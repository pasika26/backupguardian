#!/usr/bin/env node

/**
 * Production Migration Runner
 * Safely runs database migrations in production
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🔄 Starting production migration...');
  
  // Verify DATABASE_URL is available
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Railway uses external proxy
  });

  let client;

  try {
    // Connect to database
    console.log('🔌 Connecting to PostgreSQL...');
    client = await pool.connect();
    console.log('✅ Connected to database');

    // Check if table already exists
    console.log('🔍 Checking if system_settings table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_settings'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('ℹ️  system_settings table already exists, skipping migration');
      console.log('✅ Migration completed (no changes needed)');
      return;
    }

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationPath = path.join(__dirname, 'src/db/migrations/create_system_settings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');

    // Execute migration
    console.log('⚡ Executing migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify table creation
    console.log('🔍 Verifying table creation...');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as setting_count FROM system_settings;
    `);
    
    const settingCount = parseInt(verifyResult.rows[0].setting_count);
    console.log(`✅ Table created with ${settingCount} default settings`);

    // Test settings service compatibility
    console.log('🧪 Testing settings service compatibility...');
    const testQuery = await client.query(`
      SELECT setting_key, setting_value, setting_type, category 
      FROM system_settings 
      WHERE setting_key = 'max_file_size_mb'
    `);
    
    if (testQuery.rows.length > 0) {
      console.log('✅ Settings service compatibility verified');
      console.log(`📋 Sample setting: ${testQuery.rows[0].setting_key} = ${testQuery.rows[0].setting_value}`);
    }

    console.log('');
    console.log('🎉 Migration completed successfully!');
    console.log('🚀 Production system should now be functional');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };
