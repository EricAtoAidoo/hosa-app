// src/utils/helpers.js

/**
 * Pad a number to N digits with leading zeros.
 */
function padId(num, digits = 3) {
  return String(num).padStart(digits, '0');
}

/**
 * Generate sequential member ID from existing max.
 */
function nextMemberId(existingIds) {
  const nums = existingIds
    .map(id => parseInt((id || '').replace('HOSA', ''), 10))
    .filter(n => !isNaN(n));
  const nextNum = nums.length ? Math.max(...nums) + 1 : 2;
  return 'HOSA' + padId(nextNum, 3);
}

/**
 * Generate a receipt ID.
 */
function genReceiptId(year, rowCount) {
  return `HOSA-${year}-${padId(rowCount + 1, 5)}`;
}

/**
 * Generate a donation ID.
 */
function genDonationId(year, rowCount) {
  return `DON-${year}-${padId(rowCount + 1, 5)}`;
}

/**
 * Generate a log ID.
 */
function genLogId(rowCount) {
  return `LOG${padId(rowCount + 1, 6)}`;
}

/**
 * Format amount to GH₵ format.
 */
function fmtAmt(v) {
  return Number(v || 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Get today as en-GH date string.
 */
function todayGH() {
  return new Date().toLocaleDateString('en-GH');
}

/**
 * Safe error handler wrapper for async route handlers.
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  padId, nextMemberId, genReceiptId, genDonationId,
  genLogId, fmtAmt, todayGH, asyncHandler,
};
