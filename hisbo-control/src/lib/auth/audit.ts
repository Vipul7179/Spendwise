/**
 * Secure Server-Side Audit Logger for Hisbo Control Authentication
 *
 * Enforces strict redaction of credentials, tokens, and secrets.
 * Outputs diagnostic information exclusively to server stdout/stderr.
 */

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|key|credential|jwt)/i;

/**
 * Recursively redacts sensitive keys from log payloads.
 */
function sanitizePayload(obj: unknown, depth = 0): unknown {
  if (depth > 5) return '[NESTED_OBJECT]';
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // If string looks like a JWT or long bearer token, redact it
    if (obj.startsWith('eyJ') && obj.length > 50) return REDACTED;
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizePayload(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = sanitizePayload(value, depth + 1);
    }
  }
  return result;
}

/**
 * Masks an email for safe server diagnostic logging.
 * Example: "superadmin@hisbo.in" -> "s***n@hisbo.in"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return REDACTED;
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export type AuthAuditEventType =
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED_CREDENTIALS'
  | 'LOGIN_FAILED_NOT_ADMIN'
  | 'LOGIN_FAILED_ALLOWLIST'
  | 'LOGIN_FAILED_RATE_LIMITED'
  | 'SESSION_VERIFY_SUCCESS'
  | 'SESSION_REVOKED_UNAUTHORIZED'
  | 'LOGOUT_SUCCESS'
  | 'DEMO_LOGIN_ATTEMPT';

/**
 * Records an authentication security event to server logs.
 */
export function logAuthEvent(
  level: 'info' | 'warn' | 'error',
  eventType: AuthAuditEventType,
  details: {
    ip?: string;
    email?: string;
    userId?: string;
    reason?: string;
    [key: string]: unknown;
  }
): void {
  const timestamp = new Date().toISOString();
  const safeEmail = details.email ? maskEmail(details.email) : undefined;

  const safeDetails = sanitizePayload({
    ...details,
    email: safeEmail,
  }) as Record<string, unknown>;

  const logMessage = `[AUTH-AUDIT] [${timestamp}] [${eventType}]`;

  if (level === 'info') {
    console.info(logMessage, JSON.stringify(safeDetails));
  } else if (level === 'warn') {
    console.warn(logMessage, JSON.stringify(safeDetails));
  } else {
    console.error(logMessage, JSON.stringify(safeDetails));
  }
}

