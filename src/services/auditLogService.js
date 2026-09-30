import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import SystemSecurityLog from '../models/SystemSecurityLog.js';
import { sanitizeAuditDetails, getClientIp, getUserAgent } from '../utils/auditLogSanitizer.js';

/**
 * Standard Extensible Audit Actions
 */
export const AUDIT_ACTIONS = {
  // Standard lifecycle actions
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Authentication & Session actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',

  // Governance & Permissions
  STATUS_CHANGE: 'STATUS_CHANGE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',

  // Ledger & Finance
  ADD_COLUMN: 'ADD_COLUMN',
  REMOVE_COLUMN: 'REMOVE_COLUMN',
  UPDATE_PAYMENT: 'UPDATE_PAYMENT',
  CLOSE_ACCOUNT: 'CLOSE_ACCOUNT',
  REOPEN_ACCOUNT: 'REOPEN_ACCOUNT',
  BATCH_SAVE: 'BATCH_SAVE',

  // Employee specific actions
  CREATE_EMPLOYEE: 'CREATE_EMPLOYEE',
  UPDATE_EMPLOYEE: 'UPDATE_EMPLOYEE',
  CHANGE_EMPLOYEE_STATUS: 'CHANGE_EMPLOYEE_STATUS',
  RESET_EMPLOYEE_PASSWORD: 'RESET_EMPLOYEE_PASSWORD',
  DELETE_EMPLOYEE: 'DELETE_EMPLOYEE',
  EMPLOYEE_LOGIN: 'EMPLOYEE_LOGIN',
  EMPLOYEE_COLLECTION: 'EMPLOYEE_COLLECTION',

  // Data exchange
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT'
};

/**
 * Creates an AuditLog record in MongoDB asynchronously and safely.
 *
 * Guarantees that business operations will NOT fail if logging fails.
 * Automatically extracts IP, User-Agent, and authenticated user identity if req is passed.
 * Automatically sanitizes sensitive keys and masks Aadhaar/PAN.
 *
 * @param {Object} options
 * @param {string} [options.userId] - Authenticated user identifier (falls back to req.user)
 * @param {string} [options.userRole] - Role of authenticated user (falls back to req.user.role)
 * @param {string} options.action - Audit action (e.g. 'CREATE', 'UPDATE', 'LOGIN')
 * @param {string} options.entityType - Target entity name (e.g. 'Admin', 'Employee', 'FinanceRecord')
 * @param {string} [options.entityId] - Target entity identifier or ObjectId
 * @param {Object} [options.details] - Arbitrary additional context or diff object
 * @param {import('express').Request} [options.req] - Express request object for automatic IP/agent/user extraction
 * @param {string} [options.ipAddress] - Direct IP override
 * @param {string} [options.userAgent] - Direct User-Agent override
 * @param {mongoose.ClientSession} [options.session] - Optional Mongoose session for transactional operations
 * @returns {Promise<Object|null>} The saved AuditLog document or null if failed
 */
export const createAuditLog = async ({
  userId,
  userRole,
  action,
  entityType,
  entityId = '',
  details = {},
  req,
  ipAddress,
  userAgent,
  session
} = {}) => {
  try {
    if (!action || !entityType) {
      console.warn('[AuditLog Service Warning] Missing required fields: action and entityType are required');
      return null;
    }

    // Resolve User Identity from parameters or Express req
    const resolvedUserId =
      userId ||
      req?.user?.userId ||
      req?.user?.id ||
      req?.user?.username ||
      req?.user?.employeeId ||
      req?.employee?.employeeId ||
      'anonymous';

    // Resolve User Role
    const resolvedUserRole =
      userRole ||
      req?.user?.role ||
      (req?.user?.username === process.env.SUPERADMIN_USERNAME ? 'superadmin' : 'admin');

    // Resolve IP and User-Agent
    const resolvedIp = ipAddress || (req ? getClientIp(req) : '');
    const resolvedAgent = userAgent || (req ? getUserAgent(req) : '');

    // Deeply sanitize details (strip passwords/tokens, mask Aadhaar/PAN)
    const sanitizedDetails = sanitizeAuditDetails(details);

    const logEntry = new AuditLog({
      userId: String(resolvedUserId),
      userRole: String(resolvedUserRole).toLowerCase(),
      action: String(action).trim().toUpperCase(),
      entityType: String(entityType).trim(),
      entityId: entityId ? String(entityId) : '',
      details: sanitizedDetails,
      ipAddress: resolvedIp,
      userAgent: resolvedAgent
    });

    if (session) {
      await logEntry.save({ session });
    } else {
      await logEntry.save();
    }

    return logEntry;
  } catch (error) {
    // Non-blocking error handling: Log failure for server debugging but never crash business logic
    console.error('[AuditLog Service Error] Failed to persist audit log record:', error.message);
    return null;
  }
};

