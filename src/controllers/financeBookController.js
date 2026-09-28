import {
  getActiveLedgerData,
  addInstallmentColumn,
  deleteInstallmentColumn,
  createBorrowerRow,
  updateBorrowerRow,
  updateBorrowerRowStatus,
  deleteBorrowerRow,
  batchSaveLedger
} from '../services/financeBookService.js';
import { validateBorrowerRowInput } from '../utils/financeValidators.js';

/**
 * Get active Finance Book Ledger with all date columns, borrower rows, and payment cells
 * Route: GET /api/v1/finance-book/active
 */
export const getActiveLedger = async (req, res, next) => {
  try {
    const data = await getActiveLedgerData();
    return res.status(200).json({
      success: true,
      message: 'Active finance book ledger retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch save complete staged ledger state
 * Route: POST /api/v1/finance-book/batch-save
 */
export const batchSave = async (req, res, next) => {
  try {
    const { ledgerBookId, version, dateColumns, rows } = req.body;

    if (!rows && !dateColumns) {
      return res.status(400).json({
        success: false,
        message: 'Batch save payload must contain rows or dateColumns'
      });
    }

    const result = await batchSaveLedger({
      ledgerBookId,
      version,
      dateColumns,
      rows,
      user: req.user
    });

    // Return the fresh, complete ledger state
    const refreshedData = await getActiveLedgerData();

    return res.status(200).json({
      success: true,
      message: 'Ledger changes saved successfully',
      data: refreshedData
    });
  } catch (error) {
    if (error.status === 409) {
      return res.status(409).json({
        success: false,
        message: error.message || 'Ledger was modified by another user. Please refresh.'
      });
    }
    next(error);
  }
};

/**
 * Add a new installment column
 * Route: POST /api/v1/finance-book/columns
 */
export const addColumn = async (req, res, next) => {
  try {
    const { ledgerBookId } = req.body;
    const newColumn = await addInstallmentColumn({ ledgerBookId, user: req.user });

    return res.status(201).json({
      success: true,
      message: 'Installment column added successfully',
      data: {
        id: newColumn._id.toString(),
        columnIndex: newColumn.columnIndex,
        headerDate: newColumn.headerDate,
        labelTelugu: newColumn.labelTelugu
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an installment column by index and shift indexes atomically
 * Route: DELETE /api/v1/finance-book/columns/:index
 */
export const deleteColumn = async (req, res, next) => {
  try {
    const { index } = req.params;
    const { ledgerBookId } = req.query;

    const result = await deleteInstallmentColumn({
      ledgerBookId,
      columnIndex: index,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      message: `Column index ${index} deleted successfully and remaining columns shifted`,
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
 * Create a new borrower row
 * Route: POST /api/v1/finance-book/rows
 */
export const createRow = async (req, res, next) => {
  try {
    const validation = validateBorrowerRowInput(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const newRow = await createBorrowerRow({ data: req.body, user: req.user });

    return res.status(201).json({
      success: true,
      message: 'Borrower row created successfully',
      data: newRow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing borrower row
 * Route: PATCH /api/v1/finance-book/rows/:id
 */
export const updateRow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validation = validateBorrowerRowInput(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    const updatedRow = await updateBorrowerRow({
      rowId: id,
      data: req.body,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      message: 'Borrower row updated successfully',
      data: updatedRow
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
 * Update borrower account status (close or reopen)
 * Route: PATCH /api/v1/finance-book/rows/:id/status
 */
export const updateRowStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isClosed } = req.body;

    if (typeof isClosed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isClosed (boolean) is required in request body'
      });
    }

    const updatedRow = await updateBorrowerRowStatus({
      rowId: id,
      isClosed,
      user: req.user
    });

    return res.status(200).json({
      success: true,
      message: `Account ${isClosed ? 'closed' : 'reopened'} successfully`,
      data: updatedRow
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
 * Delete a borrower row and renumber subsequent rows
 * Route: DELETE /api/v1/finance-book/rows/:id
 */
export const deleteRow = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await deleteBorrowerRow({ rowId: id, user: req.user });

    return res.status(200).json({
      success: true,
      message: 'Borrower row deleted successfully and serial numbers renumbered',
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
