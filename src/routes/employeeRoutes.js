import express from 'express';
import {
  getProfile,
  getBorrowers,
  collect,
  searchLedger,
  getBorrowerDossier,
  recordBorrowerInstallment,
  updateBorrower,
  toggleBorrowerStatusController,
  addExpense,
  getExpensesList,
  removeExpense
} from '../controllers/employeeController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Enforce role authorization: Employees, Admins, and Super Admins have access to field operations
router.use(authenticateToken, authorizeRoles('employee', 'admin', 'superadmin'));

// Existing Profile & Borrower Route Handlers
router.get('/profile', getProfile);
router.get('/assigned-borrowers', getBorrowers);
router.post('/collections', collect);

// 3.1. Scoped Borrower Fast Search
// GET /api/v1/employee/ledger/search?query=...&status=Active&limit=15
router.get('/ledger/search', searchLedger);

// 3.2. Single Borrower Ledger Dossier & Installment Matrix
// GET /api/v1/employee/ledger/borrower/:id
router.get('/ledger/borrower/:id', getBorrowerDossier);

// 3.3. Atomic Single-Borrower Installment Payment
// POST /api/v1/employee/ledger/borrower/:id/payment
router.post('/ledger/borrower/:id/payment', recordBorrowerInstallment);

// Borrower Details Update
// PATCH /api/v1/employee/ledger/borrower/:id
router.patch('/ledger/borrower/:id', updateBorrower);

// Borrower Status Toggle (Close / Reopen)
// PATCH /api/v1/employee/ledger/borrower/:id/status
router.patch('/ledger/borrower/:id/status', toggleBorrowerStatusController);

// 3.4. Field Operating Expenses Cloud Synchronization
// POST /api/v1/employee/expenses
router.post('/expenses', addExpense);

// GET /api/v1/employee/expenses?date=YYYY-MM-DD
router.get('/expenses', getExpensesList);

// DELETE /api/v1/employee/expenses/:id
router.delete('/expenses/:id', removeExpense);

export default router;
