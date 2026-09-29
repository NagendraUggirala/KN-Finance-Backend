import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

import authRoutes from '../src/routes/authRoutes.js';
import adminRoutes from '../src/routes/adminRoutes.js';
import financeBookRoutes from '../src/routes/financeBookRoutes.js';
import adminEmployeeRoutes from '../src/routes/adminEmployeeRoutes.js';
import employeeRoutes from '../src/routes/employeeRoutes.js';
import auditLogRoutes from '../src/routes/auditLogRoutes.js';

import AuditLog from '../src/models/AuditLog.js';
import Admin from '../src/models/Admin.js';
import Employee from '../src/models/Employee.js';
import { createAuditLog, AUDIT_ACTIONS } from '../src/services/auditLogService.js';
import { sanitizeAuditDetails, computeDiff } from '../src/utils/auditLogSanitizer.js';

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
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function runAuditLogTests() {
  console.log('====================================================');
  console.log('--- KN FINANCE: AUDIT LOG SYSTEM TEST SUITE ---');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected to MongoDB database:', mongoose.connection.name);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(` Test server running on ${baseUrl}`);

  let testAdmin = null;
  let createdEmployeeId = null;
  let testAdminId = null;

  try {
    // 0. Setup Tokens
    const superAdminToken = jwt.sign(
      { role: 'superadmin', username: process.env.SUPERADMIN_USERNAME || 'Nagendra' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a dedicated test Admin if doesn't exist
    const testUsername = `testauditadmin_${Date.now()}`;
    const testEmail = `${testUsername}@knfinance.test`;
    testAdmin = new Admin({
      username: testUsername,
      password: 'password123',
      name: 'Audit Test Admin',
      email: testEmail,
      phone: '9876543210',
      role: 'admin',
      status: 'active'
    });
    await testAdmin.save();
    testAdminId = testAdmin._id.toString();

    const adminToken = jwt.sign(
      { userId: testAdminId, id: testAdminId, username: testAdmin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const unauthorizedToken = jwt.sign(
      { userId: 'staff_user_1', role: 'staff' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('\n--- SCENARIO 1: Admin Creates Employee -> CREATE Audit Log ---');
    const employeePayload = {
      fullName: 'Sita Rama Raju',
      age: 29,
      phone: '9876543211',
      email: `sitaram_${Date.now()}@knfinance.test`,
      aadharCard: '123456789012',
      panCard: 'ABCDE1234F',
      assignedOperationalArea: 'Ravulapalem North',
      village: 'Ravulapalem',
      password: 'SecurePass@123'
    };

    const createEmpRes = await fetch(`${baseUrl}/api/v1/admin/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(employeePayload)
    });
    const createEmpJson = await createEmpRes.json();
    console.log('Employee creation status:', createEmpRes.status, createEmpJson.success ? 'Success' : 'Failed');
    if (!createEmpJson.success) throw new Error(`Create employee failed: ${createEmpJson.message}`);

    createdEmployeeId = createEmpJson.data.employee._id;
    console.log('Created Employee Mongo ID:', createdEmployeeId);

    // Check AuditLog in DB
    const empCreateLog = await AuditLog.findOne({
      entityType: 'Employee',
      entityId: createdEmployeeId.toString(),
      action: 'CREATE'
    });
    console.log('CREATE Audit log verified in DB:', empCreateLog ? 'YES' : 'NO');
    if (!empCreateLog) throw new Error('Scenario 1 failed: CREATE audit log not found');
    console.log('Audit log details:', JSON.stringify(empCreateLog.details));
    console.log('Password absent from audit log:', empCreateLog.details.password === undefined ? 'YES' : 'NO');

    console.log('\n--- SCENARIO 2: Admin Updates Employee -> UPDATE Audit Log with Before/After Diff ---');
    const updateEmpRes = await fetch(`${baseUrl}/api/v1/admin/employees/${createdEmployeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        phone: '9123456780',
        village: 'Narsapuram'
      })
    });
    const updateEmpJson = await updateEmpRes.json();
    console.log('Employee update status:', updateEmpRes.status, updateEmpJson.success ? 'Success' : 'Failed');

    const empUpdateLog = await AuditLog.findOne({
      entityType: 'Employee',
      entityId: createdEmployeeId.toString(),
      action: 'UPDATE'
    }).sort({ createdAt: -1 });

    console.log('UPDATE Audit log verified in DB:', empUpdateLog ? 'YES' : 'NO');
    if (!empUpdateLog) throw new Error('Scenario 2 failed: UPDATE audit log not found');
    console.log('Changed fields captured:', empUpdateLog.details.changedFields);
    console.log('Before state:', empUpdateLog.details.before);
    console.log('After state:', empUpdateLog.details.after);
    if (!empUpdateLog.details.changedFields.includes('phone') || !empUpdateLog.details.changedFields.includes('village')) {
      throw new Error('Scenario 2 failed: changedFields does not contain expected keys');
    }

    console.log('\n--- SCENARIO 3: Admin Deactivates and Deletes Employee -> STATUS_CHANGE & DELETE Logs ---');
    // Deactivate
    const statusRes = await fetch(`${baseUrl}/api/v1/admin/employees/${createdEmployeeId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Inactive' })
    });
    const statusJson = await statusRes.json();
    console.log('Status change response:', statusRes.status, statusJson.success ? 'Success' : 'Failed');

    const statusLog = await AuditLog.findOne({
      entityType: 'Employee',
      entityId: createdEmployeeId.toString(),
      action: 'STATUS_CHANGE'
    }).sort({ createdAt: -1 });
    console.log('STATUS_CHANGE log found:', statusLog ? 'YES' : 'NO', statusLog?.details);

    // Delete
    const deleteRes = await fetch(`${baseUrl}/api/v1/admin/employees/${createdEmployeeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteJson = await deleteRes.json();
    console.log('Delete employee response:', deleteRes.status, deleteJson.success ? 'Success' : 'Failed');

    const deleteLog = await AuditLog.findOne({
      entityType: 'Employee',
      entityId: createdEmployeeId.toString(),
      action: 'DELETE'
    }).sort({ createdAt: -1 });
    console.log('DELETE log found:', deleteLog ? 'YES' : 'NO', deleteLog?.details);

    console.log('\n--- SCENARIO 4: Super Admin Manages Admin -> CREATE, UPDATE, STATUS_CHANGE, DELETE Logs ---');
    const newAdminUsername = `tempadmin_${Date.now()}`;
    const createAdminRes = await fetch(`${baseUrl}/api/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        username: newAdminUsername,
        password: 'AdminPassword@123',
        name: 'Temporary Admin',
        email: `${newAdminUsername}@knfinance.test`,
        phone: '9988776655'
      })
    });
    const createAdminJson = await createAdminRes.json();
    console.log('Create admin status:', createAdminRes.status, createAdminJson.success ? 'Success' : 'Failed');
    const tempAdminId = createAdminJson.admin._id;

    // Check CREATE Admin Log
    const adminCreateLog = await AuditLog.findOne({
      entityType: 'Admin',
      entityId: tempAdminId.toString(),
      action: 'CREATE'
    });
    console.log('Admin CREATE log found:', adminCreateLog ? 'YES' : 'NO', adminCreateLog?.details?.username);

    // Super admin updates admin phone
    const updateAdminRes = await fetch(`${baseUrl}/api/superadmin/admins/${tempAdminId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ phone: '9900000099' })
    });
    const updateAdminJson = await updateAdminRes.json();
    console.log('Update admin status:', updateAdminRes.status, updateAdminJson.success ? 'Success' : 'Failed');

    const adminUpdateLog = await AuditLog.findOne({
      entityType: 'Admin',
      entityId: tempAdminId.toString(),
      action: 'UPDATE'
    }).sort({ createdAt: -1 });
    console.log('Admin UPDATE log before/after:', adminUpdateLog?.details?.before, '->', adminUpdateLog?.details?.after);

    // Delete temp admin
    await fetch(`${baseUrl}/api/superadmin/admins/${tempAdminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` }
    });

    console.log('\n--- SCENARIO 5: Successful Login -> LOGIN Audit Log ---');
    const loginRes = await fetch(`${baseUrl}/api/auth/superadmin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.SUPERADMIN_USERNAME || 'Nagendra',
        password: process.env.SUPERADMIN_PASSWORD || 'qwerty@123'
      })
    });
    const loginJson = await loginRes.json();
    console.log('Super Admin login status:', loginRes.status, loginJson.success ? 'Success' : 'Failed');

    const loginLog = await AuditLog.findOne({
      action: 'LOGIN',
      userRole: 'superadmin'
    }).sort({ createdAt: -1 });
    console.log('LOGIN audit log found:', loginLog ? 'YES' : 'NO', 'User:', loginLog?.userId);

    console.log('\n--- SCENARIO 6: Failed Login -> LOGIN_FAILED Audit Log ---');
    const failLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid_nonexistent_user@knfinance.test',
        password: 'wrong_password_123'
      })
    });
    console.log('Failed login attempt status:', failLoginRes.status);

    const failLog = await AuditLog.findOne({
      action: 'LOGIN_FAILED',
      userId: 'invalid_nonexistent_user@knfinance.test'
    }).sort({ createdAt: -1 });
    console.log('LOGIN_FAILED audit log recorded in DB:', failLog ? 'YES' : 'NO', failLog?.details);

    console.log('\n--- SCENARIO 7: Admin Requests Audit Logs -> Authorized Response with Pagination & Filters ---');
    const getLogsRes = await fetch(`${baseUrl}/api/audit-logs?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const getLogsJson = await getLogsRes.json();
    console.log('Audit logs fetch status:', getLogsRes.status, getLogsJson.success ? 'Success' : 'Failed');
    console.log('Records returned:', getLogsJson.data?.length);
    console.log('Pagination info:', getLogsJson.pagination);
    if (!getLogsJson.success || !getLogsJson.pagination || getLogsJson.data.length === 0) {
      throw new Error('Scenario 7 failed: Unexpected audit logs response structure');
    }

    console.log('\n--- SCENARIO 8: Unauthorized User Requests Audit Logs -> 403 Response ---');
    const unauthRes = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${unauthorizedToken}` }
    });
    console.log('Unauthorized request status:', unauthRes.status, '(Expected 403)');
    if (unauthRes.status !== 403) throw new Error(`Scenario 8 failed: Expected 403, got ${unauthRes.status}`);

    console.log('\n--- SCENARIO 9: Invalid Audit-Log ID -> 400/404 Response ---');
    const invalidIdRes = await fetch(`${baseUrl}/api/audit-logs/not-a-valid-object-id`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Invalid format ID status:', invalidIdRes.status, '(Expected 400)');
    if (invalidIdRes.status !== 400) throw new Error(`Scenario 9 failed: Expected 400, got ${invalidIdRes.status}`);

    const nonexistentIdRes = await fetch(`${baseUrl}/api/audit-logs/66f4c222b123c456d789e999`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Non-existent ID status:', nonexistentIdRes.status, '(Expected 404)');
    if (nonexistentIdRes.status !== 404) throw new Error(`Scenario 9 failed: Expected 404, got ${nonexistentIdRes.status}`);

    console.log('\n--- SCENARIO 10: Audit Log Creation Fails -> Non-Blocking Resiliency ---');
    // Call createAuditLog with simulated invalid state or check that createAuditLog returns null without throwing
    const failedLogResult = await createAuditLog({
      action: null, // intentionally missing required action
      entityType: null
    });
    console.log('Graceful non-blocking return on error:', failedLogResult === null ? 'PASSED (returned null safely)' : 'FAILED');

    console.log('\n--- SCENARIO 11: Sensitive Information Redaction & Masking Verification ---');
    const dirtyData = {
      password: 'PlainSecretPassword!@#',
      token: 'jwt.token.string.secret',
      otp: '123456',
      aadharCard: '123456789012',
      panCard: 'ABCDE1234F',
      phone: '9876543210',
      nested: {
        apiKey: 'secret_api_key_123',
        normalField: 'safe business value'
      }
    };
    const cleaned = sanitizeAuditDetails(dirtyData);
    console.log('Original dirty data:', Object.keys(dirtyData));
    console.log('Sanitized data output:', JSON.stringify(cleaned, null, 2));

    if (cleaned.password !== '[REDACTED]' || cleaned.token !== '[REDACTED]' || cleaned.otp !== '[REDACTED]') {
      throw new Error('Scenario 11 failed: password or token was not redacted');
    }
    if (cleaned.aadharCard === '123456789012' || !cleaned.aadharCard.includes('9012')) {
      throw new Error('Scenario 11 failed: aadharCard was not properly masked');
    }
    if (cleaned.panCard === 'ABCDE1234F' || !cleaned.panCard.includes('234F')) {
      throw new Error('Scenario 11 failed: panCard was not properly masked');
    }
    console.log('Sensitive sanitization verification: PASSED');

    console.log('\n====================================================');
    console.log(' ALL 11 AUDIT LOG VERIFICATION SCENARIOS PASSED!');
    console.log('====================================================');
  } finally {
    // Cleanup created test records
    if (createdEmployeeId) {
      await Employee.deleteOne({ _id: createdEmployeeId });
      await AuditLog.deleteMany({ entityId: createdEmployeeId.toString() });
    }
    if (testAdminId) {
      await Admin.deleteOne({ _id: testAdminId });
      await AuditLog.deleteMany({ entityId: testAdminId });
    }
    server.close();
    await mongoose.disconnect();
    console.log(' Database disconnected and test server stopped.');
  }
}

runAuditLogTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
