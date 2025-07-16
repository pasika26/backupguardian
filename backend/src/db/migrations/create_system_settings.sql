-- Create system_settings table for admin configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    category VARCHAR(100) NOT NULL,
    is_editable BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_editable) VALUES 
-- File Upload Settings
('max_file_size_mb', '500', 'number', 'Maximum backup file size in megabytes', 'file_upload', true),
('allowed_file_types', '["sql", "dump", "backup", "tar", "gz", "zip"]', 'json', 'Allowed file extensions for backup uploads', 'file_upload', true),
('storage_cleanup_days', '30', 'number', 'Days to keep uploaded files before cleanup', 'file_upload', true),

-- Test Execution Settings  
('test_timeout_minutes', '15', 'number', 'Maximum time for test execution in minutes', 'test_execution', true),
('max_concurrent_tests', '3', 'number', 'Maximum number of concurrent test executions', 'test_execution', true),
('docker_container_timeout', '10', 'number', 'Docker container startup timeout in minutes', 'test_execution', true),

-- Database Cleanup Settings
('cleanup_temp_files_hours', '24', 'number', 'Hours to keep temporary test files', 'database_cleanup', true),
('cleanup_failed_tests_days', '7', 'number', 'Days to keep failed test data', 'database_cleanup', true),
('cleanup_logs_days', '14', 'number', 'Days to keep system logs', 'database_cleanup', true),

-- Security Settings
('session_timeout_hours', '24', 'number', 'User session timeout in hours', 'security', true),
('rate_limit_per_minute', '60', 'number', 'API requests per minute per user', 'security', true),

-- System Info (read-only)
('system_version', '1.0.0', 'string', 'Current system version', 'system', false),
('installation_date', CURRENT_TIMESTAMP::text, 'string', 'System installation date', 'system', false);

-- Create trigger to update timestamp
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_system_settings_timestamp
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_timestamp();
