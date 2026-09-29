import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import { createAuditLog, AUDIT_ACTIONS } from '../services/auditLogService.js';
import { computeDiff } from '../utils/auditLogSanitizer.js';

/**
 * Create a new Admin
 * Route: POST /api/superadmin/admins
 */
export const createAdmin = async (req, res, next) => {
  try {
    const { username, password, name, email, phone } = req.body;

    // Validate required fields
    if (!username || !password || !name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields (username, password, name, email, phone) are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if username already exists
    const existingAdmin = await Admin.findOne({ username: normalizedUsername });
    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Create Admin with Super Admin username reference
    const admin = new Admin({
      username: normalizedUsername,
      password,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: 'admin',
      status: 'active',
      createdBy: req.user?.username || 'superadmin'
    });

    await admin.save();

    // Audit log Admin creation automatically
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.CREATE,
      entityType: 'Admin',
      entityId: admin._id.toString(),
      details: {
        username: admin.username,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate key error: username must be unique'
      });
    }
    next(error);
  }
};

/**
 * Get all Admins
 * Route: GET /api/superadmin/admins
 */
export const getAdmins = async (req, res, next) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      admins
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single Admin by ID
 * Route: GET /api/superadmin/admins/:adminId
 */
export const getAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID format'
      });
    }

    const admin = await Admin.findById(adminId).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    return res.status(200).json({
      success: true,
      admin
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an Admin
 * Route: PUT /api/superadmin/admins/:adminId
 */
export const updateAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID format'
      });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Capture snapshot before mutations for before/after diff calculation
    const previousAdmin = admin.toObject();

    const { username, name, email, phone, password } = req.body;

    // Check if new username conflicts with another Admin
    if (username) {
      const normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername !== admin.username) {
        const existingAdmin = await Admin.findOne({
          username: normalizedUsername,
          _id: { $ne: adminId }
        });

        if (existingAdmin) {
          return res.status(409).json({
            success: false,
            message: 'Username is already taken by another admin'
          });
        }
        admin.username = normalizedUsername;
      }
    }

    if (name !== undefined) admin.name = name.trim();
    if (email !== undefined) admin.email = email.trim().toLowerCase();
    if (phone !== undefined) admin.phone = phone.trim();

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      admin.password = password;
    }

    // Explicitly prevent role and createdBy updates
    // (admin.role and admin.createdBy remain untouched)

    await admin.save();

    // Log update audit with safe before/after diff
    const diff = computeDiff(previousAdmin, admin);
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: 'Admin',
      entityId: admin._id.toString(),
      details: diff
    });

    return res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      admin
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate key error: username must be unique'
      });
    }
    next(error);
  }
};

/**
 * Update Admin Status (active / inactive)
 * Route: PATCH /api/superadmin/admins/:adminId/status
 */
export const updateAdminStatus = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID format'
      });
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'active' or 'inactive'"
      });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const previousStatus = admin.status;
    admin.status = status;
    await admin.save();

    // Log status change audit
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.STATUS_CHANGE,
      entityType: 'Admin',
      entityId: admin._id.toString(),
      details: {
        previousStatus,
        newStatus: status
      }
    });

    return res.status(200).json({
      success: true,
      message: `Admin status updated to ${status}`,
      admin
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an Admin
 * Route: DELETE /api/superadmin/admins/:adminId
 */
export const deleteAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Admin ID format'
      });
    }

    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const deletedAdminSnapshot = {
      username: admin.username,
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      role: admin.role,
      status: admin.status
    };

    await Admin.findByIdAndDelete(adminId);

    // Log delete audit
    await createAuditLog({
      req,
      action: AUDIT_ACTIONS.DELETE,
      entityType: 'Admin',
      entityId: adminId,
      details: deletedAdminSnapshot
    });

    return res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
