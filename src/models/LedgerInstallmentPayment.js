import mongoose from 'mongoose';

const ledgerInstallmentPaymentSchema = new mongoose.Schema(
  {
    rowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerBorrowerRow',
      required: [true, 'Row ID is required'],
      index: true
    },
    columnIndex: {
      type: Number,
      required: [true, 'Column index is required'],
      min: [0, 'Column index cannot be negative']
    },
    paymentDate: {
      type: String,
      required: [true, 'Payment date is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative']
    },
    paymentType: {
      type: String,
      enum: ['Cash', 'UPI', 'Card'],
      default: 'Cash'
    },
    collectedBy: {
      type: String,
      default: 'admin'
    }
  },
  {
    timestamps: true
  }
);

// One payment record per rowId + columnIndex
ledgerInstallmentPaymentSchema.index({ rowId: 1, columnIndex: 1 }, { unique: true });

const LedgerInstallmentPayment = mongoose.model(
  'LedgerInstallmentPayment',
  ledgerInstallmentPaymentSchema
);

export default LedgerInstallmentPayment;
