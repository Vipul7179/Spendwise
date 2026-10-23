import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import { fetchAdvancedGA4Report } from '@/lib/analytics/ga4-client';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Fetch Real Google Analytics 4 Advanced Telemetry
 */
export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.statusCode });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '28d';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;
  const forceRefresh = searchParams.get('refresh') === 'true';

  // Validate range param
  const allowedRanges = ['today', '7d', '28d', '90d', 'custom'];
  const sanitizedRange = allowedRanges.includes(range) ? range : '28d';

  // Validate custom dates if specified
  if (sanitizedRange === 'custom') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid custom date range. Please supply valid startDate and endDate in YYYY-MM-DD format.',
        },
        { status: 400 }
      );
    }
  }

  const result = await fetchAdvancedGA4Report({
    range: sanitizedRange,
    startDate,
    endDate,
    forceRefresh,
  });

  if (result.requiresConfiguration) {
    return NextResponse.json(result, { status: 503 });
  }

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
