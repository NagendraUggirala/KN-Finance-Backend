import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    severity: {
      type: String,
      enum: ['Info', 'Success', 'Warning', 'Critical', 'Expiry'],
      default: 'Info',
    },
    recipientType: {
      type: String,
      enum: ['all', 'single', 'status', 'expiry'],
      required: [true, 'Recipient type is required'],
    },
    recipientTarget: {
      type: String,
      default: 'All Admins',
    },
    targetAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    targetAdminEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    targetAdminName: {
      type: String,
      default: null,
      trim: true,
    },
    targetStatus: {
      type: String,
      enum: ['active', 'inactive', null],
      default: null,
    },
    expiryDate: {
      type: String,
      default: null,
    },
    sendEmail: {
      type: Boolean,
      default: false,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
    },
    actionLink: {
      type: String,
      default: null,
      trim: true,
    },
    readBy: [
      {
        adminId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Admin',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    senderName: {
      type: String,
      default: 'Super Admin',
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipientType: 1, createdAt: -1 });
notificationSchema.index({ targetAdminId: 1, createdAt: -1 });
notificationSchema.index({ targetStatus: 1 });
notificationSchema.index({ 'readBy.adminId': 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification };
export default Notification;
