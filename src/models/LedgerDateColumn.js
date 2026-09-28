import mongoose from 'mongoose';

const ledgerDateColumnSchema = new mongoose.Schema(
  {
    ledgerBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LedgerBook',
      required: [true, 'LedgerBook ID is required'],
      index: true
    },
    columnIndex: {
      type: Number,
      required: [true, 'Column index is required'],
      min: [0, 'Column index cannot be negative']
    },
    headerDate: {
      type: String,
      required: [true, 'Header date is required'],
      trim: true
    },
    labelTelugu: {
      type: String,
      required: [true, 'Telugu label is required'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index to guarantee uniqueness of column index within a ledger book
ledgerDateColumnSchema.index({ ledgerBookId: 1, columnIndex: 1 }, { unique: true });

const LedgerDateColumn = mongoose.model('LedgerDateColumn', ledgerDateColumnSchema);

export default LedgerDateColumn;
