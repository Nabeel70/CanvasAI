#!/bin/bash

# CanvasAI Development Setup Script
# This script sets up the complete development environment

set -e

echo "🎨 Setting up CanvasAI development environment..."

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check Go
    if ! command -v go &> /dev/null; then
        echo "❌ Go is not installed. Please install Go 1.21+ first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python is not installed. Please install Python 3.9+ first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    echo "✅ All prerequisites are installed"
}

# Install frontend dependencies
setup_frontend() {
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
}

# Install backend dependencies
setup_backend() {
    echo "📦 Installing backend dependencies..."
    cd backend
    go mod download
    cd ..
    echo "✅ Backend dependencies installed"
}

# Install AI service dependencies
setup_ai() {
    echo "📦 Installing AI service dependencies..."
    cd ai
    
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    
    # Activate virtual environment and install dependencies
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    echo "✅ AI service dependencies installed"
}

# Setup databases
setup_databases() {
    echo "🗄️ Setting up databases..."
    
    # Start database services
    docker-compose up -d postgres redis minio
    
    # Wait for databases to be ready
    echo "⏳ Waiting for databases to be ready..."
    sleep 10
    
    echo "✅ Databases are running"
}

# Generate environment files
generate_env_files() {
    echo "⚙️ Generating environment files..."
    
    # Frontend .env.local
    cat > frontend/.env.local << EOF
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_AI_URL=http://localhost:8000
EOF

    # Backend .env
    cat > backend/.env << EOF
DATABASE_URL=postgres://canvasai:password@localhost:5432/canvasai
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
JWT_SECRET=$(openssl rand -base64 32)
EOF

    # AI .env
    cat > ai/.env << EOF
REDIS_URL=redis://localhost:6379
MODEL_CACHE_PATH=./models
CUDA_VISIBLE_DEVICES=0
EOF

    echo "✅ Environment files generated"
}

# Create start script
create_start_script() {
    echo "📝 Creating start script..."
    
    cat > start-dev.sh << 'EOF'
#!/bin/bash

# Start CanvasAI in development mode

echo "🎨 Starting CanvasAI development environment..."

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    jobs -p | xargs -r kill
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start services in background
echo "🚀 Starting frontend (port 3000)..."
cd frontend && npm run dev &

echo "🚀 Starting backend (port 4000)..."
cd backend && encore run &

echo "🚀 Starting AI services (port 8000)..."
cd ai && source venv/bin/activate && python main.py &

# Wait for all background jobs
wait

EOF

    chmod +x start-dev.sh
    echo "✅ Start script created"
}

# Main setup function
main() {
    check_prerequisites
    setup_frontend
    setup_backend
    setup_ai
    setup_databases
    generate_env_files
    create_start_script
    
    echo ""
    echo "🎉 CanvasAI development environment is ready!"
    echo ""
    echo "To start the development environment:"
    echo "  ./start-dev.sh"
    echo ""
    echo "Services will be available at:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Backend API: http://localhost:4000"
    echo "  • AI Services: http://localhost:8000"
    echo "  • MinIO Console: http://localhost:9001"
    echo ""
    echo "For more information, see docs/developer-guide.md"
}

# Run main function
main "$@"
