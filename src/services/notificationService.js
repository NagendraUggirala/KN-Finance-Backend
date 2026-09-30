import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import { sendNotificationEmail } from './emailService.js';
import { createAuditLog, AUDIT_ACTIONS } from './auditLogService.js';

/**
 * Dispatches an in-app notification and sends email alerts (if requested)
 *
 * @param {Object} payload - Notification payload
 * @param {import('express').Request} [req] - Express request for audit logging
 * @returns {Promise<Object>} Created notification document and dispatch summary
 */
export const dispatchNotification = async (payload, req = null) => {
  const {
    title,
    message,
    severity = 'Info',
    recipientType,
    targetAdminId = null,
    targetStatus = null,
    expiryDate = null,
    sendEmail = false,
    actionLink = null,
    senderName = req?.user?.name || req?.user?.username || 'Super Admin'
  } = payload;

  if (!title || !title.trim()) {
    throw new Error('Notification title is required');
  }
  if (!message || !message.trim()) {
    throw new Error('Notification message is required');
  }
  if (!['all', 'single', 'status', 'expiry'].includes(recipientType)) {
    throw new Error('Invalid recipient type. Must be all, single, status, or expiry');
  }

  let recipientTarget = 'All Admins';
  let targetAdminName = null;
  let targetAdminEmail = null;
  let targetAdminIdClean = null;
  let targetStatusClean = null;
  let recipientEmails = [];

  // Resolve recipients and email addresses based on targeting type
  switch (recipientType) {
    case 'all': {
      recipientTarget = 'All Branch Admins';
      const allAdmins = await Admin.find({}, 'email name status');
      recipientEmails = allAdmins.map(a => a.email).filter(Boolean);
      break;
    }

    case 'single': {
      if (!targetAdminId) {
        throw new Error('Target Admin ID is required for single recipient type');
      }
      if (!mongoose.Types.ObjectId.isValid(targetAdminId)) {
        throw new Error('Invalid Target Admin ID format');
      }

      const admin = await Admin.findById(targetAdminId);
      if (!admin) {
        throw new Error(`Admin not found with ID: ${targetAdminId}`);
      }

      targetAdminIdClean = admin._id;
      targetAdminName = admin.name || admin.username;
      targetAdminEmail = admin.email;
      recipientTarget = `${admin.name || admin.username} (${admin.email})`;
      if (admin.email) {
        recipientEmails.push(admin.email);
      }
      break;
    }

    case 'status': {
      if (!targetStatus || !['active', 'inactive'].includes(targetStatus.toLowerCase())) {
        throw new Error('Target status must be either active or inactive');
      }
      targetStatusClean = targetStatus.toLowerCase();
      recipientTarget = `${targetStatusClean === 'active' ? 'Active' : 'Inactive'} Admins`;

      const statusAdmins = await Admin.find({ status: targetStatusClean }, 'email name');
      recipientEmails = statusAdmins.map(a => a.email).filter(Boolean);
      break;
    }

    case 'expiry': {
      if (targetAdminId) {
        if (!mongoose.Types.ObjectId.isValid(targetAdminId)) {
          throw new Error('Invalid Target Admin ID format');
        }
        const admin = await Admin.findById(targetAdminId);
        if (admin) {
          targetAdminIdClean = admin._id;
          targetAdminName = admin.name || admin.username;
          targetAdminEmail = admin.email;
          recipientTarget = `Dashboard License Expiry: ${admin.name || admin.username}`;
          if (admin.email) recipientEmails.push(admin.email);
        } else {
          recipientTarget = `Dashboard License Expiry (${expiryDate || 'Upcoming'})`;
        }
      } else {
        recipientTarget = `Dashboard License Expiry (${expiryDate || 'Upcoming'})`;
        const activeAdmins = await Admin.find({ status: 'active' }, 'email');
        recipientEmails = activeAdmins.map(a => a.email).filter(Boolean);
      }
      break;
    }

    default:
      recipientTarget = 'All Admins';
  }

  // Handle email dispatch if requested
  let isEmailSent = false;
  let emailDeliveryResult = null;

  if (sendEmail && recipientEmails.length > 0) {
    try {
      emailDeliveryResult = await sendNotificationEmail({
        to: recipientEmails,
        title: title.trim(),
        message: message.trim(),
        severity,
        actionLink: actionLink ? actionLink.trim() : null,
        senderName,
        expiryDate: expiryDate ? String(expiryDate).trim() : null
      });

      isEmailSent = emailDeliveryResult.sent === true;
    } catch (emailErr) {
      console.error('⚠️ [NotificationService] Email delivery warning:', emailErr.message);
      isEmailSent = false;
    }
  }

  // Create Notification document in MongoDB
  const notification = await Notification.create({
    title: title.trim(),
    message: message.trim(),
    severity,
    recipientType,
    recipientTarget,
    targetAdminId: targetAdminIdClean,
    targetAdminEmail,
    targetAdminName,
    targetStatus: targetStatusClean,
    expiryDate: expiryDate ? String(expiryDate).trim() : null,
    sendEmail: Boolean(sendEmail),
    isEmailSent,
    actionLink: actionLink ? actionLink.trim() : null,
    senderName,
    readBy: []
  });

  // Log in AuditLog
  await createAuditLog({
    req,
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'Notification',
    entityId: notification._id,
    details: {
      title: notification.title,
      severity: notification.severity,
      recipientType: notification.recipientType,
      recipientTarget: notification.recipientTarget,
      sendEmail: notification.sendEmail,
      isEmailSent: notification.isEmailSent,
      targetAdminName: notification.targetAdminName,
      recipientsCount: recipientEmails.length
    }
  });

  return {
    notification,
    recipientsCount: recipientEmails.length,
    emailSent: isEmailSent,
    emailResult: emailDeliveryResult
  };
};

