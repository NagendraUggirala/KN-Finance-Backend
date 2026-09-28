import {
  createEmployee,
  getEmployees,
  updateEmployee,
  changeEmployeeStatus,
  resetEmployeePassword,
  archiveOrDeleteEmployee
} from '../services/employeeService.js';

/**
 * List employees with search, filters, and pagination
 * Route: GET /api/v1/admin/employees
 */
export const listEmployees = async (req, res, next) => {
  try {
    const { search, village, assignedOperationalArea, status, page, limit } = req.query;

    const data = await getEmployees({
      search,
      village,
      assignedOperationalArea,
      status,
      page,
      limit
    });

    return res.status(200).json({
      success: true,
      message: 'Employees retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new employee
 * Route: POST /api/v1/admin/employees
 */
export const addEmployee = async (req, res, next) => {
  try {
    const employee = await createEmployee({
      data: req.body,
      adminUser: req.user
    });

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        employee
      }
    });
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Edit employee profile details
 * Route: PUT /api/v1/admin/employees/:id
 */
export const editEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await updateEmployee({
      id,
      data: req.body,
      adminUser: req.user
    });

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: {
        employee
      }
    });
  } catch (error) {
    if (error.status === 400 || error.status === 404 || error.status === 409) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Change employee status (Active <-> Inactive)
 * Route: PATCH /api/v1/admin/employees/:id/status
 */
export const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const employee = await changeEmployeeStatus({
      id,
      status,
      adminUser: req.user
    });

    return res.status(200).json({
      success: true,
      message: `Employee status changed to ${status} successfully`,
      data: {
        employee
      }
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

/**
 * Admin directly resets an employee's password
 * Route: POST /api/v1/admin/employees/:id/reset-password
 */
export const adminResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'newPassword is required'
      });
    }

    const result = await resetEmployeePassword({
      id,
      newPassword,
      adminUser: req.user
    });

    return res.status(200).json({
      success: true,
      message: 'Employee password reset successfully',
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

/**
 * Soft delete / archive employee and revoke sessions
 * Route: DELETE /api/v1/admin/employees/:id
 */
export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await archiveOrDeleteEmployee({
      id,
      adminUser: req.user
    });

    return res.status(200).json({
      success: true,
      message: 'Employee archived successfully',
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
