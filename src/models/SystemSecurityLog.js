import mongoose from 'mongoose';

/**
 * System Security Log Model
 *
 * Dedicated collection for tracking critical system and security-level operations
 * (such as clearing the main audit trail) so that audit deletions are immutably
 * preserved without leaving records inside the cleared auditlogs collection.
 */
const systemSecurityLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    userRole: {
      type: String,
      required: true,
      default: 'superadmin',
      trim: true
    },
    action: {
      type: String,
      required: true,
      default: 'CLEAR_AUDIT_LOGS',
      trim: true
    },
    deletedCount: {
      type: Number,
      required: true,
      default: 0
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
    collection: 'systemsecuritylogs',
    versionKey: false
  }
);

systemSecurityLogSchema.index({ createdAt: -1 });

const SystemSecurityLog = mongoose.model('SystemSecurityLog', systemSecurityLogSchema);

export default SystemSecurityLog;
