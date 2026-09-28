/**
 * Service for finance calculations used in the Finance Book Ledger
 */

/**
 * Calculates initial target balance from principal amount:
 * Formula: P * 1.20 * 1.05 (rounded to nearest integer)
 * Example: 15,000 * 1.20 * 1.05 = 18,900
 *
 * @param {number} principal
 * @returns {number}
 */
export const calculateInitialRemaining = (principal) => {
  const p = Number(principal) || 0;
  return Math.round(p * 1.20 * 1.05);
};

/**
 * Calculates +5% interest increment on a target balance
 * Formula: Current Target * 1.05 (rounded to nearest integer)
 *
 * @param {number} currentTarget
 * @returns {number}
 */
export const calculateInterestIncrement5Percent = (currentTarget) => {
  const target = Number(currentTarget) || 0;
  return Math.round(target * 1.05);
};

/**
 * Calculates total paid from an array or map of payments
 *
 * @param {Array|Object} payments
 * @returns {number}
 */
export const calculateTotalPaid = (payments) => {
  if (!payments) return 0;

  if (Array.isArray(payments)) {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  // If passed as an object / map: { "0": { amount: 500 }, ... }
  if (typeof payments === 'object') {
    return Object.values(payments).reduce((sum, p) => {
      const amt = typeof p === 'object' && p !== null ? p.amount : p;
      return sum + (Number(amt) || 0);
    }, 0);
  }


  return 0;
};

/**
 * Calculates remaining balance:
 * Formula: initialRemaining - totalPaid
 *
 * @param {number} initialRemaining
 * @param {number} totalPaid
 * @returns {number}
 */
export const calculateRemainingBalance = (initialRemaining, totalPaid) => {
  const initial = Number(initialRemaining) || 0;
  const paid = Number(totalPaid) || 0;
  return initial - paid;
};

/**
 * Checks whether an account is eligible for closure:
 * Rule: remainingBalance <= 0 AND totalPaid > 0
 *
 * @param {number} remainingBalance
 * @param {number} totalPaid
 * @returns {{ eligible: boolean, reason?: string }}
 */
export const checkAccountClosureEligibility = (remainingBalance, totalPaid) => {
  if (totalPaid <= 0) {
    return {
      eligible: false,
      reason: 'Account cannot be closed because total paid is 0'
    };
  }

  if (remainingBalance > 0) {
    return {
      eligible: false,
      reason: `Account cannot be closed because remaining balance (${remainingBalance}) is greater than 0`
    };
  }

  return { eligible: true };
};
