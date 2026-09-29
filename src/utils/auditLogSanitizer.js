/**
 * Audit Log Data Sanitizer and Diff Utility
 *
 * Ensures sensitive information (passwords, tokens, OTPs, Aadhaar, PAN, etc.)
 * is never stored in plaintext within audit logs.
 */

// Keys that should be completely redacted/omitted from audit details
const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'oldpassword',
  'confirmpassword',
  'pass',
  'token',
  'jwt',
  'refreshtoken',
  'accesstoken',
  'bearertoken',
  'otp',
  'otphash',
  'resettoken',
  'resettokenhash',
  'secret',
  'secretkey',
  'privatekey',
  'apikey',
  'authorization',
  'cvv',
  'creditcard',
  'bankaccount',
  'accountnumber'
]);

/**
 * Mask sensitive identification numbers like Aadhaar or PAN.
 * Keeps only the last 4 characters visible, replacing the rest with '*'.
 *
 * @param {string} val - Plaintext string to mask
 * @returns {string} - Masked string
 */
export const maskIdentifier = (val) => {
  if (!val || typeof val !== 'string') return val;
  const str = val.trim();
  if (str.length <= 4) return '****';
  const visible = str.slice(-4);
  const masked = '*'.repeat(str.length - 4);
  return `${masked}${visible}`;
};

/**
 * Recursively sanitizes any object, array, or primitive before logging to AuditLog.
 * - Masks Aadhaar and PAN numbers
 * - Redacts passwords, tokens, hashes, and secrets
 * - Removes Mongoose internal fields (__v, _id if redundant)
 *
 * @param {any} data - Input data object or primitive
 * @returns {any} Sanitized clone of data
 */
export const sanitizeAuditDetails = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle Mongoose documents
  if (typeof data.toObject === 'function') {
    data = data.toObject();
  }

  // Handle Dates, RegExps, ObjectIds
  if (data instanceof Date) return data.toISOString();
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditDetails(item));
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if the key matches any sensitive pattern
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Mask Aadhaar card numbers
    if (lowerKey.includes('aadhar') || lowerKey.includes('aadhaar')) {
      sanitized[key] = typeof value === 'string' ? maskIdentifier(value) : '[MASKED]';
      continue;
    }

    // Mask PAN card numbers
    if (lowerKey.includes('pancard') || lowerKey === 'pan') {
      sanitized[key] = typeof value === 'string' ? maskIdentifier(value) : '[MASKED]';
      continue;
    }

    // Recursive sanitization for nested objects
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Computes safe before/after difference between two object states.
 * Automatically sanitizes both before and after representations.
 *
 * @param {Object} beforeDoc - Previous state (plain object or Mongoose document)
 * @param {Object} afterDoc - New state (plain object or Mongoose document)
 * @param {Array<string>} ignoredFields - Fields to skip during diff calculation
 * @returns {{ changedFields: string[], before: Object, after: Object }}
 */
export const computeDiff = (
  beforeDoc = {},
  afterDoc = {},
  ignoredFields = ['password', 'tokenVersion', 'updatedAt', 'createdAt', '__v', 'lastRequestedAt', 'otpHash', 'resetTokenHash']
) => {
  const beforeObj = typeof beforeDoc.toObject === 'function' ? beforeDoc.toObject() : { ...beforeDoc };
  const afterObj = typeof afterDoc.toObject === 'function' ? afterDoc.toObject() : { ...afterDoc };

  const changedFields = [];
  const beforeDiff = {};
  const afterDiff = {};

  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;

    const valBefore = beforeObj[key];
    const valAfter = afterObj[key];

    // Standardize comparison for dates and primitives
    const strBefore = valBefore instanceof Date ? valBefore.toISOString() : JSON.stringify(valBefore);
    const strAfter = valAfter instanceof Date ? valAfter.toISOString() : JSON.stringify(valAfter);

    if (strBefore !== strAfter) {
      changedFields.push(key);
      beforeDiff[key] = valBefore;
      afterDiff[key] = valAfter;
    }
  }

  return {
    changedFields,
    before: sanitizeAuditDetails(beforeDiff),
    after: sanitizeAuditDetails(afterDiff)
  };
};

/**
 * Safely extracts client IP address from Express request object
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const getClientIp = (req) => {
  if (!req) return '';
  const xForwardedFor = req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '';
};

/**
 * Safely extracts User-Agent string from Express request object
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const getUserAgent = (req) => {
  if (!req) return '';
  return req.headers?.['user-agent'] || '';
};