/**
 * Retrieves dispatched notification history for Super Admin with filtering and pagination
 *
 * @param {Object} queryOptions
 * @returns {Promise<Object>}
 */
export const getDispatchedHistory = async ({
  page = 1,
  limit = 20,
  severity,
  recipientType,
  search
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {};

  if (severity && severity !== 'all') {
    filter.severity = severity;
  }
  if (recipientType && recipientType !== 'all') {
    filter.recipientType = recipientType;
  }
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { message: searchRegex },
      { recipientTarget: searchRegex },
      { targetAdminName: searchRegex },
      { targetAdminEmail: searchRegex }
    ];
  }

  const [notifications, total, totalAllCount, emailSentCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('targetAdminId', 'name username email')
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({}),
    Notification.countDocuments({ isEmailSent: true })
  ]);

  // Augment each notification with read count
  const augmentedNotifications = notifications.map(item => ({
    ...item,
    readCount: (item.readBy || []).length
  }));

  return {
    notifications: augmentedNotifications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    },
    metrics: {
      totalDispatched: totalAllCount,
      totalEmailsSent: emailSentCount
    }
  };
};

/**
 * Retrieves notifications targeted to a specific Admin with read status
 *
 * @param {string|mongoose.Types.ObjectId} adminId - Authenticated Admin ID
 * @param {string} [adminStatus='active'] - Admin account status ('active' | 'inactive')
 * @param {Object} queryOptions - Pagination & filters
 * @returns {Promise<Object>}
 */
export const getAdminInbox = async (
  adminId,
  adminStatus = 'active',
  { page = 1, limit = 20, severity, unreadOnly = false, search } = {}
) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const adminObjId = mongoose.Types.ObjectId.isValid(adminId)
    ? new mongoose.Types.ObjectId(adminId)
    : adminId;

  // Filter for notifications that apply to this admin
  const baseFilter = {
    $or: [
      { recipientType: 'all' },
      { targetAdminId: adminObjId },
      { recipientType: 'status', targetStatus: adminStatus.toLowerCase() },
      { recipientType: 'expiry', targetAdminId: null },
      { recipientType: 'expiry', targetAdminId: adminObjId }
    ]
  };

  const andConditions = [baseFilter];

  if (severity && severity !== 'all') {
    andConditions.push({ severity });
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    andConditions.push({
      $or: [{ title: searchRegex }, { message: searchRegex }]
    });
  }

  if (unreadOnly === true || unreadOnly === 'true') {
    andConditions.push({ 'readBy.adminId': { $ne: adminObjId } });
  }

  const query = andConditions.length > 1 ? { $and: andConditions } : baseFilter;

  const [rawNotifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({
      ...baseFilter,
      'readBy.adminId': { $ne: adminObjId }
    })
  ]);

  // Compute isRead flag for this specific admin
  const formattedNotifications = rawNotifications.map(item => {
    const readReceipt = (item.readBy || []).find(
      r => r.adminId && r.adminId.toString() === adminObjId.toString()
    );

    return {
      _id: item._id,
      title: item.title,
      message: item.message,
      severity: item.severity,
      recipientType: item.recipientType,
      recipientTarget: item.recipientTarget,
      expiryDate: item.expiryDate,
      actionLink: item.actionLink,
      senderName: item.senderName,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isRead: Boolean(readReceipt),
      readAt: readReceipt ? readReceipt.readAt : null
    };
  });

  return {
    notifications: formattedNotifications,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 1
    },
    unreadCount
  };
};

/**
 * Retrieves unread notification count badge for an Admin
 *
 * @param {string|mongoose.Types.ObjectId} adminId
 * @param {string} [adminStatus='active']
 * @returns {Promise<number>}
 */
