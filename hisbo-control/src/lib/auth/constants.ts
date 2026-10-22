/**
 * Authentication and Security Constants for Hisbo Control
 * Enforces uniform, non-revealing error messages across the application.
 */

// Generic message displayed for all failed authentication attempts
// (invalid password, nonexistent account, non-admin account, inactive status)
export const GENERIC_AUTH_ERROR = 'Invalid credentials or access denied. Please try again.';

// Rate limit error message
export const RATE_LIMIT_ERROR = 'Too many login attempts. Please try again later.';

// Server-side rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  // Maximum failed attempts before lockout
  MAX_FAILED_ATTEMPTS: 5,
  // Window of observation (15 minutes)
  WINDOW_MS: 15 * 60 * 1000,
  // Lockout duration after exceeding limit (15 minutes)
  LOCKOUT_MS: 15 * 60 * 1000,
} as const;

