#!/usr/bin/env node

/**
 * CLI Analytics Table Creator
 * Creates cli_analytics table in production PostgreSQL
 */

const { Pool } = require('pg');

async function createCliAnalyticsTable() {
  console.log('🔄 Creating CLI analytics table...');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  let client;

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Check if table already exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'cli_analytics'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  cli_analytics table already exists');
      return;
    }

    // Create table
    console.log('📄 Creating cli_analytics table...');
    await client.query(`
      CREATE TABLE cli_analytics (
          id SERIAL PRIMARY KEY,
          event TEXT NOT NULL,
          machine_id TEXT NOT NULL,
          os TEXT,
          os_version TEXT,
          node_version TEXT,
          cli_version TEXT,
          timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          -- Command-specific fields
          duration INTEGER,
          success BOOLEAN,
          file_type TEXT,
          error_message TEXT,
          options JSONB
      );
    `);

    // Create indexes
    console.log('📊 Creating indexes...');
    await client.query(`
      CREATE INDEX idx_cli_analytics_machine_id ON cli_analytics (machine_id);
    `);
    await client.query(`
      CREATE INDEX idx_cli_analytics_event ON cli_analytics (event);
    `);
    await client.query(`
      CREATE INDEX idx_cli_analytics_timestamp ON cli_analytics (timestamp);
    `);

    console.log('✅ CLI analytics table created successfully!');

  } catch (error) {
    console.error('❌ Failed to create table:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createCliAnalyticsTable();
