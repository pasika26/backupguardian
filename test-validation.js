const RailwayValidator = require('./backend/src/services/railway-validator.js');

async function testValidation() {
  const validator = new RailwayValidator();
  
  console.log('🧪 Testing BackupGuardian validation...\n');
  
  // Test files to validate
  const testFiles = [
    { path: 'test.sql', description: 'Simple SQL file' },
    { path: 'test-backups/dvdrental-small.sql', description: 'Valid PostgreSQL backup' },
    { path: 'test-backups/empty-backup.sql', description: 'Empty backup file' },
    { path: 'test-backups/truly-corrupted.sql', description: 'Corrupted with invalid bytes' },
    { path: 'test-backups/corrupted-header.backup', description: 'Corrupted binary header' }
  ];
  
  for (const testFile of testFiles) {
    console.log(`\n🔍 Testing: ${testFile.description}`);
    console.log(`📁 File: ${testFile.path}`);
    
    try {
      const result = await validator.validateBackup(testFile.path, testFile.path);
      
      if (result.success) {
        console.log(`✅ PASSED - ${testFile.description}`);
        console.log(`📊 Tables created: ${result.validationDetails.tablesCreated}`);
        console.log(`⚠️  Warnings: ${result.validationDetails.warningsFound.length}`);
      } else {
        console.log(`❌ FAILED - ${testFile.description}`);
        console.log(`💬 Errors: ${result.validationDetails.errorsFound.length}`);
      }
      
      // Show warnings if any
      if (result.validationDetails.warningsFound.length > 0) {
        console.log(`⚠️  Warnings: ${result.validationDetails.warningsFound.join(', ')}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR - ${testFile.description}: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }
}

testValidation().catch(console.error);
