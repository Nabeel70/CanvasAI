package project

import (
	"context"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/beta/errs"
	"encore.dev/storage/sqldb"
	"github.com/google/uuid"
)

// Project represents a design project
type Project struct {
	ID            string         `json:"id"`
	Title         string         `json:"title"`
	Slug          string         `json:"slug"`
	OwnerID       string         `json:"ownerId"`
	Description   string         `json:"description,omitempty"`
	Thumbnail     string         `json:"thumbnail,omitempty"`
	CanvasData    any            `json:"canvasData,omitempty"`
	CanvasWidth   int            `json:"canvasWidth"`
	CanvasHeight  int            `json:"canvasHeight"`
	IsPublic      bool           `json:"isPublic"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	Collaborators []Collaborator `json:"collaborators"`
}

// Collaborator represents a project collaborator
type Collaborator struct {
	UserID string `json:"userId"`
	Role   string `json:"role"` // owner, editor, commenter, viewer
	AddedAt time.Time `json:"addedAt"`
}

// CreateProjectRequest represents the create project request
type CreateProjectRequest struct {
	Title          string `json:"title"`
	Description    string `json:"description,omitempty"`
	TemplatePrompt string `json:"templatePrompt,omitempty"`
}

// UpdateProjectRequest represents the update project request
type UpdateProjectRequest struct {
	Title        string      `json:"title,omitempty"`
	Description  string      `json:"description,omitempty"`
	IsPublic     *bool       `json:"isPublic,omitempty"`
	CanvasData   interface{} `json:"canvasData,omitempty"`
	CanvasWidth  *int        `json:"canvasWidth,omitempty"`
	CanvasHeight *int        `json:"canvasHeight,omitempty"`
}

// ListProjectsResponse represents the list projects response
type ListProjectsResponse struct {
	Projects []Project `json:"projects"`
	Total    int       `json:"total"`
}

var db = sqldb.NewDatabase("project", sqldb.DatabaseConfig{
	Migrations: "../migrations",
})

//encore:api auth method=POST path=/projects
func CreateProject(ctx context.Context, req *CreateProjectRequest) (*Project, error) {
	userID := auth.UserID()
	
	if req.Title == "" {
		return nil, &errs.Error{
			Code:    errs.InvalidArgument,
			Message: "Title is required",
		}
	}

	projectID := uuid.New().String()
	slug := generateSlug(req.Title)
	now := time.Now()

	// Create project
	_, err := db.Exec(ctx, `
		INSERT INTO projects (id, title, slug, owner_id, description, is_public, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, projectID, req.Title, slug, userID, req.Description, false, now, now)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to create project",
		}
	}

	// Add owner as collaborator
	_, err = db.Exec(ctx, `
		INSERT INTO project_collaborators (project_id, user_id, role, invited_by)
		VALUES ($1, $2, $3, $4)
	`, projectID, userID, "owner", userID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to add owner as collaborator",
		}
	}

	project := &Project{
		ID:           projectID,
		Title:        req.Title,
		Slug:         slug,
		OwnerID:      userID,
		Description:  req.Description,
		CanvasWidth:  800,
		CanvasHeight: 600,
		IsPublic:     false,
		CreatedAt:    now,
		UpdatedAt:    now,
		Collaborators: []Collaborator{
			{
				UserID:  userID,
				Role:    "owner",
				AddedAt: now,
			},
		},
	}

	return project, nil
}

//encore:api auth method=GET path=/projects
func ListProjects(ctx context.Context) (*ListProjectsResponse, error) {
	userID := auth.UserID()

	rows, err := db.Query(ctx, `
		SELECT p.id, p.title, p.slug, p.owner_id, p.description, p.thumbnail, p.is_public, p.created_at, p.updated_at
		FROM projects p
		JOIN project_collaborators c ON p.id = c.project_id
		WHERE c.user_id = $1
		ORDER BY p.updated_at DESC
	`, userID)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to fetch projects",
		}
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		err := rows.Scan(&p.ID, &p.Title, &p.Slug, &p.OwnerID, &p.Description, &p.Thumbnail, &p.IsPublic, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			continue
		}
		projects = append(projects, p)
	}

	return &ListProjectsResponse{
		Projects: projects,
		Total:    len(projects),
	}, nil
}

