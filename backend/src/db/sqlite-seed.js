const bcrypt = require('bcryptjs');
const { query } = require('./sqlite-connection');

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Hash password for dummy users
    const passwordHash = await bcrypt.hash('password123', 10);
    
    // Generate user IDs
    const userId1 = generateId();
    const userId2 = generateId();
    const userId3 = generateId();
    
    // Insert dummy users
    await query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, email_verified)
      VALUES 
        (?, 'john.doe@example.com', ?, 'John', 'Doe', 1),
        (?, 'jane.smith@example.com', ?, 'Jane', 'Smith', 1),
        (?, 'test.user@example.com', ?, 'Test', 'User', 0)
    `, [userId1, passwordHash, userId2, passwordHash, userId3, passwordHash]);
    
    console.log('✅ Users created: 3');
    
    // Generate backup IDs
    const backupId1 = generateId();
    const backupId2 = generateId();
    const backupId3 = generateId();
    const backupId4 = generateId();
    
    // Insert dummy backups
    await query(`
      INSERT INTO backups (id, user_id, file_name, file_path, file_size, file_type, database_name, description)
      VALUES 
        (?, ?, 'production_backup_2025-06-26.sql', '/uploads/prod_backup.sql', 1024000, 'sql', 'production_db', 'Daily production backup'),
        (?, ?, 'staging_backup.dump', '/uploads/staging.dump', 512000, 'dump', 'staging_db', 'Staging environment backup'),
        (?, ?, 'customer_data_backup.sql', '/uploads/customer.sql', 2048000, 'sql', 'customer_db', 'Customer database backup'),
        (?, ?, 'test_backup_small.sql', '/uploads/test_small.sql', 256000, 'sql', 'test_db', 'Small test backup for validation')
    `, [backupId1, userId1, backupId2, userId1, backupId3, userId2, backupId4, userId3]);
    
    console.log('✅ Backups created: 4');
    
    // Generate test run IDs
    const testRunId1 = generateId();
    const testRunId2 = generateId();
    const testRunId3 = generateId();
    const testRunId4 = generateId();
    const testRunId5 = generateId();
    
    // Insert dummy test runs
    await query(`
      INSERT INTO test_runs (id, backup_id, user_id, status, started_at, completed_at, duration_seconds, test_database_name)
      VALUES 
        (?, ?, ?, 'completed', datetime('now', '-2 hours'), datetime('now', '-1 hour -55 minutes'), 300, 'test_db_1'),
        (?, ?, ?, 'completed', datetime('now', '-1 hour'), datetime('now', '-55 minutes'), 280, 'test_db_2'),
        (?, ?, ?, 'failed', datetime('now', '-30 minutes'), datetime('now', '-28 minutes'), 120, 'test_db_3'),
        (?, ?, ?, 'running', datetime('now', '-5 minutes'), NULL, NULL, 'test_db_4'),
        (?, ?, ?, 'pending', datetime('now'), NULL, NULL, NULL)
    `, [
      testRunId1, backupId1, userId1,
      testRunId2, backupId2, userId1,
      testRunId3, backupId3, userId2,
      testRunId4, backupId4, userId3,
      testRunId5, backupId1, userId1
    ]);
    
    console.log('✅ Test runs created: 5');
    
    // Insert dummy test results
    await query(`
      INSERT INTO test_results (test_run_id, test_type, status, expected_value, actual_value, execution_time_ms)
      VALUES 
        (?, 'restore_success', 'passed', 'success', 'success', 2500),
        (?, 'table_count', 'passed', '15', '15', 150),
        (?, 'row_count', 'passed', '50000', '50000', 800),
        (?, 'schema_validation', 'passed', 'valid', 'valid', 300),
        
        (?, 'restore_success', 'passed', 'success', 'success', 2200),
        (?, 'table_count', 'passed', '8', '8', 120),
        (?, 'row_count', 'warning', '25000', '24999', 650),
        
        (?, 'restore_success', 'failed', 'success', 'error', 1200),
        (?, 'table_count', 'failed', '12', 'error', 100)
    `, [
      testRunId1, testRunId1, testRunId1, testRunId1,
      testRunId2, testRunId2, testRunId2,
      testRunId3, testRunId3
    ]);
    
    console.log('✅ Test results created: 9');
    
    // Display summary
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log('- Users: 3');
    console.log('- Backups: 4');
    console.log('- Test Runs: 5');
    console.log('- Test Results: 9');
    
    return {
      users: 3,
      backups: 4,
      testRuns: 5,
      testResults: 9
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
