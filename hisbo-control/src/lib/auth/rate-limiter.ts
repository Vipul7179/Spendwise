import { RATE_LIMIT_CONFIG } from './constants';

interface RateLimitEntry {
  failedAttempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  lockedUntil: number | null;
}

// Attach store to globalThis to persist across module reloads in Node.js
const globalStore = globalThis as unknown as {
  __hisboRateLimiterStore?: Map<string, RateLimitEntry>;
};

if (!globalStore.__hisboRateLimiterStore) {
  globalStore.__hisboRateLimiterStore = new Map<string, RateLimitEntry>();
}

const store = globalStore.__hisboRateLimiterStore;

/**
 * Extracts the real client IP from incoming request headers.
 * Safely parses x-forwarded-for, x-real-ip, or defaults to loopback.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

/**
 * Normalizes email address for rate limit keying.
 */
export function normalizeRateLimitEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks if a key (IP or email) is currently rate limited.
 */
export function checkRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  // Check if currently locked out
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Check if window has elapsed
  if (now - entry.firstAttemptAt > RATE_LIMIT_CONFIG.WINDOW_MS) {
    store.delete(key);
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - entry.failedAttempts);
  return {
    allowed: remaining > 0,
    remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a failed login attempt for a key.
 */
export function recordFailedAttempt(key: string): {
  locked: boolean;
  remaining: number;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now - entry.firstAttemptAt > RATE_LIMIT_CONFIG.WINDOW_MS) {
    entry = {
      failedAttempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
      lockedUntil: null,
    };
    store.set(key, entry);
    return {
      locked: false,
      remaining: RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - 1,
      retryAfterSeconds: 0,
    };
  }

  entry.failedAttempts += 1;
  entry.lastAttemptAt = now;

  if (entry.failedAttempts >= RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + RATE_LIMIT_CONFIG.LOCKOUT_MS;
    const retryAfterSeconds = Math.ceil(RATE_LIMIT_CONFIG.LOCKOUT_MS / 1000);
    return {
      locked: true,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const remaining = RATE_LIMIT_CONFIG.MAX_FAILED_ATTEMPTS - entry.failedAttempts;
  return {
    locked: false,
    remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Resets the rate limit counter for a key upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Prunes expired entries from the in-memory store to prevent memory leaks.
 */
export function pruneRateLimitStore(): void {
  const now = Date.now();
  const maxLifetime = RATE_LIMIT_CONFIG.WINDOW_MS + RATE_LIMIT_CONFIG.LOCKOUT_MS;
  for (const [key, entry] of store.entries()) {
    if (now - entry.lastAttemptAt > maxLifetime) {
      store.delete(key);
    }
  }
}

