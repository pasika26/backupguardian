-- Test file for structural validation

-- 1. Good CREATE TABLE (should pass)
CREATE TABLE good_table (
    id INT PRIMARY KEY,
    name VARCHAR(50)
);

-- 2. Missing closing parenthesis (should fail)
CREATE TABLE bad_table (
    id INT,
    name VARCHAR(50)
-- Missing closing parenthesis and semicolon

-- 3. Missing semicolon on complete statement (should fail) 
DROP TABLE IF EXISTS test_table

-- 4. Unclosed parentheses in INSERT (should fail)
INSERT INTO good_table (id, name) VALUES (1, 'test'
-- Missing closing parenthesis

-- 5. Good statement (should pass)
INSERT INTO good_table (id, name) VALUES (2, 'good');
