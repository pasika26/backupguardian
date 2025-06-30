const fs = require('fs');
const path = require('path');
const { run } = require('./sqlite-connection');

async function runMigration() {
  try {
    console.log('Starting SQLite database migration...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'sqlite-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await run(statement);
      }
    }
    
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
