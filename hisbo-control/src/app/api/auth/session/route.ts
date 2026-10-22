import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await verifyAdminSession();

  if (!session.isAuthenticated || !session.isAdmin) {
    return NextResponse.json(
      {
        authenticated: false,
        isAdmin: false,
        isDemo: false,
        user: null,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    isAdmin: true,
    isDemo: session.isDemo,
    user: session.user,
  });
}
