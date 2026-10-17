import mongoose from 'mongoose';
import LedgerBorrowerRow from '../models/LedgerBorrowerRow.js';
import LedgerDateColumn from '../models/LedgerDateColumn.js';
import LedgerInstallmentPayment from '../models/LedgerInstallmentPayment.js';
import FinanceRecord from '../models/FinanceRecord.js';
import EmployeeExpense from '../models/EmployeeExpense.js';
import { getOrCreateActiveLedgerBook } from './financeBookService.js';
import { calculateTotalPaid, calculateRemainingBalance } from './financeCalculationService.js';
import { syncRowToFinanceRecord } from './financeSyncService.js';
import { createAuditLog, AUDIT_ACTIONS } from './auditLogService.js';
import { isValidObjectId } from '../utils/financeValidators.js';

/**
 * 3.1. Scoped Borrower Fast Search
 * Searches borrowers by sNo, Telugu name, English name, or item/product.
 * Scoped to active ledger book and employee operational context.
 */
export const searchLedgerBorrowers = async ({ query, status = 'Active', limit = 15, user }) => {
  const activeBook = await getOrCreateActiveLedgerBook({ user });
  const filter = { ledgerBookId: activeBook._id };

  const normStatus = (status || 'Active').trim().toLowerCase();
  if (normStatus === 'active') {
    filter.isClosed = false;
  } else if (normStatus === 'closed') {
    filter.isClosed = true;
  }
  // If 'all', do not filter by isClosed

  if (query && query.trim()) {
    const q = query.trim();
    const orConditions = [
      { nameTelugu: new RegExp(q, 'i') },
      { nameEnglish: new RegExp(q, 'i') },
      { productItem: new RegExp(q, 'i') }
    ];

    if (!isNaN(Number(q))) {
      orConditions.push({ sNo: Number(q) });
    }

    filter.$or = orConditions;
  }

  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
  const rows = await LedgerBorrowerRow.find(filter)
    .sort({ sNo: 1 })
    .limit(limitNum)
    .lean();

  if (rows.length === 0) {
    return { borrowers: [] };
  }

  // Fetch payments to compute real-time remaining balance and total paid
  const rowIds = rows.map((r) => r._id);
  const allPayments = await LedgerInstallmentPayment.find({ rowId: { $in: rowIds } }).lean();

  const paymentsByRowId = new Map();
  for (const p of allPayments) {
    const rowIdStr = p.rowId.toString();
    if (!paymentsByRowId.has(rowIdStr)) {
      paymentsByRowId.set(rowIdStr, {});
    }
    paymentsByRowId.get(rowIdStr)[p.columnIndex] = {
      date: p.paymentDate,
      amount: p.amount,
      paymentType: p.paymentType || 'Cash'
    };
  }

  const borrowers = rows.map((row) => {
    const rowIdStr = row._id.toString();
    const rowPayments = paymentsByRowId.get(rowIdStr) || {};
    const totalPaid = calculateTotalPaid(rowPayments);
    const remainingBalance = calculateRemainingBalance(row.initialRemaining, totalPaid);

    return {
      id: rowIdStr,
      _id: rowIdStr,
      sNo: row.sNo,
      date: row.borrowDate,
      borrowDate: row.borrowDate,
      nameTelugu: row.nameTelugu,
      nameEnglish: row.nameEnglish || '',
      item: row.productItem,
      productItem: row.productItem,
      amount: row.principalAmount,
      principalAmount: row.principalAmount,
      initialRemaining: row.initialRemaining,
      remainingBalance,
      totalPaid,
      interestRate: row.interestRate || 5,
      isClosed: Boolean(row.isClosed)
    };
  });

  return { borrowers };
};

/**
 * 3.2. Single Borrower Ledger Dossier & Installment Matrix
 * Retrieves complete history, payment schedule matrix, and date columns for a single borrower.
 */
