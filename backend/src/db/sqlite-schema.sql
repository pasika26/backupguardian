-- BackupGuardian Database Schema (SQLite version for testing)
-- Created: 2025-06-26

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL, -- 'sql', 'dump', 'custom'
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    database_name TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Test runs table
CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    backup_id TEXT NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    duration_seconds INTEGER,
    error_message TEXT,
    docker_container_id TEXT,
    test_database_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    test_run_id TEXT NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL, -- 'restore_success', 'table_count', 'row_count', 'schema_validation', 'data_sampling'
    status TEXT NOT NULL, -- 'passed', 'failed', 'warning'
    expected_value TEXT,
    actual_value TEXT,
    error_details TEXT,
    execution_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_backups_user_id ON backups(user_id);
CREATE INDEX IF NOT EXISTS idx_backups_upload_date ON backups(upload_date);
CREATE INDEX IF NOT EXISTS idx_test_runs_backup_id ON test_runs(backup_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_user_id ON test_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
CREATE INDEX IF NOT EXISTS idx_test_runs_started_at ON test_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_test_results_test_run_id ON test_results(test_run_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_type ON test_results(test_type);
