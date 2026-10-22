import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  getProductionReporterStatus,
  fetchProductionUserDirectory,
} from '@/lib/production/reporter';
import { UserManagementItem } from '@/types/admin';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Fetch Customer User Directory
 *
 * ARCHITECTURAL DESIGN:
 * - Customer Management is completely isolated from Admin Management.
 * - DEFAULT DATA SOURCE: Spendwise Production (omnhxlqykmtzxdagppcl) via least-privilege
 *   reporting routine reporting.get_user_directory().
 * - Dedicated least-privilege role: hisbo_readonly_reporter (NO production service_role key).
 * - ZERO SILENT FALLBACK: If production reporting is unconfigured or disabled, returns
 *   HTTP 503 with explicit configuration guidance. Never serves mock data or staging admins.
 * - STAGING ADMIN ISOLATION: Staging admin accounts (is_admin = true) are NEVER displayed
 *   in the customer user directory.
 */
export async function GET(request: Request) {
  // 1. Verify authenticated admin session via hisbo-staging
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode }
    );
  }

  const url = new URL(request.url);
  // Default to PRODUCTION reporting for customer users
  const source = url.searchParams.get('source') || 'production';

  // ------------------------------------------------------------------
  // DEFAULT: PRODUCTION REPORTING (Spendwise omnhxlqykmtzxdagppcl)
  // ------------------------------------------------------------------
  if (source === 'production') {
    const reporterStatus = getProductionReporterStatus();
    if (!reporterStatus.enabled || !reporterStatus.configured) {
      return NextResponse.json(
        {
          success: false,
          source: 'production',
          configured: false,
          error: 'Production reporting is not configured. Customer accounts are queried from the Spendwise production database (omnhxlqykmtzxdagppcl). Please execute Migration 003 in Supabase SQL editor and configure PROD_REPORTING_ENABLED=true and PROD_REPORTING_DATABASE_URL in hisbo-control/.env.local.',
          requiresConfiguration: true,
          users: [],
          count: 0,
        },
        { status: 503 }
      );
    }

    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const search = url.searchParams.get('search') || '';

    const { users: rawUsers, error: prodErr } = await fetchProductionUserDirectory(limit, offset, search);

    if (prodErr) {
      logAuthEvent('error', 'ADMIN_QUERY_FAILED' as any, {
        source: 'production',
        reason: prodErr,
      });
      return NextResponse.json(
        {
          success: false,
          source: 'production',
          configured: true,
          error: prodErr,
          users: [],
          count: 0,
        },
        { status: 500 }
      );
    }

    const users: UserManagementItem[] = rawUsers.map((p) => {
      const lastSeenMs = p.last_seen ? new Date(p.last_seen).getTime() : 0;
      const isActive = lastSeenMs > 0 && Date.now() - lastSeenMs < 30 * 86400000;

      return {
        id: p.id,
        email: p.email || 'No email registered',
        name: p.name || p.email?.split('@')[0] || 'User',
        createdAt: p.created_at || new Date().toISOString(),
        lastSignIn: p.last_seen || undefined,
        authProvider: p.email ? 'email' : 'guest',
        status: isActive ? 'active' : 'inactive',
        isAdmin: Boolean(p.is_admin),
        totalExpensesCount: 0, // Customer ledgers intentionally isolated
        hasBudgets: false,
        hasGoals: false,
      };
    });

    return NextResponse.json({
      success: true,
      source: 'production',
      configured: true,
      users,
      count: users.length,
    });
  }

  // ------------------------------------------------------------------
  // OPTIONAL: STAGING SYNTHETIC CUSTOMERS (Excludes staging admin accounts)
  // ------------------------------------------------------------------
  let adminClient;
  try {
    adminClient = getSupabaseAdminClient();
  } catch (clientErr) {
    const msg = clientErr instanceof Error ? clientErr.message : 'Client configuration error';
    return NextResponse.json(
      { success: false, source: 'staging', error: msg },
      { status: 500 }
    );
  }

  if (!adminClient) {
    return NextResponse.json(
      {
        success: false,
        source: 'staging',
        error: 'Staging service-role key is not configured in .env.local.',
        requiresServiceRoleKey: true,
        users: [],
        count: 0,
      },
      { status: 503 }
    );
  }

  try {
    // REQUIREMENT 3: Exclude staging admin accounts from customer directory
    const { data: profiles, error: queryErr } = await adminClient
      .from('profiles')
      .select('id, email, name, created_at, last_seen, is_admin, expense_count, goals_count')
      .eq('is_admin', false)
      .order('created_at', { ascending: false });

    if (queryErr) {
      logAuthEvent('error', 'ADMIN_QUERY_FAILED' as any, {
        source: 'staging',
        reason: queryErr.message,
      });
      return NextResponse.json(
        { success: false, source: 'staging', error: 'Database query failed while fetching staging user records.' },
        { status: 500 }
      );
    }

    const users: UserManagementItem[] = (profiles || []).map((p) => {
      const lastSeenMs = p.last_seen ? new Date(p.last_seen).getTime() : 0;
      const isActive = lastSeenMs > 0 && Date.now() - lastSeenMs < 30 * 86400000;

      return {
        id: p.id,
        email: p.email || 'No email registered',
        name: p.name || p.email?.split('@')[0] || 'User',
        createdAt: p.created_at || new Date().toISOString(),
        lastSignIn: p.last_seen || undefined,
        authProvider: p.email ? 'email' : 'guest',
        status: isActive ? 'active' : 'inactive',
        isAdmin: false,
        totalExpensesCount: p.expense_count || 0,
        hasBudgets: false,
        hasGoals: (p.goals_count || 0) > 0,
      };
    });

    return NextResponse.json({
      success: true,
      source: 'staging',
      users,
      count: users.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown exception';
    return NextResponse.json(
      { success: false, source: 'staging', error: `Internal query error: ${msg}` },
      { status: 500 }
    );
  }
}
