import FinanceRecord from '../models/FinanceRecord.js';

/**
 * Service to handle synchronization between LedgerBorrowerRow and FinanceRecord
 */
export const syncRowToFinanceRecord = async ({ row, totalPaid = 0, remainingBalance = 0, session = null, user = null }) => {
  try {
    const status = row.isClosed ? 'closed' : 'active';
    const targetAmount = row.initialRemaining;

    if (row.financeRecordId) {
      // Update existing record
      const updateData = {
        borrowerNameTelugu: row.nameTelugu,
        borrowerNameEnglish: row.nameEnglish || '',
        productItem: row.productItem,
        principalAmount: row.principalAmount,
        interestRate: row.interestRate || 5,
        targetAmount,
        totalPaid,
        remainingBalance,
        status,
        startDate: row.borrowDate
      };

      const query = FinanceRecord.findByIdAndUpdate(row.financeRecordId, updateData, {
        returnDocument: 'after'
      });
      if (session) query.session(session);
      return await query;

    } else {
      // Create a new FinanceRecord and link to row
      const recordData = {
        borrowerNameTelugu: row.nameTelugu,
        borrowerNameEnglish: row.nameEnglish || '',
        productItem: row.productItem,
        principalAmount: row.principalAmount,
        interestRate: row.interestRate || 5,
        targetAmount,
        totalPaid,
        remainingBalance,
        startDate: row.borrowDate,
        status,
        ledgerBookId: row.ledgerBookId,
        createdBy: user?.employeeId || user?.username || 'admin'
      };


      const records = await FinanceRecord.create([recordData], { session });
      const createdRecord = records[0];

      // Update row with financeRecordId
      row.financeRecordId = createdRecord._id;
      if (session) {
        await row.save({ session });
      } else {
        await row.save();
      }

      return createdRecord;
    }
  } catch (error) {
    console.error('Error synchronizing with FinanceRecord:', error);
    // Non-fatal if standalone, but log for audit
    return null;
  }
};

/**
 * Removes or updates status of FinanceRecord when a row is deleted
 */
export const handleRowDeletionSync = async (financeRecordId, session = null) => {
  if (!financeRecordId) return;
  try {
    const query = FinanceRecord.findByIdAndUpdate(
      financeRecordId,
      { status: 'closed' },
      { returnDocument: 'after' }
    );
    if (session) query.session(session);

    await query;
  } catch (error) {
    console.error('Error syncing row deletion to FinanceRecord:', error);
  }
};
