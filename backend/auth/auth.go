package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"encore.dev/config"
	encoreauth "encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/rlog"
	"encore.dev/storage/sqldb"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Avatar    *string   `json:"avatar,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// UserClaims represents JWT claims for user authentication
type UserClaims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

// SignupRequest represents the signup request payload
type SignupRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthResponse represents the authentication response
type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}

// UpdateProfileRequest represents the profile update request
type UpdateProfileRequest struct {
	Name   *string `json:"name,omitempty"`
	Avatar *string `json:"avatar,omitempty"`
}

var (
	ErrUserExists       = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound     = errors.New("user not found")
	ErrInvalidToken     = errors.New("invalid token")
)

var secrets struct {
	JWTSecret string
}

var _ = config.Load(context.Background(), &secrets)

var authdb = sqldb.NewDatabase("auth", sqldb.DatabaseConfig{ Migrations: "../migrations" })

//encore:api public method=POST path=/auth/signup
func Signup(ctx context.Context, req *SignupRequest) (*AuthResponse, error) {
	// Validate input
	if err := validateSignupRequest(req); err != nil {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: err.Error()}
	}

	// Check if user already exists
	existingUser, err := getUserByEmail(ctx, req.Email)
	if err != nil && err != ErrUserNotFound {
		rlog.Error("failed to check existing user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}
	if existingUser != nil {
		return nil, &errs.Error{Code: errs.AlreadyExists, Message: "user already exists"}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		rlog.Error("failed to hash password", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Create user
	user := &User{
		ID:        uuid.New().String(),
		Email:     strings.ToLower(strings.TrimSpace(req.Email)),
		Name:      strings.TrimSpace(req.Name),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := createUser(ctx, user, string(hashedPassword)); err != nil {
		rlog.Error("failed to create user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Generate JWT token
	token, err := generateJWTToken(user)
	if err != nil {
		rlog.Error("failed to generate token", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	return &AuthResponse{
		User:  *user,
		Token: token,
	}, nil
}

//encore:api public method=POST path=/auth/login
func Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	// Validate input
	if err := validateLoginRequest(req); err != nil {
		return nil, &errs.Error{Code: errs.InvalidArgument, Message: err.Error()}
	}

	// Get user by email
	user, err := getUserByEmail(ctx, req.Email)
	if err != nil {
		if err == ErrUserNotFound {
			return nil, &errs.Error{Code: errs.Unauthenticated, Message: "invalid credentials"}
		}
		rlog.Error("failed to get user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Get user password hash
	hashedPassword, err := getUserPasswordHash(ctx, user.ID)
	if err != nil {
		rlog.Error("failed to get user password", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "invalid credentials"}
	}

	// Generate JWT token
	token, err := generateJWTToken(user)
	if err != nil {
		rlog.Error("failed to generate token", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	return &AuthResponse{
		User:  *user,
		Token: token,
	}, nil
}

//encore:api auth method=GET path=/auth/me
func GetProfile(ctx context.Context) (*User, error) {
	userID := encoreauth.UserID()
	if userID == "" {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "not authenticated"}
	}

	user, err := getUserByID(ctx, userID)
	if err != nil {
		if err == ErrUserNotFound {
			return nil, &errs.Error{Code: errs.NotFound, Message: "user not found"}
		}
		rlog.Error("failed to get user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	return user, nil
}

//encore:api auth method=PUT path=/auth/profile
func UpdateProfile(ctx context.Context, req *UpdateProfileRequest) (*User, error) {
	userID := encoreauth.UserID()
	if userID == "" {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "not authenticated"}
	}

	user, err := getUserByID(ctx, userID)
	if err != nil {
		if err == ErrUserNotFound {
			return nil, &errs.Error{Code: errs.NotFound, Message: "user not found"}
		}
		rlog.Error("failed to get user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Update fields
	if req.Name != nil {
		user.Name = strings.TrimSpace(*req.Name)
	}
	if req.Avatar != nil {
		user.Avatar = req.Avatar
	}
	user.UpdatedAt = time.Now()

	if err := updateUser(user); err != nil {
		rlog.Error("failed to update user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	return user, nil
}

//encore:api public method=POST path=/auth/refresh
func RefreshToken(ctx context.Context) (*AuthResponse, error) {
	// Get token from Authorization header
	authHeader := ctx.Value("Authorization")
	if authHeader == nil {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "no token provided"}
	}

	tokenString := strings.TrimPrefix(authHeader.(string), "Bearer ")
	
	// Parse and validate token
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secrets.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "invalid token"}
	}

	claims, ok := token.Claims.(*UserClaims)
	if !ok {
		return nil, &errs.Error{Code: errs.Unauthenticated, Message: "invalid token claims"}
	}

	// Get fresh user data
	user, err := getUserByID(claims.UserID)
	if err != nil {
		if err == ErrUserNotFound {
			return nil, &errs.Error{Code: errs.NotFound, Message: "user not found"}
		}
		rlog.Error("failed to get user", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	// Generate new token
	newToken, err := generateJWTToken(user)
	if err != nil {
		rlog.Error("failed to generate token", "error", err)
		return nil, &errs.Error{Code: errs.Internal, Message: "internal server error"}
	}

	return &AuthResponse{
		User:  *user,
		Token: newToken,
	}, nil
}

// Helper functions

func validateSignupRequest(req *SignupRequest) error {
	if strings.TrimSpace(req.Name) == "" {
		return errors.New("name is required")
	}
	if len(strings.TrimSpace(req.Name)) < 2 {
		return errors.New("name must be at least 2 characters")
	}
	if strings.TrimSpace(req.Email) == "" {
		return errors.New("email is required")
	}
	if !isValidEmail(req.Email) {
		return errors.New("invalid email format")
	}
	if req.Password == "" {
		return errors.New("password is required")
	}
	if len(req.Password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	return nil
}

func validateLoginRequest(req *LoginRequest) error {
	if strings.TrimSpace(req.Email) == "" {
		return errors.New("email is required")
	}
	if req.Password == "" {
		return errors.New("password is required")
	}
	return nil
}

func isValidEmail(email string) bool {
	// Simple email validation
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

func generateJWTToken(user *User) (string, error) {
	claims := UserClaims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "canvasai",
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secrets.JWTSecret))
}

// Database operations using Postgres via Encore sqldb
func createUser(ctx context.Context, user *User, hashedPassword string) error {
	_, err := authdb.Exec(ctx, `INSERT INTO users (id,email,name,password_hash,avatar,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, user.ID, user.Email, user.Name, hashedPassword, user.Avatar, user.CreatedAt, user.UpdatedAt)
	return err
}

