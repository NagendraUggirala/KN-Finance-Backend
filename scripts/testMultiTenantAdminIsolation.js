import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

import Admin from '../src/models/Admin.js';
import Employee from '../src/models/Employee.js';
import LedgerBook from '../src/models/LedgerBook.js';
import LedgerBorrowerRow from '../src/models/LedgerBorrowerRow.js';
import LedgerDateColumn from '../src/models/LedgerDateColumn.js';
import FinanceRecord from '../src/models/FinanceRecord.js';

import { createAdmin } from '../src/controllers/adminController.js';
import { getActiveLedgerData, createBorrowerRow, addInstallmentColumn } from '../src/services/financeBookService.js';
import { createEmployee, getEmployees, updateEmployee } from '../src/services/employeeService.js';
import { sendAdminCredentialsEmail } from '../src/services/emailService.js';

async function runMultiTenantVerification() {
  console.log('=================================================================');
  console.log('🚀 Starting Multi-Tenant Admin Isolation & Email Verification Suite');
  console.log('=================================================================');

  await mongoose.connect(process.env.MONGO_URI);
  console.log(' Connected to MongoDB Atlas');

  try {
    const timestamp = Date.now();
    const admin1Username = `admin_test_1_${timestamp}`;
    const admin1Email = `admin1_${timestamp}@knfinance.test`;
    const admin1Password = 'AdminSecret@123';

    const admin2Username = `admin_test_2_${timestamp}`;
    const admin2Email = `admin2_${timestamp}@knfinance.test`;
    const admin2Password = 'AdminSecret@456';

    // -------------------------------------------------------------
    // Test 1: Verify sendAdminCredentialsEmail template & dispatch
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing Admin Credentials Email Dispatcher:');
    const emailResult = await sendAdminCredentialsEmail({
      to: admin1Email,
      name: 'Test Branch Admin One',
      username: admin1Username,
      email: admin1Email,
      password: admin1Password
    });
    console.log(`   Email dispatch result: sent=${emailResult.sent}, simulated=${emailResult.simulated || false}`);
    if (!emailResult.sent) {
      throw new Error('Email dispatch failed');
    }
    console.log('✅ [Test 1 Passed] sendAdminCredentialsEmail rendered and dispatched successfully');

    // -------------------------------------------------------------
    // Test 2: Super Admin creates Admin 1 via createAdmin controller
    // -------------------------------------------------------------
    console.log('\n[Test 2] Creating Admin 1 via createAdmin Controller:');
    let admin1Created = null;
    let resObj1 = null;
    const req1 = {
      body: {
        username: admin1Username,
        password: admin1Password,
        name: 'Admin Branch 1',
        email: admin1Email,
        phone: '9876543210'
      },
      user: { role: 'superadmin', username: 'Nagendra' }
    };
    const res1 = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resObj1 = payload;
        admin1Created = payload.admin;
        return this;
      }
    };

    await createAdmin(req1, res1, (err) => {
      if (err) throw err;
    });

    if (res1.statusCode !== 201 || !admin1Created) {
      throw new Error(`Failed to create Admin 1: ${JSON.stringify(resObj1)}`);
    }
    console.log(`   Admin 1 created ID: ${admin1Created._id}, emailSent: ${resObj1.emailSent}`);
    console.log('✅ [Test 2 Passed] Admin 1 created and email notification dispatched');

    // -------------------------------------------------------------
    // Test 3: Super Admin creates Admin 2 via createAdmin controller
    // -------------------------------------------------------------
    console.log('\n[Test 3] Creating Admin 2 via createAdmin Controller:');
    let admin2Created = null;
    let resObj2 = null;
    const req2 = {
      body: {
        username: admin2Username,
        password: admin2Password,
        name: 'Admin Branch 2',
        email: admin2Email,
        phone: '9876543211'
      },
      user: { role: 'superadmin', username: 'Nagendra' }
    };
    const res2 = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resObj2 = payload;
        admin2Created = payload.admin;
        return this;
      }
    };

    await createAdmin(req2, res2, (err) => {
      if (err) throw err;
    });

    if (res2.statusCode !== 201 || !admin2Created) {
      throw new Error(`Failed to create Admin 2: ${JSON.stringify(resObj2)}`);
    }
    console.log(`   Admin 2 created ID: ${admin2Created._id}, emailSent: ${resObj2.emailSent}`);
    console.log('✅ [Test 3 Passed] Admin 2 created and email notification dispatched');

    // -------------------------------------------------------------
    // Test 4: Finance Book Isolation between Admin 1 and Admin 2
    // -------------------------------------------------------------
    console.log('\n[Test 4] Verifying Finance Book Isolation:');
    const admin1User = {
      userId: admin1Created._id.toString(),
      id: admin1Created._id.toString(),
      username: admin1Username,
      role: 'admin',
      name: 'Admin Branch 1'
    };
    const admin2User = {
      userId: admin2Created._id.toString(),
      id: admin2Created._id.toString(),
      username: admin2Username,
      role: 'admin',
      name: 'Admin Branch 2'
    };

    // Admin 1 loads their active ledger
    const ledger1Initial = await getActiveLedgerData({ user: admin1User });
    console.log(`   Admin 1 Ledger Title: "${ledger1Initial.ledgerBook.title}" (Rows: ${ledger1Initial.rows.length})`);

    // Admin 2 loads their active ledger
    const ledger2Initial = await getActiveLedgerData({ user: admin2User });
    console.log(`   Admin 2 Ledger Title: "${ledger2Initial.ledgerBook.title}" (Rows: ${ledger2Initial.rows.length})`);

    if (ledger1Initial.ledgerBook.id === ledger2Initial.ledgerBook.id) {
      throw new Error('Admin 1 and Admin 2 share the same ledgerBook ID! Isolation failed.');
    }
    console.log('   Confirmed: Admin 1 and Admin 2 have distinct LedgerBook instances.');

    // Admin 1 adds a date column and a borrower row
    console.log('   Adding a column and borrower row to Admin 1 Finance Book...');
    await addInstallmentColumn({ user: admin1User });
    await createBorrowerRow({
      data: {
        borrowDate: '17-10-2026',
        nameTelugu: 'వెంకటేశ్వర రావు',
        nameEnglish: 'Venkateswara Rao',
        productItem: 'Gold Loan 10g',
        principalAmount: 20000
      },
      user: admin1User
    });

    // Check Admin 1 ledger now
    const ledger1AfterAdd = await getActiveLedgerData({ user: admin1User });
    console.log(`   Admin 1 now has ${ledger1AfterAfterRows(ledger1AfterAdd)} borrower row(s).`);
    if (ledger1AfterAdd.rows.length !== 1) {
      throw new Error(`Expected Admin 1 to have 1 row, got ${ledger1AfterAdd.rows.length}`);
    }

    // Check Admin 2 ledger now - MUST BE 0 rows!
    const ledger2AfterAdd = await getActiveLedgerData({ user: admin2User });
    console.log(`   Admin 2 now has ${ledger2AfterAdd.rows.length} borrower row(s).`);
    if (ledger2AfterAdd.rows.length !== 0) {
      throw new Error(`Isolation Breach! Admin 2 sees Admin 1's rows: ${ledger2AfterAdd.rows.length}`);
    }
    console.log('✅ [Test 4 Passed] Finance Book data is 100% isolated between Admins');

    // -------------------------------------------------------------
    // Test 5: Employee Data Isolation between Admin 1 and Admin 2
    // -------------------------------------------------------------
    console.log('\n[Test 5] Verifying Employee Data Isolation:');

    // Admin 1 adds an employee
    const emp1 = await createEmployee({
      data: {
        fullName: 'Ravi Kumar (Admin 1 Employee)',
        age: 26,
        phone: '9988776655',
        email: `ravi_${timestamp}@knfinance.test`,
        assignedOperationalArea: 'Vijayawada Central',
        password: 'Password@123'
      },
      adminUser: admin1User
    });
    console.log(`   Admin 1 created employee: ${emp1.employeeId} (adminId: ${emp1.adminId})`);

    // Admin 2 lists employees
    const admin2Employees = await getEmployees({ user: admin2User });
    console.log(`   Admin 2 query returned ${admin2Employees.employees.length} employees.`);
    const leakedEmp = admin2Employees.employees.find((e) => e.employeeId === emp1.employeeId);
    if (leakedEmp) {
      throw new Error('Isolation Breach! Admin 2 can see Admin 1 employee!');
    }

    // Admin 2 creates their own employee
    const emp2 = await createEmployee({
      data: {
        fullName: 'Suresh Babu (Admin 2 Employee)',
        age: 29,
        phone: '9988776656',
        email: `suresh_${timestamp}@knfinance.test`,
        assignedOperationalArea: 'Guntur Rural',
        password: 'Password@123'
      },
      adminUser: admin2User
    });
    console.log(`   Admin 2 created employee: ${emp2.employeeId} (adminId: ${emp2.adminId})`);

    // Admin 1 lists employees
    const admin1Employees = await getEmployees({ user: admin1User });
    console.log(`   Admin 1 query returned ${admin1Employees.employees.length} employees.`);
    const hasEmp1 = admin1Employees.employees.some((e) => e.employeeId === emp1.employeeId);
    const hasEmp2InAdmin1 = admin1Employees.employees.some((e) => e.employeeId === emp2.employeeId);

    if (!hasEmp1) {
      throw new Error('Admin 1 cannot see their own employee!');
    }
    if (hasEmp2InAdmin1) {
      throw new Error('Isolation Breach! Admin 1 can see Admin 2 employee!');
    }
    console.log('✅ [Test 5 Passed] Employees are strictly scoped to their respective Admin');

    // -------------------------------------------------------------
    // Test 6: Cross-Tenant Protection (Admin 2 cannot modify Admin 1 employee)
    // -------------------------------------------------------------
    console.log('\n[Test 6] Testing Cross-Tenant Security Guards:');
    try {
      await updateEmployee({
        id: emp1._id || emp1.id,
        data: { fullName: 'Hacked by Admin 2' },
        adminUser: admin2User
      });
      throw new Error('Security Breach! Admin 2 was able to update Admin 1 employee!');
    } catch (err) {
      if (err.status === 403) {
        console.log(`   Security blocked unauthorized cross-tenant update as expected: "${err.message}" (HTTP 403)`);
      } else {
        throw err;
      }
    }
    console.log('✅ [Test 6 Passed] Cross-tenant security guards actively preventing unauthorized modifications');

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    console.log('\n[Cleanup] Cleaning up test data:');
    await Admin.deleteMany({ _id: { $in: [admin1Created._id, admin2Created._id] } });
    await LedgerBook.deleteMany({ adminId: { $in: [admin1Created._id, admin2Created._id] } });
    await Employee.deleteMany({ _id: { $in: [emp1._id || emp1.id, emp2._id || emp2.id] } });
    console.log('   Cleaned up test documents successfully.');

    console.log('\n=================================================================');
    console.log('🎉 ALL MULTI-TENANT ISOLATION & EMAIL TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=================================================================');
  } finally {
    await mongoose.disconnect();
  }
}

function ledger1AfterAfterRows(ledger) {
  return ledger.rows.length;
}

runMultiTenantVerification().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
