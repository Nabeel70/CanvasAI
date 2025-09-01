package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name,omitempty"`
	Avatar    string    `json:"avatar,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// SignupRequest represents the signup request payload
type SignupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"`
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

var db = sqldb.NewDatabase("auth", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

var jwtSecret = []byte("your-secret-key") // In production, use environment variable

//encore:api public method=POST path=/auth/signup
func Signup(ctx context.Context, req *SignupRequest) (*AuthResponse, error) {
	// Validate input
	if req.Email == "" || req.Password == "" {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "Email and password are required",
		}
	}

	// Check if user already exists
	var existingID string
	err := db.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", req.Email).Scan(&existingID)
	if err == nil {
		return nil, &errs.Error{
			Code:    errs.AlreadyExists,
			Message: "User with this email already exists",
		}
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to hash password",
		}
	}

	// Create user
	userID := uuid.New().String()
	_, err = db.Exec(ctx, `
		INSERT INTO users (id, email, name, hashed_password, created_at)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, req.Email, req.Name, hashedPassword, time.Now())
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to create user",
		}
	}

	// Generate JWT token
	token, err := generateToken(userID)
	if err != nil {
		return nil, err
	}

	user := User{
		ID:        userID,
		Email:     req.Email,
		Name:      req.Name,
		CreatedAt: time.Now(),
	}

	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

//encore:api public method=POST path=/auth/login
func Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	var user User
	var hashedPassword string

	err := db.QueryRow(ctx, `
		SELECT id, email, name, avatar, hashed_password, created_at
		FROM users WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Email, &user.Name, &user.Avatar, &hashedPassword, &user.CreatedAt)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "Invalid email or password",
		}
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Unauthenticated,
			Message: "Invalid email or password",
		}
	}

	// Generate JWT token
	token, err := generateToken(user.ID)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

//encore:api auth method=GET path=/auth/me
func GetProfile(ctx context.Context) (*User, error) {
	userID := auth.UserID()
	
	var user User
	err := db.QueryRow(ctx, `
		SELECT id, email, name, avatar, created_at
		FROM users WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.Name, &user.Avatar, &user.CreatedAt)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.NotFound,
			Message: "User not found",
		}
	}

	return &user, nil
}

func generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to generate token",
		}
	}

	return tokenString, nil
}

func generateSecureKey() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return base64.URLEncoding.EncodeToString(bytes)
}
