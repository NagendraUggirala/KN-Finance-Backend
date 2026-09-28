import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID or username is required'],
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      enum: [
        'CREATE_ROW',
        'UPDATE_ROW',
        'DELETE_ROW',
        'ADD_COLUMN',
        'DELETE_COLUMN',
        'UPDATE_PAYMENT',
        'CLOSE_ACCOUNT',
        'REOPEN_ACCOUNT',
        'BATCH_SAVE',
        'CREATE_EMPLOYEE',
        'UPDATE_EMPLOYEE',
        'CHANGE_EMPLOYEE_STATUS',
        'RESET_EMPLOYEE_PASSWORD',
        'DELETE_EMPLOYEE',
        'EMPLOYEE_LOGIN',
        'EMPLOYEE_COLLECTION'
      ],
      index: true

    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      default: 'FinanceBook'
    },
    entityId: {
      type: String,
      default: ''
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