//encore:api auth method=GET path=/projects/:id
func GetProject(ctx context.Context, id string) (*Project, error) {
	userID := auth.UserID()

	// Check if user has access to this project
	var hasAccess bool
	err := db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM project_collaborators
			WHERE project_id = $1 AND user_id = $2
		)
	`, id, userID).Scan(&hasAccess)
	if err != nil || !hasAccess {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "Access denied to this project",
		}
	}

	var project Project
	err = db.QueryRow(ctx, `
		SELECT id, title, slug, owner_id, description, thumbnail, canvas_data, canvas_width, canvas_height, is_public, created_at, updated_at
		FROM projects WHERE id = $1
	`, id).Scan(&project.ID, &project.Title, &project.Slug, &project.OwnerID, &project.Description, &project.Thumbnail, &project.CanvasData, &project.CanvasWidth, &project.CanvasHeight, &project.IsPublic, &project.CreatedAt, &project.UpdatedAt)
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.NotFound,
			Message: "Project not found",
		}
	}

	// Get collaborators
	rows, err := db.Query(ctx, `
		SELECT user_id, role, invited_at
		FROM project_collaborators WHERE project_id = $1
	`, id)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var collab Collaborator
			err := rows.Scan(&collab.UserID, &collab.Role, &collab.AddedAt)
			if err == nil {
				project.Collaborators = append(project.Collaborators, collab)
			}
		}
	}

	return &project, nil
}

//encore:api auth method=PUT path=/projects/:id
func UpdateProject(ctx context.Context, id string, req *UpdateProjectRequest) (*Project, error) {
	userID := auth.UserID()

	// Check if user is owner or editor
	var role string
	err := db.QueryRow(ctx, `
		SELECT role FROM project_collaborators
		WHERE project_id = $1 AND user_id = $2
	`, id, userID).Scan(&role)
	if err != nil || (role != "owner" && role != "editor") {
		return nil, &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "Insufficient permissions to update project",
		}
	}

	// Update project
	_, err = db.Exec(ctx, `
		UPDATE projects
		SET title = COALESCE(NULLIF($2, ''), title),
			description = COALESCE(NULLIF($3, ''), description),
			is_public = COALESCE($4, is_public),
			canvas_data = COALESCE($5, canvas_data),
			canvas_width = COALESCE($6, canvas_width),
			canvas_height = COALESCE($7, canvas_height),
			updated_at = $8
		WHERE id = $1
	`, id, req.Title, req.Description, req.IsPublic, req.CanvasData, req.CanvasWidth, req.CanvasHeight, time.Now())
	if err != nil {
		return nil, &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to update project",
		}
	}

	return GetProject(ctx, id)
}

//encore:api auth method=DELETE path=/projects/:id
func DeleteProject(ctx context.Context, id string) error {
	userID := auth.UserID()

	// Check if user is owner
	var ownerID string
	err := db.QueryRow(ctx, `
		SELECT owner_id FROM projects WHERE id = $1
	`, id).Scan(&ownerID)
	if err != nil {
		return &errs.Error{
			Code:    errs.NotFound,
			Message: "Project not found",
		}
	}

	if ownerID != userID {
		return &errs.Error{
			Code:    errs.PermissionDenied,
			Message: "Only project owner can delete the project",
		}
	}

	// Delete project (cascading deletes will handle collaborators)
	_, err = db.Exec(ctx, "DELETE FROM projects WHERE id = $1", id)
	if err != nil {
		return &errs.Error{
			Code:    errs.Internal,
			Message: "Failed to delete project",
		}
	}

	return nil
}

func generateSlug(title string) string {
	// Simple slug generation - in production, use a more robust solution
	slug := title
	if len(slug) > 50 {
		slug = slug[:50]
	}
	return slug + "-" + uuid.New().String()[:8]
}
