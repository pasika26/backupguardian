CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email) VALUES ('test@example.com');
INSERT INTO users (email) VALUES ('admin@example.com');

CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    title TEXT,
    content TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
