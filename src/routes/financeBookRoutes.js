import express from 'express';
import {
  getActiveLedger,
  batchSave,
  addColumn,
  deleteColumn,
  createRow,
  updateRow,
  updateRowStatus,
  deleteRow
} from '../controllers/financeBookController.js';
import { authenticateToken, requireStaffOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce authentication & staff authorization (admin, superadmin, employee) on all Finance Book endpoints
router.use(authenticateToken, requireStaffOrAdmin);


// Ledger Active & Batch Save
router.get('/active', getActiveLedger);
router.post('/batch-save', batchSave);

// Dynamic Installment Columns
router.post('/columns', addColumn);
router.delete('/columns/:index', deleteColumn);

// Borrower Rows
router.post('/rows', createRow);
router.patch('/rows/:id', updateRow);
router.patch('/rows/:id/status', updateRowStatus);
router.delete('/rows/:id', deleteRow);

export default router;
