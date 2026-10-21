'use client';

import { useRef, useState } from 'react';
import AppSplash from '@/components/app/AppSplash';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthTabs from '@/components/auth/AuthTabs';
import GoogleAuthButton from '@/components/auth/GoogleAuthButton';
import GuestEntryButton from '@/components/auth/GuestEntryButton';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyAuthErrorMessage, calculatePasswordStrength } from '@/lib/auth-helpers';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const pending = useRef(false);
  const [initializing, setInitializing] = useState(false);

  const pwdStrength = calculatePasswordStrength(password);
  const canCreateAccount = Boolean(name.trim())
    && /^[\p{L}\s.'-]+$/u.test(name.trim())
    && /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())
    && password.length >= 8
    && agreeTerms;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current || oauthLoading) return;
    setError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName || !/^[\p{L}\s.'-]+$/u.test(trimmedName)) {
      setError('Enter your name (letters and spaces only).');
      return;
    }

    const trimmedEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!agreeTerms) {
      setError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    pending.current = true;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        setInitializing(true);
        // Auto-confirmed or immediate session
        localStorage.removeItem('sw_guest');

        // Check if there is local guest data to sync/merge
        const localDataRaw = localStorage.getItem('spendwise_v1');
        if (localDataRaw) {
          try {
            const localData = JSON.parse(localDataRaw);
            localData.name = trimmedName;
            await supabase.from('user_data').upsert({
              user_id: data.user!.id,
              data: localData,
              updated_at: new Date().toISOString(),
            });
            localStorage.setItem('spendwise_v1', JSON.stringify(localData));
          } catch (err) {
            console.warn('[SignUp] Local data migration attempt:', err);
          }
        }

        router.replace('/overview');
      } else {
        // Confirmation email sent
        setSuccessMessage(
          `Account created for ${trimmedEmail}! Please check your email inbox to confirm your account, then log in.`
        );
      }
    } catch (err: any) {
      setInitializing(false);
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
      pending.current = false;
    }
  };


  if (initializing) return <AppSplash ready={false} />;
  return (
    <>
      <AuthTabs />
      <div id="af">
        <h2>Create your account</h2>
        <p className="mut">Free for personal use. Your data is saved securely to your account.</p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--bad) 12%, transparent)',
              border: '1px solid var(--bad)',
              color: 'var(--bad)',
              fontSize: '0.88rem',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
              border: '1px solid var(--ok)',
              color: 'var(--ok)',
              fontSize: '0.9rem',
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {successMessage}
            <div style={{ marginTop: '8px' }}>
              <Link href="/login" className="b" style={{ display: 'inline-block', padding: '8px 16px', fontSize: '0.85rem' }}>
                Go to Log In &rarr;
              </Link>
            </div>
          </div>
        )}

        {!successMessage && <GoogleAuthButton disabled={loading} onBusyChange={setOAuthLoading} />}

        {!successMessage && (
          <form id="signup-email-form" onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label htmlFor="signup-name">
              Your name
            </label>
            <div className="fl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="signup-name"
                type="text"
                placeholder="e.g. John"
                maxLength={30}
                autoComplete="given-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <label htmlFor="signup-email">
              Email
            </label>
            <div className="fl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                maxLength={80}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label htmlFor="signup-password">
              Password
            </label>
            <div className="fl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {showPassword ? (
                    <>
                      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 11s3 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                      <path d="M2 2l20 20" />
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            <div className="pws" data-s={pwdStrength.score}>
              <i />
              <i />
              <i />
              <i />
              <span>{pwdStrength.label}</span>
            </div>

            <ul className="password-hints">
              <li>At least 8 characters</li>
              <li>Tip: combine letters and numbers</li>
              <li>A strong password helps keep your account safe</li>
            </ul>

            <label className="chk">
              <input
                type="checkbox"
                form="signup-email-form"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
              />
              <span>
                I agree to the{' '}
                <Link href="/privacy?from=signup" target="_blank" rel="noopener noreferrer">
                  Terms and Privacy Policy
                </Link>
                . Your data stays private and is never sold.
              </span>
            </label>

            <button
              type="submit"
              className="b cta"
              disabled={loading || oauthLoading || !canCreateAccount}
              style={{ width: '100%', marginTop: '6px' }}
            >
              {loading ? (
                <>
                  <span className="sp" />
                  Creating account...
                </>
              ) : (
                <>Create account <span aria-hidden="true" style={{ marginLeft: 8 }}>&rarr;</span></>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <GuestEntryButton className="lk">Continue without an account</GuestEntryButton>
        </div>

        <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>

        <div className="trust" style={{ marginTop: '12px' }}>
          Guest data stays only on this device
        </div>
        <div className="trust">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Your data is encrypted and private
        </div>
      </div>
    </>
  );
}
