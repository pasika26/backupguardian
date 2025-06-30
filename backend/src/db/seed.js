const bcrypt = require('bcryptjs');
const { pool } = require('./connection');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Hash password for dummy users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Insert dummy users
    const users = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
      VALUES 
        ('john.doe@example.com', $1, 'John', 'Doe', true),
        ('jane.smith@example.com', $1, 'Jane', 'Smith', true),
        ('test.user@example.com', $1, 'Test', 'User', false)
      RETURNING id, email, first_name, last_name;
    `, [passwordHash]);
    
    console.log('✅ Users created:', users.rows.length);
    
    const userId1 = users.rows[0].id;
    const userId2 = users.rows[1].id;
    const userId3 = users.rows[2].id;
    
    // Insert dummy backups
    const backups = await pool.query(`
      INSERT INTO backups (user_id, file_name, file_path, file_size, file_type, database_name, description)
      VALUES 
        ($1, 'production_backup_2025-06-26.sql', '/uploads/prod_backup.sql', 1024000, 'sql', 'production_db', 'Daily production backup'),
        ($1, 'staging_backup.dump', '/uploads/staging.dump', 512000, 'dump', 'staging_db', 'Staging environment backup'),
        ($2, 'customer_data_backup.sql', '/uploads/customer.sql', 2048000, 'sql', 'customer_db', 'Customer database backup'),
        ($3, 'test_backup_small.sql', '/uploads/test_small.sql', 256000, 'sql', 'test_db', 'Small test backup for validation')
      RETURNING id, file_name, user_id;
    `, [userId1, userId2, userId3]);
    
    console.log('✅ Backups created:', backups.rows.length);
    
    const backupId1 = backups.rows[0].id;
    const backupId2 = backups.rows[1].id;
    const backupId3 = backups.rows[2].id;
    const backupId4 = backups.rows[3].id;
    
    // Insert dummy test runs
    const testRuns = await pool.query(`
      INSERT INTO test_runs (backup_id, user_id, status, started_at, completed_at, duration_seconds, test_database_name)
      VALUES 
        ($1, $2, 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', 300, 'test_db_1'),
        ($3, $4, 'completed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '55 minutes', 280, 'test_db_2'),
        ($5, $6, 'failed', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '28 minutes', 120, 'test_db_3'),
        ($7, $8, 'running', NOW() - INTERVAL '5 minutes', NULL, NULL, 'test_db_4'),
        ($9, $10, 'pending', NOW(), NULL, NULL, NULL)
      RETURNING id, backup_id, status;
    `, [
      backupId1, userId1,  // Test run 1
      backupId2, userId1,  // Test run 2  
      backupId3, userId2,  // Test run 3
      backupId4, userId3,  // Test run 4
      backupId1, userId1   // Test run 5
    ]);
    
    console.log('✅ Test runs created:', testRuns.rows.length);
    
    const testRunId1 = testRuns.rows[0].id;
    const testRunId2 = testRuns.rows[1].id;
    const testRunId3 = testRuns.rows[2].id;
    
    // Insert dummy test results
    const testResults = await pool.query(`
      INSERT INTO test_results (test_run_id, test_type, status, expected_value, actual_value, execution_time_ms)
      VALUES 
        ($1, 'restore_success', 'passed', 'success', 'success', 2500),
        ($1, 'table_count', 'passed', '15', '15', 150),
        ($1, 'row_count', 'passed', '50000', '50000', 800),
        ($1, 'schema_validation', 'passed', 'valid', 'valid', 300),
        
        ($2, 'restore_success', 'passed', 'success', 'success', 2200),
        ($2, 'table_count', 'passed', '8', '8', 120),
        ($2, 'row_count', 'warning', '25000', '24999', 650),
        
        ($3, 'restore_success', 'failed', 'success', 'error', 1200),
        ($3, 'table_count', 'failed', '12', 'error', 100)
      RETURNING id, test_run_id, test_type, status;
    `, [testRunId1, testRunId2, testRunId3]);
    
    console.log('✅ Test results created:', testResults.rows.length);
    
    // Display summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${users.rows.length}`);
    console.log(`- Backups: ${backups.rows.length}`);
    console.log(`- Test Runs: ${testRuns.rows.length}`);
    console.log(`- Test Results: ${testResults.rows.length}`);
    
    return {
      users: users.rows,
      backups: backups.rows,
      testRuns: testRuns.rows,
      testResults: testResults.rows
    };
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding error:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
