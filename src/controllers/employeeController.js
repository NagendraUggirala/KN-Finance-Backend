import {
  employeeLogin,
  getEmployeeProfile,
  getAssignedBorrowers,
  recordCollection
} from '../services/employeeService.js';
import {
  searchLedgerBorrowers,
  getSingleBorrowerDossier,
  recordAtomicInstallmentPayment,
  updateBorrowerDetails,
  toggleBorrowerStatus,
  createEmployeeExpense,
  getEmployeeExpenses,
  deleteEmployeeExpense
} from '../services/employeeLedgerService.js';

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

/**
 * 3.1. Scoped Borrower Fast Search
 * Route: GET /api/v1/employee/ledger/search
 */
export const searchLedger = async (req, res, next) => {
  try {
    const { query, status, limit } = req.query;
    const user = req.employee || req.user;

    const result = await searchLedgerBorrowers({
      query,
      status,
      limit,
      user
    });

    return res.status(200).json({
      success: true,
      message: 'Matching borrowers retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3.2. Single Borrower Ledger Dossier & Installment Matrix
 * Route: GET /api/v1/employee/ledger/borrower/:id
 */
export const getBorrowerDossier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await getSingleBorrowerDossier({ borrowerId: id, user: req.user });

    return res.status(200).json({
      success: true,
      message: 'Borrower dossier retrieved successfully',
      data: result
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
 * 3.3. Atomic Single-Borrower Installment Payment
 * Route: POST /api/v1/employee/ledger/borrower/:id/payment
 */
export const recordBorrowerInstallment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columnIndex, paymentDate, amount, paymentType, notes } = req.body;
    const user = req.employee || req.user;

    const result = await recordAtomicInstallmentPayment({
      borrowerId: id,
      columnIndex,
      paymentDate,
      amount,
      paymentType,
      notes,
      user,
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
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
 * Borrower Details Update
 * Route: PATCH /api/v1/employee/ledger/borrower/:id
 */
export const updateBorrower = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.employee || req.user;

    const result = await updateBorrowerDetails({
      borrowerId: id,
      data: req.body,
      user,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Borrower details updated successfully',
      data: { borrower: result }
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
 * Toggle Borrower Status (Close/Reopen)
 * Route: PATCH /api/v1/employee/ledger/borrower/:id/status
 */
export const toggleBorrowerStatusController = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isClosed } = req.body;
    const user = req.employee || req.user;

    const result = await toggleBorrowerStatus({
      borrowerId: id,
      isClosed,
      user,
      req
    });

    return res.status(200).json({
      success: true,
      message: `Borrower account marked as ${result.isClosed ? 'Closed' : 'Active'}`,
      data: { borrower: result }
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
 * 3.4. Field Operating Expenses - Log New Expense
 * Route: POST /api/v1/employee/expenses
 */
export const addExpense = async (req, res, next) => {
  try {
    const user = req.employee || req.user;
    const result = await createEmployeeExpense({
      data: req.body,
      user,
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Operating expense logged successfully',
      data: { expense: result }
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
 * 3.4. Field Operating Expenses - Retrieve List
 * Route: GET /api/v1/employee/expenses
 */
export const getExpensesList = async (req, res, next) => {
  try {
    const { date, startDate, endDate } = req.query;
    const user = req.employee || req.user;

    const result = await getEmployeeExpenses({
      date,
      startDate,
      endDate,
      user
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3.4. Field Operating Expenses - Delete Expense
 * Route: DELETE /api/v1/employee/expenses/:id
 */
export const removeExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.employee || req.user;

    const result = await deleteEmployeeExpense({
      id,
      user,
      req
    });

    return res.status(200).json({
      success: true,
      message: 'Operating expense deleted successfully',
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