/**
 * Queries audit logs with pagination, multi-field filtering, date ranges, and safe search.
 *
 * @param {Object} params
 * @param {number|string} [params.page=1]
 * @param {number|string} [params.limit=25]
 * @param {string} [params.userId]
 * @param {string} [params.userRole]
 * @param {string} [params.action]
 * @param {string} [params.entityType]
 * @param {string} [params.entityId]
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 * @param {string} [params.search]
 * @param {Object} [params.currentUser] - Authenticated user info from JWT
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const queryAuditLogs = async ({
  page = 1,
  limit = 25,
  userId,
  userRole,
  action,
  entityType,
  entityId,
  startDate,
  endDate,
  search,
  currentUser
} = {}) => {
  // Validate and normalize pagination bounds
  let parsedPage = parseInt(page, 10);
  if (isNaN(parsedPage) || parsedPage < 1) parsedPage = 1;

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1) parsedLimit = 25;
  if (parsedLimit > 100) parsedLimit = 100; // Enforce maximum 100 records per page

  const filter = {};

  // Exact match filters
  if (userId && typeof userId === 'string' && userId.trim()) {
    filter.userId = userId.trim();
  }

  if (userRole && typeof userRole === 'string' && userRole.trim()) {
    filter.userRole = userRole.trim().toLowerCase();
  }

  if (action && typeof action === 'string' && action.trim()) {
    filter.action = action.trim().toUpperCase();
  }

  if (entityType && typeof entityType === 'string' && entityType.trim()) {
    filter.entityType = entityType.trim();
  }

  if (entityId && typeof entityId === 'string' && entityId.trim()) {
    filter.entityId = entityId.trim();
  }

  // Date Range Filtering
  if (startDate || endDate) {
    filter.createdAt = {};

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        const err = new Error('Invalid startDate format. Use ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)');
        err.status = 400;
        throw err;
      }
      filter.createdAt.$gte = parsedStart;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        const err = new Error('Invalid endDate format. Use ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)');
        err.status = 400;
        throw err;
      }
      // If date string contains date only (e.g. 2026-09-29), include entire day until 23:59:59.999
      if (typeof endDate === 'string' && endDate.length <= 10) {
        parsedEnd.setHours(23, 59, 59, 999);
      }
      filter.createdAt.$lte = parsedEnd;
    }
  }

  // Free-text Search across critical fields (sanitized to prevent ReDoS / injection)
  if (search && typeof search === 'string' && search.trim()) {
    const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(safeSearch, 'i');
    filter.$or = [
      { userId: searchRegex },
      { action: searchRegex },
      { entityType: searchRegex },
      { entityId: searchRegex },
      { ipAddress: searchRegex }
    ];
  }

  // Execute Count & Query
  const totalRecords = await AuditLog.countDocuments(filter);
  const totalPages = Math.ceil(totalRecords / parsedLimit) || 1;
  const skip = (parsedPage - 1) * parsedLimit;

  const data = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .lean();

  return {
    data,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalRecords,
      totalPages
    }
  };
};

/**
 * Retrieves a single audit log entry by its MongoDB ObjectId.
 *
 * @param {string} id - AuditLog ObjectId
 * @returns {Promise<{ error?: string, status?: number, data?: Object }>}
 */
export const getAuditLogById = async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return {
      error: 'Invalid Audit Log ID format',
      status: 400
    };
  }

  const log = await AuditLog.findById(id).lean();

  if (!log) {
    return {
      error: 'Audit log record not found',
      status: 404
    };
  }

  return {
    data: log
  };
};

/**
 * Permanently clears all audit logs from the auditlogs collection.
 *
 * Safety & Security Rules:
 * 1. Validates exact confirmation token: 'CLEAR_ALL_AUDIT_LOGS'.
 * 2. Employs AuditLog.deleteMany({}) — strictly preserves auditlogs collection, schema, and indexes.
 * 3. Never deletes documents from other collections (admins, employees, finance records, ledgers, etc.).
 * 4. Records the destructive operation in the dedicated 'systemsecuritylogs' collection.
 *
 * @param {Object} options
 * @param {string} options.confirmation - Exact string 'CLEAR_ALL_AUDIT_LOGS'
 * @param {import('express').Request} options.req - Authenticated Super Admin request
 * @returns {Promise<{ deletedCount: number }>}
 */
export const clearAllAuditLogs = async ({ confirmation, req } = {}) => {
  if (confirmation !== 'CLEAR_ALL_AUDIT_LOGS') {
    const error = new Error('Confirmation required to clear audit logs');
    error.status = 400;
    throw error;
  }

  // Perform controlled deletion on auditlogs documents ONLY
  const result = await AuditLog.deleteMany({});
  const deletedCount = result.deletedCount || 0;

  // Record this critical event in the dedicated systemsecuritylogs collection
  try {
    const userId = req?.user?.username || req?.user?.userId || req?.user?.id || 'superadmin';
    const userRole = req?.user?.role || 'superadmin';
    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await SystemSecurityLog.create({
      userId: String(userId),
      userRole: String(userRole),
      action: 'CLEAR_AUDIT_LOGS',
      deletedCount,
      ipAddress,
      userAgent
    });
  } catch (secErr) {
    console.error('[SecurityLog Notice] Failed to log clear event to systemsecuritylogs:', secErr.message);
  }

  return { deletedCount };
};
