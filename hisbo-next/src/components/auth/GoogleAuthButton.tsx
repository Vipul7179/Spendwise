'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { googleAuthError, oauthReturnError } from '@/lib/google-auth';
import { beginGoogleAnalyticsFlow, trackAuthFailure } from '@/lib/analytics';

function subscribeToLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener('hashchange', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener('hashchange', onChange);
  };
}

export default function GoogleAuthButton({
  disabled = false,
  onBusyChange,
}: {
  disabled?: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const location = useSyncExternalStore(subscribeToLocation,
    () => window.location.search + window.location.hash, () => '');
  const returnError = oauthReturnError(location);

  useEffect(() => {
    // A browser Back navigation may restore the page from the back/forward cache.
    const reset = () => {
      pending.current = false;
      setLoading(false);
      onBusyChange(false);
    };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, [onBusyChange]);

  const continueWithGoogle = async () => {
    if (pending.current || disabled) return;
    pending.current = true;
    setLoading(true);
    onBusyChange(true);
    setError(null);
    try {
      const supabase = createClient();
      beginGoogleAnalyticsFlow();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/overview`,
        },
      });
      if (error) throw error;
      // Supabase navigates to Google. Keep locked until navigation or pageshow.
      // Do not clear guest storage or write user/profile data here.
    } catch (error) {
      trackAuthFailure('google');
      setError(googleAuthError(error));
      pending.current = false;
      setLoading(false);
      onBusyChange(false);
    }
  };

  return (
    <div className="google-auth">
      {(error || returnError) && <p className="google-auth-error" role="alert">{error || returnError}</p>}
      <button type="button" className="google-auth-button" disabled={disabled || loading}
        aria-busy={loading} onClick={continueWithGoogle}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z" />
          <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z" />
          <path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z" />
          <path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z" />
        </svg>
        <span aria-live="polite">{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
      </button>
      <div className="auth-email-divider"><span>or continue with email</span></div>
    </div>
  );
}
