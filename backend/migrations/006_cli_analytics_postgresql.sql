-- CLI Analytics table for PostgreSQL
CREATE TABLE IF NOT EXISTS cli_analytics (
    id SERIAL PRIMARY KEY,
    event TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    os TEXT,
    os_version TEXT,
    node_version TEXT,
    cli_version TEXT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Command-specific fields
    duration INTEGER,
    success BOOLEAN,
    file_type TEXT,
    error_message TEXT,
    options JSONB -- PostgreSQL JSON for command options
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cli_analytics_machine_id ON cli_analytics (machine_id);
CREATE INDEX IF NOT EXISTS idx_cli_analytics_event ON cli_analytics (event);
CREATE INDEX IF NOT EXISTS idx_cli_analytics_timestamp ON cli_analytics (timestamp);
