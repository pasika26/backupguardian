const BackupValidator = require('./src/services/backup-validator');
const fs = require('fs').promises;
const path = require('path');

async function createTestBackupFiles() {
  const testDir = path.join(__dirname, 'test-backups');
  
  // Ensure test directory exists
  try {
    await fs.access(testDir);
  } catch {
    await fs.mkdir(testDir, { recursive: true });
  }

  // Create a valid SQL backup
  const validSqlContent = `
-- Valid test backup
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert test data
INSERT INTO users (username, email) VALUES
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com'),
    ('charlie', 'charlie@example.com');

INSERT INTO posts (user_id, title, content, published) VALUES
    (1, 'First Post', 'This is Alice''s first post', true),
    (2, 'Bob''s Thoughts', 'Some thoughts from Bob', true),
    (1, 'Draft Post', 'This is a draft', false),
    (3, 'Charlie''s Update', 'Update from Charlie', true);

-- Create an index
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_published ON posts(published);
`;

  // Create an invalid SQL backup (syntax error)
  const invalidSqlContent = `
-- Invalid test backup with syntax errors
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This will cause a syntax error
INSERT INTO users (username, email) VALUES
    ('alice', 'alice@example.com',  -- Missing closing parenthesis
    ('bob', 'bob@example.com');

-- This table references a non-existent column
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(nonexistent_column),
    title VARCHAR(200) NOT NULL
);
`;

  const validBackupPath = path.join(testDir, 'valid-backup.sql');
  const invalidBackupPath = path.join(testDir, 'invalid-backup.sql');

  await fs.writeFile(validBackupPath, validSqlContent);
  await fs.writeFile(invalidBackupPath, invalidSqlContent);

  return {
    validBackupPath,
    invalidBackupPath,
    testDir
  };
}

async function testBackupValidator() {
  const validator = new BackupValidator();
  
  console.log('🔍 Testing Backup Validator...\n');
  
  let testFiles = null;
  
  try {
    // Create test backup files
    console.log('1. Creating test backup files...');
    testFiles = await createTestBackupFiles();
    console.log('✅ Test backup files created');
    console.log(`   Valid backup: ${testFiles.validBackupPath}`);
    console.log(`   Invalid backup: ${testFiles.invalidBackupPath}\n`);

    // Test single valid backup validation
    console.log('2. Testing valid backup validation...');
    const validResult = await validator.validateBackup(testFiles.validBackupPath);
    
    console.log('📊 Valid Backup Result:');
    console.log(`   Success: ${validResult.success}`);
    console.log(`   Duration: ${validResult.duration}ms`);
    console.log(`   Test ID: ${validResult.testId}`);
    console.log(`   Tables: ${validResult.databaseInfo.tableCount}`);
    console.log(`   Has Data: ${validResult.databaseInfo.hasData}`);
    console.log(`   File Size: ${validResult.fileInfo.size} bytes`);
    console.log(`   Errors: ${validResult.errors.length}`);
    
    if (validResult.errors.length > 0) {
      console.log(`   Error Details: ${validResult.errors.join('; ')}`);
    }
    
    console.log('   Stages:');
    for (const [stage, details] of Object.entries(validResult.stages)) {
      console.log(`     ${stage}: ${details.success ? '✅' : '❌'} (${details.duration}ms)`);
      if (details.error) {
        console.log(`       Error: ${details.error}`);
      }
    }
    
    console.log();

    // Test single invalid backup validation
    console.log('3. Testing invalid backup validation...');
    const invalidResult = await validator.validateBackup(testFiles.invalidBackupPath);
    
    console.log('📊 Invalid Backup Result:');
    console.log(`   Success: ${invalidResult.success}`);
    console.log(`   Duration: ${invalidResult.duration}ms`);
    console.log(`   Test ID: ${invalidResult.testId}`);
    console.log(`   Errors: ${invalidResult.errors.length}`);
    
    if (invalidResult.errors.length > 0) {
      console.log(`   Error Details: ${invalidResult.errors.slice(0, 2).join('; ')}`);
    }
    
    console.log();

    // Test multiple backups validation
    console.log('4. Testing multiple backups validation...');
    const multipleResults = await validator.validateMultipleBackups([
      testFiles.validBackupPath,
      testFiles.invalidBackupPath
    ]);
    
    console.log('📊 Multiple Backups Results:');
    console.log(`   Total files: ${multipleResults.length}`);
    console.log(`   Successful: ${multipleResults.filter(r => r.success).length}`);
    console.log(`   Failed: ${multipleResults.filter(r => !r.success).length}`);
    
    // Get summary
    const summary = validator.getValidationSummary(multipleResults);
    console.log('\n📈 Validation Summary:');
    console.log(`   Success Rate: ${summary.successRate}%`);
    console.log(`   Average Duration: ${summary.avgDuration}ms`);
    console.log(`   File Types: ${JSON.stringify(summary.fileTypes)}`);
    
    console.log('\n🎉 Backup Validator test completed successfully!');
    
  } catch (error) {
    console.error('❌ Backup Validator test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // Cleanup test files
    if (testFiles) {
      console.log('\n🧹 Cleaning up test files...');
      try {
        await fs.unlink(testFiles.validBackupPath);
        await fs.unlink(testFiles.invalidBackupPath);
        await fs.rmdir(testFiles.testDir);
        console.log('✅ Test files cleaned up');
      } catch (error) {
        console.log(`⚠️  Cleanup warning: ${error.message}`);
      }
    }
    
    // Emergency cleanup of any remaining containers
    console.log('🧹 Performing emergency cleanup...');
    await validator.emergencyCleanup();
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
    console.error('Visit: https://docs.docker.com/get-docker/');
    return false;
  }
}

async function main() {
  const dockerAvailable = await checkDocker();
  if (dockerAvailable) {
    await testBackupValidator();
  }
}

main().catch(console.error);
