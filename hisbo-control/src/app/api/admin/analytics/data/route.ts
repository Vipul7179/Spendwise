import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { fetchLiveGA4Telemetry } from '@/lib/analytics/ga4-client';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Fetch Real Google Analytics 4 Telemetry
 */
export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const result = await fetchLiveGA4Telemetry();

  if (result.requiresConfiguration) {
    return NextResponse.json(result, { status: 503 });
  }

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
