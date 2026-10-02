import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { createAuditLog, AUDIT_ACTIONS } from '../services/auditLogService.js';

/**
 * Super Admin Login
 * Route: POST /api/auth/superadmin/login
 * Authenticates using environment variables (process.env.SUPERADMIN_USERNAME & process.env.SUPERADMIN_PASSWORD)
 */
export const superAdminLogin = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate request body
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const envUsername = process.env.SUPERADMIN_USERNAME;
    const envPassword = process.env.SUPERADMIN_PASSWORD;

    // Compare credentials with environment variables
    if (username !== envUsername || password !== envPassword) {
      await createAuditLog({
        req,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Auth',
        entityId: username || 'superadmin',
        userId: username || 'superadmin',
        userRole: 'superadmin',
        details: { reason: 'Invalid Super Admin credentials', attemptedUsername: username }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid Super Admin credentials.'
      });
    }

    // Generate JWT token with required payload
    const payload = {
      role: 'superadmin',
      username: process.env.SUPERADMIN_USERNAME
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    // Log successful Super Admin login
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: 'Auth',
      entityId: 'superadmin',
      userId: process.env.SUPERADMIN_USERNAME || 'superadmin',
      userRole: 'superadmin',
      details: { username: process.env.SUPERADMIN_USERNAME }
    });

    // Return successful response without exposing password
    return res.status(200).json({
      success: true,
      message: 'Super Admin login successful',
      token,
      user: {
        role: 'superadmin',
        username: process.env.SUPERADMIN_USERNAME
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin Login
 * Route: POST /api/auth/login or POST /api/auth/admin/login
 * Authenticates Admin accounts stored in MongoDB
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find Admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });

    if (!admin) {
      await createAuditLog({
        req,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Admin',
        userId: normalizedEmail,
        userRole: 'admin',
        details: { email: normalizedEmail, reason: 'Admin account not found' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify account status
    if (admin.status !== 'active') {
      await createAuditLog({
        req,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Admin',
        entityId: admin._id.toString(),
        userId: admin._id.toString(),
        userRole: 'admin',
        details: { email: normalizedEmail, reason: 'Admin account inactive' }
      });

      return res.status(403).json({
        success: false,
        message: 'Admin account is inactive. Please contact Super Admin.'
      });
    }

    // Compare password with bcrypt hash
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await createAuditLog({
        req,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: 'Admin',
        entityId: admin._id.toString(),
        userId: admin._id.toString(),
        userRole: 'admin',
        details: { email: normalizedEmail, reason: 'Incorrect password' }
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT
    const payload = {
      userId: admin._id.toString(),
      role: admin.role,
      username: admin.username,
      email: admin.email
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    // Log successful Admin login
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.LOGIN,
      entityType: 'Admin',
      entityId: admin._id.toString(),
      userId: admin._id.toString(),
      userRole: 'admin',
      details: { username: admin.username, email: admin.email }
    });

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot Password - Send OTP
 * Route: POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check in Admin / Employee model
    const admin = await Admin.findOne({ email: normalizedEmail });
    const employee = !admin ? await Employee.findOne({ email: normalizedEmail, isArchived: { $ne: true } }) : null;
    const user = admin || employee;

    // Anti-enumeration: Return same success message even if user doesn't exist
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered with KN Finance, a verification OTP has been sent.'
      });
    }

    // Check 60-second cooldown on existing active reset request
    const existingReset = await PasswordReset.findOne({ adminId: user._id, verified: false }).sort({ createdAt: -1 });
    if (existingReset && existingReset.lastRequestedAt) {
      const elapsedMs = Date.now() - new Date(existingReset.lastRequestedAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate a cryptographically secure random 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Hash the OTP before storing it
    const otpHash = await bcrypt.hash(otp, 10);

    // 10 minutes expiration
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Replace/invalidate previous pending requests
    await PasswordReset.deleteMany({ adminId: user._id });

    // Store in PasswordReset collection
    await PasswordReset.create({
      adminId: user._id,
      userModel: admin ? 'Admin' : 'Employee',
      email: user.email,
      otpHash,
      expiresAt,
      attempts: 0,
      verified: false,
      lastRequestedAt: new Date()
    });

    // ⚡ DISPATCH EMAIL ASYNCHRONOUSLY IN BACKGROUND (Do NOT 'await' here!)
    sendPasswordResetEmail(user.email, otp, 10)
      .then(info => console.log(`[Email Sent]: OTP dispatched to ${user.email} (${info?.messageId || 'OK'})`))
      .catch(mailErr => console.error(`[Email Failed]: Could not send OTP to ${user.email}:`, mailErr?.message || mailErr));

    // Return instant HTTP 200 response (Anti-enumeration compliant)
    const responsePayload = {
      success: true,
      message: 'If this email is registered with KN Finance, a verification OTP has been sent.'
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.devOtp = otp; // Included for convenience during automated development testing
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP
 * Route: POST /api/auth/resend-otp
 */
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = await Admin.findOne({ email: normalizedEmail });
    const employee = !admin ? await Employee.findOne({ email: normalizedEmail, isArchived: { $ne: true } }) : null;
    const user = admin || employee;

    // Anti-enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered with KN Finance, a new OTP has been sent.'
      });
    }

    // Check 60-second cooldown
    const existingReset = await PasswordReset.findOne({ adminId: user._id, verified: false }).sort({ createdAt: -1 });
    if (existingReset && existingReset.lastRequestedAt) {
      const elapsedMs = Date.now() - new Date(existingReset.lastRequestedAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        });
      }
    }

    // Generate fresh OTP and hash
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await PasswordReset.deleteMany({ adminId: user._id });

    await PasswordReset.create({
      adminId: user._id,
      userModel: admin ? 'Admin' : 'Employee',
      email: user.email,
      otpHash,
      expiresAt,
      attempts: 0,
      verified: false,
      lastRequestedAt: new Date()
    });

    // ⚡ DISPATCH EMAIL ASYNCHRONOUSLY IN BACKGROUND (Do NOT 'await' here!)
    sendPasswordResetEmail(user.email, otp, 10)
      .then(info => console.log(`[Email Sent]: Resend OTP dispatched to ${user.email} (${info?.messageId || 'OK'})`))
      .catch(mailErr => console.error(`[Email Failed]: Could not resend OTP to ${user.email}:`, mailErr?.message || mailErr));

    const responsePayload = {
      success: true,
      message: 'A new verification OTP has been sent to your email.'
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.devOtp = otp;
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 * Route: POST /api/auth/verify-otp
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP code are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.toString().trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a 6-digit numeric code.'
      });
    }

    // Find active unverified password reset record
    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      verified: false
    }).sort({ createdAt: -1 });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active password reset request found. Please request a new OTP.'
      });
    }

    // Check expiration
    if (new Date() > new Date(resetRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new code.'
      });
    }

    // Check max attempts
    if (resetRecord.attempts >= 5) {
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      return res.status(429).json({
        success: false,
        message: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Compare submitted OTP with stored hash
    const isMatch = await bcrypt.compare(normalizedOtp, resetRecord.otpHash);

    if (!isMatch) {
      resetRecord.attempts += 1;
      await resetRecord.save();
      const remaining = 5 - resetRecord.attempts;

      if (remaining <= 0) {
        await PasswordReset.deleteOne({ _id: resetRecord._id });
        return res.status(429).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        });
      }

      return res.status(400).json({
        success: false,
        message: `Invalid verification code. ${remaining} attempt(s) remaining.`
      });
    }

    // Mark as verified & generate a cryptographically secure short-lived reset token
    const plainResetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(plainResetToken).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes to complete reset

    resetRecord.verified = true;
    resetRecord.resetTokenHash = resetTokenHash;
    resetRecord.resetTokenExpiresAt = resetTokenExpiresAt;
    await resetRecord.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken: plainResetToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Password
 * Route: POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token, new password, and password confirmation are required.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.'
      });
    }

    // Password validation: minimum 8 characters, at least one number or special character
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    if (!/[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one number or special character.'
      });
    }

    // Hash the incoming reset token to find the database record
    const resetTokenHash = crypto.createHash('sha256').update(resetToken.trim()).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      resetTokenHash,
      verified: true
    });

    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used password reset token.'
      });
    }

    // Check token expiration
    if (new Date() > new Date(resetRecord.resetTokenExpiresAt)) {
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new OTP.'
      });
    }

    // Find the User (Admin or Employee)
    let user = null;
    let userRole = 'admin';
    let entityType = 'Admin';

    if (resetRecord.userModel === 'Employee') {
      user = await Employee.findById(resetRecord.adminId);
      userRole = 'employee';
      entityType = 'Employee';
    } else {
      user = await Admin.findById(resetRecord.adminId);
      if (!user) {
        user = await Employee.findById(resetRecord.adminId);
        if (user) {
          userRole = 'employee';
          entityType = 'Employee';
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.'
      });
    }

    // Update password (pre-save hook hashes it using bcrypt automatically)
    user.password = newPassword;
    await user.save();

    // Invalidate/delete the password reset records for this user
    await PasswordReset.deleteMany({ adminId: user._id });

    // Log password reset audit (never logs passwords or tokens)
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.PASSWORD_RESET,
      entityType,
      entityId: user._id.toString(),
      userId: user._id.toString(),
      userRole,
      details: {
        username: user.username || user.employeeId || user.fullName,
        email: user.email
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};
