import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuthEvent } from '@/lib/auth/audit';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Continue fail-safe
  }

  logAuthEvent('info', 'LOGOUT_SUCCESS', {
    reason: 'Admin signed out successfully',
  });

  const response = NextResponse.json({ success: true });

  // Delete demo cookie
  response.cookies.delete('hisbo_control_demo');

  // Ensure any Supabase auth cookies are explicitly cleared
  try {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('auth')) {
        response.cookies.set(cookie.name, '', { maxAge: 0, path: '/' });
      }
    }
  } catch {
    // Ignore cookie iteration errors in edge environments
  }

  return response;
}
