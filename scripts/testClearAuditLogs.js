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
import SystemSecurityLog from '../src/models/SystemSecurityLog.js';

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

async function runClearAuditLogsTests() {
  console.log('====================================================');
  console.log('--- KN FINANCE: CLEAR AUDIT LOGS SECURITY TEST SUITE ---');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected to MongoDB database:', mongoose.connection.name);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(` Test server running on ${baseUrl}`);

  let testAdmin = null;
  let testAdminId = null;
  let testEmployeeId = null;

  try {
    // Setup Super Admin Token
    const superAdminToken = jwt.sign(
      { role: 'superadmin', username: process.env.SUPERADMIN_USERNAME || 'Nagendra' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup Admin Token
    const testUsername = `testclearadmin_${Date.now()}`;
    testAdmin = new Admin({
      username: testUsername,
      password: 'password123',
      name: 'Clear Test Admin',
      email: `${testUsername}@knfinance.test`,
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

    // Seed dummy audit logs for testing
    console.log('\n--- Seeding test audit logs into auditlogs collection ---');
    await AuditLog.insertMany([
      { userId: 'admin_1', userRole: 'admin', action: 'CREATE', entityType: 'Employee', details: { test: 1 } },
      { userId: 'admin_1', userRole: 'admin', action: 'UPDATE', entityType: 'Employee', details: { test: 2 } },
      { userId: 'superadmin', userRole: 'superadmin', action: 'LOGIN', entityType: 'Auth', details: { test: 3 } }
    ]);
    const seededCount = await AuditLog.countDocuments();
    console.log(` Seeded audit logs. Current count in DB: ${seededCount}`);

    // TEST 5: Unauthenticated request -> 401
    console.log('\n--- TEST 5: Unauthenticated Request (No token) -> Expected 401 ---');
    const test5Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'CLEAR_ALL_AUDIT_LOGS' })
    });
    const test5Json = await test5Res.json();
    console.log('Status:', test5Res.status, 'Body:', test5Json);
    if (test5Res.status !== 401) throw new Error(`Test 5 failed: Expected 401, got ${test5Res.status}`);
    const countAfterTest5 = await AuditLog.countDocuments();
    if (countAfterTest5 !== seededCount) throw new Error('Test 5 failed: Records were deleted!');
    console.log('Test 5 Passed: 401 Unauthorized enforced. No records deleted.');

    // TEST 4: Admin + correct confirmation -> 403 Forbidden
    console.log('\n--- TEST 4: Normal Admin attempting to CLEAR -> Expected 403 Forbidden ---');
    const test4Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ confirmation: 'CLEAR_ALL_AUDIT_LOGS' })
    });
    const test4Json = await test4Res.json();
    console.log('Status:', test4Res.status, 'Body:', test4Json);
    if (test4Res.status !== 403) throw new Error(`Test 4 failed: Expected 403, got ${test4Res.status}`);
    const countAfterTest4 = await AuditLog.countDocuments();
    if (countAfterTest4 !== seededCount) throw new Error('Test 4 failed: Records were deleted by Admin!');
    console.log('Test 4 Passed: 403 Forbidden strictly enforced for Admin. No records deleted.');

    // TEST 3: Super Admin + missing confirmation -> 400
    console.log('\n--- TEST 3: Super Admin + Missing Confirmation -> Expected 400 ---');
    const test3Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({})
    });
    const test3Json = await test3Res.json();
    console.log('Status:', test3Res.status, 'Body:', test3Json);
    if (test3Res.status !== 400 || test3Json.message !== 'Confirmation required to clear audit logs') {
      throw new Error(`Test 3 failed: Expected 400 with confirmation message, got ${test3Res.status}`);
    }
    const countAfterTest3 = await AuditLog.countDocuments();
    if (countAfterTest3 !== seededCount) throw new Error('Test 3 failed: Records were deleted!');
    console.log('Test 3 Passed: 400 returned on missing confirmation. No records deleted.');

    // TEST 2: Super Admin + incorrect confirmation -> 400
    console.log('\n--- TEST 2: Super Admin + Incorrect Confirmation ("yes" / "delete") -> Expected 400 ---');
    const test2Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ confirmation: 'delete' })
    });
    const test2Json = await test2Res.json();
    console.log('Status:', test2Res.status, 'Body:', test2Json);
    if (test2Res.status !== 400 || test2Json.message !== 'Confirmation required to clear audit logs') {
      throw new Error(`Test 2 failed: Expected 400 with confirmation message, got ${test2Res.status}`);
    }
    const countAfterTest2 = await AuditLog.countDocuments();
    if (countAfterTest2 !== seededCount) throw new Error('Test 2 failed: Records were deleted!');
    console.log('Test 2 Passed: 400 returned on incorrect confirmation. No records deleted.');

    // TEST 1: Super Admin + correct confirmation -> 200 and all logs deleted
    console.log('\n--- TEST 1: Super Admin + Correct Confirmation ("CLEAR_ALL_AUDIT_LOGS") -> Expected 200 ---');
    const test1Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ confirmation: 'CLEAR_ALL_AUDIT_LOGS' })
    });
    const test1Json = await test1Res.json();
    console.log('Status:', test1Res.status, 'Body:', test1Json);
    if (test1Res.status !== 200 || !test1Json.success || test1Json.deletedCount !== seededCount) {
      throw new Error(`Test 1 failed: Expected 200 and deletedCount ${seededCount}, got ${JSON.stringify(test1Json)}`);
    }

    const countAfterTest1 = await AuditLog.countDocuments();
    console.log(`Current auditlogs count in DB: ${countAfterTest1} (Expected: 0)`);
    if (countAfterTest1 !== 0) throw new Error('Test 1 failed: auditlogs collection is not empty!');

    // Check systemsecuritylogs collection
    const secLog = await SystemSecurityLog.findOne({ action: 'CLEAR_AUDIT_LOGS' }).sort({ createdAt: -1 });
    console.log('System Security Log entry verified:', secLog ? 'YES' : 'NO', {
      userRole: secLog?.userRole,
      action: secLog?.action,
      deletedCount: secLog?.deletedCount
    });
    if (!secLog || secLog.deletedCount !== seededCount) {
      throw new Error('Test 1 failed: CLEAR_AUDIT_LOGS not recorded in systemsecuritylogs');
    }
    console.log('Test 1 Passed: Successfully cleared all audit logs and recorded in systemsecuritylogs.');

    // TEST 6: Clear when no audit logs exist -> 200 with deletedCount = 0
    console.log('\n--- TEST 6: Clear when no audit logs exist -> Expected 200 & deletedCount = 0 ---');
    const test6Res = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({ confirmation: 'CLEAR_ALL_AUDIT_LOGS' })
    });
    const test6Json = await test6Res.json();
    console.log('Status:', test6Res.status, 'Body:', test6Json);
    if (test6Res.status !== 200 || test6Json.deletedCount !== 0 || test6Json.message !== 'No audit logs found') {
      throw new Error(`Test 6 failed: Expected deletedCount 0 and "No audit logs found", got ${JSON.stringify(test6Json)}`);
    }
    console.log('Test 6 Passed: Successfully handled empty collection with deletedCount: 0.');

    // TEST 7: Perform new application operation -> Verify future audit logging is fully functional
    console.log('\n--- TEST 7: Perform New Business Operation (Create Employee) -> Verify Audit Log Created ---');
    const newEmpPayload = {
      fullName: 'Venkata Subba Rao',
      age: 32,
      phone: '9848022338',
      email: `venkat_${Date.now()}@knfinance.test`,
      assignedOperationalArea: 'Palakollu Rural',
      village: 'Palakollu',
      password: 'EmployeePass@123'
    };

    const newEmpRes = await fetch(`${baseUrl}/api/v1/admin/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify(newEmpPayload)
    });
    const newEmpJson = await newEmpRes.json();
    console.log('Create employee status:', newEmpRes.status, newEmpJson.success ? 'Success' : 'Failed');
    if (!newEmpJson.success) throw new Error(`Create employee failed: ${newEmpJson.message}`);
    testEmployeeId = newEmpJson.data.employee._id;

    // Check if new audit log exists
    const newAuditLog = await AuditLog.findOne({
      entityType: 'Employee',
      entityId: testEmployeeId.toString(),
      action: 'CREATE'
    });
    console.log('New audit log created after clear:', newAuditLog ? 'YES' : 'NO', {
      action: newAuditLog?.action,
      entityType: newAuditLog?.entityType,
      userId: newAuditLog?.userId
    });
    if (!newAuditLog) throw new Error('Test 7 failed: New audit log document was not created after clear operation!');
    console.log('Test 7 Passed: Future audit logging works perfectly after clear operation.');

    // Verify Collection & Indexes Integrity
    console.log('\n--- DATA PROTECTION & INDEX INTEGRITY VERIFICATION ---');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('Database collections list:', collectionNames);

    if (!collectionNames.includes('auditlogs')) {
      throw new Error('Verification failed: auditlogs collection was dropped!');
    }

    const indexes = await AuditLog.collection.indexes();
    console.log(`Indexes preserved on auditlogs collection: ${indexes.length} indexes`);
    indexes.forEach(idx => console.log('  -', JSON.stringify(idx.key)));

    const otherCollections = ['admins', 'employees'];
    for (const c of otherCollections) {
      if (!collectionNames.includes(c)) throw new Error(`Verification failed: ${c} collection is missing!`);
    }
    console.log('All collections and indexes intact.');

    console.log('\n====================================================');
    console.log(' ALL 7 CLEAR AUDIT LOGS TEST CASES PASSED SUCCESSFULLY!');
    console.log('====================================================');
  } finally {
    if (testEmployeeId) {
      await Employee.deleteOne({ _id: testEmployeeId });
      await AuditLog.deleteMany({ entityId: testEmployeeId.toString() });
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

runClearAuditLogsTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
