# CanvasAI Developer Guide

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Go 1.21+
- Python 3.9+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nabeel70/CanvasAI.git
   cd CanvasAI
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd ../backend && go mod download
   
   # AI Services
   cd ../ai && pip install -r requirements.txt
   ```

3. **Start services with Docker**
   ```bash
   docker-compose up -d postgres redis minio
   ```

4. **Run services locally**
   ```bash
   # Terminal 1: Frontend
   cd frontend && npm run dev
   
   # Terminal 2: Backend
   cd backend && encore run
   
   # Terminal 3: AI Services
   cd ai && python main.py
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - AI Services: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Architecture Overview

### Frontend Stack
- **React 18**: Component-based UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **TailwindCSS**: Utility-first CSS framework
- **Fabric.js**: Canvas manipulation library
- **Yjs**: CRDT for real-time collaboration
- **Zustand**: State management
- **React Query**: Server state management

### Backend Stack
- **Encore**: Go framework for backend services
- **PostgreSQL**: Primary database
- **Redis**: Caching and real-time features
- **MinIO**: S3-compatible object storage
- **WebSocket**: Real-time communication

### AI Stack
- **FastAPI**: Python web framework
- **ONNX Runtime**: Model inference
- **PIL/OpenCV**: Image processing
- **Transformers**: Hugging Face models
- **Stable Diffusion**: Image generation

## Project Structure

```
CanvasAI/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── stores/          # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   └── api/             # API client functions
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # Go backend services
│   ├── auth/                # Authentication service
│   ├── project/             # Project management service
│   ├── canvas/              # Canvas/collaboration service
│   ├── asset/               # Asset management service
│   └── go.mod
├── ai/                      # Python AI services
│   ├── main.py              # FastAPI application
│   ├── models/              # AI model implementations
│   └── requirements.txt
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
├── charts/                  # Helm charts for K8s
├── terraform/               # Infrastructure as code
└── docker-compose.yml       # Local development setup
```

## Key Components

### Canvas Engine (Fabric.js)

The canvas component is built on Fabric.js for vector manipulation:

```typescript
import { fabric } from 'fabric'

const canvas = new fabric.Canvas('canvas', {
  width: 800,
  height: 600,
  backgroundColor: '#ffffff'
})

// Add objects
const rect = new fabric.Rect({
  left: 100,
  top: 100,
  width: 200,
  height: 100,
  fill: '#3B82F6'
})

canvas.add(rect)
```

### Real-time Collaboration (Yjs)

Collaborative editing uses Yjs for conflict-free replicated data types:

```typescript
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

const ydoc = new Y.Doc()
const provider = new WebrtcProvider('canvasai-room', ydoc)

// Shared canvas state
const ycanvas = ydoc.getMap('canvas')

// Listen for changes
ycanvas.observe((event) => {
  // Update canvas based on remote changes
  updateCanvas(event.changes)
})
```

### AI Integration

AI services are integrated via REST API calls:

```typescript
const generateLayout = async (prompt: string) => {
  const response = await fetch('/ai/layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width: 800, height: 600 })
  })
  
  const { scene_graph } = await response.json()
  return scene_graph
}
```

## Development Workflow

### Code Style

- **Frontend**: ESLint + Prettier with Airbnb config
- **Backend**: Go fmt + golint
- **AI**: Black + flake8

### Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && go test ./...

# AI service tests
cd ai && pytest
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/canvas-tools`
2. Make changes and commit: `git commit -m "feat: add pen tool"`
3. Push and create PR: `git push origin feature/canvas-tools`
4. Code review and merge

### Environment Variables

Create `.env.local` files for local development:

```bash
# Frontend (.env.local)
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_AI_URL=http://localhost:8000

# Backend (.env)
DATABASE_URL=postgres://canvasai:password@localhost:5432/canvasai
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key

# AI Services (.env)
MODEL_CACHE_PATH=./models
CUDA_VISIBLE_DEVICES=0
```

## Debugging

### Frontend Debugging

Use React DevTools and browser developer tools:

```typescript
// Debug canvas state
console.log('Canvas objects:', canvas.getObjects())

// Debug Yjs state
console.log('Yjs doc:', ydoc.toJSON())
```

### Backend Debugging

Use Encore's built-in tracing and logging:

```go
import "encore.dev/rlog"

func someFunction() {
    rlog.Info("Processing request", "userID", userID)
}
```

### AI Services Debugging

Use FastAPI's automatic documentation at `/docs`:

```python
import logging

logger = logging.getLogger(__name__)
logger.info(f"Processing image: {image.size}")
```

## Performance Optimization

### Frontend Optimization

- Use React.memo for expensive components
- Implement virtual scrolling for large lists
- Optimize canvas rendering with requestAnimationFrame
- Use Web Workers for heavy computations

### Backend Optimization

- Use database connection pooling
- Implement Redis caching for frequent queries
- Use gRPC for service-to-service communication
- Monitor with Prometheus metrics

### AI Optimization

- Use ONNX Runtime for faster inference
- Implement model caching
- Use GPU acceleration when available
- Batch similar requests

## Deployment

See [Deployment Guide](./deployment.md) for production deployment instructions.

## Contributing

See [Contributing Guide](../CONTRIBUTING.md) for contribution guidelines.
