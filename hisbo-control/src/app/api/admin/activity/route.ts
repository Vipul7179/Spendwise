import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

/**
 * Administrative API: Audit Trail
 *
 * Persistently stores and retrieves staff audit events in hisbo-staging (klvbtoxyeixxjydnanlz).
 * Requires admin session verification.
 */
export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode }
    );
  }

  let adminClient;
  try {
    adminClient = getSupabaseAdminClient();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Configuration error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  if (!adminClient) {
    return NextResponse.json(
      {
        success: false,
        requiresServiceRoleKey: true,
        error: 'Staging service-role key is not configured in hisbo-control/.env.local.',
        logs: [],
      },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
  const category = url.searchParams.get('category');

  try {
    let query = adminClient
      .from('admin_audit_logs')
      .select('id, timestamp, admin_id, admin_email, action, category, details, ip_hash, status, metadata')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      // Check if table does not exist yet (migration 001 pending)
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.includes('relation "public.admin_audit_logs" does not exist') ||
        error.message?.includes('Could not find the table') ||
        error.code === 'PGRST205';

      if (isMissingTable) {
        return NextResponse.json({
          success: true,
          configured: false,
          requiresMigration: true,
          message: 'Table public.admin_audit_logs is not initialized in hisbo-staging. Run migration 001_admin_roles_and_audit_logs.sql.',
          logs: [],
        });
      }

      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      adminEmail: row.admin_email,
      action: row.action,
      category: row.category,
      details: row.details || '',
      ipHash: row.ip_hash || 'local',
      status: row.status || 'success',
    }));

    return NextResponse.json({
      success: true,
      configured: true,
      logs: mapped,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database query failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode }
    );
  }

  let adminClient;
  try {
    adminClient = getSupabaseAdminClient();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Configuration error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }

  if (!adminClient) {
    return NextResponse.json(
      { success: false, error: 'Staging service-role key is not configured.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { action, category, details, status = 'success', metadata = {} } = body;

    if (!action || !category) {
      return NextResponse.json(
        { success: false, error: 'Action and category are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from('admin_audit_logs')
      .insert({
        admin_id: auth.user?.id,
        admin_email: auth.user?.email || 'admin@hisbo.in',
        action,
        category,
        details: details || '',
        status,
        metadata,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid request payload';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

