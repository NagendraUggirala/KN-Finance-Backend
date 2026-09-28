import mongoose from 'mongoose';

const ledgerBookSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: [true, 'Branch ID is required'],
      trim: true,
      default: 'NY-104'
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      default: 'KN FINANCE - FINANCE BOOK LEDGER'
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      default: '2026-2027'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ledgerBookSchema.index({ branchId: 1, isActive: 1 });

const LedgerBook = mongoose.model('LedgerBook', ledgerBookSchema);

export default LedgerBook;
