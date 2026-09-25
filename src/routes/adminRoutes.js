import express from 'express';
import {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  updateAdminStatus,
  deleteAdmin
} from '../controllers/adminController.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply authentication and Super Admin authorization to all routes in this router
router.use(authenticateToken, requireSuperAdmin);

// Super Admin -> Admin management endpoints
router.post('/admins', createAdmin);
router.get('/admins', getAdmins);
router.get('/admins/:adminId', getAdmin);
router.put('/admins/:adminId', updateAdmin);
router.patch('/admins/:adminId/status', updateAdminStatus);
router.delete('/admins/:adminId', deleteAdmin);

export default router;
