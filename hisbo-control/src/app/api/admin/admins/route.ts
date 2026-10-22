import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { AdminUser } from '@/types/admin';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Fetch Staging Admin Accounts
 *
 * Architecture:
 * - Strictly queries hisbo-staging (klvbtoxyeixxjydnanlz) public.profiles where is_admin = true.
 * - Manages staff and platform administrators separately from production customers.
 *
 * Security Requirements:
 * - Server-side admin verification (no browser-supplied roles).
 * - Demo sessions rejected (HTTP 403).
 * - Staging project reference klvbtoxyeixxjydnanlz verified.
 * - Strictly read-only query.
 */
export async function GET(request: Request) {
  // 1. Verify authenticated Supabase session and is_admin status in staging
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode }
    );
  }

  // 2. Obtain service-role client for staging
  let adminClient;
  try {
    adminClient = getSupabaseAdminClient();
  } catch (clientErr) {
    const msg = clientErr instanceof Error ? clientErr.message : 'Client configuration error';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }

  if (!adminClient) {
    return NextResponse.json(
      {
        success: false,
        error: 'Staging service-role key is not configured in hisbo-control/.env.local.',
        requiresServiceRoleKey: true,
        admins: [],
      },
      { status: 503 }
    );
  }

  // 3. Query staging public.profiles for staff with is_admin = true
  try {
    const { data: profiles, error: queryErr } = await adminClient
      .from('profiles')
      .select('id, email, name, created_at, last_seen, is_admin')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (queryErr) {
      logAuthEvent('error', 'ADMIN_QUERY_FAILED' as any, {
        source: 'staging_admins',
        reason: queryErr.message,
      });
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve administrative accounts from staging database.' },
        { status: 500 }
      );
    }

    const admins: AdminUser[] = (profiles || []).map((p) => ({
      id: p.id,
      email: p.email || 'No email registered',
      name: p.name || p.email?.split('@')[0] || 'Administrator',
      role: 'super_admin',
      createdAt: p.created_at || new Date().toISOString(),
      lastLogin: p.last_seen || undefined,
      status: 'active',
    }));

    return NextResponse.json({
      success: true,
      admins,
      count: admins.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception';
    return NextResponse.json(
      { success: false, error: `Internal query error: ${msg}` },
      { status: 500 }
    );
  }
}

