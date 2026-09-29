import jwt from 'jsonwebtoken';
import Employee from '../models/Employee.js';

/**
 * Middleware to authenticate requests using JWT
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains userId/id, role, tokenVersion

    // Token version revocation and status check for employees
    if (decoded.role === 'employee') {
      const employee = await Employee.findById(decoded.id || decoded.userId);

      if (!employee || employee.isArchived) {
        return res.status(401).json({
          success: false,
          message: 'Employee account not found or archived.'
        });
      }

      if (employee.status !== 'Active') {
        return res.status(403).json({
          success: false,
          message: 'Employee account is inactive. Please contact Admin.'
        });
      }

      if (employee.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }

      req.employee = employee;
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};


/**
 * Middleware to restrict access to Super Admins only
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super Admin only.'
    });
  }
  next();
};

/**
 * Middleware to restrict access to Admins or Super Admins
 */
export const requireAdminOrSuperAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Authorized Admin only.'
    });
  }
  next();
};

/**
 * Middleware to allow access to Staff (Employees, Admins, Super Admins)
 */
export const requireStaffOrAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin', 'employee'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Authorized Staff only.'
    });
  }
  next();
};


