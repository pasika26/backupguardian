-- Invalid character encoding test
CREATE TABLE test_table (
    id SERIAL PRIMARY KEY,
    data TEXT NOT NULL
);

-- Invalid UTF-8 sequences and special characters
INSERT INTO test_table (data) VALUES 
    ('Valid text'),
    ('������������'), -- Invalid byte sequences
    ('Test with €£¥ valid unicode'),
    ('�����������'); -- More invalid sequences

-- Mixed valid and invalid content
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    bio TEXT
);

INSERT INTO users (name, bio) VALUES
    ('John Doe', 'Normal bio text'),
    ('Jane Smith', '����Invalid encoding here����'),
    ('Bob Wilson', 'Another normal entry');
