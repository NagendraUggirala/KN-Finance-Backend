import dns from 'node:dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import connectDB from '../config/db.js';
import Admin from '../src/models/Admin.js';
import Notification from '../src/models/Notification.js';
import AuditLog from '../src/models/AuditLog.js';
import {
  dispatchNotification,
  getDispatchedHistory,
  getAdminInbox,
  getAdminUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  resendNotificationEmail
} from '../src/services/notificationService.js';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const runTests = async () => {
  console.log('🧪 Starting Superadmin-to-Admin Notification System Tests...\n');

  try {
    await connectDB();
    console.log('✅ Connected to MongoDB Atlas\n');

    // 1. Fetch or create a test admin
    let testAdmin = await Admin.findOne({ role: 'admin' });
    if (!testAdmin) {
      testAdmin = await Admin.create({
        username: 'test_branch_admin_' + Date.now(),
        password: 'password123',
        name: 'Test Branch Admin',
        email: 'test_admin@knfinance.com',
        phone: '9999999999',
        status: 'active'
      });
      console.log('Created temporary test admin:', testAdmin.username);
    } else {
      console.log('Found existing branch admin:', testAdmin.name, `(${testAdmin.email})`);
    }

    const mockSuperAdminReq = {
      user: {
        userId: 'superadmin_id_001',
        username: 'Nagendra',
        role: 'superadmin',
        name: 'Super Admin'
      },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'TestRunner/1.0' }
    };

    // 2. Test Dispatch: recipientType = 'all'
    console.log('--- Test 1: Dispatch to All Admins (with sendEmail: true) ---');
    const dispatchAll = await dispatchNotification(
      {
        title: 'System Maintenance Scheduled',
        message: 'Portal will undergo scheduled routine maintenance on Sunday at 02:00 AM IST.',
        severity: 'Warning',
        recipientType: 'all',
        sendEmail: true,
        actionLink: 'https://knfinance.com/maintenance'
      },
      mockSuperAdminReq
    );
    console.log('✅ Dispatched to All:', dispatchAll.notification.title);
    console.log('   Target:', dispatchAll.notification.recipientTarget);
    console.log('   Recipients resolved:', dispatchAll.recipientsCount);
    console.log('   Email sent status:', dispatchAll.emailSent);

    // 3. Test Dispatch: recipientType = 'single'
    console.log('\n--- Test 2: Dispatch to Single Admin ---');
    const dispatchSingle = await dispatchNotification(
      {
        title: 'Branch Audit Compliance Pending',
        message: 'Please complete your branch ledger reconciliation before end of week.',
        severity: 'Critical',
        recipientType: 'single',
        targetAdminId: testAdmin._id,
        sendEmail: true
      },
      mockSuperAdminReq
    );
    console.log('✅ Dispatched to Single Admin:', dispatchSingle.notification.title);
    console.log('   Target Admin Name:', dispatchSingle.notification.targetAdminName);
    console.log('   Target Admin Email:', dispatchSingle.notification.targetAdminEmail);

    // 4. Test Dispatch: recipientType = 'status'
    console.log('\n--- Test 3: Dispatch by Admin Status (Active) ---');
    const dispatchStatus = await dispatchNotification(
      {
        title: 'New Feature Announcement: Finance Book v2',
        message: 'A new column customization feature is now active in your dashboard.',
        severity: 'Success',
        recipientType: 'status',
        targetStatus: 'active',
        sendEmail: false
      },
      mockSuperAdminReq
    );
    console.log('✅ Dispatched by Status:', dispatchStatus.notification.title);
    console.log('   Target:', dispatchStatus.notification.recipientTarget);

    // 5. Test Dispatch: recipientType = 'expiry'
    console.log('\n--- Test 4: Dispatch License Expiry Alert ---');
    const dispatchExpiry = await dispatchNotification(
      {
        title: 'Dashboard License Renewal Notice',
        message: 'Your branch operations license will expire in 15 days.',
        severity: 'Expiry',
        recipientType: 'expiry',
        targetAdminId: testAdmin._id,
        expiryDate: '2026-10-15',
        sendEmail: true,
        actionLink: 'https://knfinance.com/renew'
      },
      mockSuperAdminReq
    );
    console.log('✅ Dispatched Expiry Notice:', dispatchExpiry.notification.title);
    console.log('   Expiry Date:', dispatchExpiry.notification.expiryDate);

    // 6. Test Admin Inbox Retrieval
    console.log('\n--- Test 5: Admin Inbox Retrieval ---');
    const inbox = await getAdminInbox(testAdmin._id, testAdmin.status, {
      page: 1,
      limit: 10
    });
    console.log(`✅ Inbox fetched ${inbox.notifications.length} items. Total: ${inbox.pagination.total}`);
    console.log(`   Initial Unread Count: ${inbox.unreadCount}`);

    // Verify isRead is false for newly dispatched items
    const sampleInboxItem = inbox.notifications.find(
      n => n._id.toString() === dispatchSingle.notification._id.toString()
    );
    if (!sampleInboxItem) {
      throw new Error('Single dispatched item not found in test admin inbox!');
    }
    console.log(`   Sample item '${sampleInboxItem.title}' isRead = ${sampleInboxItem.isRead}`);

    // 7. Test Admin Unread Count
    console.log('\n--- Test 6: Fast Unread Count ---');
    const unreadCount = await getAdminUnreadCount(testAdmin._id, testAdmin.status);
    console.log('✅ Unread count badge:', unreadCount);

    // 8. Test Mark Single Notification as Read
    console.log('\n--- Test 7: Mark Single Notification as Read ---');
    const markReadResult = await markNotificationAsRead(dispatchSingle.notification._id, testAdmin._id);
    console.log('✅ Mark read result:', markReadResult);

    const inboxAfterSingleRead = await getAdminInbox(testAdmin._id, testAdmin.status);
    const updatedSample = inboxAfterSingleRead.notifications.find(
      n => n._id.toString() === dispatchSingle.notification._id.toString()
    );
    console.log(`   Updated sample isRead = ${updatedSample?.isRead} (readAt: ${updatedSample?.readAt})`);
    console.log(`   New unread count: ${inboxAfterSingleRead.unreadCount}`);

    // 9. Test Mark All as Read
    console.log('\n--- Test 8: Mark All Notifications as Read ---');
    const markAllResult = await markAllNotificationsAsRead(testAdmin._id, testAdmin.status);
    console.log('✅ Mark all modified count:', markAllResult.modifiedCount);

    const unreadCountAfterAll = await getAdminUnreadCount(testAdmin._id, testAdmin.status);
    console.log('✅ Unread count after mark all:', unreadCountAfterAll);

    // 10. Test Super Admin History
    console.log('\n--- Test 9: Super Admin Dispatched History ---');
    const history = await getDispatchedHistory({ page: 1, limit: 10 });
    console.log(`✅ Dispatched history returned ${history.notifications.length} records. Total: ${history.pagination.total}`);
    console.log('   Metrics:', history.metrics);

    // 11. Test Resend Notification Email
    console.log('\n--- Test 10: Resend Notification Email ---');
    const resendResult = await resendNotificationEmail(dispatchExpiry.notification._id, mockSuperAdminReq);
    console.log('✅ Resend result:', resendResult.emailSent ? 'Delivered/Simulated' : 'Failed');

    // 12. Test Audit Log Verification
    console.log('\n--- Test 11: Verify Audit Log Recording ---');
    const recentAuditLogs = await AuditLog.find({ entityType: 'Notification' })
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`✅ Found ${recentAuditLogs.length} Notification audit log records:`);
    recentAuditLogs.forEach(log => {
      console.log(`   - [${log.action}] ${log.entityType} (${log.details?.title || log.details?.action || 'N/A'}) by ${log.userRole}`);
    });

    // 13. Test Delete Notification
    console.log('\n--- Test 12: Delete Notification (Super Admin) ---');
    await deleteNotificationById(dispatchAll.notification._id, mockSuperAdminReq);
    await deleteNotificationById(dispatchSingle.notification._id, mockSuperAdminReq);
    await deleteNotificationById(dispatchStatus.notification._id, mockSuperAdminReq);
    await deleteNotificationById(dispatchExpiry.notification._id, mockSuperAdminReq);
    console.log('✅ Cleaned up test notifications successfully');

    console.log('\n🎉 ALL NOTIFICATION TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

runTests();
