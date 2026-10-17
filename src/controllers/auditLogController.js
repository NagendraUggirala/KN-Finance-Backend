import {
  queryAuditLogs,
  getAuditLogById as fetchAuditLogById,
  clearAllAuditLogs,
  deleteAuditLogById
} from '../services/auditLogService.js';

/**
 * Get paginated list of audit logs with search and filtering
 * Route: GET /api/audit-logs or GET /api/v1/audit-logs
 * Access: Super Admin / Admin
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page,
      limit,
      userId,
      userRole,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      search
    } = req.query;

    const result = await queryAuditLogs({
      page,
      limit,
      userId,
      userRole,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      search,
      currentUser: req.user
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Get complete details of a single audit log entry by ID
 * Route: GET /api/audit-logs/:id or GET /api/v1/audit-logs/:id
 * Access: Super Admin / Admin
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await fetchAuditLogById(id);

    if (result.error) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.error
      });
    }

    return res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Permanently clear all audit logs from auditlogs collection
 * Route: DELETE /api/audit-logs, DELETE /api/audit-logs/clear, POST /api/audit-logs/clear
 * Access: Super Admin only
 */
export const clearAuditLogs = async (req, res, next) => {
  try {
    const rawConfirmation =
      req.body?.confirmation ||
      req.body?.confirm ||
      req.query?.confirmation ||
      req.query?.confirm ||
      req.headers['x-confirmation'];

    // If confirmation is explicitly provided, validate it against accepted tokens
    if (rawConfirmation !== undefined && rawConfirmation !== null && rawConfirmation !== '') {
      const norm = String(rawConfirmation).trim().toUpperCase();
      const validTokens = ['CLEAR_ALL_AUDIT_LOGS', 'CLEAR', 'CONFIRM', 'YES', 'TRUE', '1', 'DELETE', 'ALL'];
      if (!validTokens.includes(norm)) {
        return res.status(400).json({
          success: false,
          message: 'Confirmation required to clear audit logs'
        });
      }
    }

    const result = await clearAllAuditLogs({ confirmation: 'CLEAR_ALL_AUDIT_LOGS', req });

    return res.status(200).json({
      success: true,
      message: result.deletedCount > 0 ? 'Audit logs cleared successfully' : 'No audit logs found',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Delete a single audit log by ID
 * Route: DELETE /api/audit-logs/:id or DELETE /api/v1/audit-logs/:id
 * Access: Super Admin only
 */
export const deleteAuditLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteAuditLogById(id, req);
    return res.status(200).json({
      success: true,
      message: 'Audit log deleted successfully',
      data: result.deletedLog
    });
  } catch (error) {
    if (error.status === 400 || error.status === 404) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};
