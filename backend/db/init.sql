-- CanvasAI Database Initialization Script
-- This script sets up the complete database schema for CanvasAI

-- Create database and user
CREATE DATABASE canvasai;
CREATE USER canvasai WITH ENCRYPTED PASSWORD 'canvasai_password';
GRANT ALL PRIVILEGES ON DATABASE canvasai TO canvasai;

-- Connect to canvasai database
\c canvasai;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO canvasai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO canvasai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO canvasai;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For better array indexing

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator');
CREATE TYPE project_role AS ENUM ('owner', 'editor', 'commenter', 'viewer');
CREATE TYPE asset_type AS ENUM ('image', 'video', 'audio', 'document', 'font', 'svg');
CREATE TYPE operation_type AS ENUM ('insert', 'update', 'delete', 'move', 'transform');
CREATE TYPE lock_type AS ENUM ('editing', 'moving', 'resizing', 'rotating');

-- Import all migration files in order
\i migrations/001_create_users_table.sql
\i migrations/002_create_projects_table.sql
\i migrations/003_create_assets_table.sql
\i migrations/004_create_collaboration_tables.sql

-- Insert default data
INSERT INTO users (id, email, name, password_hash, email_verified) VALUES
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'admin@canvasai.com',
    'CanvasAI Admin',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
    TRUE
),
(
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'demo@canvasai.com',
    'Demo User',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: demo123
    TRUE
);

-- Insert sample projects
INSERT INTO projects (id, owner_id, title, description, is_template, template_category, canvas_data) VALUES
(
    'a47ac10b-58cc-4372-a567-0e02b2c3d481',
    'f47ac10b-58cc-4372-a567-0e02b2c3d480',
    'Welcome to CanvasAI',
    'A sample project to get you started with CanvasAI',
    FALSE,
    NULL,
    '{"version":"5.3.0","objects":[{"type":"textbox","version":"5.3.0","originX":"center","originY":"center","left":400,"top":200,"width":300,"height":100,"fill":"#333333","stroke":null,"strokeWidth":1,"fontSize":24,"fontFamily":"Inter","text":"Welcome to CanvasAI!","textAlign":"center"}],"background":"#ffffff"}'
),
(
    'a47ac10b-58cc-4372-a567-0e02b2c3d482',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    'Business Card Template',
    'Professional business card design template',
    TRUE,
    'business',
    '{"version":"5.3.0","objects":[{"type":"rect","version":"5.3.0","left":50,"top":50,"width":700,"height":400,"fill":"#ffffff","stroke":"#cccccc","strokeWidth":2},{"type":"textbox","version":"5.3.0","left":80,"top":100,"width":300,"height":50,"fill":"#333333","fontSize":28,"fontWeight":"bold","text":"Your Name"},{"type":"textbox","version":"5.3.0","left":80,"top":160,"width":300,"height":30,"fill":"#666666","fontSize":16,"text":"Your Title"}],"background":"#f8f9fa"}'
);

-- Insert sample template tags
UPDATE projects SET template_tags = ARRAY['professional', 'business', 'clean'] 
WHERE is_template = TRUE;

-- Create full-text search indexes
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_assets_search ON assets USING gin(to_tsvector('english', original_filename || ' ' || COALESCE(alt_text, '')));

-- Create materialized view for popular templates
CREATE MATERIALIZED VIEW popular_templates AS
SELECT 
    p.*,
    COUNT(pv.id) as usage_count
FROM projects p
LEFT JOIN project_versions pv ON pv.project_id = p.id
WHERE p.is_template = TRUE
GROUP BY p.id
ORDER BY usage_count DESC, p.created_at DESC;

CREATE UNIQUE INDEX ON popular_templates (id);

-- Create function to refresh popular templates
CREATE OR REPLACE FUNCTION refresh_popular_templates()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY popular_templates;
END;
$$ LANGUAGE plpgsql;

-- Create analytics tables
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB,
    user_agent TEXT,
    ip_address INET,
    country VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Create function for logging analytics events
CREATE OR REPLACE FUNCTION log_analytics_event(
    p_user_id UUID,
    p_session_id VARCHAR(255),
    p_event_type VARCHAR(100),
    p_event_data JSONB DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO analytics_events (
        user_id, session_id, event_type, event_data, user_agent, ip_address
    ) VALUES (
        p_user_id, p_session_id, p_event_type, p_event_data, p_user_agent, p_ip_address
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create maintenance procedures
CREATE OR REPLACE FUNCTION run_maintenance()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
    cleaned_sessions INTEGER;
    cleaned_presence INTEGER;
    cleaned_locks INTEGER;
    cleaned_assets INTEGER;
BEGIN
    -- Clean up expired sessions
    SELECT cleanup_expired_sessions() INTO cleaned_sessions;
    result := result || 'Cleaned ' || cleaned_sessions || ' expired sessions. ';
    
    -- Clean up stale presence
    SELECT cleanup_stale_presence() INTO cleaned_presence;
    result := result || 'Cleaned ' || cleaned_presence || ' stale presence records. ';
    
    -- Clean up expired locks
    SELECT cleanup_expired_locks() INTO cleaned_locks;
    result := result || 'Cleaned ' || cleaned_locks || ' expired locks. ';
    
    -- Clean up orphaned assets
    SELECT cleanup_orphaned_assets() INTO cleaned_assets;
    result := result || 'Cleaned ' || cleaned_assets || ' orphaned assets. ';
    
    -- Refresh materialized views
    PERFORM refresh_popular_templates();
    result := result || 'Refreshed materialized views. ';
    
    -- Update statistics
    ANALYZE;
    result := result || 'Updated table statistics.';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant all permissions to canvasai user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO canvasai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO canvasai;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO canvasai;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO canvasai;

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users(lower(email));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_updated_at_desc ON projects(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_created_at_desc ON assets(created_at DESC);

COMMIT;
