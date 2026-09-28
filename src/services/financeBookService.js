import mongoose from 'mongoose';
import LedgerBook from '../models/LedgerBook.js';
import LedgerDateColumn from '../models/LedgerDateColumn.js';
import LedgerBorrowerRow from '../models/LedgerBorrowerRow.js';
import LedgerInstallmentPayment from '../models/LedgerInstallmentPayment.js';
import AuditLog from '../models/AuditLog.js';
import {
  calculateInitialRemaining,
  calculateInterestIncrement5Percent,
  calculateTotalPaid,
  calculateRemainingBalance,
  checkAccountClosureEligibility
} from './financeCalculationService.js';
import { syncRowToFinanceRecord, handleRowDeletionSync } from './financeSyncService.js';
import { isValidObjectId } from '../utils/financeValidators.js';

/**
 * Transaction helper that uses MongoDB replica-set transactions when available,
 * and gracefully falls back to non-transactional execution for standalone local MongoDB instances.
 */
export const runInTransaction = async (workFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await workFn(session);
      });
      return result;
    } catch (txError) {
      if (
        txError.message &&
        (txError.message.includes('replica set') ||
          txError.message.includes('standalone') ||
          txError.message.includes('Transaction numbers are only allowed on a replica set member'))
      ) {
        console.warn('MongoDB transactions not supported on this deployment; executing operations sequentially.');
        await session.endSession().catch(() => {});
        session = null;
        return await workFn(null);
      }
      throw txError;
    }
  } catch (error) {
    if (session) {
      await session.endSession().catch(() => {});
      session = null;
    }
    throw error;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
};

/**
 * Adds 7 days to a date string formatted as DD-MM or DD-MM-YYYY
 * Accurately calculates month and year transitions.
 */
