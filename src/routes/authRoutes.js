import express from 'express';
import {
  unifiedLogin,
  superAdminLogin,
  adminLogin,
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword
} from '../controllers/authController.js';

const router = express.Router();

// ==========================================
// UNIFIED SINGLE LOGIN (Primary Endpoint)
// POST /api/auth/login or POST /api/v1/auth/login
// Supports: Super Admin, Admin, and Employee
// ==========================================
router.post('/login', unifiedLogin);

// ==========================================
// BACKWARD-COMPATIBLE ROUTE ALIASES
// ==========================================
router.post('/admin/login', unifiedLogin);
router.post('/superadmin/login', unifiedLogin);
router.post('/employee/login', unifiedLogin);


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
