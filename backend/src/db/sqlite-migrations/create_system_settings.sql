-- Create system_settings table for admin configuration (SQLite version)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL, -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    category TEXT NOT NULL,
    is_editable INTEGER DEFAULT 1, -- SQLite doesn't have boolean
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description, category, is_editable) VALUES 
-- File Upload Settings
('max_file_size_mb', '500', 'number', 'Maximum backup file size in megabytes', 'file_upload', 1),
('allowed_file_types', '["sql", "dump", "backup", "tar", "gz", "zip"]', 'json', 'Allowed file extensions for backup uploads', 'file_upload', 1),
('storage_cleanup_days', '30', 'number', 'Days to keep uploaded files before cleanup', 'file_upload', 1),

-- Test Execution Settings  
('test_timeout_minutes', '15', 'number', 'Maximum time for test execution in minutes', 'test_execution', 1),
('max_concurrent_tests', '3', 'number', 'Maximum number of concurrent test executions', 'test_execution', 1),
('docker_container_timeout', '10', 'number', 'Docker container startup timeout in minutes', 'test_execution', 1),

-- Database Cleanup Settings
('cleanup_temp_files_hours', '24', 'number', 'Hours to keep temporary test files', 'database_cleanup', 1),
('cleanup_failed_tests_days', '7', 'number', 'Days to keep failed test data', 'database_cleanup', 1),
('cleanup_logs_days', '14', 'number', 'Days to keep system logs', 'database_cleanup', 1),

-- Security Settings
('session_timeout_hours', '24', 'number', 'User session timeout in hours', 'security', 1),
('rate_limit_per_minute', '60', 'number', 'API requests per minute per user', 'security', 1),

-- System Info (read-only)
('system_version', '1.0.0', 'string', 'Current system version', 'system', 0),
('installation_date', datetime('now'), 'string', 'System installation date', 'system', 0);

-- Create trigger to update timestamp (SQLite version)
CREATE TRIGGER IF NOT EXISTS update_system_settings_timestamp
    AFTER UPDATE ON system_settings
    FOR EACH ROW
BEGIN
    UPDATE system_settings SET updated_at = datetime('now') WHERE id = NEW.id;
END;
