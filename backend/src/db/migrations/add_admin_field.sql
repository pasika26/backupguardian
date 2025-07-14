-- Add is_admin field to users table
ALTER TABLE users 
ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Create index for faster admin queries
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- Set the first user as admin (you can modify this email)
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'admin@backupguardian.com'
LIMIT 1;
