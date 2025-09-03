-- Create collaboration sessions table
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create active collaborators table for tracking who's online
CREATE TABLE active_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cursor_x FLOAT,
    cursor_y FLOAT,
    selection_ids TEXT[], -- Array of selected element IDs
    color VARCHAR(7), -- Hex color for user identification
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- Create CRDT operations table for real-time sync
CREATE TABLE crdt_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_id VARCHAR(255) NOT NULL, -- Unique operation ID for CRDT
    operation_type VARCHAR(50) NOT NULL, -- 'insert', 'delete', 'update', 'move'
    element_id VARCHAR(255), -- Canvas element ID
    operation_data JSONB NOT NULL, -- The actual operation data
    timestamp_vector JSONB NOT NULL, -- Vector clock for ordering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create presence events table for cursor tracking
CREATE TABLE presence_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'cursor_move', 'selection_change', 'join', 'leave'
    event_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create canvas locks table for preventing conflicts
CREATE TABLE canvas_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    element_id VARCHAR(255) NOT NULL,
    lock_type VARCHAR(50) NOT NULL DEFAULT 'editing', -- 'editing', 'moving', 'resizing'
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 seconds'),
    UNIQUE(session_id, element_id)
);

-- Create operation conflicts table for handling concurrent edits
CREATE TABLE operation_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    operation_id_1 VARCHAR(255) NOT NULL,
    operation_id_2 VARCHAR(255) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL, -- 'concurrent_edit', 'delete_update', etc.
    resolution_strategy VARCHAR(50), -- 'last_writer_wins', 'merge', 'manual'
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_collaboration_sessions_project_id ON collaboration_sessions(project_id);
CREATE INDEX idx_collaboration_sessions_session_id ON collaboration_sessions(session_id);
CREATE INDEX idx_collaboration_sessions_expires_at ON collaboration_sessions(expires_at);
CREATE INDEX idx_collaboration_sessions_is_active ON collaboration_sessions(is_active);

CREATE INDEX idx_active_collaborators_session_id ON active_collaborators(session_id);
CREATE INDEX idx_active_collaborators_user_id ON active_collaborators(user_id);
CREATE INDEX idx_active_collaborators_last_seen_at ON active_collaborators(last_seen_at);

CREATE INDEX idx_crdt_operations_session_id ON crdt_operations(session_id);
CREATE INDEX idx_crdt_operations_user_id ON crdt_operations(user_id);
CREATE INDEX idx_crdt_operations_operation_id ON crdt_operations(operation_id);
CREATE INDEX idx_crdt_operations_element_id ON crdt_operations(element_id) WHERE element_id IS NOT NULL;
CREATE INDEX idx_crdt_operations_created_at ON crdt_operations(created_at);
CREATE INDEX idx_crdt_operations_type ON crdt_operations(operation_type);

CREATE INDEX idx_presence_events_session_id ON presence_events(session_id);
CREATE INDEX idx_presence_events_user_id ON presence_events(user_id);
CREATE INDEX idx_presence_events_created_at ON presence_events(created_at);
CREATE INDEX idx_presence_events_type ON presence_events(event_type);

CREATE INDEX idx_canvas_locks_session_id ON canvas_locks(session_id);
CREATE INDEX idx_canvas_locks_user_id ON canvas_locks(user_id);
CREATE INDEX idx_canvas_locks_element_id ON canvas_locks(element_id);
CREATE INDEX idx_canvas_locks_expires_at ON canvas_locks(expires_at);

CREATE INDEX idx_operation_conflicts_session_id ON operation_conflicts(session_id);
CREATE INDEX idx_operation_conflicts_resolved_at ON operation_conflicts(resolved_at) WHERE resolved_at IS NOT NULL;

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete expired sessions and their related data
    DELETE FROM collaboration_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up stale presence data
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove collaborators who haven't been seen for more than 5 minutes
    DELETE FROM active_collaborators 
    WHERE last_seen_at < CURRENT_TIMESTAMP - INTERVAL '5 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired locks
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Remove expired locks
    DELETE FROM canvas_locks 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update collaborator presence
CREATE OR REPLACE FUNCTION update_collaborator_presence(
    p_session_id UUID,
    p_user_id UUID,
    p_cursor_x FLOAT DEFAULT NULL,
    p_cursor_y FLOAT DEFAULT NULL,
    p_selection_ids TEXT[] DEFAULT NULL,
    p_color VARCHAR(7) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO active_collaborators (
        session_id, user_id, cursor_x, cursor_y, selection_ids, color, last_seen_at
    ) VALUES (
        p_session_id, p_user_id, p_cursor_x, p_cursor_y, p_selection_ids, p_color, CURRENT_TIMESTAMP
    )
    ON CONFLICT (session_id, user_id) 
    DO UPDATE SET
        cursor_x = COALESCE(EXCLUDED.cursor_x, active_collaborators.cursor_x),
        cursor_y = COALESCE(EXCLUDED.cursor_y, active_collaborators.cursor_y),
        selection_ids = COALESCE(EXCLUDED.selection_ids, active_collaborators.selection_ids),
        color = COALESCE(EXCLUDED.color, active_collaborators.color),
        last_seen_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to acquire canvas lock
CREATE OR REPLACE FUNCTION acquire_canvas_lock(
    p_session_id UUID,
    p_user_id UUID,
    p_element_id VARCHAR(255),
    p_lock_type VARCHAR(50) DEFAULT 'editing',
    p_duration_seconds INTEGER DEFAULT 30
)
RETURNS BOOLEAN AS $$
DECLARE
    lock_acquired BOOLEAN := FALSE;
BEGIN
    -- Try to acquire lock
    INSERT INTO canvas_locks (
        session_id, user_id, element_id, lock_type, expires_at
    ) VALUES (
        p_session_id, p_user_id, p_element_id, p_lock_type, 
        CURRENT_TIMESTAMP + (p_duration_seconds || ' seconds')::INTERVAL
    )
    ON CONFLICT (session_id, element_id) DO NOTHING;
    
    -- Check if lock was acquired
    GET DIAGNOSTICS lock_acquired = ROW_COUNT;
    RETURN lock_acquired > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to release canvas lock
CREATE OR REPLACE FUNCTION release_canvas_lock(
    p_session_id UUID,
    p_user_id UUID,
    p_element_id VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    lock_released BOOLEAN := FALSE;
BEGIN
    DELETE FROM canvas_locks 
    WHERE session_id = p_session_id 
    AND user_id = p_user_id 
    AND element_id = p_element_id;
    
    GET DIAGNOSTICS lock_released = ROW_COUNT;
    RETURN lock_released > 0;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-cleanup expired locks
CREATE OR REPLACE FUNCTION auto_cleanup_expired_locks()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up expired locks when new lock is created
    PERFORM cleanup_expired_locks();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_cleanup_locks_trigger
    AFTER INSERT ON canvas_locks
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_cleanup_expired_locks();
