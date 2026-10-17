import express from 'express';
import {
  getAuditLogs,
  getAuditLogById,
  clearAuditLogs,
  deleteAuditLog
} from '../controllers/auditLogController.js';
import {
  authenticateToken,
  requireAdminOrSuperAdmin,
  requireSuperAdmin
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce JWT authentication and Admin/SuperAdmin role on all audit log endpoints
router.use(authenticateToken, requireAdminOrSuperAdmin);

/**
 * @route   GET /api/audit-logs
 * @desc    Query audit logs with pagination and filters
 * @access  Private (Admin, Super Admin)
 */
router.get('/', getAuditLogs);

/**
 * @route   DELETE /api/audit-logs / DELETE /api/audit-logs/clear / POST /api/audit-logs/clear
 * @desc    Permanently clear all audit logs (Requires Super Admin authorization)
 * @access  Private (Super Admin only)
 */
router.delete('/', requireSuperAdmin, clearAuditLogs);
router.delete('/clear', requireSuperAdmin, clearAuditLogs);
router.post('/clear', requireSuperAdmin, clearAuditLogs);

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get complete audit log details by ID
 * @access  Private (Admin, Super Admin)
 */
router.get('/:id', getAuditLogById);

/**
 * @route   DELETE /api/audit-logs/:id
 * @desc    Permanently delete a single audit log entry by ID
 * @access  Private (Super Admin only)
 */
router.delete('/:id', requireSuperAdmin, deleteAuditLog);

export default router;
