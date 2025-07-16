-- Corrupted backup with missing table references
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id), -- customers table doesn't exist
    product_id INTEGER REFERENCES products(id),   -- products table doesn't exist
    quantity INTEGER NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data that will fail due to missing referenced tables
INSERT INTO orders (customer_id, product_id, quantity) VALUES
    (1, 1, 2),
    (2, 3, 1),
    (1, 2, 5);

-- Create a table that references non-existent column
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(non_existent_column),
    item_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Foreign key constraint that will fail
ALTER TABLE orders ADD CONSTRAINT fk_invalid 
    FOREIGN KEY (customer_id) REFERENCES missing_table(id);
