const CleanupService = require('./src/services/cleanup-service');
const fs = require('fs').promises;
const path = require('path');

async function createTestTempFiles() {
  const tempDir = path.join(__dirname, 'test-temp');
  
  // Ensure temp directory exists
  try {
    await fs.access(tempDir);
  } catch {
    await fs.mkdir(tempDir, { recursive: true });
  }

  const tempFiles = [];
  
  // Create some test temp files
  for (let i = 1; i <= 3; i++) {
    const tempFile = path.join(tempDir, `temp-file-${i}.txt`);
    await fs.writeFile(tempFile, `Test temp file ${i} content`);
    tempFiles.push(tempFile);
  }

  return { tempDir, tempFiles };
}

async function testCleanupService() {
  const cleanup = new CleanupService();
  
  console.log('🧹 Testing Cleanup Service...\n');
  
  let testFiles = null;
  
  try {
    // Test 1: Create temp files and test cleanup
    console.log('1. Testing temp file cleanup...');
    testFiles = await createTestTempFiles();
    console.log(`✅ Created ${testFiles.tempFiles.length} test temp files`);
    
    const validationContext = {
      containerName: null, // No container for this test
      tempFiles: testFiles.tempFiles
    };
    
    const cleanupResult = await cleanup.cleanupAfterValidation(validationContext);
    
    console.log('📊 Cleanup Result:');
    console.log(`   Containers Removed: ${cleanupResult.containersRemoved}`);
    console.log(`   Temp Files Deleted: ${cleanupResult.tempFilesDeleted}`);
    console.log(`   Duration: ${cleanupResult.duration}ms`);
    console.log(`   Errors: ${cleanupResult.errors.length}`);
    
    if (cleanupResult.errors.length > 0) {
      console.log(`   Error Details: ${cleanupResult.errors.join('; ')}`);
    }

    // Test 2: Test cleanup stats
    console.log('\n2. Testing cleanup statistics...');
    const stats = await cleanup.getCleanupStats();
    
    console.log('📈 Cleanup Stats:');
    console.log(`   Running Containers: ${stats.runningContainers}`);
    console.log(`   Total Containers: ${stats.totalContainers}`);
    console.log(`   Memory Usage: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Uptime: ${Math.round(stats.uptime)}s`);
    console.log(`   Timestamp: ${stats.timestamp}`);

    // Test 3: Test scheduled cleanup (dry run)
    console.log('\n3. Testing scheduled cleanup (safe dry run)...');
    const scheduledResult = await cleanup.scheduledCleanup({
      maxTestRunAge: 365, // Very old - won't delete anything recent
      maxTempFileAge: 365,
      maxContainerAge: 24
    });
    
    console.log('📊 Scheduled Cleanup Result:');
    console.log(`   Database Records Expired: ${scheduledResult.databaseRecordsExpired}`);
    console.log(`   Containers Removed: ${scheduledResult.containersRemoved}`);
    console.log(`   Temp Files Deleted: ${scheduledResult.tempFilesDeleted}`);
    console.log(`   Duration: ${scheduledResult.duration}ms`);
    console.log(`   Errors: ${scheduledResult.errors.length}`);

    // Test 4: Test emergency cleanup (this should be safe since we likely don't have containers)
    console.log('\n4. Testing emergency cleanup...');
    const emergencyResult = await cleanup.emergencyCleanup();
    
    console.log('🚨 Emergency Cleanup Result:');
    console.log(`   Containers Removed: ${emergencyResult.containersRemoved}`);
    console.log(`   Duration: ${emergencyResult.duration}ms`);
    console.log(`   Errors: ${emergencyResult.errors.length}`);
    
    if (emergencyResult.errors.length > 0) {
      console.log(`   Error Details: ${emergencyResult.errors.slice(0, 2).join('; ')}`);
    }

    console.log('\n🎉 Cleanup Service test completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup Service test failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    // Cleanup test files and directory
    if (testFiles) {
      console.log('\n🧹 Cleaning up test files...');
      try {
        // Remove any remaining files
        for (const file of testFiles.tempFiles) {
          try {
            await fs.unlink(file);
          } catch (error) {
            // Ignore if already deleted
          }
        }
        
        // Remove test directory
        await fs.rmdir(testFiles.tempDir);
        console.log('✅ Test cleanup completed');
      } catch (error) {
        console.log(`⚠️  Test cleanup warning: ${error.message}`);
      }
    }
  }
}

// Check if Docker is available (but don't require it)
async function checkDocker() {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync('docker --version');
    console.log('✅ Docker is available - container cleanup tests will be more comprehensive');
    return true;
  } catch (error) {
    console.log('⚠️  Docker is not available - container cleanup tests will be limited');
    return false;
  }
}

async function main() {
  await checkDocker();
  await testCleanupService();
}

main().catch(console.error);
