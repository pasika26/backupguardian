-- CLI Analytics table
CREATE TABLE IF NOT EXISTS cli_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event TEXT NOT NULL,
    machine_id TEXT NOT NULL,
    os TEXT,
    os_version TEXT,
    node_version TEXT,
    cli_version TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Command-specific fields
    duration INTEGER,
    success BOOLEAN,
    file_type TEXT,
    error_message TEXT,
    options TEXT, -- JSON string of command options
    
    -- Indexes for better query performance
    INDEX idx_machine_id (machine_id),
    INDEX idx_event (event),
    INDEX idx_timestamp (timestamp)
);
