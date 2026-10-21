import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Anonymous navigation needs no auth network round trip. Supabase validates
  // signatures and refreshes expired tokens when a persisted session exists.
  if (!request.cookies.getAll().some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))) {
    return supabaseResponse;
  }
  const { data, error } = await supabase.auth.getClaims();
  if (!error && data?.claims && ['/', '/login', '/signup'].includes(request.nextUrl.pathname)) {
    const response = NextResponse.redirect(new URL('/overview', request.url));
    // Preserve rotated refresh tokens on redirects too.
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
  supabaseResponse.headers.set('Cache-Control', 'private, no-store');

  return supabaseResponse;
}