export const addSevenDaysToDateStr = (dateStr) => {
  const now = new Date();
  if (!dateStr || typeof dateStr !== 'string') {
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}`;
  }

  const parts = dateStr.trim().split('-');
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const year = parts[2] ? parseInt(parts[2], 10) : now.getFullYear();

  if (isNaN(day) || isNaN(month)) {
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}`;
  }

  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + 7);

  const nextDay = String(d.getUTCDate()).padStart(2, '0');
  const nextMonth = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${nextDay}-${nextMonth}`;
};

/**
 * Finds the active LedgerBook or creates the initial default active LedgerBook
 */
export const getOrCreateActiveLedgerBook = async (session = null) => {
  let ledgerBook = await LedgerBook.findOne({ isActive: true }).session(session);
  if (!ledgerBook) {
    const newBook = new LedgerBook({
      branchId: 'NY-104',
      title: 'KN FINANCE - FINANCE BOOK LEDGER',
      academicYear: '2026-2027',
      isActive: true,
      version: 1
    });
    ledgerBook = await newBook.save({ session });
  }
  return ledgerBook;
};

/**
 * Retrieves the full active ledger state with calculations and totals
 */
export const getActiveLedgerData = async () => {
  const ledgerBook = await getOrCreateActiveLedgerBook();

  // Load date columns sorted by columnIndex
  const dateColumns = await LedgerDateColumn.find({ ledgerBookId: ledgerBook._id })
    .sort({ columnIndex: 1 })
    .lean();

  // Load borrower rows sorted by sNo
  const rows = await LedgerBorrowerRow.find({ ledgerBookId: ledgerBook._id })
    .sort({ sNo: 1 })
    .lean();

  const rowIds = rows.map((r) => r._id);

  // Fetch all payments for these rows in a single batch query
  const allPayments = await LedgerInstallmentPayment.find({ rowId: { $in: rowIds } }).lean();

  // Group payments by rowId
  const paymentsByRowId = new Map();
  for (const payment of allPayments) {
    const rowIdStr = payment.rowId.toString();
    if (!paymentsByRowId.has(rowIdStr)) {
      paymentsByRowId.set(rowIdStr, {});
    }
    paymentsByRowId.get(rowIdStr)[payment.columnIndex] = {
      date: payment.paymentDate,
      amount: payment.amount,
      paymentType: payment.paymentType || 'Cash'
    };
  }

  // Calculate totals and format rows for frontend
  let grandPrincipalAmount = 0;
  let grandTotalPaid = 0;
  let grandRemainingBalance = 0;

  const formattedRows = rows.map((row) => {
    const rowIdStr = row._id.toString();
    const rowPayments = paymentsByRowId.get(rowIdStr) || {};
    const totalPaid = calculateTotalPaid(rowPayments);
    const remainingBalance = calculateRemainingBalance(row.initialRemaining, totalPaid);

    grandPrincipalAmount += row.principalAmount;
    grandTotalPaid += totalPaid;
    grandRemainingBalance += remainingBalance;

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
      interestRate: row.interestRate || 5,
      isClosed: Boolean(row.isClosed),
      financeRecordId: row.financeRecordId ? row.financeRecordId.toString() : null,
      totalPaid,
      remainingBalance,
      payments: rowPayments,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  });

  return {
    ledgerBook: {
      id: ledgerBook._id.toString(),
      _id: ledgerBook._id.toString(),
      branchId: ledgerBook.branchId,
      title: ledgerBook.title,
      academicYear: ledgerBook.academicYear,
      isActive: ledgerBook.isActive,
      version: ledgerBook.version || 1,
      createdAt: ledgerBook.createdAt,
      updatedAt: ledgerBook.updatedAt
    },
    dateColumns: dateColumns.map((c) => c.headerDate),
    columns: dateColumns.map((c) => ({
      id: c._id.toString(),
      columnIndex: c.columnIndex,
      headerDate: c.headerDate,
      labelTelugu: c.labelTelugu
    })),
    rows: formattedRows,
    totals: {
      principalAmount: grandPrincipalAmount,
      totalPaid: grandTotalPaid,
      remainingBalance: grandRemainingBalance
    }
  };
};

/**
 * Adds a new installment column by adding 7 days to the last column's date
 */
export const addInstallmentColumn = async ({ ledgerBookId, user }) => {
  return await runInTransaction(async (session) => {
    let ledgerBook;
    if (ledgerBookId && isValidObjectId(ledgerBookId)) {
      ledgerBook = await LedgerBook.findById(ledgerBookId).session(session);
    }
    if (!ledgerBook) {
      ledgerBook = await getOrCreateActiveLedgerBook(session);
    }

    // Find the last column
    const lastColumn = await LedgerDateColumn.findOne({ ledgerBookId: ledgerBook._id })
      .sort({ columnIndex: -1 })
      .session(session);

    let nextIndex = 0;
    let nextDate = '';

    if (lastColumn) {
      nextIndex = lastColumn.columnIndex + 1;
      nextDate = addSevenDaysToDateStr(lastColumn.headerDate);
    } else {
      nextIndex = 0;
      nextDate = addSevenDaysToDateStr(null);
    }

    const labelTelugu = `వాయిదా ${nextIndex + 1}`;

    const newColumn = new LedgerDateColumn({
      ledgerBookId: ledgerBook._id,
      columnIndex: nextIndex,
      headerDate: nextDate,
      labelTelugu
    });

    await newColumn.save({ session });

    // Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'ADD_COLUMN',
          entityType: 'LedgerDateColumn',
          entityId: newColumn._id.toString(),
          details: {
            columnIndex: nextIndex,
            headerDate: nextDate,
            labelTelugu
          }
        }
      ],
      { session }
    );

    return newColumn;
  });
};

/**
 * Deletes an installment column and shifts all subsequent column indexes and payment indexes atomically
 */
export const deleteInstallmentColumn = async ({ ledgerBookId, columnIndex, user }) => {
  const targetIndex = Number(columnIndex);
  if (isNaN(targetIndex) || targetIndex < 0) {
    const error = new Error('Invalid column index');
    error.status = 400;
    throw error;
  }

  return await runInTransaction(async (session) => {
    let ledgerBook;
    if (ledgerBookId && isValidObjectId(ledgerBookId)) {
      ledgerBook = await LedgerBook.findById(ledgerBookId).session(session);
    }
    if (!ledgerBook) {
      ledgerBook = await getOrCreateActiveLedgerBook(session);
    }

    // Check if target column exists
    const targetColumn = await LedgerDateColumn.findOne({
      ledgerBookId: ledgerBook._id,
      columnIndex: targetIndex
    }).session(session);

    if (!targetColumn) {
      const error = new Error(`Column at index ${targetIndex} does not exist`);
      error.status = 404;
      throw error;
    }

    // Find all rows in this ledger
    const rows = await LedgerBorrowerRow.find({ ledgerBookId: ledgerBook._id }, { _id: 1 }).session(session);
    const rowIds = rows.map((r) => r._id);

    // 1. Delete payments belonging to this column index
    if (rowIds.length > 0) {
      await LedgerInstallmentPayment.deleteMany(
        { rowId: { $in: rowIds }, columnIndex: targetIndex },
        { session }
      );
    }

    // 2. Delete the target column
    await LedgerDateColumn.deleteOne({ _id: targetColumn._id }, { session });

    // 3. Shift payments with columnIndex > targetIndex down by 1
    if (rowIds.length > 0) {
      // Find payments that need shifting
      const paymentsToShift = await LedgerInstallmentPayment.find({
        rowId: { $in: rowIds },
        columnIndex: { $gt: targetIndex }
      })
        .sort({ columnIndex: 1 })
        .session(session);

      for (const payment of paymentsToShift) {
        payment.columnIndex -= 1;
        await payment.save({ session });
      }
    }

    // 4. Shift subsequent date columns down by 1 and re-label in Telugu
    const columnsToShift = await LedgerDateColumn.find({
      ledgerBookId: ledgerBook._id,
      columnIndex: { $gt: targetIndex }
    })
      .sort({ columnIndex: 1 })
      .session(session);

    for (const col of columnsToShift) {
      col.columnIndex -= 1;
      col.labelTelugu = `వాయిదా ${col.columnIndex + 1}`;
      await col.save({ session });
    }

    // 5. Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'DELETE_COLUMN',
          entityType: 'LedgerDateColumn',
          entityId: targetColumn._id.toString(),
          details: {
            deletedColumnIndex: targetIndex,
            deletedHeaderDate: targetColumn.headerDate
          }
        }
      ],
      { session }
    );

    return {
      deletedColumnIndex: targetIndex,
      remainingColumnsCount: (await LedgerDateColumn.countDocuments({ ledgerBookId: ledgerBook._id }).session(session))
    };
  });
};

/**
 * Creates a new borrower row
 */
export const createBorrowerRow = async ({ data, user }) => {
  return await runInTransaction(async (session) => {
    let ledgerBook;
    if (data.ledgerBookId && isValidObjectId(data.ledgerBookId)) {
      ledgerBook = await LedgerBook.findById(data.ledgerBookId).session(session);
    }
    if (!ledgerBook) {
      ledgerBook = await getOrCreateActiveLedgerBook(session);
    }

    // Find current max sNo
    const lastRow = await LedgerBorrowerRow.findOne({ ledgerBookId: ledgerBook._id })
      .sort({ sNo: -1 })
      .session(session);

    const sNo = lastRow ? lastRow.sNo + 1 : 1;
    const principalAmount = Number(data.principalAmount !== undefined ? data.principalAmount : data.amount) || 0;
    const initialRemaining =
      data.initialRemaining !== undefined && !isNaN(Number(data.initialRemaining))
        ? Number(data.initialRemaining)
        : calculateInitialRemaining(principalAmount);

    const newRow = new LedgerBorrowerRow({
      ledgerBookId: ledgerBook._id,
      sNo,
      borrowDate: data.borrowDate || data.date || addSevenDaysToDateStr(null),
      nameTelugu: (data.nameTelugu || '').trim(),
      nameEnglish: (data.nameEnglish || '').trim(),
      productItem: (data.productItem || data.item || '').trim(),
      principalAmount,
      initialRemaining,
      interestRate: Number(data.interestRate) || 5,
      isClosed: Boolean(data.isClosed),
      createdBy: user?.username || 'admin',
      updatedBy: user?.username || 'admin'
    });

    await newRow.save({ session });

    // Sync with FinanceRecord
    await syncRowToFinanceRecord({
      row: newRow,
      totalPaid: 0,
      remainingBalance: initialRemaining,
      session,
      user
    });

    // Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'CREATE_ROW',
          entityType: 'LedgerBorrowerRow',
          entityId: newRow._id.toString(),
          details: {
            sNo: newRow.sNo,
            nameTelugu: newRow.nameTelugu,
            nameEnglish: newRow.nameEnglish,
            principalAmount,
            initialRemaining
          }
        }
      ],
      { session }
    );

    return {
      id: newRow._id.toString(),
      _id: newRow._id.toString(),
      sNo: newRow.sNo,
      date: newRow.borrowDate,
      borrowDate: newRow.borrowDate,
      nameTelugu: newRow.nameTelugu,
      nameEnglish: newRow.nameEnglish,
      item: newRow.productItem,
      productItem: newRow.productItem,
      amount: newRow.principalAmount,
      principalAmount: newRow.principalAmount,
      initialRemaining: newRow.initialRemaining,
      interestRate: newRow.interestRate,
      isClosed: newRow.isClosed,
      totalPaid: 0,
      remainingBalance: initialRemaining,
      payments: {}
    };
  });
};

/**
 * Updates a borrower row
 */
export const updateBorrowerRow = async ({ rowId, data, user }) => {
  if (!isValidObjectId(rowId)) {
    const error = new Error('Invalid row ID');
    error.status = 400;
    throw error;
  }

  return await runInTransaction(async (session) => {
    const row = await LedgerBorrowerRow.findById(rowId).session(session);
    if (!row) {
      const error = new Error('Borrower row not found');
      error.status = 404;
      throw error;
    }

    if (data.borrowDate || data.date) {
      row.borrowDate = (data.borrowDate || data.date).trim();
    }
    if (data.nameTelugu !== undefined) {
      row.nameTelugu = data.nameTelugu.trim();
    }
    if (data.nameEnglish !== undefined) {
      row.nameEnglish = data.nameEnglish.trim();
    }
    if (data.productItem !== undefined || data.item !== undefined) {
      row.productItem = (data.productItem || data.item).trim();
    }
    if (data.interestRate !== undefined) {
      row.interestRate = Number(data.interestRate) || 5;
    }

    // Handle principal amount and target initialRemaining
    const newPrincipal = data.principalAmount !== undefined ? data.principalAmount : data.amount;
    if (newPrincipal !== undefined) {
      const principalNum = Number(newPrincipal);
      const principalChanged = principalNum !== row.principalAmount;
      row.principalAmount = principalNum;

      if (data.initialRemaining !== undefined) {
        row.initialRemaining = Number(data.initialRemaining);
      } else if (principalChanged) {
        row.initialRemaining = calculateInitialRemaining(principalNum);
      }
    } else if (data.initialRemaining !== undefined) {
      row.initialRemaining = Number(data.initialRemaining);
    }

    // Handle optional +5% increment
    if (data.applyFivePercentIncrement) {
      row.initialRemaining = calculateInterestIncrement5Percent(row.initialRemaining);
    }

    row.updatedBy = user?.username || 'admin';
    await row.save({ session });

    // Fetch existing payments to calculate totalPaid and remainingBalance
    const payments = await LedgerInstallmentPayment.find({ rowId: row._id }).session(session);
    const paymentsMap = {};
    for (const p of payments) {
      paymentsMap[p.columnIndex] = {
        date: p.paymentDate,
        amount: p.amount,
        paymentType: p.paymentType
      };
    }
    const totalPaid = calculateTotalPaid(payments);
    const remainingBalance = calculateRemainingBalance(row.initialRemaining, totalPaid);

    // Sync with FinanceRecord
    await syncRowToFinanceRecord({
      row,
      totalPaid,
      remainingBalance,
      session,
      user
    });

    // Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'UPDATE_ROW',
          entityType: 'LedgerBorrowerRow',
          entityId: row._id.toString(),
          details: {
            sNo: row.sNo,
            principalAmount: row.principalAmount,
            initialRemaining: row.initialRemaining,
            isClosed: row.isClosed
          }
        }
      ],
      { session }
    );

    return {
      id: row._id.toString(),
      _id: row._id.toString(),
      sNo: row.sNo,
      date: row.borrowDate,
      borrowDate: row.borrowDate,
      nameTelugu: row.nameTelugu,
      nameEnglish: row.nameEnglish,
      item: row.productItem,
      productItem: row.productItem,
      amount: row.principalAmount,
      principalAmount: row.principalAmount,
      initialRemaining: row.initialRemaining,
      interestRate: row.interestRate,
      isClosed: row.isClosed,
      totalPaid,
      remainingBalance,
      payments: paymentsMap
    };
  });
};

/**
 * Updates borrower account closure status (with validation rule: remainingBalance <= 0 AND totalPaid > 0)
 */
export const updateBorrowerRowStatus = async ({ rowId, isClosed, user }) => {
  if (!isValidObjectId(rowId)) {
    const error = new Error('Invalid row ID');
    error.status = 400;
    throw error;
  }

  return await runInTransaction(async (session) => {
    const row = await LedgerBorrowerRow.findById(rowId).session(session);
    if (!row) {
      const error = new Error('Borrower row not found');
      error.status = 404;
      throw error;
    }

    const payments = await LedgerInstallmentPayment.find({ rowId: row._id }).session(session);
    const totalPaid = calculateTotalPaid(payments);
    const remainingBalance = calculateRemainingBalance(row.initialRemaining, totalPaid);

    if (isClosed === true) {
      const { eligible, reason } = checkAccountClosureEligibility(remainingBalance, totalPaid);
      if (!eligible) {
        const error = new Error(reason);
        error.status = 400;
        throw error;
      }
    }

    row.isClosed = Boolean(isClosed);
    row.updatedBy = user?.username || 'admin';
    await row.save({ session });

    // Sync with FinanceRecord
    await syncRowToFinanceRecord({
      row,
      totalPaid,
      remainingBalance,
      session,
      user
    });

    // Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: isClosed ? 'CLOSE_ACCOUNT' : 'REOPEN_ACCOUNT',
          entityType: 'LedgerBorrowerRow',
          entityId: row._id.toString(),
          details: {
            sNo: row.sNo,
            isClosed: row.isClosed,
            totalPaid,
            remainingBalance
          }
        }
      ],
      { session }
    );

    return {
      id: row._id.toString(),
      _id: row._id.toString(),
      sNo: row.sNo,
      nameTelugu: row.nameTelugu,
      nameEnglish: row.nameEnglish,
      isClosed: row.isClosed,
      totalPaid,
      remainingBalance
    };
  });
};

/**
 * Deletes a borrower row, its payments, syncs FinanceRecord, and renumbers subsequent sNos atomically
 */
export const deleteBorrowerRow = async ({ rowId, user }) => {
  if (!isValidObjectId(rowId)) {
    const error = new Error('Invalid row ID');
    error.status = 400;
    throw error;
  }

  return await runInTransaction(async (session) => {
    const row = await LedgerBorrowerRow.findById(rowId).session(session);
    if (!row) {
      const error = new Error('Borrower row not found');
      error.status = 404;
      throw error;
    }

    const deletedSNo = row.sNo;
    const ledgerBookId = row.ledgerBookId;

    // 1. Delete associated payments
    await LedgerInstallmentPayment.deleteMany({ rowId: row._id }, { session });

    // 2. Handle finance record sync
    if (row.financeRecordId) {
      await handleRowDeletionSync(row.financeRecordId, session);
    }

    // 3. Delete row
    await LedgerBorrowerRow.deleteOne({ _id: row._id }, { session });

    // 4. Renumber subsequent rows (sNo > deletedSNo -> sNo - 1)
    const subsequentRows = await LedgerBorrowerRow.find({
      ledgerBookId,
      sNo: { $gt: deletedSNo }
    })
      .sort({ sNo: 1 })
      .session(session);

    for (const r of subsequentRows) {
      r.sNo -= 1;
      await r.save({ session });
    }

    // 5. Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'DELETE_ROW',
          entityType: 'LedgerBorrowerRow',
          entityId: rowId,
          details: {
            deletedSNo,
            nameTelugu: row.nameTelugu,
            nameEnglish: row.nameEnglish
          }
        }
      ],
      { session }
    );

    return {
      deletedRowId: rowId,
      deletedSNo,
      remainingRowsCount: (await LedgerBorrowerRow.countDocuments({ ledgerBookId }).session(session))
    };
  });
};

/**
 * Atomic Batch Save of complete ledger state: dateColumns, borrower rows, and payment cells
 */
export const batchSaveLedger = async ({ ledgerBookId, version, dateColumns, rows, user }) => {
  return await runInTransaction(async (session) => {
    let ledgerBook;
    if (ledgerBookId && isValidObjectId(ledgerBookId)) {
      ledgerBook = await LedgerBook.findById(ledgerBookId).session(session);
    }
    if (!ledgerBook) {
      ledgerBook = await getOrCreateActiveLedgerBook(session);
    }

    // Optimistic Concurrency Check (if version is supplied)
    if (version !== undefined && ledgerBook.version !== undefined && ledgerBook.version !== version) {
      const conflictError = new Error('Ledger was modified by another user. Please refresh.');
      conflictError.status = 409;
      throw conflictError;
    }

    // 1. Sync Date Columns
    if (Array.isArray(dateColumns)) {
      // Clear old date columns for this ledger book
      await LedgerDateColumn.deleteMany({ ledgerBookId: ledgerBook._id }, { session });

      const newDateColumnsToInsert = [];
      for (let i = 0; i < dateColumns.length; i++) {
        const item = dateColumns[i];
        const headerDate = typeof item === 'string' ? item.trim() : item.headerDate?.trim();
        const labelTelugu =
          typeof item === 'object' && item.labelTelugu ? item.labelTelugu.trim() : `వాయిదా ${i + 1}`;

        newDateColumnsToInsert.push({
          ledgerBookId: ledgerBook._id,
          columnIndex: i,
          headerDate,
          labelTelugu
        });
      }

      if (newDateColumnsToInsert.length > 0) {
        await LedgerDateColumn.insertMany(newDateColumnsToInsert, { session });
      }
    }

    // 2. Sync Borrower Rows and Payments
    if (Array.isArray(rows)) {
      const processedRowIds = [];

      for (let index = 0; index < rows.length; index++) {
        const rowData = rows[index];
        const sNo = rowData.sNo || index + 1;
        const principalAmount =
          Number(rowData.principalAmount !== undefined ? rowData.principalAmount : rowData.amount) || 0;
        const initialRemaining =
          rowData.initialRemaining !== undefined && !isNaN(Number(rowData.initialRemaining))
            ? Number(rowData.initialRemaining)
            : calculateInitialRemaining(principalAmount);

        let rowDoc = null;
        const targetId = rowData.id || rowData._id;

        if (targetId && isValidObjectId(targetId)) {
          rowDoc = await LedgerBorrowerRow.findById(targetId).session(session);
        } else if (rowData.sNo) {
          rowDoc = await LedgerBorrowerRow.findOne({ ledgerBookId: ledgerBook._id, sNo: rowData.sNo }).session(session);
        }

        if (rowDoc) {
          // Update existing row
          rowDoc.sNo = sNo;
          rowDoc.borrowDate = rowData.borrowDate || rowData.date || rowDoc.borrowDate;
          rowDoc.nameTelugu = (rowData.nameTelugu || rowDoc.nameTelugu).trim();
          rowDoc.nameEnglish = (rowData.nameEnglish !== undefined ? rowData.nameEnglish : rowDoc.nameEnglish).trim();
          rowDoc.productItem = (rowData.productItem || rowData.item || rowDoc.productItem).trim();
          rowDoc.principalAmount = principalAmount;
          rowDoc.initialRemaining = initialRemaining;
          rowDoc.interestRate = Number(rowData.interestRate) || rowDoc.interestRate || 5;
          rowDoc.isClosed = Boolean(rowData.isClosed);
          rowDoc.updatedBy = user?.username || 'admin';
          await rowDoc.save({ session });
        } else {
          // Create new row
          rowDoc = new LedgerBorrowerRow({
            ledgerBookId: ledgerBook._id,
            sNo,
            borrowDate: rowData.borrowDate || rowData.date || addSevenDaysToDateStr(null),
            nameTelugu: (rowData.nameTelugu || '').trim(),
            nameEnglish: (rowData.nameEnglish || '').trim(),
            productItem: (rowData.productItem || rowData.item || '').trim(),
            principalAmount,
            initialRemaining,
            interestRate: Number(rowData.interestRate) || 5,
            isClosed: Boolean(rowData.isClosed),
            createdBy: user?.username || 'admin',
            updatedBy: user?.username || 'admin'
          });
          await rowDoc.save({ session });
        }

        processedRowIds.push(rowDoc._id);

        // 3. Process Payments for this row
        const paymentsData = rowData.payments;
        let rowTotalPaid = 0;

        if (paymentsData && typeof paymentsData === 'object') {
          const paymentEntries = Array.isArray(paymentsData)
            ? paymentsData.map((p, idx) => [idx, p])
            : Object.entries(paymentsData);

          for (const [colIdxKey, paymentVal] of paymentEntries) {
            const columnIndex = Number(colIdxKey);
            if (isNaN(columnIndex) || columnIndex < 0) continue;

            const amount =
              typeof paymentVal === 'object' && paymentVal !== null
                ? Number(paymentVal.amount)
                : Number(paymentVal);

            const paymentDate =
              typeof paymentVal === 'object' && paymentVal !== null && paymentVal.date
                ? paymentVal.date
                : '';

            const paymentType =
              typeof paymentVal === 'object' && paymentVal !== null && paymentVal.paymentType
                ? paymentVal.paymentType
                : 'Cash';

            if (isNaN(amount) || amount <= 0) {
              // Remove empty or 0 payment cell
              await LedgerInstallmentPayment.deleteOne(
                { rowId: rowDoc._id, columnIndex },
                { session }
              );
            } else {
              // Upsert payment
              await LedgerInstallmentPayment.findOneAndUpdate(
                { rowId: rowDoc._id, columnIndex },
                {
                  paymentDate: paymentDate || addSevenDaysToDateStr(null),
                  amount,
                  paymentType,
                  collectedBy: user?.username || 'admin'
                },
                { upsert: true, returnDocument: 'after', session }
              );
              rowTotalPaid += amount;
            }
          }
        }

        // Recalculate remaining balance and sync FinanceRecord
        const rowRemaining = calculateRemainingBalance(rowDoc.initialRemaining, rowTotalPaid);
        await syncRowToFinanceRecord({
          row: rowDoc,
          totalPaid: rowTotalPaid,
          remainingBalance: rowRemaining,
          session,
          user
        });
      }

      // Remove rows that were deleted from the ledger book in this batch
      const deletedRows = await LedgerBorrowerRow.find({
        ledgerBookId: ledgerBook._id,
        _id: { $nin: processedRowIds }
      }).session(session);

      for (const delRow of deletedRows) {
        await LedgerInstallmentPayment.deleteMany({ rowId: delRow._id }, { session });
        if (delRow.financeRecordId) {
          await handleRowDeletionSync(delRow.financeRecordId, session);
        }
        await LedgerBorrowerRow.deleteOne({ _id: delRow._id }, { session });
      }
    }

    // Increment ledger book version
    ledgerBook.version = (ledgerBook.version || 1) + 1;
    await ledgerBook.save({ session });

    // Audit log
    await AuditLog.create(
      [
        {
          userId: user?.username || user?.userId || 'admin',
          action: 'BATCH_SAVE',
          entityType: 'FinanceBook',
          entityId: ledgerBook._id.toString(),
          details: {
            rowsCount: rows ? rows.length : 0,
            columnsCount: dateColumns ? dateColumns.length : 0,
            newVersion: ledgerBook.version
          }
        }
      ],
      { session }
    );

    return {
      ledgerBookId: ledgerBook._id.toString(),
      version: ledgerBook.version
    };
  });
};
