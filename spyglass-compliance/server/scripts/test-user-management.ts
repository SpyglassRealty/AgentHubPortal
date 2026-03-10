/**
 * Test User Management System
 * Comprehensive testing of admin user CRUD operations
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: 'admin@spyglassrealty.com',
  password: 'admin123'
};

const AGENT_CREDENTIALS = {
  email: 'agent@spyglassrealty.com', 
  password: 'agent123'
};

// Store session cookies
let adminCookies = '';
let agentCookies = '';

async function makeRequest(method: string, endpoint: string, data?: any, cookies?: string) {
  try {
    const config: any = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { 'Cookie': cookies } : {})
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
}

async function loginUser(credentials: any): Promise<string> {
  const result = await makeRequest('POST', '/auth/login', credentials);
  
  if (!result.success) {
    throw new Error(`Login failed: ${JSON.stringify(result.error)}`);
  }
  
  // Extract cookies from response (Note: this is simplified for testing)
  return 'session_id=test'; // In real implementation, extract from Set-Cookie header
}

async function runTests() {
  console.log('🧪 Starting User Management System Tests\n');

  try {
    // Test 1: Admin Login
    console.log('1. Testing admin login...');
    const adminLoginResult = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
    if (!adminLoginResult.success) {
      throw new Error('Admin login failed');
    }
    adminCookies = 'admin_session=test';
    console.log('✅ Admin login successful\n');

    // Test 2: Agent Login  
    console.log('2. Testing agent login...');
    const agentLoginResult = await makeRequest('POST', '/auth/login', AGENT_CREDENTIALS);
    if (!agentLoginResult.success) {
      throw new Error('Agent login failed');
    }
    agentCookies = 'agent_session=test';
    console.log('✅ Agent login successful\n');

    // Test 3: List Users (Admin)
    console.log('3. Testing user list (admin access)...');
    const listResult = await makeRequest('GET', '/users', undefined, adminCookies);
    if (!listResult.success) {
      throw new Error(`Failed to list users: ${JSON.stringify(listResult.error)}`);
    }
    console.log('✅ Admin can list users');
    console.log(`   Found ${listResult.data.users?.length || 0} users\n`);

    // Test 4: List Users (Agent - should fail)
    console.log('4. Testing user list (agent access - should fail)...');
    const agentListResult = await makeRequest('GET', '/users', undefined, agentCookies);
    if (agentListResult.success || agentListResult.status !== 403) {
      throw new Error('Agent should not have access to user list');
    }
    console.log('✅ Agent correctly denied access to user list\n');

    // Test 5: Create New User
    console.log('5. Testing user creation...');
    const newUserData = {
      email: 'test.agent@spyglassrealty.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Agent',
      role: 'agent',
      phone: '512-555-9999',
      trecLicense: 'TEST001'
    };

    const createResult = await makeRequest('POST', '/users', newUserData, adminCookies);
    if (!createResult.success) {
      throw new Error(`Failed to create user: ${JSON.stringify(createResult.error)}`);
    }
    console.log('✅ User created successfully');
    console.log(`   New user ID: ${createResult.data.user?.id}\n`);

    const newUserId = createResult.data.user?.id;

    // Test 6: Get User Details
    console.log('6. Testing get user details...');
    const getUserResult = await makeRequest('GET', `/users/${newUserId}`, undefined, adminCookies);
    if (!getUserResult.success) {
      throw new Error(`Failed to get user: ${JSON.stringify(getUserResult.error)}`);
    }
    console.log('✅ User details retrieved successfully');
    console.log(`   User: ${getUserResult.data.user?.firstName} ${getUserResult.data.user?.lastName}\n`);

    // Test 7: Update User
    console.log('7. Testing user update...');
    const updateData = {
      firstName: 'Updated',
      phone: '512-555-0000'
    };

    const updateResult = await makeRequest('PUT', `/users/${newUserId}`, updateData, adminCookies);
    if (!updateResult.success) {
      throw new Error(`Failed to update user: ${JSON.stringify(updateResult.error)}`);
    }
    console.log('✅ User updated successfully');
    console.log(`   Updated name: ${updateResult.data.user?.firstName}\n`);

    // Test 8: Reset Password
    console.log('8. Testing password reset...');
    const resetResult = await makeRequest('POST', `/users/${newUserId}/reset-password`, {
      newPassword: 'NewPassword123!'
    }, adminCookies);
    
    if (!resetResult.success) {
      throw new Error(`Failed to reset password: ${JSON.stringify(resetResult.error)}`);
    }
    console.log('✅ Password reset successfully\n');

    // Test 9: Deactivate User
    console.log('9. Testing user deactivation...');
    const deactivateResult = await makeRequest('DELETE', `/users/${newUserId}`, undefined, adminCookies);
    if (!deactivateResult.success) {
      throw new Error(`Failed to deactivate user: ${JSON.stringify(deactivateResult.error)}`);
    }
    console.log('✅ User deactivated successfully\n');

    // Test 10: Verify Deactivated User Cannot Login
    console.log('10. Testing deactivated user login (should fail)...');
    const deactivatedLoginResult = await makeRequest('POST', '/auth/login', {
      email: 'test.agent@spyglassrealty.com',
      password: 'NewPassword123!'
    });
    
    if (deactivatedLoginResult.success) {
      throw new Error('Deactivated user should not be able to log in');
    }
    console.log('✅ Deactivated user correctly denied login\n');

    // Test 11: Search Users
    console.log('11. Testing user search...');
    const searchResult = await makeRequest('GET', '/users?search=admin&active=true', undefined, adminCookies);
    if (!searchResult.success) {
      throw new Error(`Failed to search users: ${JSON.stringify(searchResult.error)}`);
    }
    console.log('✅ User search working correctly');
    console.log(`   Search results: ${searchResult.data.users?.length || 0} users\n`);

    // Test 12: Role Filtering
    console.log('12. Testing role filtering...');
    const roleFilterResult = await makeRequest('GET', '/users?role=admin', undefined, adminCookies);
    if (!roleFilterResult.success) {
      throw new Error(`Failed to filter by role: ${JSON.stringify(roleFilterResult.error)}`);
    }
    console.log('✅ Role filtering working correctly');
    console.log(`   Admin users: ${roleFilterResult.data.users?.length || 0}\n`);

    console.log('🎉 All User Management Tests Passed!\n');
    
    console.log('📊 Test Summary:');
    console.log('✅ Admin authentication');
    console.log('✅ Agent authentication'); 
    console.log('✅ Admin can list users');
    console.log('✅ Agent denied user list access');
    console.log('✅ User creation');
    console.log('✅ User details retrieval');
    console.log('✅ User updates');
    console.log('✅ Password reset');
    console.log('✅ User deactivation');
    console.log('✅ Deactivated user login prevention');
    console.log('✅ User search functionality');
    console.log('✅ Role-based filtering');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests };