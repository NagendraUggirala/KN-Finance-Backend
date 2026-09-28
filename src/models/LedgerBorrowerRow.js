import mongoose from 'mongoose';

const ledgerBorrowerRowSchema = new mongoose.Schema(
  {
    ledgerBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerBook',
      required: [true, 'LedgerBook ID is required'],
      index: true
    },
    sNo: {
      type: Number,
      required: [true, 'Serial number is required'],
      min: [1, 'Serial number must be at least 1']
    },
    borrowDate: {
      type: String,
      required: [true, 'Borrow date is required'],
      trim: true
    },
    nameTelugu: {
      type: String,
      required: [true, 'Telugu name is required'],
      trim: true
    },
    nameEnglish: {
      type: String,
      trim: true,
      default: ''
    },
    productItem: {
      type: String,
      required: [true, 'Product item is required'],
      trim: true
    },
    principalAmount: {
      type: Number,
      required: [true, 'Principal amount is required'],
      min: [0, 'Principal amount cannot be negative']
    },
    initialRemaining: {
      type: Number,
      required: [true, 'Initial remaining amount is required'],
      min: [0, 'Initial remaining amount cannot be negative']
    },
    interestRate: {
      type: Number,
      default: 5
    },
    isClosed: {
      type: Boolean,
      default: false,
      index: true
    },
    financeRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceRecord',
      default: null
    },
    createdBy: {
      type: String,
      default: 'admin'
    },
    updatedBy: {
      type: String,
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ledgerBorrowerRowSchema.index({ ledgerBookId: 1, sNo: 1 });
ledgerBorrowerRowSchema.index({ ledgerBookId: 1, isClosed: 1 });

const LedgerBorrowerRow = mongoose.model('LedgerBorrowerRow', ledgerBorrowerRowSchema);

export default LedgerBorrowerRow;
