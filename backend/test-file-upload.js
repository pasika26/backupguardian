/**
 * File Upload Testing Script
 * Tests .sql/.dump files and 100MB limit
 */
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

// Helper function to make HTTP requests
async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

// Helper function to make form data requests
async function makeFormRequest(url, formData, token = null) {
  const fetch = (await import('node-fetch')).default;
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    body: formData,
    headers
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

async function runFileUploadTests() {
  console.log('📁 Starting File Upload Tests...\n');
  
  let userToken = null;
  const uploadDir = path.join(__dirname, 'uploads');
  
  try {
    // Setup: Create uploads directory
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Test 1: Register user and get token
    console.log('1. Getting authentication token...');
    const userData = {
      email: `upload-test-${Date.now()}@example.com`,
      password: 'uploadtest123',
      firstName: 'Upload',
      lastName: 'Tester'
    };
    
    const register = await makeRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (register.status === 201 && register.data.data?.token) {
      userToken = register.data.data.token;
      console.log(`   ✅ Token received`);
    } else {
      throw new Error('Failed to get auth token');
    }
    
    // Test 2: Create different file types
    console.log('\n2. Creating test files...');
    
    // SQL file
    const sqlContent = `
-- PostgreSQL backup test file
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (email, password_hash) VALUES 
    ('user1@example.com', 'hash1'),
    ('user2@example.com', 'hash2'),
    ('user3@example.com', 'hash3');

INSERT INTO backups (user_id, file_name, file_size) VALUES 
    (1, 'backup1.sql', 1024),
    (2, 'backup2.sql', 2048),
    (3, 'backup3.sql', 4096);
`;
    
    const sqlFile = path.join(uploadDir, 'test-backup.sql');
    fs.writeFileSync(sqlFile, sqlContent);
    console.log(`   ✅ Created SQL file: ${sqlFile}`);
    
    // DUMP file (PostgreSQL custom format simulation)
    const dumpContent = Buffer.from(`PGDMP       backup        15.13        ENCODING UTF8    PGDMP: POSTGRESQL DATABASE DUMP
-- Test dump content here
-- This would normally be binary data`);
    
    const dumpFile = path.join(uploadDir, 'test-backup.dump');
    fs.writeFileSync(dumpFile, dumpContent);
    console.log(`   ✅ Created DUMP file: ${dumpFile}`);
    
    // Large file for size testing (1MB)
    const largeContent = 'A'.repeat(1024 * 1024); // 1MB
    const largeFile = path.join(uploadDir, 'large-backup.sql');
    fs.writeFileSync(largeFile, largeContent);
    console.log(`   ✅ Created 1MB file: ${largeFile}`);
    
    // Invalid file type
    const invalidContent = 'Invalid file content';
    const invalidFile = path.join(uploadDir, 'invalid-backup.txt');
    fs.writeFileSync(invalidFile, invalidContent);
    console.log(`   ✅ Created invalid file: ${invalidFile}`);
    
    // Test 3: Upload SQL file
    console.log('\n3. Testing SQL file upload...');
    const FormData = (await import('form-data')).default;
    
    const sqlFormData = new FormData();
    sqlFormData.append('backup', fs.createReadStream(sqlFile));
    sqlFormData.append('databaseName', 'test_database');
    sqlFormData.append('description', 'Test SQL backup file');
    
    const sqlUpload = await makeFormRequest('/api/backups/upload', sqlFormData, userToken);
    console.log(`   Status: ${sqlUpload.status} (should be 201)`);
    console.log(`   Message: ${sqlUpload.data.message}`);
    if (sqlUpload.data.data?.backup) {
      console.log(`   File type detected: ${sqlUpload.data.data.backup.fileType}`);
    }
    
    // Test 4: Upload DUMP file
    console.log('\n4. Testing DUMP file upload...');
    const dumpFormData = new FormData();
    dumpFormData.append('backup', fs.createReadStream(dumpFile));
    dumpFormData.append('databaseName', 'dump_database');
    dumpFormData.append('description', 'Test DUMP backup file');
    
    const dumpUpload = await makeFormRequest('/api/backups/upload', dumpFormData, userToken);
    console.log(`   Status: ${dumpUpload.status} (should be 201)`);
    console.log(`   Message: ${dumpUpload.data.message}`);
    if (dumpUpload.data.data?.backup) {
      console.log(`   File type detected: ${dumpUpload.data.data.backup.fileType}`);
    }
    
    // Test 5: Upload large file (1MB - should work)
    console.log('\n5. Testing 1MB file upload...');
    const largeFormData = new FormData();
    largeFormData.append('backup', fs.createReadStream(largeFile));
    largeFormData.append('databaseName', 'large_database');
    largeFormData.append('description', 'Large backup file test');
    
    const largeUpload = await makeFormRequest('/api/backups/upload', largeFormData, userToken);
    console.log(`   Status: ${largeUpload.status} (should be 201)`);
    console.log(`   Message: ${largeUpload.data.message}`);
    if (largeUpload.data.data?.backup) {
      console.log(`   File size: ${largeUpload.data.data.backup.fileSize} bytes`);
    }
    
    // Test 6: Upload invalid file type
    console.log('\n6. Testing invalid file type (.txt)...');
    const invalidFormData = new FormData();
    invalidFormData.append('backup', fs.createReadStream(invalidFile));
    invalidFormData.append('databaseName', 'invalid_db');
    
    const invalidUpload = await makeFormRequest('/api/backups/upload', invalidFormData, userToken);
    console.log(`   Status: ${invalidUpload.status} (should be 400)`);
    console.log(`   Message: ${invalidUpload.data.message}`);
    
    // Test 7: Test without authentication
    console.log('\n7. Testing upload without authentication...');
    const noAuthFormData = new FormData();
    noAuthFormData.append('backup', fs.createReadStream(sqlFile));
    
    const noAuthUpload = await makeFormRequest('/api/backups/upload', noAuthFormData);
    console.log(`   Status: ${noAuthUpload.status} (should be 401)`);
    console.log(`   Message: ${noAuthUpload.data.message}`);
    
    // Test 8: Test missing file
    console.log('\n8. Testing upload without file...');
    const noFileFormData = new FormData();
    noFileFormData.append('databaseName', 'no_file_db');
    
    const noFileUpload = await makeFormRequest('/api/backups/upload', noFileFormData, userToken);
    console.log(`   Status: ${noFileUpload.status} (should be 400)`);
    console.log(`   Message: ${noFileUpload.data.message}`);
    
    // Test 9: Verify uploads in database
    console.log('\n9. Verifying uploads in database...');
    const backups = await makeRequest('/api/backups', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${backups.status}`);
    console.log(`   User's backups: ${backups.data.data?.count || 0}`);
    
    if (backups.data.data?.backups) {
      backups.data.data.backups.forEach(backup => {
        console.log(`   - ${backup.file_name} (${backup.file_type}, ${backup.file_size} bytes)`);
      });
    }
    
    // Test 10: Test 100MB limit (create 101MB file)
    console.log('\n10. Testing 100MB file size limit...');
    console.log('   Creating 101MB file (this may take a moment)...');
    
    const oversizeFile = path.join(uploadDir, 'oversize-backup.sql');
    const stream = fs.createWriteStream(oversizeFile);
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunk = 'B'.repeat(chunkSize);
    
    // Write 101MB
    for (let i = 0; i < 101; i++) {
      stream.write(chunk);
    }
    stream.end();
    
    // Wait for file to be written
    await new Promise(resolve => stream.on('finish', resolve));
    
    const oversizeFormData = new FormData();
    oversizeFormData.append('backup', fs.createReadStream(oversizeFile));
    oversizeFormData.append('databaseName', 'oversize_db');
    
    const oversizeUpload = await makeFormRequest('/api/backups/upload', oversizeFormData, userToken);
    console.log(`   Status: ${oversizeUpload.status} (should be 413 or 400)`);
    console.log(`   Message: ${oversizeUpload.data.message || oversizeUpload.data.error?.message}`);
    
    console.log('\n🎉 File Upload Tests Completed!');
    
    console.log('\n✅ Features Tested:');
    console.log('  - SQL file upload');
    console.log('  - DUMP file upload');
    console.log('  - File type detection');
    console.log('  - File size validation');
    console.log('  - 100MB size limit');
    console.log('  - Invalid file type rejection');
    console.log('  - Authentication requirement');
    console.log('  - Database storage');
    
    // Cleanup large files
    try {
      fs.unlinkSync(largeFile);
      fs.unlinkSync(oversizeFile);
      console.log('\n🧹 Cleanup: Large test files removed');
    } catch (error) {
      console.log('   Cleanup note: Some test files may remain');
    }
    
  } catch (error) {
    console.error('❌ File upload test failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runFileUploadTests();
}

module.exports = { runFileUploadTests };