export const getAdminUnreadCount = async (adminId, adminStatus = 'active') => {
  const adminObjId = mongoose.Types.ObjectId.isValid(adminId)
    ? new mongoose.Types.ObjectId(adminId)
    : adminId;

  const baseFilter = {
    $or: [
      { recipientType: 'all' },
      { targetAdminId: adminObjId },
      { recipientType: 'status', targetStatus: adminStatus.toLowerCase() },
      { recipientType: 'expiry', targetAdminId: null },
      { recipientType: 'expiry', targetAdminId: adminObjId }
    ],
    'readBy.adminId': { $ne: adminObjId }
  };

  return await Notification.countDocuments(baseFilter);
};

/**
 * Marks a specific notification as read by an Admin
 *
 * @param {string} notificationId
 * @param {string|mongoose.Types.ObjectId} adminId
 * @returns {Promise<Object>}
 */
export const markNotificationAsRead = async (notificationId, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error('Invalid Notification ID format');
  }

  const adminObjId = mongoose.Types.ObjectId.isValid(adminId)
    ? new mongoose.Types.ObjectId(adminId)
    : adminId;

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  // Check if already read
  const alreadyRead = notification.readBy.some(
    r => r.adminId && r.adminId.toString() === adminObjId.toString()
  );

  if (!alreadyRead) {
    notification.readBy.push({
      adminId: adminObjId,
      readAt: new Date()
    });
    await notification.save();
  }

  return {
    notificationId: notification._id,
    isRead: true,
    readAt: new Date()
  };
};

/**
 * Marks all applicable notifications as read for an Admin
 *
 * @param {string|mongoose.Types.ObjectId} adminId
 * @param {string} [adminStatus='active']
 * @returns {Promise<{ modifiedCount: number }>}
 */
export const markAllNotificationsAsRead = async (adminId, adminStatus = 'active') => {
  const adminObjId = mongoose.Types.ObjectId.isValid(adminId)
    ? new mongoose.Types.ObjectId(adminId)
    : adminId;

  const baseFilter = {
    $or: [
      { recipientType: 'all' },
      { targetAdminId: adminObjId },
      { recipientType: 'status', targetStatus: adminStatus.toLowerCase() },
      { recipientType: 'expiry', targetAdminId: null },
      { recipientType: 'expiry', targetAdminId: adminObjId }
    ],
    'readBy.adminId': { $ne: adminObjId }
  };

  const result = await Notification.updateMany(baseFilter, {
    $push: {
      readBy: {
        adminId: adminObjId,
        readAt: new Date()
      }
    }
  });

  return {
    modifiedCount: result.modifiedCount || 0
  };
};

/**
 * Deletes a notification by ID (Super Admin only)
 *
 * @param {string} notificationId
 * @param {import('express').Request} [req]
 * @returns {Promise<Object>}
 */
export const deleteNotificationById = async (notificationId, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error('Invalid Notification ID format');
  }

  const notification = await Notification.findByIdAndDelete(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  // Log in AuditLog
  await createAuditLog({
    req,
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'Notification',
    entityId: notification._id,
    details: {
      title: notification.title,
      recipientTarget: notification.recipientTarget,
      severity: notification.severity
    }
  });

  return notification;
};

/**
 * Resends the email for an existing notification
 *
 * @param {string} notificationId
 * @param {import('express').Request} [req]
 * @returns {Promise<Object>}
 */
export const resendNotificationEmail = async (notificationId, req = null) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new Error('Invalid Notification ID format');
  }

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new Error('Notification not found');
  }

  // Resolve recipient emails
  let recipientEmails = [];
  if (notification.recipientType === 'single') {
    if (notification.targetAdminEmail) {
      recipientEmails.push(notification.targetAdminEmail);
    } else if (notification.targetAdminId) {
      const admin = await Admin.findById(notification.targetAdminId);
      if (admin?.email) recipientEmails.push(admin.email);
    }
  } else if (notification.recipientType === 'status') {
    const statusAdmins = await Admin.find({ status: notification.targetStatus }, 'email');
    recipientEmails = statusAdmins.map(a => a.email).filter(Boolean);
  } else {
    // all or expiry
    const allAdmins = await Admin.find({}, 'email');
    recipientEmails = allAdmins.map(a => a.email).filter(Boolean);
  }

  if (recipientEmails.length === 0) {
    throw new Error('No recipient email addresses found for this notification');
  }

  const emailResult = await sendNotificationEmail({
    to: recipientEmails,
    title: notification.title,
    message: notification.message,
    severity: notification.severity,
    actionLink: notification.actionLink,
    senderName: notification.senderName,
    expiryDate: notification.expiryDate
  });

  notification.isEmailSent = emailResult.sent === true;
  await notification.save();

  // Log in AuditLog
  await createAuditLog({
    req,
    action: 'EXPORT',
    entityType: 'Notification',
    entityId: notification._id,
    details: {
      action: 'RESEND_EMAIL',
      title: notification.title,
      recipientsCount: recipientEmails.length,
      sent: notification.isEmailSent
    }
  });

  return {
    notificationId: notification._id,
    emailSent: notification.isEmailSent,
    recipientCount: recipientEmails.length,
    emailResult
  };
};
