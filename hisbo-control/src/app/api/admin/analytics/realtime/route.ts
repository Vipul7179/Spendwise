import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { fetchLiveGA4Realtime } from '@/lib/analytics/ga4-client';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Fetch Real-Time GA4 Telemetry (Last 30 Minutes)
 */
export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get('refresh') === 'true';

  const result = await fetchLiveGA4Realtime({ forceRefresh });

  if (result.requiresConfiguration) {
    return NextResponse.json(result, { status: 503 });
  }

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}

