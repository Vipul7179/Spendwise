import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GENERIC_AUTH_ERROR, RATE_LIMIT_ERROR } from '@/lib/auth/constants';
import {
  getClientIp,
  normalizeRateLimitEmail,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from '@/lib/auth/rate-limiter';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // 1. Parse and validate request body
  let email = '';
  let password = '';

  try {
    const body = await request.json();
    email = typeof body?.email === 'string' ? body.email.trim() : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    logAuthEvent('warn', 'LOGIN_FAILED_CREDENTIALS', { ip, reason: 'Malformed JSON payload' });
    return NextResponse.json(
      { success: false, error: GENERIC_AUTH_ERROR },
      { status: 400 }
    );
  }

  if (!email || !password) {
    logAuthEvent('warn', 'LOGIN_FAILED_CREDENTIALS', { ip, reason: 'Missing email or password' });
    return NextResponse.json(
      { success: false, error: GENERIC_AUTH_ERROR },
      { status: 400 }
    );
  }

  const normalizedEmail = normalizeRateLimitEmail(email);

  // 2. Server-side Rate Limiting (by IP and by target account)
  const ipLimit = checkRateLimit(ip);
  const emailLimit = checkRateLimit(normalizedEmail);

  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
    logAuthEvent('warn', 'LOGIN_FAILED_RATE_LIMITED', {
      ip,
      email: normalizedEmail,
      retryAfterSeconds: retryAfter,
    });

    return NextResponse.json(
      { success: false, error: RATE_LIMIT_ERROR },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  // 3. Attempt Supabase Authentication via Server Client
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !data.user) {
      // Record failure for rate limiting
      recordFailedAttempt(ip);
      recordFailedAttempt(normalizedEmail);

      logAuthEvent('warn', 'LOGIN_FAILED_CREDENTIALS', {
        ip,
        email: normalizedEmail,
        reason: authError?.message || 'No user object returned from Supabase Auth',
      });

      // Uniform generic response — no information leakage
      return NextResponse.json(
        { success: false, error: GENERIC_AUTH_ERROR },
        { status: 401 }
      );
    }

    const userId = data.user.id;

    // 4. Server-Side Administrative Authorization Check
    // Query public.profiles to verify administrative privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, is_admin')
      .eq('id', userId)
      .maybeSingle();

    const isExplicitAdmin = !profileError && profile && profile.is_admin === true;

    // Optional environment allowlist check
    const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS
      ?.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isEmailAllowed =
      !allowedEmails ||
      allowedEmails.length === 0 ||
      allowedEmails.includes(normalizedEmail);

    // 5. Enforce Administrative Authorization
    if (!isExplicitAdmin || !isEmailAllowed) {
      // CRITICAL: Immediately invalidate any session created by Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        logAuthEvent('error', 'SESSION_REVOKED_UNAUTHORIZED', {
          ip,
          userId,
          reason: `signOut error: ${signOutErr instanceof Error ? signOutErr.message : 'Unknown'}`,
        });
      }

      // Record failed attempt in rate limiter
      recordFailedAttempt(ip);
      recordFailedAttempt(normalizedEmail);

      logAuthEvent('warn', 'LOGIN_FAILED_NOT_ADMIN', {
        ip,
        email: normalizedEmail,
        userId,
        reason: !isExplicitAdmin
          ? `User exists but lacks administrative privileges (profileErr: ${Boolean(profileError)})`
          : 'User email is not in ADMIN_ALLOWED_EMAILS',
      });

      // Prepare response and explicitly purge any auth cookies
      const response = NextResponse.json(
        { success: false, error: GENERIC_AUTH_ERROR },
        { status: 401 }
      );

      const cookieStore = await cookies();
      for (const cookie of cookieStore.getAll()) {
        if (cookie.name.startsWith('sb-') || cookie.name.includes('auth')) {
          response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
        }
      }

      return response;
    }

    // 6. Successful Admin Login
    resetRateLimit(ip);
    resetRateLimit(normalizedEmail);

    logAuthEvent('info', 'LOGIN_SUCCESS', {
      ip,
      email: normalizedEmail,
      userId,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    recordFailedAttempt(ip);
    recordFailedAttempt(normalizedEmail);

    const errMessage = err instanceof Error ? err.message : 'Unknown error during authentication';
    logAuthEvent('error', 'LOGIN_FAILED_CREDENTIALS', {
      ip,
      email: normalizedEmail,
      reason: `Unhandled exception: ${errMessage}`,
    });

    return NextResponse.json(
      { success: false, error: GENERIC_AUTH_ERROR },
      { status: 401 }
    );
  }
}

