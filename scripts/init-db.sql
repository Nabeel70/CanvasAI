-- Initialize CanvasAI database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create databases for different services
CREATE DATABASE canvasai_auth;
CREATE DATABASE canvasai_project;
CREATE DATABASE canvasai_canvas;
CREATE DATABASE canvasai_asset;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE canvasai_auth TO canvasai;
GRANT ALL PRIVILEGES ON DATABASE canvasai_project TO canvasai;
GRANT ALL PRIVILEGES ON DATABASE canvasai_canvas TO canvasai;
GRANT ALL PRIVILEGES ON DATABASE canvasai_asset TO canvasai;
