import dotenv from 'dotenv';
dotenv.config();

/**
 * Super Admin Seeder Notice
 * Super Admin credentials are now read directly from environment variables (.env):
 * - SUPERADMIN_USERNAME
 * - SUPERADMIN_PASSWORD
 *
 * No database record or model is required for Super Admin.
 */
console.log('ℹ️ Super Admin is configured via environment variables (.env).');
console.log('   SUPERADMIN_USERNAME:', process.env.SUPERADMIN_USERNAME ? '[CONFIGURED]' : '[NOT SET]');
console.log('   SUPERADMIN_PASSWORD:', process.env.SUPERADMIN_PASSWORD ? '[CONFIGURED]' : '[NOT SET]');
console.log('ℹ️ No database record is created or needed for Super Admin.');
process.exit(0);

