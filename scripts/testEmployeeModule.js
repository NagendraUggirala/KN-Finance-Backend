import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

import authRoutes from '../src/routes/authRoutes.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import financeBookRoutes from '../src/routes/financeBookRoutes.js';
import adminEmployeeRoutes from '../src/routes/adminEmployeeRoutes.js';
import employeeRoutes from '../src/routes/employeeRoutes.js';
import Employee from '../src/models/Employee.js';
import FinanceRecord from '../src/models/FinanceRecord.js';
import AuditLog from '../src/models/AuditLog.js';
import { swaggerDocument } from '../src/docs/swagger.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/superadmin', adminRoutes);
app.use('/api/v1/finance-book', financeBookRoutes);
app.use('/api/finance-book', financeBookRoutes);
app.use('/api/v1/admin/employees', adminEmployeeRoutes);
app.use('/api/admin/employees', adminEmployeeRoutes);
app.use('/api/v1/employee', employeeRoutes);
app.use('/api/employee', employeeRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function runEmployeeModuleTests() {
  console.log('--- Starting Complete Employee Management & Auth Verification Suite ---');
  await mongoose.connect(process.env.MONGO_URI);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  try {
    const adminToken = jwt.sign(
      { userId: 'admin_test_user_id', username: 'Nagendra', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Clean test employees
    await Employee.deleteMany({ email: /test_employee/i });

    // 1. Admin creates employee
    console.log('\n[1] Admin creates employee:');
    const createRes = await fetch(`${baseUrl}/api/v1/admin/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: 'Ravi Kumar Test',
        age: 28,
        phone: '9876543210',
        altPhone: '9123456780',
        email: 'test_employee_ravi@example.com',
        aadharCard: '1234-5678-9012',
        panCard: 'ABCDE1234F',
        village: 'Ravulapalem',
        assignedOperationalArea: 'Area-01',
        joiningDate: '2026-09-28',
        references: 'Direct field reference',
        password: 'InitialPassword@123'
      })
    });

    const createJson = await createRes.json();
    console.log('Create employee status:', createRes.status, 'Success:', createJson.success);
    if (createRes.status !== 201) throw new Error(`Create employee failed: ${createJson.message}`);
    const employeeData = createJson.data.employee;
    const employeeMongoId = employeeData._id;

    console.log('Created Employee ID:', employeeData.employeeId, 'Status:', employeeData.status, 'tokenVersion:', employeeData.tokenVersion);
    if (employeeData.password) throw new Error('Password must NEVER be returned in response');
    if (employeeData.status !== 'Active') throw new Error('Status should be Active');
    if (employeeData.tokenVersion !== 0) throw new Error('Initial tokenVersion must be 0');

    // Verify bcrypt in database
    const dbEmp = await Employee.findById(employeeMongoId).select('+password');
    if (!dbEmp.password.startsWith('$2') || dbEmp.password === 'InitialPassword@123') {
      throw new Error('Password was not hashed with bcrypt in database');
    }
    console.log('Password verified bcrypt hash in DB:', dbEmp.password.substring(0, 15) + '...');

    // 2. Admin searches and filters employees
    console.log('\n[2] Admin lists and filters employees:');
    const listRes = await fetch(`${baseUrl}/api/v1/admin/employees?search=Ravi&village=Ravulapalem&status=Active`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const listJson = await listRes.json();
    console.log('List status:', listRes.status, 'Employees found:', listJson.data.employees.length);
    if (listJson.data.employees.length === 0) throw new Error('Search did not return created employee');
    if (listJson.data.employees[0].password) throw new Error('Password returned in employee listing');

    // 3. Admin updates employee profile
    console.log('\n[3] Admin updates employee profile:');
    const updateRes = await fetch(`${baseUrl}/api/v1/admin/employees/${employeeMongoId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        fullName: 'Ravi Kumar Updated',
        assignedOperationalArea: 'Area-02'
      })
    });
    const updateJson = await updateRes.json();
    console.log('Update status:', updateRes.status, 'Updated Area:', updateJson.data.employee.assignedOperationalArea);
    if (updateJson.data.employee.assignedOperationalArea !== 'Area-02') throw new Error('Update failed');

    // 4. Employee Login with initial credentials
    console.log('\n[4] Employee Login with initial password:');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_employee_ravi@example.com',
        password: 'InitialPassword@123'
      })
    });
    const loginJson = await loginRes.json();
    console.log('Login status:', loginRes.status, 'Success:', loginJson.success);
    if (loginRes.status !== 200) throw new Error(`Employee login failed: ${loginJson.message}`);
    const initialEmployeeToken = loginJson.token;
    console.log('Obtained Employee JWT token.');

    // 5. Employee accesses Profile
    console.log('\n[5] Employee gets profile:');
    const profileRes = await fetch(`${baseUrl}/api/v1/employee/profile`, {
      headers: { Authorization: `Bearer ${initialEmployeeToken}` }
    });
    const profileJson = await profileRes.json();
    console.log('Profile status:', profileRes.status, 'Full name:', profileJson.data.profile.fullName);
    if (profileRes.status !== 200) throw new Error('Failed to fetch employee profile');
    if (profileJson.data.profile.password || profileJson.data.profile.tokenVersion) {
      throw new Error('Sensitive fields returned in employee profile');
    }

    // 6. Security: Employee token attempting to access Admin API (must return 403)
    console.log('\n[6] Security: Employee accessing Admin API:');
    const adminAccessRes = await fetch(`${baseUrl}/api/v1/admin/employees`, {
      headers: { Authorization: `Bearer ${initialEmployeeToken}` }
    });
    console.log('Status when employee accesses admin API:', adminAccessRes.status);
    if (adminAccessRes.status !== 403) throw new Error('Expected 403 Forbidden for employee on admin route');

    // 7. Security: Admin token attempting to access Employee API (must return 403)
    console.log('\n[7] Security: Admin accessing Employee Portal API:');
    const empAccessRes = await fetch(`${baseUrl}/api/v1/employee/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Status when admin accesses employee profile:', empAccessRes.status);
    if (empAccessRes.status !== 403) throw new Error('Expected 403 Forbidden for admin on employee route');

    // 8. TokenVersion Revocation Test on Password Reset
    console.log('\n[8] Testing tokenVersion Revocation on Password Reset:');
    console.log('Admin resets employee password...');
    const resetRes = await fetch(`${baseUrl}/api/v1/admin/employees/${employeeMongoId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        newPassword: 'NewSecurePassword@999'
      })
    });
    const resetJson = await resetRes.json();
    console.log('Password reset status:', resetRes.status, 'New tokenVersion in DB:', resetJson.data.tokenVersion);
    if (resetJson.data.tokenVersion !== 1) throw new Error('tokenVersion was not incremented');

    console.log('Attempting request with old employee JWT...');
    const oldTokenRes = await fetch(`${baseUrl}/api/v1/employee/profile`, {
      headers: { Authorization: `Bearer ${initialEmployeeToken}` }
    });
    console.log('Old token status:', oldTokenRes.status);
    if (oldTokenRes.status !== 401) throw new Error('Expected 401 Unauthorized for revoked employee token');

    console.log('Employee logs in with new password...');
    const newLoginRes = await fetch(`${baseUrl}/api/v1/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_employee_ravi@example.com',
        password: 'NewSecurePassword@999'
      })
    });
    const newLoginJson = await newLoginRes.json();
    console.log('New login status:', newLoginRes.status);
    if (newLoginRes.status !== 200) throw new Error('Failed to login with new password');
    const newEmployeeToken = newLoginJson.token;

    // Verify new token works
    const newProfileRes = await fetch(`${baseUrl}/api/v1/employee/profile`, {
      headers: { Authorization: `Bearer ${newEmployeeToken}` }
    });
    console.log('New token profile access status:', newProfileRes.status);
    if (newProfileRes.status !== 200) throw new Error('New token should work');

    // 9. Status Deactivation & Session Invalidation Test
    console.log('\n[9] Testing Status Deactivation (Active -> Inactive):');
    const deactivateRes = await fetch(`${baseUrl}/api/v1/admin/employees/${employeeMongoId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    console.log('Deactivate status:', deactivateRes.status);

    console.log('Checking if active token is rejected after deactivation...');
    const inactiveTokenRes = await fetch(`${baseUrl}/api/v1/employee/profile`, {
      headers: { Authorization: `Bearer ${newEmployeeToken}` }
    });
    console.log('Inactive employee token status:', inactiveTokenRes.status);
    if (inactiveTokenRes.status !== 401 && inactiveTokenRes.status !== 403) {
      throw new Error('Deactivated employee token must be rejected');
    }

    console.log('Attempting login while Inactive...');
    const inactiveLoginRes = await fetch(`${baseUrl}/api/v1/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_employee_ravi@example.com',
        password: 'NewSecurePassword@999'
      })
    });
    console.log('Login while inactive status:', inactiveLoginRes.status);
    if (inactiveLoginRes.status !== 403) throw new Error('Expected 403 Forbidden for inactive employee login');

    console.log('Admin reactivates employee to Active...');
    await fetch(`${baseUrl}/api/v1/admin/employees/${employeeMongoId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Active' })
    });

    console.log('Employee logs in again after reactivation...');
    const reactivatedLoginRes = await fetch(`${baseUrl}/api/v1/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_employee_ravi@example.com',
        password: 'NewSecurePassword@999'
      })
    });
    const reactivatedLoginJson = await reactivatedLoginRes.json();
    console.log('Login after reactivation status:', reactivatedLoginRes.status);
    if (reactivatedLoginRes.status !== 200) throw new Error('Login failed after reactivation');
    const activeEmpToken = reactivatedLoginJson.token;

    // 10. Assigned Borrowers & Field Collections
    console.log('\n[10] Testing Assigned Borrowers & Field Collection:');
    // Create test borrower
    const testBorrower = await FinanceRecord.create({
      borrowerNameTelugu: 'కృష్ణమూర్తి',
      borrowerNameEnglish: 'Krishnamurthy',
      productItem: 'బంగారు ఉంగరం',
      principalAmount: 10000,
      targetAmount: 12600,
      totalPaid: 1000,
      remainingBalance: 11600,
      assignedOperationalArea: 'Area-02',
      village: 'Ravulapalem',
      status: 'active'
    });

    const borrowersRes = await fetch(`${baseUrl}/api/v1/employee/assigned-borrowers`, {
      headers: { Authorization: `Bearer ${activeEmpToken}` }
    });
    const borrowersJson = await borrowersRes.json();
    console.log('Assigned borrowers status:', borrowersRes.status, 'Count:', borrowersJson.data.borrowers.length);
    if (borrowersJson.data.borrowers.length === 0) throw new Error('Assigned borrowers returned empty');

    // Record collection
    const collectRes = await fetch(`${baseUrl}/api/v1/employee/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeEmpToken}`
      },
      body: JSON.stringify({
        borrowerId: testBorrower._id.toString(),
        amount: 600,
        paymentDate: '2026-09-28',
        paymentType: 'Cash'
      })
    });
    const collectJson = await collectRes.json();
    console.log('Collection status:', collectRes.status, 'New total paid:', collectJson.data.totalPaid, 'Remaining:', collectJson.data.remainingBalance);
    if (collectRes.status !== 201) throw new Error('Failed to record collection');
    if (collectJson.data.totalPaid !== 1600 || collectJson.data.remainingBalance !== 11000) {
      throw new Error('Financial calculations after collection mismatch');
    }

    // 11. Archive / Delete Employee
    console.log('\n[11] Testing Archive Employee:');
    const deleteRes = await fetch(`${baseUrl}/api/v1/admin/employees/${employeeMongoId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Archive employee status:', deleteRes.status);
    if (deleteRes.status !== 200) throw new Error('Failed to archive employee');

    // 12. Verify Swagger Endpoints
    console.log('\n[12] Checking Swagger paths:');
    const epCheck = [
      '/api/v1/auth/employee/login',
      '/api/v1/admin/employees',
      '/api/v1/admin/employees/{id}',
      '/api/v1/admin/employees/{id}/status',
      '/api/v1/admin/employees/{id}/reset-password',
      '/api/v1/employee/profile',
      '/api/v1/employee/assigned-borrowers',
      '/api/v1/employee/collections'
    ];
    for (const ep of epCheck) {
      if (!swaggerDocument.paths[ep]) {
        throw new Error(`Missing Swagger documentation for endpoint: ${ep}`);
      }
    }
    console.log('All required Employee Management & Portal endpoints present in Swagger!');

    // Clean up
    await Employee.deleteMany({ email: /test_employee/i });
    await FinanceRecord.deleteOne({ _id: testBorrower._id });

    console.log('\n✅ ALL EMPLOYEE MANAGEMENT & AUTH VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runEmployeeModuleTests().catch((err) => {
  console.error('\n❌ Employee verification test suite failed:', err);
  process.exit(1);
});
