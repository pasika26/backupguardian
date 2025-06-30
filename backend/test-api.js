/**
 * API Testing Script
 * Run with: node test-api.js
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
async function makeFormRequest(url, formData) {
  const fetch = (await import('node-fetch')).default;
  
  const response = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return { status: response.status, data };
}

async function runTests() {
  console.log('🧪 Starting API Tests...\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    const health = await makeRequest('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Database: ${health.data.database?.status || 'unknown'}`);
    console.log(`   Stats: ${JSON.stringify(health.data.database?.stats || {})}`);
    
    // Test 2: User Registration
    console.log('\n2. Testing user registration...');
    const userData = {
      email: `test-${Date.now()}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const register = await makeRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    console.log(`   Status: ${register.status}`);
    console.log(`   Message: ${register.data.message}`);
    
    let userToken = null;
    if (register.data.data?.token) {
      userToken = register.data.data.token;
      console.log(`   Token received: ${userToken.substring(0, 20)}...`);
    }
    
    // Test 3: User Login
    console.log('\n3. Testing user login...');
    const login = await makeRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   Message: ${login.data.message}`);
    
    // Test 4: Get All Users
    console.log('\n4. Testing get all users...');
    const users = await makeRequest('/api/users');
    console.log(`   Status: ${users.status}`);
    console.log(`   Users count: ${users.data.data?.count || 0}`);
    
    // Test 5: Create Test File for Upload
    console.log('\n5. Creating test backup file...');
    const testSqlContent = `
-- Test SQL backup file
CREATE TABLE test_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO test_table (name) VALUES 
    ('Test Record 1'),
    ('Test Record 2'),
    ('Test Record 3');
`;
    
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const testFile = path.join(uploadDir, 'test-backup.sql');
    fs.writeFileSync(testFile, testSqlContent);
    console.log(`   Test file created: ${testFile}`);
    
    // Test 6: File Upload (using form data)
    console.log('\n6. Testing backup file upload...');
    try {
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('backup', fs.createReadStream(testFile));
      formData.append('databaseName', 'test_database');
      formData.append('description', 'Test backup upload');
      
      const upload = await makeFormRequest('/api/backups/upload', formData);
      console.log(`   Status: ${upload.status}`);
      console.log(`   Message: ${upload.data.message}`);
      
      if (upload.data.data?.backup) {
        console.log(`   Backup ID: ${upload.data.data.backup.id}`);
      }
    } catch (uploadError) {
      console.log(`   Upload error: ${uploadError.message}`);
    }
    
    // Test 7: Get All Backups
    console.log('\n7. Testing get all backups...');
    const backups = await makeRequest('/api/backups');
    console.log(`   Status: ${backups.status}`);
    console.log(`   Backups count: ${backups.data.data?.count || 0}`);
    
    // Test 8: Get All Test Runs
    console.log('\n8. Testing get all test runs...');
    const testRuns = await makeRequest('/api/test-runs');
    console.log(`   Status: ${testRuns.status}`);
    console.log(`   Test runs count: ${testRuns.data.data?.count || 0}`);
    
    // Test 9: Create Test Run
    if (backups.data.data?.backups?.length > 0) {
      console.log('\n9. Testing create test run...');
      const backupId = backups.data.data.backups[0].id;
      
      const createTestRun = await makeRequest('/api/test-runs', {
        method: 'POST',
        body: JSON.stringify({ backupId })
      });
      console.log(`   Status: ${createTestRun.status}`);
      console.log(`   Message: ${createTestRun.data.message}`);
    }
    
    // Test 10: Error Handling
    console.log('\n10. Testing error handling...');
    const notFound = await makeRequest('/api/nonexistent');
    console.log(`   404 Status: ${notFound.status}`);
    console.log(`   404 Message: ${notFound.data.message}`);
    
    console.log('\n🎉 API Tests Completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
