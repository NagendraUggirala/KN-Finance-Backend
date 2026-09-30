import express from 'express';
import {
  createNotification,
  getAllDispatchedNotifications,
  getNotificationById,
  getAdminNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  resendEmail
} from '../controllers/notificationController.js';
import {
  authenticateToken,
  requireSuperAdmin,
  requireAdminOrSuperAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();

// -------------------------------------------------------------
// Admin / Recipient Routes (Admins and Super Admins)
// -------------------------------------------------------------

// Admin inbox with filters & unread indicators
router.get(
  '/inbox',
  authenticateToken,
  requireAdminOrSuperAdmin,
  getAdminNotifications
);

// Admin unread count badge for header/sidebar
router.get(
  '/unread-count',
  authenticateToken,
  requireAdminOrSuperAdmin,
  getUnreadCount
);

// Mark all notifications as read for current admin
router.patch(
  '/read-all',
  authenticateToken,
  requireAdminOrSuperAdmin,
  markAllAsRead
);
router.put(
  '/read-all',
  authenticateToken,
  requireAdminOrSuperAdmin,
  markAllAsRead
);

// Mark specific notification as read
router.patch(
  '/:id/read',
  authenticateToken,
  requireAdminOrSuperAdmin,
  markAsRead
);
router.put(
  '/:id/read',
  authenticateToken,
  requireAdminOrSuperAdmin,
  markAsRead
);

// -------------------------------------------------------------
// Super Admin Management Routes
// -------------------------------------------------------------

// Dispatched history list (Super Admin only)
router.get(
  '/history',
  authenticateToken,
  requireSuperAdmin,
  getAllDispatchedNotifications
);

// Dispatch new notification (in-app + optional email alert)
router.post(
  '/',
  authenticateToken,
  requireSuperAdmin,
  createNotification
);

// Root GET: Route history for Super Admin, or inbox for Branch Admin
router.get(
  '/',
  authenticateToken,
  (req, res, next) => {
    if (req.user?.role === 'superadmin') {
      return getAllDispatchedNotifications(req, res, next);
    }
    return getAdminNotifications(req, res, next);
  }
);

// Resend notification email
router.post(
  '/:id/resend',
  authenticateToken,
  requireSuperAdmin,
  resendEmail
);

// Get single notification by ID
router.get(
  '/:id',
  authenticateToken,
  requireAdminOrSuperAdmin,
  getNotificationById
);

// Delete notification (Super Admin only)
router.delete(
  '/:id',
  authenticateToken,
  requireSuperAdmin,
  deleteNotification
);

export default router;
