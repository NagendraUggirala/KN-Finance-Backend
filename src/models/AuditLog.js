import mongoose from 'mongoose';

/**
 * Production AuditLog Model
 *
 * Captures comprehensive immutable audit trail of actions performed across KN Finance.
 * Supports backward-compatibility with existing auditlogs records.
 */
const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID or username is required'],
      trim: true,
      index: true
    },
    userRole: {
      type: String,
      default: 'admin',
      trim: true,
      index: true
    },
    action: {
      type: String,
      required: [true, 'Audit action is required'],
      trim: true,
      uppercase: true,
      index: true
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
      default: 'General',
      index: true
    },
    entityId: {
      type: String,
      default: '',
      trim: true,
      index: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    ipAddress: {
      type: String,
      default: '',
      trim: true
    },
    userAgent: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Performance & Query Optimization Indexes
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ userRole: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
