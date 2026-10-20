export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const m = String(error.message || '');
  const c = error.status;

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) {
    return 'Could not connect. Check your internet connection and try again.';
  }
  if (/invalid login credentials|invalid_grant|invalid login/i.test(m)) {
    return 'Incorrect email or password.';
  }
  if (/already registered|already exists|User already registered/i.test(m)) {
    return 'An account with this email already exists. Try logging in.';
  }
  if (/not confirmed|Email not confirmed/i.test(m)) {
    return 'Please confirm your email first. Check your inbox.';
  }
  if (c === 429 || /rate limit|too many/i.test(m)) {
    return /email/i.test(m)
      ? 'Too many emails were sent recently. Please try again in about an hour, or log in if you already have an account.'
      : 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (/password/i.test(m) && /weak|short|least/i.test(m)) {
    return 'Choose a stronger password (at least 8 characters).';
  }
  return m || 'Something went wrong. Please try again.';
}

export function calculatePasswordStrength(v: string): { score: number; label: string } {
  let n = 0;
  if (v.length >= 8) n++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) n++;
  if (/\d/.test(v)) n++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  if (!v) n = 0;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: n, label: labels[n] || '' };
}

