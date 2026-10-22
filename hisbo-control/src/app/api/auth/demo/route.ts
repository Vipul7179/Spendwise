import { NextResponse } from 'next/server';
import { logAuthEvent } from '@/lib/auth/audit';
import { getClientIp } from '@/lib/auth/rate-limiter';
import { GENERIC_AUTH_ERROR } from '@/lib/auth/constants';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = getClientIp(request);
  // Production builds unconditionally reject demo mode, regardless of any env flag
  const isDemoPermitted = process.env.NODE_ENV !== 'production';

  if (!isDemoPermitted) {
    logAuthEvent('warn', 'DEMO_LOGIN_ATTEMPT', {
      ip,
      reason: 'Demo login rejected: blocked in production environment',
    });

    return NextResponse.json(
      { success: false, error: GENERIC_AUTH_ERROR },
      { status: 403 }
    );
  }

  logAuthEvent('info', 'DEMO_LOGIN_ATTEMPT', {
    ip,
    reason: 'Demo login granted for local development / testing',
  });

  const response = NextResponse.json({ success: true, isDemo: true });
  response.cookies.set('hisbo_control_demo', 'super_admin', {
    path: '/',
    maxAge: 86400, // 24 hours
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

