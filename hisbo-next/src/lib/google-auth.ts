/** Only show known, useful messages; never echo provider details or tokens. */
export function oauthReturnError(location: string): string | null {
  const [search, hash] = location.split('#');
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash);
  const code = fragment.get('error') || query.get('error');
  if (!code) return null;
  if (code === 'access_denied') return 'Google sign-in was cancelled. You can try again or continue with email.';
  return 'We could not finish signing you in. Please try again. If the link expired, start a new sign-in from this page.';
}

export function googleAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message
    : typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : '';
  if (/fetch|network|offline/i.test(message)) return 'Could not connect to Google sign-in. Check your connection and try again.';
  if (/provider|disabled|not enabled|configuration|missing next_public/i.test(message)) {
    return 'Google sign-in is temporarily unavailable. Please use email or try again later.';
  }
  return 'Could not start Google sign-in. Please try again or continue with email.';
}
