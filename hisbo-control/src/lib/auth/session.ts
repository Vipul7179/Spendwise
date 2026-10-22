import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminUser } from '@/types/admin';
import { GENERIC_AUTH_ERROR } from './constants';
import { logAuthEvent } from './audit';

export interface AdminAuthResult {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  user: AdminUser | null;
  error?: string;
}

const DEMO_ADMIN: AdminUser = {
  id: 'usr_demo_super_admin',
  email: 'admin@hisbo.in',
  name: 'Hisbo Super Admin (Demo)',
  role: 'super_admin',
  avatarUrl: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  lastLogin: new Date().toISOString(),
  status: 'active',
};

/**
 * Server-side verification for Hisbo Control admin access.
 * Validates real Supabase Auth session AND verifies `profiles.is_admin === true`.
 * In production, demo evaluation mode is strictly prohibited.
 */
export async function verifyAdminSession(): Promise<AdminAuthResult> {
  const cookieStore = await cookies();
  const demoCookie = cookieStore.get('hisbo_control_demo')?.value;

  // 1. Check if demo mode is active — STRICTLY RESTRICTED TO NON-PRODUCTION
  // Production builds unconditionally reject demo mode, regardless of any env flag
  const isDemoPermitted = process.env.NODE_ENV !== 'production';

  if ((demoCookie === 'true' || demoCookie === 'super_admin') && isDemoPermitted) {
    return {
      isAuthenticated: true,
      isAdmin: true,
      isDemo: true,
      user: DEMO_ADMIN,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        isDemo: false,
        user: null,
        error: GENERIC_AUTH_ERROR,
      };
    }

    const userId = session.user.id;
    const userEmail = (session.user.email || '').toLowerCase();

    // 2. Query public.profiles to verify administrative privileges
    // Queries only standard columns without exposing internal structure
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, is_admin, created_at, last_seen')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile || !profile.is_admin) {
      // Invalidate the session immediately — unauthorized users cannot hold an active session
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue fail-closed
      }

      logAuthEvent('warn', 'SESSION_REVOKED_UNAUTHORIZED', {
        userId,
        email: userEmail,
        reason: 'Session revoked: user lacks verified administrative privileges',
      });

      return {
        isAuthenticated: false,
        isAdmin: false,
        isDemo: false,
        user: null,
        error: GENERIC_AUTH_ERROR,
      };
    }

    // 3. Defense-in-depth: Verify against environment allowlist if configured
    const allowedEmails = process.env.ADMIN_ALLOWED_EMAILS
      ?.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails && allowedEmails.length > 0) {
      if (!allowedEmails.includes(userEmail)) {
        try {
          await supabase.auth.signOut();
        } catch {
          // Continue fail-closed
        }

        logAuthEvent('warn', 'SESSION_REVOKED_UNAUTHORIZED', {
          userId,
          email: userEmail,
          reason: 'Session revoked: user not in ADMIN_ALLOWED_EMAILS allowlist',
        });

        return {
          isAuthenticated: false,
          isAdmin: false,
          isDemo: false,
          user: null,
          error: GENERIC_AUTH_ERROR,
        };
      }
    }

    const adminUser: AdminUser = {
      id: profile.id,
      email: session.user.email || profile.email || 'admin@hisbo.in',
      name: profile.name || session.user.email?.split('@')[0] || 'Administrator',
      role: 'super_admin',
      createdAt: profile.created_at || new Date().toISOString(),
      lastLogin: profile.last_seen || new Date().toISOString(),
      status: 'active',
    };

    return {
      isAuthenticated: true,
      isAdmin: true,
      isDemo: false,
      user: adminUser,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    logAuthEvent('error', 'SESSION_REVOKED_UNAUTHORIZED', {
      reason: `Unhandled verification exception: ${message}`,
    });

    return {
      isAuthenticated: false,
      isAdmin: false,
      isDemo: false,
      user: null,
      error: GENERIC_AUTH_ERROR,
    };
  }
}
