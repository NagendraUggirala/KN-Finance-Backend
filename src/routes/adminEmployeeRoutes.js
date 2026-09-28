import express from 'express';
import {
  listEmployees,
  addEmployee,
  editEmployee,
  updateStatus,
  adminResetPassword,
  deleteEmployee
} from '../controllers/adminEmployeeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Enforce Admin and SuperAdmin authorization on all employee management endpoints
router.use(authenticateToken, authorizeRoles('admin', 'superadmin'));

router.get('/', listEmployees);
router.post('/', addEmployee);
router.put('/:id', editEmployee);
router.patch('/:id/status', updateStatus);
router.post('/:id/reset-password', adminResetPassword);
router.delete('/:id', deleteEmployee);

export default router;
