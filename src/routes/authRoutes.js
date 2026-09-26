import express from 'express';
import {
  superAdminLogin,
  adminLogin,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

// Super Admin Login
// POST /api/auth/superadmin/login
router.post('/superadmin/login', superAdminLogin);

// Admin Login
// POST /api/auth/login and POST /api/auth/admin/login
router.post('/login', adminLogin);
router.post('/admin/login', adminLogin);

// Admin Password Reset Workflow
// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// POST /api/auth/resend-otp
router.post('/resend-otp', resendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOtp);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;