export const getSingleBorrowerDossier = async ({ borrowerId, user = null }) => {
  let row = null;
  if (isValidObjectId(borrowerId)) {
    row = await LedgerBorrowerRow.findById(borrowerId).lean();
  }

  if (!row && !isNaN(Number(borrowerId))) {
    const activeBook = await getOrCreateActiveLedgerBook({ user });
    row = await LedgerBorrowerRow.findOne({ ledgerBookId: activeBook._id, sNo: Number(borrowerId) }).lean();
  }

  if (!row) {
    const error = new Error('Borrower ledger dossier not found');
    error.status = 404;
    throw error;
  }

  // Load date columns of the ledger
  const dateCols = await LedgerDateColumn.find({ ledgerBookId: row.ledgerBookId })
    .sort({ columnIndex: 1 })
    .lean();

  const dateColumns = dateCols.map((dc) => dc.headerDate || dc.date);

  // Load all installment payments for this borrower
  const paymentsList = await LedgerInstallmentPayment.find({ rowId: row._id }).lean();
  const payments = {};
  for (const p of paymentsList) {
    payments[p.columnIndex] = {
      date: p.paymentDate,
      amount: p.amount,
      paymentType: p.paymentType || 'Cash'
    };
  }

  const totalPaid = calculateTotalPaid(payments);
  const remainingBalance = calculateRemainingBalance(row.initialRemaining, totalPaid);

  return {
    borrower: {
      id: row._id.toString(),
      _id: row._id.toString(),
      sNo: row.sNo,
      date: row.borrowDate,
      borrowDate: row.borrowDate,
      nameTelugu: row.nameTelugu,
      nameEnglish: row.nameEnglish || '',
      item: row.productItem,
      productItem: row.productItem,
      amount: row.principalAmount,
      principalAmount: row.principalAmount,
      initialRemaining: row.initialRemaining,
      remainingBalance,
      totalPaid,
      interestRate: row.interestRate || 5,
      isClosed: Boolean(row.isClosed),
      financeRecordId: row.financeRecordId ? row.financeRecordId.toString() : null,
      payments
    },
    dateColumns
  };
};

/**
 * 3.3. Atomic Single-Borrower Installment Payment
 * Upserts an installment payment on an isolated borrower row with auto balance recalculation.
 */
