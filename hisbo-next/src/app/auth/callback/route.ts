import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function callbackOrigin(url: URL, request: Request): string {
  // Next's local server may use localhost internally for a 127.0.0.1 request.
  // Accept only known production/loopback hosts, never arbitrary proxy headers.
  const host = request.headers.get('host') || url.host;
  if (host === 'www.hisbo.in' || request.headers.get('x-forwarded-host') === 'www.hisbo.in') {
    return 'https://www.hisbo.in';
  }
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `${url.protocol}//${host}`;
  return 'https://www.hisbo.in';
}

function nextPath(value: string | null, origin: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/overview';
  const next = new URL(value, origin);
  const allowed = ['/overview', '/budgets', '/savings', '/groups', '/automate', '/alerts', '/admin/banners', '/reset-password'];
  return next.origin === origin && allowed.includes(next.pathname)
    ? next.pathname + next.search + next.hash : '/overview';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = callbackOrigin(url, request);
  const fail = (error: string) => NextResponse.redirect(`${origin}/login?error=${error}`);
  const providerError = url.searchParams.get('error');
  if (providerError) return fail(providerError === 'access_denied' ? 'access_denied' : 'oauth_failed');
  const code = url.searchParams.get('code');
  if (!code) return fail('missing_code');

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) return fail('exchange_failed');
    // The existing SSR client writes the exchanged session through next/headers cookies.
    return NextResponse.redirect(`${origin}${nextPath(url.searchParams.get('next'), origin)}`);
  } catch {
    return fail('exchange_failed');
  }
}
