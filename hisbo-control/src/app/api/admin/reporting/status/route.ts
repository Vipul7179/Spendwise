import { NextResponse } from 'next/server';
import { verifyRealAdminSession } from '@/lib/auth/admin-guard';
import {
  getProductionReporterStatus,
  verifyProductionReportingConnection,
} from '@/lib/production/reporter';

export const dynamic = 'force-dynamic';

/**
 * READ-ONLY Administrative API: Inspect Production Reporting Status & Connectivity
 *
 * Security Requirements:
 * - Server-side admin verification (no browser-supplied roles).
 * - Demo sessions rejected (HTTP 403).
 * - Read-only operation.
 */
export async function GET(request: Request) {
  const auth = await verifyRealAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error },
      { status: auth.statusCode }
    );
  }

  const status = getProductionReporterStatus();

  // If not enabled or not configured, return honest status without connecting
  if (!status.enabled || !status.configured) {
    return NextResponse.json({
      success: true,
      enabled: status.enabled,
      configured: status.configured,
      message: status.message,
      connected: false,
    });
  }

  // If enabled and configured, perform read-only verification
  const check = await verifyProductionReportingConnection();
  return NextResponse.json({
    success: check.ok,
    enabled: true,
    configured: true,
    connected: check.ok,
    message: check.message,
    metrics: check.metrics || null,
  });
}