export const recordAtomicInstallmentPayment = async ({
  borrowerId,
  columnIndex,
  paymentDate,
  amount,
  paymentType = 'Cash',
  notes = '',
  user,
  req
}) => {
  if (!borrowerId) {
    const error = new Error('Borrower ID is required');
    error.status = 400;
    throw error;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error('Payment amount must be a positive number');
    error.status = 400;
    throw error;
  }

  if (!['Cash', 'UPI', 'Card'].includes(paymentType)) {
    const error = new Error('Invalid paymentType. Allowed values: Cash, UPI, Card');
    error.status = 400;
    throw error;
  }

  const row = isValidObjectId(borrowerId)
    ? await LedgerBorrowerRow.findById(borrowerId)
    : await LedgerBorrowerRow.findOne({ sNo: Number(borrowerId) });

  if (!row) {
    const error = new Error('Borrower ledger record not found');
    error.status = 404;
    throw error;
  }

  // Resolve column index: if not specified, automatically use the borrower's next available column
  let colIdx;
  if (columnIndex === undefined || columnIndex === null || columnIndex === '') {
    const existingPayments = await LedgerInstallmentPayment.find({ rowId: row._id }).lean();
    const usedIndices = new Set(existingPayments.map((p) => p.columnIndex));
    colIdx = 0;
    while (usedIndices.has(colIdx)) {
      colIdx++;
    }
  } else {
    colIdx = Number(columnIndex);
    if (isNaN(colIdx) || colIdx < 0) {
      const error = new Error('columnIndex must be a valid non-negative number');
      error.status = 400;
      throw error;
    }
  }

  if (row.isClosed) {
    const error = new Error('Cannot record installment on a closed borrower account');
    error.status = 400;
    throw error;
  }

  const collectorName = user?.employeeId || user?.username || user?.name || 'Staff';

  // Atomic upsert in LedgerInstallmentPayment
  const payment = await LedgerInstallmentPayment.findOneAndUpdate(
    { rowId: row._id, columnIndex: colIdx },
    {
      $set: {
        paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        amount: numAmount,
        paymentType: paymentType || 'Cash',
        collectedBy: collectorName
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Auto-create LedgerDateColumn in the ledger book if this column does not exist yet
  try {
    const existingCol = await LedgerDateColumn.findOne({
      ledgerBookId: row.ledgerBookId,
      columnIndex: colIdx
    });

    if (!existingCol) {
      const formattedHeader = paymentDate || new Date().toISOString().split('T')[0];
      await LedgerDateColumn.create({
        ledgerBookId: row.ledgerBookId,
        columnIndex: colIdx,
        headerDate: formattedHeader,
        labelTelugu: `వాయిదా ${colIdx + 1}`
      });
    }
  } catch (colErr) {
    // If concurrent insert occurs, index ensures safety
    console.log('Notice: date column check/creation completed:', colErr?.message || 'OK');
  }

  // Recalculate borrower total paid and remaining balance across all columns
  const allPayments = await LedgerInstallmentPayment.find({ rowId: row._id }).lean();
  const totalPaid = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, (row.initialRemaining || 0) - totalPaid);

  // Automatically close account if balance cleared
  if (remainingBalance === 0 && totalPaid > 0 && !row.isClosed) {
    row.isClosed = true;
    await row.save();
  }

  // Synchronize with FinanceRecord if linked
  if (row.financeRecordId) {
    await FinanceRecord.findByIdAndUpdate(row.financeRecordId, {
      $set: {
        totalPaid,
        remainingBalance,
        status: remainingBalance === 0 ? 'closed' : 'active'
      }
    }).catch((err) => console.error('FinanceRecord sync warning:', err.message));
  }

  // Generate unique formatted receipt number
  const yyyymm = new Date().toISOString().slice(0, 7).replace('-', '');
  const randSeq = Math.floor(1000 + Math.random() * 9000);
  const receiptNo = `REC-${yyyymm}-${randSeq}`;

  // Log in Audit Trail
  await createAuditLog({
    req,
    userId: user?.employeeId || user?.username || user?.id || 'staff',
    userRole: user?.role || 'employee',
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'LedgerInstallmentPayment',
    entityId: payment._id.toString(),
    details: {
      borrowerId: row._id.toString(),
      borrowerNameTelugu: row.nameTelugu,
      columnIndex: colIdx,
      amount: numAmount,
      remainingBalance,
      totalPaid,
      paymentType,
      receiptNo,
      notes
    }
  });

  return {
    receiptNo,
    borrowerId: row._id.toString(),
    columnIndex: colIdx,
    amount: numAmount,
    remainingBalance,
    totalPaid,
    paymentType,
    isClosed: Boolean(row.isClosed)
  };
};

/**
 * Borrower Details Update (Scoped for Field Officer / Admin)
 */
export const updateBorrowerDetails = async ({ borrowerId, data, user, req }) => {
  if (!isValidObjectId(borrowerId)) {
    const error = new Error('Invalid borrower row ID format');
    error.status = 400;
    throw error;
  }

  const row = await LedgerBorrowerRow.findById(borrowerId);
  if (!row) {
    const error = new Error('Borrower ledger record not found');
    error.status = 404;
    throw error;
  }

  const {
    nameTelugu,
    nameEnglish,
    productItem,
    borrowDate,
    principalAmount,
    interestRate
  } = data;

  if (nameTelugu !== undefined) row.nameTelugu = nameTelugu.trim();
  if (nameEnglish !== undefined) row.nameEnglish = nameEnglish.trim();
  if (productItem !== undefined) row.productItem = productItem.trim();
  if (borrowDate !== undefined) row.borrowDate = borrowDate.trim();
  if (interestRate !== undefined) row.interestRate = Number(interestRate);

  if (principalAmount !== undefined && Number(principalAmount) > 0) {
    row.principalAmount = Number(principalAmount);
    // Auto-update initial remaining based on 5% increment rule
    const increment = Math.round(row.principalAmount * 0.05 * 10) / 10;
    row.initialRemaining = row.principalAmount + increment;
  }

  row.updatedBy = user?.employeeId || user?.username || 'Staff';
  await row.save();

  // Sync to FinanceRecord if linked
  if (row.financeRecordId) {
    await syncRowToFinanceRecord(row, null).catch(() => {});
  }

  await createAuditLog({
    req,
    userId: user?.employeeId || user?.username || user?.id || 'staff',
    userRole: user?.role || 'employee',
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'LedgerBorrowerRow',
    entityId: row._id.toString(),
    details: {
      actionType: 'EMPLOYEE_BORROWER_UPDATE',
      borrowerId: row._id.toString(),
      borrowerNameTelugu: row.nameTelugu
    }
  });

  return {
    id: row._id.toString(),
    sNo: row.sNo,
    borrowDate: row.borrowDate,
    nameTelugu: row.nameTelugu,
    nameEnglish: row.nameEnglish,
    productItem: row.productItem,
    principalAmount: row.principalAmount,
    initialRemaining: row.initialRemaining,
    isClosed: row.isClosed
  };
};

/**
 * Toggle Borrower Closure Status (Close / Reopen)
 */
export const toggleBorrowerStatus = async ({ borrowerId, isClosed, user, req }) => {
  if (!isValidObjectId(borrowerId)) {
    const error = new Error('Invalid borrower row ID format');
    error.status = 400;
    throw error;
  }

  const row = await LedgerBorrowerRow.findById(borrowerId);
  if (!row) {
    const error = new Error('Borrower ledger record not found');
    error.status = 404;
    throw error;
  }

  row.isClosed = Boolean(isClosed);
  row.updatedBy = user?.employeeId || user?.username || 'Staff';
  await row.save();

  if (row.financeRecordId) {
    await FinanceRecord.findByIdAndUpdate(row.financeRecordId, {
      $set: { status: row.isClosed ? 'closed' : 'active' }
    }).catch(() => {});
  }

  await createAuditLog({
    req,
    userId: user?.employeeId || user?.username || user?.id || 'staff',
    userRole: user?.role || 'employee',
    action: AUDIT_ACTIONS.UPDATE,
    entityType: 'LedgerBorrowerRow',
    entityId: row._id.toString(),
    details: {
      actionType: 'TOGGLE_BORROWER_STATUS',
      isClosed: row.isClosed,
      borrowerNameTelugu: row.nameTelugu
    }
  });

  return {
    id: row._id.toString(),
    sNo: row.sNo,
    nameTelugu: row.nameTelugu,
    isClosed: row.isClosed
  };
};

/**
 * 3.4. Field Operating Expenses - Create
 */
export const createEmployeeExpense = async ({ data, user, req }) => {
  const { date, category, amount, description, receiptNumber } = data;

  if (!category || !category.trim()) {
    const error = new Error('Expense category is required');
    error.status = 400;
    throw error;
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error('Expense amount must be a positive number');
    error.status = 400;
    throw error;
  }

  const employeeId = user?.id || user?.userId || user?._id;
  const adminId = user?.adminId || (user?.role === 'admin' ? (user.userId || user.id) : null);
  const paidByName = user?.fullName || user?.name || user?.username || 'Field Officer';

  const expense = await EmployeeExpense.create({
    employeeId,
    adminId,
    paidBy: paidByName,
    date: (date || new Date().toISOString().split('T')[0]).trim(),
    category: category.trim(),
    amount: numAmount,
    description: (description || '').trim(),
    receiptNumber: (receiptNumber || '').trim()
  });

  await createAuditLog({
    req,
    userId: user?.employeeId || user?.username || user?.id || 'staff',
    userRole: user?.role || 'employee',
    action: AUDIT_ACTIONS.CREATE,
    entityType: 'EmployeeExpense',
    entityId: expense._id.toString(),
    details: {
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
      paidBy: expense.paidBy
    }
  });

  return {
    id: expense._id.toString(),
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    description: expense.description,
    receiptNumber: expense.receiptNumber,
    paidBy: expense.paidBy,
    createdAt: expense.createdAt
  };
};

/**
 * 3.4. Field Operating Expenses - List & Filter
 */
export const getEmployeeExpenses = async ({ date, startDate, endDate, user }) => {
  const query = {};

  // If role is employee, scope strictly to their own expenses
  if (user?.role === 'employee') {
    query.employeeId = user.id || user.userId || user._id;
  } else if (user?.role === 'admin') {
    query.adminId = user.userId || user.id || user._id;
  }

  if (date && date.trim()) {
    query.date = date.trim();
  } else if (startDate && endDate) {
    query.date = { $gte: startDate.trim(), $lte: endDate.trim() };
  }

  const expenses = await EmployeeExpense.find(query)
    .sort({ createdAt: -1 })
    .lean();

  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const formatted = expenses.map((e) => ({
    id: e._id.toString(),
    date: e.date,
    category: e.category,
    amount: e.amount,
    description: e.description,
    receiptNumber: e.receiptNumber,
    paidBy: e.paidBy,
    createdAt: e.createdAt
  }));

  return {
    expenses: formatted,
    totalExpenses
  };
};

/**
 * 3.4. Field Operating Expenses - Delete
 */
export const deleteEmployeeExpense = async ({ id, user, req }) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid expense ID format');
    error.status = 400;
    throw error;
  }

  const query = { _id: id };
  if (user?.role === 'employee') {
    query.employeeId = user.id || user.userId || user._id;
  }

  const deleted = await EmployeeExpense.findOneAndDelete(query);
  if (!deleted) {
    const error = new Error('Expense record not found or unauthorized');
    error.status = 404;
    throw error;
  }

  await createAuditLog({
    req,
    userId: user?.employeeId || user?.username || user?.id || 'staff',
    userRole: user?.role || 'employee',
    action: AUDIT_ACTIONS.DELETE,
    entityType: 'EmployeeExpense',
    entityId: id,
    details: {
      category: deleted.category,
      amount: deleted.amount,
      date: deleted.date
    }
  });

  return { id };
};
