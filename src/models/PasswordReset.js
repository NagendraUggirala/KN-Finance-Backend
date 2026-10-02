import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'userModel',
      required: true,
      index: true
    },
    userModel: {
      type: String,
      enum: ['Admin', 'Employee'],
      default: 'Admin'
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    otpHash: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: '1h' } // Auto-delete documents 1 hour after expiresAt
    },
    attempts: {
      type: Number,
      default: 0
    },
    verified: {
      type: Boolean,
      default: false
    },
    resetTokenHash: {
      type: String,
      default: null,
      index: true
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null
    },
    lastRequestedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;
