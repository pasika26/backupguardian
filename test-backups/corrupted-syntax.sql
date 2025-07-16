-- Corrupted SQL backup with syntax errors
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL
    -- Missing closing parenthesis and semicolon

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    user_id INTEGER REFERENCES users(id)
);

-- Invalid SQL statement
INSERT INTO users (username, email) VALUES
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com'
    -- Missing closing parenthesis

-- Syntax error in INSERT
INSERT INTO products (name, price, user_id) VALUES
    ('Product 1', 19.99, 1),
    ('Product 2', INVALID_VALUE, 2);

-- Incomplete statement
ALTER TABLE users ADD COLUMN
