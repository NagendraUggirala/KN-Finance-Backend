import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Employee from '../models/Employee.js';
import PasswordReset from '../models/PasswordReset.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { createAuditLog, AUDIT_ACTIONS } from '../services/auditLogService.js';

/**
 * Unified Login
 * Route: POST /api/auth/login or POST /api/v1/auth/login
 * Authenticates Super Admin, Admin, and Employee from a single unified POST endpoint.
 * Accepts: { email, password }
 */
export const unifiedLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const rawLoginId = (email || req.body.identifier || req.body.username || req.body.employeeId || '').toString().trim();

    // Validate request body
    if (!rawLoginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedLoginId = rawLoginId.toLowerCase();
    const envUsername = (process.env.SUPERADMIN_USERNAME || '').trim();
    const envEmail = (process.env.SUPERADMIN_EMAIL || process.env.EMAIL_USER || '').trim();
    const envPassword = process.env.SUPERADMIN_PASSWORD;

    // 1. Check Super Admin Credentials (via environment variables)
    const isSuperAdmin =
      (envUsername && (normalizedLoginId === envUsername.toLowerCase() || rawLoginId === envUsername)) ||
      (envEmail && normalizedLoginId === envEmail.toLowerCase());

    if (isSuperAdmin) {
      if (password === envPassword) {
        const payload = {
          role: 'superadmin',
          username: envUsername
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRES_IN || '1d'
        });

        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN,
          entityType: 'Auth',
          entityId: 'superadmin',
          userId: envUsername,
          userRole: 'superadmin',
          details: { username: envUsername }
        });

        return res.status(200).json({
          success: true,
          message: 'Super Admin login successful',
          token,
          user: {
            role: 'superadmin',
            username: envUsername
          }
        });
      } else {
        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Auth',
          entityId: rawLoginId,
          userId: rawLoginId,
          userRole: 'superadmin',
          details: { reason: 'Invalid Super Admin credentials', attemptedUsername: rawLoginId }
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    }

    // 2. Check Admin Collection
    const admin = await Admin.findOne({
      $or: [
        { email: normalizedLoginId },
        { username: rawLoginId }
      ]
    });

    if (admin) {
      if (admin.status !== 'active') {
        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Admin',
          entityId: admin._id.toString(),
          userId: admin._id.toString(),
          userRole: 'admin',
          details: { email: admin.email, reason: 'Admin account inactive' }
        });

        return res.status(403).json({
          success: false,
          message: 'Admin account is inactive. Please contact Super Admin.'
        });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Admin',
          entityId: admin._id.toString(),
          userId: admin._id.toString(),
          userRole: 'admin',
          details: { email: admin.email, reason: 'Incorrect password' }
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const payload = {
        userId: admin._id.toString(),
        role: admin.role,
        username: admin.username,
        email: admin.email
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      });

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
    }

    // 3. Check Employee Collection
    const employee = await Employee.findOne({
      $or: [
        { email: normalizedLoginId },
        { employeeId: rawLoginId.toUpperCase() }
      ],
      isArchived: false
    }).select('+password');

    if (employee) {
      if (employee.status !== 'Active') {
        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Employee',
          entityId: employee._id.toString(),
          userId: employee.employeeId,
          userRole: 'employee',
          details: { employeeId: employee.employeeId, reason: 'Employee account inactive' }
        });

        return res.status(403).json({
          success: false,
          message: 'Employee account is inactive. Please contact Admin.'
        });
      }

      const isMatch = await employee.comparePassword(password);
      if (!isMatch) {
        await createAuditLog({
          req,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Employee',
          entityId: employee._id.toString(),
          userId: employee.employeeId,
          userRole: 'employee',
          details: { employeeId: employee.employeeId, reason: 'Incorrect password' }
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const payload = {
        id: employee._id.toString(),
        userId: employee._id.toString(),
        employeeId: employee.employeeId,
        role: 'employee',
        adminId: employee.adminId ? employee.adminId.toString() : null,
        tokenVersion: employee.tokenVersion || 0
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
      });

      await createAuditLog({
        req,
        action: AUDIT_ACTIONS.LOGIN,
        entityType: 'Employee',
        entityId: employee._id.toString(),
        userId: employee.employeeId,
        userRole: 'employee',
        details: { employeeId: employee.employeeId, email: employee.email }
      });

      const employeeData = {
        id: employee._id.toString(),
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        name: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        role: 'employee',
        adminId: employee.adminId ? employee.adminId.toString() : null,
        assignedOperationalArea: employee.assignedOperationalArea,
        village: employee.village,
        status: employee.status
      };

      return res.status(200).json({
        success: true,
        message: 'Employee login successful',
        token,
        user: employeeData,
        employee: employeeData // backward compatibility
      });
    }

    // 4. No Matching Account Found
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      entityType: 'Auth',
      userId: rawLoginId,
      userRole: 'unknown',
      details: { attemptedIdentifier: rawLoginId, reason: 'Account not found' }
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin Login (Legacy / Dedicated Route)
 */
export const superAdminLogin = unifiedLogin;

/**
 * Admin Login (Legacy / Dedicated Route)
 */
export const adminLogin = unifiedLogin;

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
