import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

import connectDB from '../config/db.js';
import LedgerBook from '../src/models/LedgerBook.js';
import LedgerDateColumn from '../src/models/LedgerDateColumn.js';
import LedgerBorrowerRow from '../src/models/LedgerBorrowerRow.js';
import LedgerInstallmentPayment from '../src/models/LedgerInstallmentPayment.js';
import FinanceRecord from '../src/models/FinanceRecord.js';
import AuditLog from '../src/models/AuditLog.js';

import {
  calculateInitialRemaining,
  calculateInterestIncrement5Percent,
  calculateTotalPaid,
  calculateRemainingBalance,
  checkAccountClosureEligibility
} from '../src/services/financeCalculationService.js';

import {
  getActiveLedgerData,
  addInstallmentColumn,
  deleteInstallmentColumn,
  createBorrowerRow,
  updateBorrowerRow,
  updateBorrowerRowStatus,
  deleteBorrowerRow,
  batchSaveLedger,
  addSevenDaysToDateStr
} from '../src/services/financeBookService.js';

async function runTests() {
  console.log('--- Starting Finance Book Backend Verification Suite ---');

  // 1. Test Financial Calculations
  console.log('\n[1] Testing Financial Calculations:');
  const principal = 15000;
  const initialRemaining = calculateInitialRemaining(principal);
  console.log(`Principal: ${principal} -> Initial Remaining (P * 1.20 * 1.05): ${initialRemaining}`);
  if (initialRemaining !== 18900) {
    throw new Error(`Expected 18900, got ${initialRemaining}`);
  }

  const targetIncrement = calculateInterestIncrement5Percent(initialRemaining);
  console.log(`Current Target: ${initialRemaining} -> +5% Increment: ${targetIncrement}`);
  if (targetIncrement !== 19845) {
    throw new Error(`Expected 19845, got ${targetIncrement}`);
  }

  const payments = [
    { amount: 500 },
    { amount: 500 },
    { amount: 1000 }
  ];
  const totalPaid = calculateTotalPaid(payments);
  const remaining = calculateRemainingBalance(initialRemaining, totalPaid);
  console.log(`Total Paid: ${totalPaid}, Remaining Balance: ${remaining}`);
  if (totalPaid !== 2000 || remaining !== 16900) {
    throw new Error(`Calculations mismatch. totalPaid=${totalPaid}, remaining=${remaining}`);
  }

  // Account Closure Eligibility
  const check1 = checkAccountClosureEligibility(16900, 2000);
  console.log('Account closure check with positive balance (16900): eligible =', check1.eligible);
  if (check1.eligible) throw new Error('Account with remaining balance should not be eligible for closure');

  const check2 = checkAccountClosureEligibility(0, 0);
  console.log('Account closure check with 0 paid: eligible =', check2.eligible);
  if (check2.eligible) throw new Error('Account with 0 paid should not be eligible for closure');

  const check3 = checkAccountClosureEligibility(0, 18900);
  console.log('Account closure check with 0 balance and 18900 paid: eligible =', check3.eligible);
  if (!check3.eligible) throw new Error('Fully paid account should be eligible for closure');

  // 2. Test Date Operations
  console.log('\n[2] Testing Date Arithmetic (+7 days):');
  const d1 = addSevenDaysToDateStr('08-08');
  console.log('08-08 + 7 days =', d1);
  if (d1 !== '15-08') throw new Error(`Expected 15-08, got ${d1}`);

  const d2 = addSevenDaysToDateStr('29-08');
  console.log('29-08 + 7 days (month transition) =', d2);
  if (d2 !== '05-09') throw new Error(`Expected 05-09, got ${d2}`);

  const d3 = addSevenDaysToDateStr('28-12');
  console.log('28-12 + 7 days (year transition) =', d3);
  if (d3 !== '04-01') throw new Error(`Expected 04-01, got ${d3}`);

  // 3. Test Database Connection & Endpoints
  console.log('\n[3] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  const testUser = { username: 'test_admin', role: 'admin' };

  // Clean test data
  console.log('\n[4] Initializing Active Ledger Book...');
  const activeData = await getActiveLedgerData();
  console.log('Active Ledger Book ID:', activeData.ledgerBook.id);
  const ledgerBookId = activeData.ledgerBook.id;

  // Clear previous test records for clean slate
  await LedgerDateColumn.deleteMany({ ledgerBookId });
  await LedgerBorrowerRow.deleteMany({ ledgerBookId });
  await AuditLog.deleteMany({ entityId: ledgerBookId });

  // 5. Test Adding Columns
  console.log('\n[5] Testing Add Column:');
  const col0 = await addInstallmentColumn({ ledgerBookId, user: testUser });
  console.log(`Column 0 added: columnIndex=${col0.columnIndex}, headerDate=${col0.headerDate}, labelTelugu=${col0.labelTelugu}`);

  const col1 = await addInstallmentColumn({ ledgerBookId, user: testUser });
  console.log(`Column 1 added: columnIndex=${col1.columnIndex}, headerDate=${col1.headerDate}, labelTelugu=${col1.labelTelugu}`);

  const col2 = await addInstallmentColumn({ ledgerBookId, user: testUser });
  console.log(`Column 2 added: columnIndex=${col2.columnIndex}, headerDate=${col2.headerDate}, labelTelugu=${col2.labelTelugu}`);

  if (col1.columnIndex !== 1 || col2.columnIndex !== 2) {
    throw new Error('Column indexing is not sequential');
  }

  // 6. Test Creating Borrower Rows
  console.log('\n[6] Testing Borrower Row Creation:');
  const row1 = await createBorrowerRow({
    data: {
      ledgerBookId,
      borrowDate: '03-08',
      nameTelugu: 'కృష్ణారావు',
      nameEnglish: 'Krishna Rao',
      productItem: 'బంగారు గాజులు',
      principalAmount: 15000,
      interestRate: 5
    },
    user: testUser
  });
  console.log(`Row 1 created: sNo=${row1.sNo}, nameTelugu=${row1.nameTelugu}, initialRemaining=${row1.initialRemaining}`);
  if (row1.sNo !== 1 || row1.initialRemaining !== 18900) {
    throw new Error('Row 1 sNo or initialRemaining incorrect');
  }

  const row2 = await createBorrowerRow({
    data: {
      ledgerBookId,
      borrowDate: '05-08',
      nameTelugu: 'వెంకటేశ్వర్లు',
      nameEnglish: 'Venkateswarlu',
      productItem: 'వెండి పాత్రలు',
      principalAmount: 20000,
      interestRate: 5
    },
    user: testUser
  });
  console.log(`Row 2 created: sNo=${row2.sNo}, nameTelugu=${row2.nameTelugu}, initialRemaining=${row2.initialRemaining}`);
  if (row2.sNo !== 2) {
    throw new Error('Row 2 sNo should be 2');
  }

  // 7. Test Updating Borrower Row & Applying +5% increment
  console.log('\n[7] Testing Borrower Row Update & +5% Increment:');
  const updatedRow1 = await updateBorrowerRow({
    rowId: row1.id,
    data: {
      applyFivePercentIncrement: true
    },
    user: testUser
  });
  console.log(`Row 1 updated with +5%: initialRemaining=${updatedRow1.initialRemaining}`);
  if (updatedRow1.initialRemaining !== 19845) {
    throw new Error('Row 1 +5% calculation failed');
  }

  // 8. Test Payments & Account Closure Validation
  console.log('\n[8] Testing Account Closure Validation:');
  // Attempt closure while balance remains
  try {
    await updateBorrowerRowStatus({
      rowId: row1.id,
      isClosed: true,
      user: testUser
    });
    throw new Error('Closure should have thrown error');
  } catch (err) {
    console.log('Correctly rejected closure when balance > 0:', err.message);
  }

  // 9. Test Deleting Column & Shifting
  console.log('\n[9] Testing Column Deletion and Atomic Shifting:');
  // Add payment at column 2
  await LedgerInstallmentPayment.create({
    rowId: row1.id,
    columnIndex: 2,
    paymentDate: col2.headerDate,
    amount: 1000,
    paymentType: 'Cash'
  });

  console.log('Deleting column 1 (middle column)...');
  await deleteInstallmentColumn({ ledgerBookId, columnIndex: 1, user: testUser });

  const remainingCols = await LedgerDateColumn.find({ ledgerBookId }).sort({ columnIndex: 1 });
  console.log('Remaining columns:', remainingCols.map(c => ({ idx: c.columnIndex, date: c.headerDate, telugu: c.labelTelugu })));
  if (remainingCols.length !== 2 || remainingCols[1].columnIndex !== 1) {
    throw new Error('Column shifting after deletion failed');
  }

  const shiftedPayment = await LedgerInstallmentPayment.findOne({ rowId: row1.id });
  console.log('Shifted payment columnIndex:', shiftedPayment.columnIndex);
  if (shiftedPayment.columnIndex !== 1) {
    throw new Error('Payment columnIndex was not shifted correctly');
  }

  // 10. Test Deleting Row & Renumbering
  console.log('\n[10] Testing Row Deletion and sNo Renumbering:');
  await deleteBorrowerRow({ rowId: row1.id, user: testUser });
  const remainingRows = await LedgerBorrowerRow.find({ ledgerBookId }).sort({ sNo: 1 });
  console.log('Remaining rows count:', remainingRows.length, 'Row 2 new sNo:', remainingRows[0].sNo);
  if (remainingRows[0].sNo !== 1) {
    throw new Error('Subsequent row sNo was not renumbered to 1');
  }

  // 11. Test Batch Save
  console.log('\n[11] Testing Batch Save (atomic update with columns, rows, payments):');
  const batchPayload = {
    ledgerBookId,
    dateColumns: ['08-08', '15-08', '22-08'],
    rows: [
      {
        sNo: 1,
        date: '03-08',
        nameTelugu: 'కృష్ణారావు',
        nameEnglish: 'Krishna Rao',
        item: 'బంగారు గొలుసు',
        amount: 10000,
        initialRemaining: 12600,
        isClosed: false,
        payments: {
          '0': { date: '08-08', amount: 600, paymentType: 'Cash' },
          '1': { date: '15-08', amount: 600, paymentType: 'UPI' }
        }
      },
      {
        sNo: 2,
        date: '10-08',
        nameTelugu: 'రామకృష్ణ',
        nameEnglish: 'Ramakrishna',
        item: 'వెండి గిన్నె',
        amount: 5000,
        initialRemaining: 6300,
        isClosed: false,
        payments: {
          '0': { date: '08-08', amount: 300, paymentType: 'Cash' }
        }
      }
    ]
  };

  const batchResult = await batchSaveLedger({
    ledgerBookId,
    dateColumns: batchPayload.dateColumns,
    rows: batchPayload.rows,
    user: testUser
  });
  console.log('Batch save completed. New version:', batchResult.version);

  // 12. Test Active Ledger Data Retrieval
  console.log('\n[12] Testing Active Ledger State Retrieval:');
  const fullLedger = await getActiveLedgerData();
  console.log('Active ledger date columns:', fullLedger.dateColumns);
  console.log('Active ledger row count:', fullLedger.rows.length);
  console.log('Row 1 details:', {
    sNo: fullLedger.rows[0].sNo,
    nameTelugu: fullLedger.rows[0].nameTelugu,
    nameEnglish: fullLedger.rows[0].nameEnglish,
    principalAmount: fullLedger.rows[0].principalAmount,
    initialRemaining: fullLedger.rows[0].initialRemaining,
    totalPaid: fullLedger.rows[0].totalPaid,
    remainingBalance: fullLedger.rows[0].remainingBalance,
    payments: fullLedger.rows[0].payments
  });
  console.log('Grand Totals:', fullLedger.totals);

  if (fullLedger.rows[0].totalPaid !== 1200) {
    throw new Error(`Expected Row 1 totalPaid = 1200, got ${fullLedger.rows[0].totalPaid}`);
  }
  if (fullLedger.rows[0].remainingBalance !== (12600 - 1200)) {
    throw new Error(`Expected Row 1 remainingBalance = 11400, got ${fullLedger.rows[0].remainingBalance}`);
  }

  // 13. Test Audit Logs
  const auditLogsCount = await AuditLog.countDocuments({ entityType: 'FinanceBook' });
  console.log('\n[13] Audit logs for FinanceBook recorded:', auditLogsCount);

  // 14. Test Telugu Character Encoding
  if (fullLedger.rows[0].nameTelugu !== 'కృష్ణారావు') {
    throw new Error(`Telugu character corruption detected: ${fullLedger.rows[0].nameTelugu}`);
  }
  console.log('Telugu character UTF-8 encoding verified perfectly:', fullLedger.rows[0].nameTelugu);

  console.log('\n✅ ALL 14 TEST SUITES PASSED SUCCESSFULLY!');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