func getUserByEmail(ctx context.Context, email string) (*User, error) {
	row := authdb.QueryRow(ctx, `SELECT id, email, name, avatar, created_at, updated_at FROM users WHERE lower(email)=lower($1)`, strings.ToLower(email))
	var u User
	var avatar sql.NullString
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &avatar, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if err == sql.ErrNoRows { return nil, ErrUserNotFound }
		return nil, err
	}
	if avatar.Valid { u.Avatar = &avatar.String }
	return &u, nil
}

func getUserByID(ctx context.Context, id string) (*User, error) {
	row := authdb.QueryRow(ctx, `SELECT id, email, name, avatar, created_at, updated_at FROM users WHERE id=$1`, id)
	var u User
	var avatar sql.NullString
	if err := row.Scan(&u.ID, &u.Email, &u.Name, &avatar, &u.CreatedAt, &u.UpdatedAt); err != nil {
		if err == sql.ErrNoRows { return nil, ErrUserNotFound }
		return nil, err
	}
	if avatar.Valid { u.Avatar = &avatar.String }
	return &u, nil
}

func getUserPasswordHash(ctx context.Context, userID string) (string, error) {
	row := authdb.QueryRow(ctx, `SELECT password_hash FROM users WHERE id=$1`, userID)
	var hash string
	if err := row.Scan(&hash); err != nil {
		if err == sql.ErrNoRows { return "", ErrUserNotFound }
		return "", err
	}
	return hash, nil
}

func updateUser(user *User) error {
	_, err := authdb.Exec(context.Background(), `UPDATE users SET name=$1, avatar=$2, updated_at=$3 WHERE id=$4`, user.Name, user.Avatar, time.Now(), user.ID)
	return err
}

// Auth handler for Encore
func AuthHandler(ctx context.Context, token string) (encoreauth.UID, *encoreauth.UserData, error) {
	// Parse JWT token
	parsedToken, err := jwt.ParseWithClaims(token, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secrets.JWTSecret), nil
	})

	if err != nil || !parsedToken.Valid {
		return "", nil, err
	}

	claims, ok := parsedToken.Claims.(*UserClaims)
	if !ok {
		return "", nil, errors.New("invalid token claims")
	}

	return encoreauth.UID(claims.UserID), &encoreauth.UserData{
		ID:    claims.UserID,
		Email: claims.Email,
	}, nil
}
