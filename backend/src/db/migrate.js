const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function runMigration() {
  try {
    console.log('Starting database migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully');
    console.log('Tables created: users, backups, test_runs, test_results');
    
  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
