import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import AuditLog from '../src/models/AuditLog.js';
import SystemSecurityLog from '../src/models/SystemSecurityLog.js';
import { clearAllAuditLogs, queryAuditLogs, deleteAuditLogById } from '../src/services/auditLogService.js';

async function runTest() {
  console.log('🚀 Starting Audit Logs Clear Verification Test...');
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not found in environment');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  // 1. Seed some test audit logs
  console.log('\n--- Step 1: Seeding test audit logs ---');
  await AuditLog.create([
    {
      userId: 'test-admin-1',
      userRole: 'admin',
      action: 'LOGIN',
      entityType: 'AUTH',
      details: { info: 'Test login entry 1' }
    },
    {
      userId: 'test-admin-2',
      userRole: 'admin',
      action: 'CREATE_EMPLOYEE',
      entityType: 'EMPLOYEE',
      details: { info: 'Test employee created' }
    },
    {
      userId: 'test-superadmin',
      userRole: 'superadmin',
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'SYSTEM',
      details: { info: 'Updated settings' }
    }
  ]);

  const initialCount = await AuditLog.countDocuments();
  console.log(`Current audit logs count in database: ${initialCount}`);
  if (initialCount < 3) {
    throw new Error('Failed to seed audit logs');
  }

  // 2. Test single deletion
  console.log('\n--- Step 2: Testing single audit log deletion ---');
  const sampleLog = await AuditLog.findOne({ action: 'LOGIN' });
  const singleDeleteResult = await deleteAuditLogById(sampleLog._id);
  console.log('Single delete result:', singleDeleteResult.message);
  const afterSingleDeleteCount = await AuditLog.countDocuments();
  console.log(`Audit logs count after single delete: ${afterSingleDeleteCount}`);

  // 3. Test clearAllAuditLogs with 'CLEAR' token
  console.log('\n--- Step 3: Testing clearAllAuditLogs with confirmation "CLEAR" ---');
  const mockReq = {
    user: { username: 'superadmin', role: 'superadmin' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'VerificationTest/1.0' }
  };

  const clearResult1 = await clearAllAuditLogs({ confirmation: 'CLEAR', req: mockReq });
  console.log(`Cleared logs count: ${clearResult1.deletedCount}`);

  const postClearCount = await AuditLog.countDocuments();
  console.log(`Audit logs in database after clearing: ${postClearCount}`);
  if (postClearCount !== 0) {
    throw new Error(`Expected 0 audit logs in database, found ${postClearCount}`);
  }

  // 4. Verify system security log entry was created
  console.log('\n--- Step 4: Verifying SystemSecurityLog record ---');
  const secLog = await SystemSecurityLog.findOne({ action: 'CLEAR_AUDIT_LOGS' }).sort({ timestamp: -1 });
  if (!secLog) {
    throw new Error('SystemSecurityLog record was not created for CLEAR_AUDIT_LOGS');
  }
  console.log('Found security log record:', {
    action: secLog.action,
    deletedCount: secLog.deletedCount,
    userRole: secLog.userRole,
    userId: secLog.userId
  });

  // 5. Test querying when empty
  console.log('\n--- Step 5: Testing queryAuditLogs when empty ---');
  const queryResult = await queryAuditLogs({ page: 1, limit: 10, currentUser: { role: 'superadmin' } });
  console.log('Query empty result data length:', queryResult.data.length, 'totalRecords:', queryResult.pagination.totalRecords);

  console.log('\n✅ All Audit Logs Clear verification checks passed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Verification test failed:', err);
  process.exit(1);
});
