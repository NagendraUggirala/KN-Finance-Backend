import {
  employeeLogin,
  getEmployeeProfile,
  getAssignedBorrowers,
  recordCollection
} from '../services/employeeService.js';

/**
 * Employee Login
 * Route: POST /api/v1/auth/employee/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    const result = await employeeLogin({ email, username, password });

    return res.status(200).json({
      success: true,
      message: 'Employee login successful',
      token: result.token,
      employee: result.employee
    });
  } catch (error) {
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Get Authenticated Employee Profile
 * Route: GET /api/v1/employee/profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const employeeId = req.user.id || req.user.userId;
    const profile = await getEmployeeProfile(employeeId);

    return res.status(200).json({
      success: true,
      message: 'Employee profile retrieved successfully',
      data: {
        profile
      }
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Get Borrowers Assigned to Employee's Area
 * Route: GET /api/v1/employee/assigned-borrowers
 */
export const getBorrowers = async (req, res, next) => {
  try {
    const employee = req.employee || (await getEmployeeProfile(req.user.id || req.user.userId));
    const borrowers = await getAssignedBorrowers(employee);

    return res.status(200).json({
      success: true,
      message: 'Assigned borrowers retrieved successfully',
      data: {
        borrowers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record Daily/Weekly Installment Collection
 * Route: POST /api/v1/employee/collections
 */
export const collect = async (req, res, next) => {
  try {
    const employee = req.employee || req.user;
    const { borrowerId, amount, paymentDate, paymentType } = req.body;

    const result = await recordCollection({
      employee,
      borrowerId,
      amount,
      paymentDate,
      paymentType
    });

    return res.status(201).json({
      success: true,
      message: 'Collection recorded successfully',
      data: result
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
