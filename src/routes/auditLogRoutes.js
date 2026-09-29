import express from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLogController.js';
import { authenticateToken, requireAdminOrSuperAdmin } from '../middleware/authMiddleware.js';

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
 * @route   GET /api/audit-logs/:id
 * @desc    Get complete audit log details by ID
 * @access  Private (Admin, Super Admin)
 */
router.get('/:id', getAuditLogById);

export default router;
