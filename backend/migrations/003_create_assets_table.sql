-- Create assets table for file management
CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL, -- Path in storage (S3/MinIO)
    thumbnail_path TEXT, -- Path to thumbnail if applicable
    width INTEGER, -- For images
    height INTEGER, -- For images
    duration FLOAT, -- For videos/audio
    metadata JSONB, -- Additional file metadata
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    alt_text TEXT, -- For accessibility
    checksum VARCHAR(64), -- File integrity check
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create asset usage tracking table
CREATE TABLE asset_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    element_id VARCHAR(255), -- Canvas element ID that uses this asset
    usage_type VARCHAR(50) NOT NULL, -- 'image', 'background', 'texture', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create asset folders table for organization
CREATE TABLE asset_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES asset_folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL, -- Full path from root
    is_system BOOLEAN DEFAULT FALSE, -- System folders like 'Trash', 'Uploads'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create asset_folder_items table for folder organization
CREATE TABLE asset_folder_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID NOT NULL REFERENCES asset_folders(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(folder_id, asset_id)
);

-- Create asset shares table for sharing assets
CREATE TABLE asset_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for public shares
    share_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER, -- NULL for unlimited
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_assets_project_id ON assets(project_id);
CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_mime_type ON assets(mime_type);
CREATE INDEX idx_assets_file_size ON assets(file_size);
CREATE INDEX idx_assets_is_public ON assets(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_assets_created_at ON assets(created_at);
CREATE INDEX idx_assets_tags ON assets USING GIN(tags);
CREATE INDEX idx_assets_checksum ON assets(checksum);

CREATE INDEX idx_asset_usage_asset_id ON asset_usage(asset_id);
CREATE INDEX idx_asset_usage_project_id ON asset_usage(project_id);
CREATE INDEX idx_asset_usage_element_id ON asset_usage(element_id) WHERE element_id IS NOT NULL;
CREATE INDEX idx_asset_usage_type ON asset_usage(usage_type);

CREATE INDEX idx_asset_folders_user_id ON asset_folders(user_id);
CREATE INDEX idx_asset_folders_project_id ON asset_folders(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_asset_folders_parent_id ON asset_folders(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_asset_folders_path ON asset_folders(path);

CREATE INDEX idx_asset_folder_items_folder_id ON asset_folder_items(folder_id);
CREATE INDEX idx_asset_folder_items_asset_id ON asset_folder_items(asset_id);

CREATE INDEX idx_asset_shares_asset_id ON asset_shares(asset_id);
CREATE INDEX idx_asset_shares_shared_by ON asset_shares(shared_by);
CREATE INDEX idx_asset_shares_shared_with ON asset_shares(shared_with) WHERE shared_with IS NOT NULL;
CREATE INDEX idx_asset_shares_share_token ON asset_shares(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_asset_shares_expires_at ON asset_shares(expires_at) WHERE expires_at IS NOT NULL;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_assets_updated_at 
    BEFORE UPDATE ON assets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_folders_updated_at 
    BEFORE UPDATE ON asset_folders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate total storage used by user
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(file_size) FROM assets WHERE user_id = user_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up orphaned assets
CREATE OR REPLACE FUNCTION cleanup_orphaned_assets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete assets that are not used in any project and older than 30 days
    DELETE FROM assets 
    WHERE project_id IS NULL 
    AND id NOT IN (SELECT DISTINCT asset_id FROM asset_usage)
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate file path
CREATE OR REPLACE FUNCTION generate_asset_path(user_uuid UUID, filename TEXT, mime_type TEXT)
RETURNS TEXT AS $$
DECLARE
    year_month TEXT;
    file_extension TEXT;
    uuid_part TEXT;
BEGIN
    year_month := TO_CHAR(CURRENT_DATE, 'YYYY/MM');
    file_extension := CASE 
        WHEN position('.' in filename) > 0 THEN 
            lower(substring(filename from position('.' in filename)))
        ELSE ''
    END;
    
    uuid_part := replace(gen_random_uuid()::text, '-', '');
    
    RETURN 'uploads/' || user_uuid || '/' || year_month || '/' || uuid_part || file_extension;
END;
$$ LANGUAGE plpgsql;

-- Create default folders for new users
CREATE OR REPLACE FUNCTION create_default_user_folders()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default folders for new user
    INSERT INTO asset_folders (user_id, name, path, is_system) VALUES
    (NEW.id, 'My Assets', '/my-assets', TRUE),
    (NEW.id, 'Recent', '/recent', TRUE),
    (NEW.id, 'Favorites', '/favorites', TRUE),
    (NEW.id, 'Trash', '/trash', TRUE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create default folders for new users
CREATE TRIGGER create_user_default_folders
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_folders();
