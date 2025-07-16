-- Backup with data integrity issues
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2) NOT NULL CHECK (total > 0),
    status VARCHAR(20) DEFAULT 'pending'
);

-- Insert valid data first
INSERT INTO users (username, email) VALUES
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com');

INSERT INTO orders (user_id, total, status) VALUES
    (1, 50.00, 'completed'),
    (2, 25.50, 'pending');

-- Now insert data that violates constraints
INSERT INTO users (username, email) VALUES
    ('john_doe', 'different@email.com'),  -- Duplicate username
    ('another_user', 'john@example.com'); -- Duplicate email

-- Insert orders with invalid data
INSERT INTO orders (user_id, total, status) VALUES
    (999, 100.00, 'completed'),  -- user_id 999 doesn't exist
    (1, -50.00, 'completed'),    -- negative total violates CHECK constraint
    (2, 0, 'invalid_status');    -- total = 0 violates CHECK, invalid status

-- Create invalid constraints
ALTER TABLE orders ADD CONSTRAINT invalid_check CHECK (total < 0);
