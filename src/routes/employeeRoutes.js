import express from 'express';
import {
  getProfile,
  getBorrowers,
  collect
} from '../controllers/employeeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Enforce Employee role authorization on all employee portal endpoints
router.use(authenticateToken, authorizeRoles('employee'));

router.get('/profile', getProfile);
router.get('/assigned-borrowers', getBorrowers);
router.post('/collections', collect);

export default router;
