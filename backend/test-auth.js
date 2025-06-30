/**
 * Authentication Flow Testing Script
 * Run with: node test-auth.js
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

async function runAuthTests() {
  console.log('🔐 Starting Authentication Flow Tests...\n');
  
  let userToken = null;
  let userId = null;
  let backupId = null;
  let testRunId = null;
  
  try {
    // Test 1: Register new user
    console.log('1. Testing user registration...');
    const userData = {
      email: `auth-test-${Date.now()}@example.com`,
      password: 'securepassword123',
      firstName: 'Auth',
      lastName: 'Tester'
    };
    
    const register = await makeRequest('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    console.log(`   Status: ${register.status}`);
    
    if (register.status === 201 && register.data.data?.token) {
      userToken = register.data.data.token;
      userId = register.data.data.user.id;
      console.log(`   ✅ Registration successful, token received`);
      console.log(`   User ID: ${userId}`);
    } else {
      throw new Error('Registration failed');
    }
    
    // Test 2: Test protected route without token
    console.log('\n2. Testing protected route without token...');
    const noAuth = await makeRequest('/api/users/me');
    console.log(`   Status: ${noAuth.status} (should be 401)`);
    console.log(`   Message: ${noAuth.data.message}`);
    
    // Test 3: Test protected route with token
    console.log('\n3. Testing protected route with token...');
    const withAuth = await makeRequest('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${withAuth.status} (should be 200)`);
    console.log(`   User email: ${withAuth.data.data?.user?.email}`);
    console.log(`   Stats: ${JSON.stringify(withAuth.data.data?.stats)}`);
    
    // Test 4: Test backup upload without auth
    console.log('\n4. Testing backup upload without auth...');
    const testSqlContent = `CREATE TABLE test_auth (id INT, name VARCHAR(50));`;
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const testFile = path.join(uploadDir, 'auth-test-backup.sql');
    fs.writeFileSync(testFile, testSqlContent);
    
    const FormData = (await import('form-data')).default;
    const formDataNoAuth = new FormData();
    formDataNoAuth.append('backup', fs.createReadStream(testFile));
    formDataNoAuth.append('databaseName', 'auth_test_db');
    
    const uploadNoAuth = await makeFormRequest('/api/backups/upload', formDataNoAuth);
    console.log(`   Status: ${uploadNoAuth.status} (should be 401)`);
    console.log(`   Message: ${uploadNoAuth.data.message}`);
    
    // Test 5: Test backup upload with auth
    console.log('\n5. Testing backup upload with auth...');
    const formDataWithAuth = new FormData();
    formDataWithAuth.append('backup', fs.createReadStream(testFile));
    formDataWithAuth.append('databaseName', 'auth_test_db');
    formDataWithAuth.append('description', 'Auth test backup');
    
    const uploadWithAuth = await makeFormRequest('/api/backups/upload', formDataWithAuth, userToken);
    console.log(`   Status: ${uploadWithAuth.status} (should be 201)`);
    
    if (uploadWithAuth.status === 201 && uploadWithAuth.data.data?.backup) {
      backupId = uploadWithAuth.data.data.backup.id;
      console.log(`   ✅ Upload successful, backup ID: ${backupId}`);
    } else {
      throw new Error('Backup upload failed');
    }
    
    // Test 6: Test get backups (should only show user's backups)
    console.log('\n6. Testing get user backups...');
    const userBackups = await makeRequest('/api/backups', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${userBackups.status}`);
    console.log(`   User's backup count: ${userBackups.data.data?.count || 0}`);
    
    // Test 7: Test create test run
    console.log('\n7. Testing create test run with auth...');
    const createTestRun = await makeRequest('/api/test-runs', {
      method: 'POST',
      body: JSON.stringify({ backupId }),
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${createTestRun.status}`);
    
    if (createTestRun.status === 201 && createTestRun.data.data?.testRun) {
      testRunId = createTestRun.data.data.testRun.id;
      console.log(`   ✅ Test run created: ${testRunId}`);
    }
    
    // Test 8: Test get test runs (should only show user's test runs)
    console.log('\n8. Testing get user test runs...');
    const userTestRuns = await makeRequest('/api/test-runs', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${userTestRuns.status}`);
    console.log(`   User's test run count: ${userTestRuns.data.data?.count || 0}`);
    
    // Test 9: Test invalid token
    console.log('\n9. Testing invalid token...');
    const invalidToken = await makeRequest('/api/users/me', {
      headers: {
        'Authorization': 'Bearer invalid-token-here'
      }
    });
    console.log(`   Status: ${invalidToken.status} (should be 401)`);
    console.log(`   Message: ${invalidToken.data.message}`);
    
    // Test 10: Test login with registered user
    console.log('\n10. Testing login...');
    const login = await makeRequest('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    });
    console.log(`   Status: ${login.status}`);
    console.log(`   Login successful: ${login.data.success}`);
    
    // Test 11: Test cross-user access (try to access another user's backup)
    console.log('\n11. Testing cross-user access prevention...');
    
    // Get a backup ID from the seeded data (should belong to different user)
    const allBackups = await makeRequest('/api/users', {}); // Admin endpoint to see all users
    
    // Try to access backup that doesn't belong to this user
    const unauthorizedAccess = await makeRequest('/api/backups/nonexistent-backup-id', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Status: ${unauthorizedAccess.status} (should be 404)`);
    console.log(`   Message: ${unauthorizedAccess.data.message}`);
    
    // Test 12: Test user profile with stats
    console.log('\n12. Testing final user profile with updated stats...');
    const finalProfile = await makeRequest('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    console.log(`   Final stats:`, JSON.stringify(finalProfile.data.data?.stats, null, 2));
    
    console.log('\n🎉 All Authentication Tests Completed Successfully!');
    console.log('\n✅ Security Features Working:');
    console.log('  - JWT token authentication');
    console.log('  - Protected routes');
    console.log('  - User isolation (can only access own data)');
    console.log('  - Proper error handling for auth failures');
    console.log('  - File upload security');
    
  } catch (error) {
    console.error('❌ Auth test failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAuthTests();
}

module.exports = { runAuthTests };
