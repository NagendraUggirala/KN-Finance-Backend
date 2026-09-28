import mongoose from 'mongoose';

/**
 * Checks if a string is a valid MongoDB ObjectId
 */
export const isValidObjectId = (id) => {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validates a number as a positive financial amount (or zero)
 */
export const isNonNegativeNumber = (val) => {
  return typeof val === 'number' && !isNaN(val) && val >= 0;
};

/**
 * Validates date string in DD-MM or DD-MM-YYYY format
 */
export const isValidDateFormat = (dateStr) => {
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  // Matches DD-MM or DD-MM-YYYY
  const regex = /^\d{1,2}-\d{1,2}(-\d{4})?$/;
  return regex.test(trimmed);
};

/**
 * Validates borrower row input payload
 */
export const validateBorrowerRowInput = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate) {
    if (!data.nameTelugu || typeof data.nameTelugu !== 'string' || !data.nameTelugu.trim()) {
      errors.push('nameTelugu is required and must be non-empty');
    }
    if (!data.productItem && !data.item) {
      errors.push('productItem (or item) is required');
    }
    if (data.principalAmount === undefined && data.amount === undefined) {
      errors.push('principalAmount is required');
    }
  }

  const principal = data.principalAmount !== undefined ? data.principalAmount : data.amount;
  if (principal !== undefined) {
    const num = Number(principal);
    if (isNaN(num) || num < 0) {
      errors.push('Principal amount must be a non-negative number');
    }
  }

  if (data.interestRate !== undefined) {
    const rate = Number(data.interestRate);
    if (isNaN(rate) || rate < 0) {
      errors.push('Interest rate must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
