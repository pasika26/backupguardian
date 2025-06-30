const DockerRunner = require('./src/services/docker-runner');
const RestoreAutomation = require('./src/services/restore-automation');
const fs = require('fs').promises;
const path = require('path');

async function createTestBackupFile() {
  const testSqlContent = `
-- Test backup file for BackupGuardian
CREATE TABLE test_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_users (username, email) VALUES
    ('john_doe', 'john@example.com'),
    ('jane_smith', 'jane@example.com'),
    ('bob_wilson', 'bob@example.com');

CREATE TABLE test_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES test_users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_posts (user_id, title, content) VALUES
    (1, 'First Post', 'This is the first test post'),
    (2, 'Second Post', 'This is another test post'),
    (1, 'Third Post', 'John posts again');
`;

  const testBackupPath = path.join(__dirname, 'test-backup.sql');
  await fs.writeFile(testBackupPath, testSqlContent);
  return testBackupPath;
}

async function testRestoreAutomation() {
  const runner = new DockerRunner();
  const restoreAutomation = new RestoreAutomation();
  const testId = `restore-test-${Date.now()}`;
  
  console.log('🔄 Testing Restore Automation...');
  
  let container = null;
  let testBackupPath = null;
  
  try {
    // Create test backup file
    console.log('\n1. Creating test backup file...');
    testBackupPath = await createTestBackupFile();
    console.log('✅ Test backup file created:', testBackupPath);
    
    // Create test container
    console.log('\n2. Creating test container...');
    container = await runner.createContainer(testId);
    console.log('✅ Container created:', container.containerName);
    
    // Execute restore
    console.log('\n3. Executing restore...');
    const restoreResult = await restoreAutomation.executeRestore(
      testBackupPath,
      container.connectionInfo,
      container.containerName
    );
    
    console.log('📊 Restore Result:');
    console.log(`   Success: ${restoreResult.success}`);
    console.log(`   Duration: ${restoreResult.duration}ms`);
    console.log(`   File Type: ${restoreResult.fileType}`);
    console.log(`   Output: ${restoreResult.output.substring(0, 200)}...`);
    
    if (restoreResult.error) {
      console.log(`   Error: ${restoreResult.error}`);
    }
    
    // Validate restored database
    if (restoreResult.success) {
      console.log('\n4. Validating restored database...');
      const validation = await restoreAutomation.validateRestoredDatabase(
        container.connectionInfo,
        container.containerName
      );
      
      console.log('📊 Database Validation:');
      console.log(`   Table Count: ${validation.tableCount}`);
      console.log(`   Has Data: ${validation.hasData}`);
      console.log(`   Errors: ${validation.errors.length}`);
      
      if (validation.errors.length > 0) {
        console.log(`   Error Details: ${validation.errors.join(', ')}`);
      }
    }
    
    console.log('\n🎉 Restore Automation test completed!');
    
  } catch (error) {
    console.error('❌ Restore Automation test failed:', error.message);
    throw error;
  } finally {
    // Cleanup
    if (container) {
      console.log('\n🧹 Cleaning up container...');
      await runner.removeContainer(container.containerName);
    }
    
    if (testBackupPath) {
      console.log('🧹 Cleaning up test backup file...');
      await restoreAutomation.cleanupTempFile(testBackupPath);
    }
  }
}

// Check if Docker is available first
async function checkDocker() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync('docker --version');
    console.log('✅ Docker is available');
    return true;
  } catch (error) {
    console.error('❌ Docker is not available. Please install Docker first.');
    return false;
  }
}

async function main() {
  const dockerAvailable = await checkDocker();
  if (dockerAvailable) {
    await testRestoreAutomation();
  }
}

main().catch(console.error);
