import mongoose from 'mongoose';

const financeRecordSchema = new mongoose.Schema(
  {
    borrowerNameTelugu: {
      type: String,
      required: [true, 'Borrower Telugu name is required'],
      trim: true
    },
    borrowerNameEnglish: {
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
    interestRate: {
      type: Number,
      default: 5
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [0, 'Target amount cannot be negative']
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: [0, 'Total paid cannot be negative']
    },
    remainingBalance: {
      type: Number,
      default: 0
    },
    startDate: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      index: true
    },
    village: {
      type: String,
      trim: true,
      default: ''
    },
    assignedOperationalArea: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    ledgerBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerBook',
      index: true
    },

    createdBy: {
      type: String,
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
);

financeRecordSchema.index({ borrowerNameEnglish: 1 });
financeRecordSchema.index({ borrowerNameTelugu: 1 });

const FinanceRecord = mongoose.model('FinanceRecord', financeRecordSchema);

export default FinanceRecord;
