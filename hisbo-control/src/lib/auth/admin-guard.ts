import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminUser } from '@/types/admin';
import { GENERIC_AUTH_ERROR } from './constants';
import { assertStagingEnvironment } from './staging-guard';
import { logAuthEvent } from './audit';

export interface RealAdminAuthResult {
  authorized: boolean;
  user: AdminUser | null;
  statusCode: number;
  error?: string;
}

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!cookieHeader) return map;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      try { map.set(key, decodeURIComponent(val)); }
      catch { map.set(key, val); } // A malformed unrelated cookie must not throw.
    }
  }
  return map;
}

/**
 * Strict server-side verification for real-data administrative routes.
 *
 * Mandatory Security Safeguards:
 * 1. Demo sessions are STRICTLY REJECTED with HTTP 403 (Requirement 5).
 * 2. Unsigned/client-supplied roles are ignored; verifies real session against Supabase Auth (Requirement 4).
 * 3. Checks staging public.profiles to confirm is_admin === true (Requirement 4).
 * 4. Fails closed if the configured database is not staging klvbtoxyeixxjydnanlz (Requirement 6).
 */
export async function verifyRealAdminSession(request?: Request): Promise<RealAdminAuthResult> {
  let demoCookie: string | undefined;

  if (request) {
    const cookieMap = parseCookieHeader(request.headers.get('cookie'));
    demoCookie = cookieMap.get('hisbo_control_demo');
  } else {
    try {
      const cookieStore = await cookies();
      demoCookie = cookieStore.get('hisbo_control_demo')?.value;
    } catch {
      // Outside request context
      demoCookie = undefined;
    }
  }

  // REQUIREMENT 5: Strictly reject demo sessions on real-data routes
  if (demoCookie === 'true' || demoCookie === 'super_admin') {
    logAuthEvent('warn', 'REAL_DATA_ACCESS_DENIED' as any, {
      reason: 'Demo evaluation session attempted to access real staging data route',
    });
    return {
      authorized: false,
      user: null,
      statusCode: 403,
      error: 'Access denied: Demo evaluation sessions cannot access real database records.',
    };
  }

  // REQUIREMENT 6: Fail-closed project validation
  const stagingCheck = assertStagingEnvironment();
  if (!stagingCheck.isStaging) {
    logAuthEvent('error', 'REAL_DATA_ACCESS_DENIED' as any, {
      reason: stagingCheck.error,
    });
    return {
      authorized: false,
      user: null,
      statusCode: 500,
      error: stagingCheck.error,
    };
  }

  // REQUIREMENT 4: Server-side authentication and is_admin confirmation
  try {
    let verifiedUser = null;

    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) verifiedUser = data.user;
    } catch {
      // If server client cannot access Next.js cookies, identity remains unverified
    }

    if (!verifiedUser) {
      return {
        authorized: false,
        user: null,
        statusCode: 401,
        error: GENERIC_AUTH_ERROR,
      };
    }

    const userId = verifiedUser.id;
    const userEmail = (verifiedUser.email || '').toLowerCase();

    // Verify is_admin status in staging public.profiles
    const supabase = await createSupabaseServerClient();
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, name, email, is_admin, created_at, last_seen')
      .eq('id', userId)
      .maybeSingle();

    if (profileErr || !profile || profile.is_admin !== true) {
      logAuthEvent('warn', 'REAL_DATA_ACCESS_DENIED' as any, {
        userId,
        email: userEmail,
        reason: 'User lacks verified administrative privileges in staging profiles',
      });
      return {
        authorized: false,
        user: null,
        statusCode: 403,
        error: GENERIC_AUTH_ERROR,
      };
    }

    // Optional email allowlist check
    const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS
      ?.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails && allowedEmails.length > 0 && !allowedEmails.includes(userEmail)) {
      return {
        authorized: false,
        user: null,
        statusCode: 403,
        error: GENERIC_AUTH_ERROR,
      };
    }

    const adminUser: AdminUser = {
      id: profile.id,
      email: verifiedUser.email || profile.email || 'admin@hisbo.in',
      name: profile.name || verifiedUser.email?.split('@')[0] || 'Administrator',
      role: 'super_admin',
      createdAt: profile.created_at || new Date().toISOString(),
      lastLogin: profile.last_seen || new Date().toISOString(),
      status: 'active',
    };

    return {
      authorized: true,
      statusCode: 200,
      user: adminUser,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    return {
      authorized: false,
      user: null,
      statusCode: 500,
      error: `Server authorization error: ${message}`,
    };
  }
}

