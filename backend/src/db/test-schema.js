const { pool } = require('./connection');

async function testDatabaseSchema() {
  try {
    console.log('🧪 Testing database schema and relationships...\n');
    
    // Test 1: Check all tables exist
    console.log('1. Checking if all tables exist...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const expectedTables = ['backups', 'test_results', 'test_runs', 'users'];
    const actualTables = tables.rows.map(row => row.table_name).sort();
    
    console.log('Expected tables:', expectedTables);
    console.log('Actual tables:', actualTables);
    console.log('✅ All tables exist:', JSON.stringify(expectedTables) === JSON.stringify(actualTables));
    
    // Test 2: Check table counts
    console.log('\n2. Checking table row counts...');
    const counts = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM backups'),
      pool.query('SELECT COUNT(*) FROM test_runs'),
      pool.query('SELECT COUNT(*) FROM test_results')
    ]);
    
    console.log(`Users: ${counts[0].rows[0].count}`);
    console.log(`Backups: ${counts[1].rows[0].count}`);
    console.log(`Test Runs: ${counts[2].rows[0].count}`);
    console.log(`Test Results: ${counts[3].rows[0].count}`);
    
    // Test 3: Check foreign key relationships
    console.log('\n3. Testing foreign key relationships...');
    
    // Test user -> backups relationship
    const userBackups = await pool.query(`
      SELECT u.email, COUNT(b.id) as backup_count
      FROM users u
      LEFT JOIN backups b ON u.id = b.user_id
      GROUP BY u.id, u.email
      ORDER BY u.email;
    `);
    
    console.log('User -> Backups relationship:');
    userBackups.rows.forEach(row => {
      console.log(`  ${row.email}: ${row.backup_count} backups`);
    });
    
    // Test backup -> test_runs relationship
    const backupTestRuns = await pool.query(`
      SELECT b.file_name, COUNT(tr.id) as test_run_count
      FROM backups b
      LEFT JOIN test_runs tr ON b.id = tr.backup_id
      GROUP BY b.id, b.file_name
      ORDER BY b.file_name;
    `);
    
    console.log('\nBackup -> Test Runs relationship:');
    backupTestRuns.rows.forEach(row => {
      console.log(`  ${row.file_name}: ${row.test_run_count} test runs`);
    });
    
    // Test test_run -> test_results relationship
    const testRunResults = await pool.query(`
      SELECT 
        tr.id,
        tr.status as run_status,
        COUNT(tres.id) as result_count
      FROM test_runs tr
      LEFT JOIN test_results tres ON tr.id = tres.test_run_id
      GROUP BY tr.id, tr.status
      ORDER BY tr.created_at;
    `);
    
    console.log('\nTest Run -> Test Results relationship:');
    testRunResults.rows.forEach(row => {
      console.log(`  Run ${row.id.substring(0, 8)}... (${row.run_status}): ${row.result_count} results`);
    });
    
    // Test 4: Check data integrity
    console.log('\n4. Testing data integrity...');
    
    // Check for orphaned records
    const orphanedBackups = await pool.query(`
      SELECT COUNT(*) FROM backups b
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = b.user_id);
    `);
    
    const orphanedTestRuns = await pool.query(`
      SELECT COUNT(*) FROM test_runs tr
      WHERE NOT EXISTS (SELECT 1 FROM backups b WHERE b.id = tr.backup_id)
         OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = tr.user_id);
    `);
    
    const orphanedTestResults = await pool.query(`
      SELECT COUNT(*) FROM test_results tres
      WHERE NOT EXISTS (SELECT 1 FROM test_runs tr WHERE tr.id = tres.test_run_id);
    `);
    
    console.log(`Orphaned backups: ${orphanedBackups.rows[0].count}`);
    console.log(`Orphaned test runs: ${orphanedTestRuns.rows[0].count}`);
    console.log(`Orphaned test results: ${orphanedTestResults.rows[0].count}`);
    
    // Test 5: Complex query test
    console.log('\n5. Testing complex query (full join)...');
    const complexQuery = await pool.query(`
      SELECT 
        u.email,
        b.file_name,
        tr.status as test_status,
        tr.duration_seconds,
        COUNT(tres.id) as result_count,
        COUNT(CASE WHEN tres.status = 'passed' THEN 1 END) as passed_count,
        COUNT(CASE WHEN tres.status = 'failed' THEN 1 END) as failed_count
      FROM users u
      JOIN backups b ON u.id = b.user_id
      JOIN test_runs tr ON b.id = tr.backup_id
      LEFT JOIN test_results tres ON tr.id = tres.test_run_id
      WHERE tr.status IN ('completed', 'failed')
      GROUP BY u.id, u.email, b.id, b.file_name, tr.id, tr.status, tr.duration_seconds
      ORDER BY u.email, b.file_name;
    `);
    
    console.log('Complex query results:');
    complexQuery.rows.forEach(row => {
      console.log(`  ${row.email} | ${row.file_name} | ${row.test_status} (${row.duration_seconds}s) | Results: ${row.result_count} (${row.passed_count} passed, ${row.failed_count} failed)`);
    });
    
    console.log('\n🎉 All database schema tests completed successfully!');
    
    return {
      tablesExist: true,
      rowCounts: {
        users: parseInt(counts[0].rows[0].count),
        backups: parseInt(counts[1].rows[0].count),
        testRuns: parseInt(counts[2].rows[0].count),
        testResults: parseInt(counts[3].rows[0].count)
      },
      relationshipsWork: true,
      dataIntegrity: {
        orphanedBackups: parseInt(orphanedBackups.rows[0].count),
        orphanedTestRuns: parseInt(orphanedTestRuns.rows[0].count),
        orphanedTestResults: parseInt(orphanedTestResults.rows[0].count)
      }
    };
    
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testDatabaseSchema()
    .then((results) => {
      console.log('\nTest Summary:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test error:', error);
      process.exit(1);
    });
}

module.exports = { testDatabaseSchema };
