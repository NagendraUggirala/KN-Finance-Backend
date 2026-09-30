import {
  dispatchNotification,
  getDispatchedHistory,
  getAdminInbox,
  getAdminUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotificationById,
  resendNotificationEmail
} from '../services/notificationService.js';
import Notification from '../models/Notification.js';

/**
 * Dispatches a new notification to branch admins (Super Admin only)
 * POST /api/v1/notifications
 */
export const createNotification = async (req, res) => {
  try {
    const result = await dispatchNotification(req.body, req);

    return res.status(201).json({
      success: true,
      message: 'Notification dispatched successfully',
      data: result.notification,
      dispatchSummary: {
        recipientsCount: result.recipientsCount,
        emailSent: result.emailSent
      }
    });
  } catch (error) {
    console.error('Error dispatching notification:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to dispatch notification'
    });
  }
};

/**
 * Retrieves full dispatched notification history (Super Admin only)
 * GET /api/v1/notifications/history or GET /api/v1/notifications
 */
export const getAllDispatchedNotifications = async (req, res) => {
  try {
    const { page, limit, severity, recipientType, search } = req.query;

    const result = await getDispatchedHistory({
      page,
      limit,
      severity,
      recipientType,
      search
    });

    return res.status(200).json({
      success: true,
      data: result.notifications,
      pagination: result.pagination,
      metrics: result.metrics
    });
  } catch (error) {
    console.error('Error fetching dispatched notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification history'
    });
  }
};

/**
 * Retrieves a single notification by ID
 * GET /api/v1/notifications/:id
 */
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id)
      .populate('targetAdminId', 'name username email')
      .populate('readBy.adminId', 'name username email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification by ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notification'
    });
  }
};

/**
 * Retrieves notifications for the currently logged-in Admin's inbox
 * GET /api/v1/notifications/inbox
 */
export const getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const adminStatus = req.user.status || 'active';
    const { page, limit, severity, unreadOnly, search } = req.query;

    const result = await getAdminInbox(adminId, adminStatus, {
      page,
      limit,
      severity,
      unreadOnly,
      search
    });

    return res.status(200).json({
      success: true,
      count: result.notifications.length,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
      data: result.notifications
    });
  } catch (error) {
    console.error('Error fetching admin inbox notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications'
    });
  }
};

/**
 * Retrieves the unread notification badge count for the logged-in Admin
 * GET /api/v1/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const adminStatus = req.user.status || 'active';

    const unreadCount = await getAdminUnreadCount(adminId, adminStatus);

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve unread count'
    });
  }
};

/**
 * Marks a single notification as read by the authenticated Admin
 * PATCH /api/v1/notifications/:id/read or PUT /api/v1/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id || req.user.userId;

    const result = await markNotificationAsRead(id, adminId);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to mark notification as read'
    });
  }
};

/**
 * Marks all applicable notifications as read for the authenticated Admin
 * PATCH /api/v1/notifications/read-all or PUT /api/v1/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const adminId = req.user.id || req.user.userId;
    const adminStatus = req.user.status || 'active';

    const result = await markAllNotificationsAsRead(adminId, adminStatus);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
};

/**
 * Deletes a dispatched notification (Super Admin only)
 * DELETE /api/v1/notifications/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteNotificationById(id, req);

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete notification'
    });
  }
};

/**
 * Resends email alert for an existing notification (Super Admin only)
 * POST /api/v1/notifications/:id/resend
 */
export const resendEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await resendNotificationEmail(id, req);

    return res.status(200).json({
      success: true,
      message: 'Notification email resent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error resending notification email:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to resend notification email'
    });
  }
};
