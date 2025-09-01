# Contributing to CanvasAI

We love your input! We want to make contributing to CanvasAI as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Requests

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

### Branch Naming Convention

- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Examples:
- `feat(canvas): add pen tool with bezier curves`
- `fix(auth): resolve JWT token expiration issue`
- `docs(api): update authentication endpoints`

## Code Style

### Frontend (TypeScript/React)

- Use functional components with hooks
- Follow the Airbnb style guide
- Use TypeScript for type safety
- Components should be in PascalCase
- Use meaningful variable and function names

```typescript
// Good
interface CanvasToolProps {
  selectedTool: string
  onToolChange: (tool: string) => void
}

const CanvasTool: React.FC<CanvasToolProps> = ({ selectedTool, onToolChange }) => {
  // Component implementation
}

// Bad
const canvastool = (props: any) => {
  // Implementation
}
```

### Backend (Go)

- Follow Go conventions and use `gofmt`
- Use meaningful package names
- Document exported functions and types
- Handle errors appropriately

```go
// Good
package project

// CreateProject creates a new design project for the authenticated user.
func CreateProject(ctx context.Context, req *CreateProjectRequest) (*Project, error) {
    if req.Title == "" {
        return nil, &errs.Error{
            Code:    errs.InvalidArgument,
            Message: "Title is required",
        }
    }
    // Implementation
}

// Bad
func createproj(r *req) *proj {
    // Implementation
}
```

### AI Services (Python)

- Follow PEP 8 style guide
- Use type hints
- Document functions with docstrings
- Use meaningful variable names

```python
# Good
def generate_layout(prompt: str, width: int, height: int) -> Dict[str, Any]:
    """Generate a layout based on the given prompt.
    
    Args:
        prompt: Text description of the desired layout
        width: Canvas width in pixels
        height: Canvas height in pixels
        
    Returns:
        Dictionary containing the generated scene graph
    """
    # Implementation

# Bad
def gen_layout(p, w, h):
    # Implementation
```

## Testing

### Frontend Testing

We use Jest and React Testing Library:

```typescript
import { render, screen } from '@testing-library/react'
import { CanvasTool } from './CanvasTool'

test('renders canvas tool with correct selection', () => {
  render(<CanvasTool selectedTool="pen" onToolChange={jest.fn()} />)
  const penTool = screen.getByRole('button', { name: /pen/i })
  expect(penTool).toHaveClass('selected')
})
```

### Backend Testing

Use Go's built-in testing framework:

```go
func TestCreateProject(t *testing.T) {
    ctx := context.Background()
    req := &CreateProjectRequest{
        Title: "Test Project",
    }
    
    project, err := CreateProject(ctx, req)
    if err != nil {
        t.Fatalf("Expected no error, got %v", err)
    }
    
    if project.Title != req.Title {
        t.Errorf("Expected title %s, got %s", req.Title, project.Title)
    }
}
```

### AI Services Testing

Use pytest for Python testing:

```python
import pytest
from main import generate_layout

def test_generate_layout():
    result = generate_layout("Create a modern landing page", 800, 600)
    
    assert "artboard" in result
    assert result["artboard"]["width"] == 800
    assert result["artboard"]["height"] == 600
```

## Documentation

- Update README.md if you change functionality
- Add docstrings/comments for new functions
- Update API documentation for new endpoints
- Include examples for new features

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- CanvasAI version
- Operating system
- Browser (for frontend issues)
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

### Feature Requests

Use the feature request template and include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Alternative solutions considered

## Security

If you discover a security vulnerability, please send an email to security@canvasai.org instead of creating a public issue.

## Plugin Development

### Plugin Structure

```javascript
// plugins/my-plugin/index.js
export function init(api) {
  // Plugin initialization
  api.addPanel('My Plugin', MyPluginPanel)
  api.addTool('custom-tool', CustomTool)
}

export const metadata = {
  name: 'My Plugin',
  version: '1.0.0',
  description: 'Description of what the plugin does',
  author: 'Your Name',
  permissions: ['canvas.read', 'canvas.write']
}
```

### Plugin API

Available API methods:

- `api.canvas` - Canvas manipulation
- `api.selection` - Selected objects
- `api.history` - Undo/redo operations
- `api.ui` - UI components and panels
- `api.storage` - Plugin data storage

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Don't hesitate to ask! You can:

- Create an issue with the "question" label
- Join our Discord server
- Email us at developers@canvasai.org

Thank you for contributing to CanvasAI! 🎨
