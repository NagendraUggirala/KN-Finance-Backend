/**
 * Role-based access control middleware
 * Checks if authenticated user has any of the permitted roles
 *
 * @param  {...string} roles Allowed roles (e.g. 'admin', 'superadmin', 'employee')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource.'
      });
    }
    next();
  };
};

export default authorizeRoles;
