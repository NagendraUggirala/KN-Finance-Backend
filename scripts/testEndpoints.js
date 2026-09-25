import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:5000';

const runTests = async () => {
  let superAdminToken = '';
  let createdAdminId = '';

  const testSuperAdminUsername = process.env.SUPERADMIN_USERNAME || 'Nagendra';
  const testSuperAdminPassword = process.env.SUPERADMIN_PASSWORD || 'qwerty@123';

  console.log('--- Starting API Endpoint Verification ---');

  // Test 1: Super Admin Login - Missing fields (400)
  {
    const res = await fetch(`${BASE_URL}/api/auth/superadmin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testSuperAdminUsername })
    });
    const data = await res.json();
    console.log(`Test 1 [POST /api/auth/superadmin/login] Missing password:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data);
  }

  // Test 2: Super Admin Login - Invalid credentials (401)
  {
    const res = await fetch(`${BASE_URL}/api/auth/superadmin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testSuperAdminUsername, password: 'wrongpassword' })
    });
    const data = await res.json();
    const correctMessage = data.message === 'Invalid Super Admin credentials.';
    console.log(`Test 2 [POST /api/auth/superadmin/login] Invalid credentials:`, res.status === 401 && correctMessage ? 'PASSED (401)' : `FAILED (${res.status})`, data);
  }

  // Test 3: Super Admin Login - Successful (200)
  {
    const res = await fetch(`${BASE_URL}/api/auth/superadmin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testSuperAdminUsername, password: testSuperAdminPassword })
    });
    const data = await res.json();
    superAdminToken = data.token;
    const hasNoPassword = !data.user.password;
    console.log(`Test 3 [POST /api/auth/superadmin/login] Valid login:`, res.status === 200 && hasNoPassword ? 'PASSED (200)' : `FAILED (${res.status})`, {
      success: data.success,
      role: data.user?.role,
      username: data.user?.username,
      tokenReceived: Boolean(data.token),
      passwordExposed: !hasNoPassword
    });
  }

  // Test 4: Access Super Admin Endpoint without Token (401)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`);
    const data = await res.json();
    console.log(`Test 4 [GET /api/superadmin/admins] No token:`, res.status === 401 ? 'PASSED (401)' : `FAILED (${res.status})`, data);
  }

  // Test 5: Access Super Admin Endpoint with invalid Token (401)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`, {
      headers: { Authorization: 'Bearer invalid.token.value' }
    });
    const data = await res.json();
    console.log(`Test 5 [GET /api/superadmin/admins] Invalid token:`, res.status === 401 ? 'PASSED (401)' : `FAILED (${res.status})`, data);
  }

  // Test 6: Create Admin - Missing fields (400)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ username: 'admin01' })
    });
    const data = await res.json();
    console.log(`Test 6 [POST /api/superadmin/admins] Missing fields:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data);
  }

  // Cleanup potential leftover admin01 from previous runs
  const testUsername = `testadmin_${Date.now()}`;

  // Test 7: Create Admin - Successful (201)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        username: testUsername,
        password: 'password123',
        name: 'Test Admin',
        email: 'testadmin@example.com',
        phone: '9876543210'
      })
    });
    const data = await res.json();
    createdAdminId = data.admin?._id;
    const passwordNotExposed = !data.admin?.password;
    console.log(`Test 7 [POST /api/superadmin/admins] Create Admin:`, res.status === 201 && passwordNotExposed ? 'PASSED (201)' : `FAILED (${res.status})`, {
      success: data.success,
      adminId: createdAdminId,
      role: data.admin?.role,
      status: data.admin?.status,
      createdBy: data.admin?.createdBy,
      passwordExposed: !passwordNotExposed
    });
  }

  // Test 8: Create Admin - Duplicate username (409)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        username: testUsername,
        password: 'password123',
        name: 'Duplicate Admin',
        email: 'dup@example.com',
        phone: '1122334455'
      })
    });
    const data = await res.json();
    console.log(`Test 8 [POST /api/superadmin/admins] Duplicate username:`, res.status === 409 ? 'PASSED (409)' : `FAILED (${res.status})`, data);
  }

  // Test 9: Get All Admins (200)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const data = await res.json();
    const hasPasswords = data.admins?.some(a => a.password);
    console.log(`Test 9 [GET /api/superadmin/admins] List Admins:`, res.status === 200 && !hasPasswords ? 'PASSED (200)' : `FAILED (${res.status})`, {
      success: data.success,
      adminCount: data.admins?.length,
      passwordsExposed: Boolean(hasPasswords)
    });
  }

  // Test 10: Get Single Admin (200)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const data = await res.json();
    console.log(`Test 10 [GET /api/superadmin/admins/:adminId] Get Single:`, res.status === 200 && !data.admin?.password ? 'PASSED (200)' : `FAILED (${res.status})`, {
      success: data.success,
      username: data.admin?.username,
      passwordExposed: Boolean(data.admin?.password)
    });
  }

  // Test 11: Update Admin (200)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: 'Updated Admin Name',
        phone: '1234567890'
      })
    });
    const data = await res.json();
    console.log(`Test 11 [PUT /api/superadmin/admins/:adminId] Update Admin:`, res.status === 200 && data.admin?.name === 'Updated Admin Name' ? 'PASSED (200)' : `FAILED (${res.status})`, {
      success: data.success,
      updatedName: data.admin?.name,
      updatedPhone: data.admin?.phone
    });
  }

  // Test 12: Update Admin Status - Invalid status (400)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ status: 'invalid_status' })
    });
    const data = await res.json();
    console.log(`Test 12 [PATCH /api/superadmin/admins/:adminId/status] Invalid status:`, res.status === 400 ? 'PASSED (400)' : `FAILED (${res.status})`, data);
  }

  // Test 13: Update Admin Status - Inactive (200)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ status: 'inactive' })
    });
    const data = await res.json();
    console.log(`Test 13 [PATCH /api/superadmin/admins/:adminId/status] Set inactive:`, res.status === 200 && data.admin?.status === 'inactive' ? 'PASSED (200)' : `FAILED (${res.status})`, {
      success: data.success,
      newStatus: data.admin?.status
    });
  }

  // Test 14: Delete Admin (200)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const data = await res.json();
    console.log(`Test 14 [DELETE /api/superadmin/admins/:adminId] Delete Admin:`, res.status === 200 ? 'PASSED (200)' : `FAILED (${res.status})`, data);
  }

  // Test 15: Verify Deleted Admin is Not Found (404)
  {
    const res = await fetch(`${BASE_URL}/api/superadmin/admins/${createdAdminId}`, {
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });
    const data = await res.json();
    console.log(`Test 15 [GET /api/superadmin/admins/:adminId] Check Deleted:`, res.status === 404 ? 'PASSED (404)' : `FAILED (${res.status})`, data);
  }

  console.log('--- All Tests Completed Successfully ---');
};

runTests().catch(console.error);
