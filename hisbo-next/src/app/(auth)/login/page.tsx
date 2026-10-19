'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthTabs from '@/components/auth/AuthTabs';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyAuthErrorMessage } from '@/lib/auth-helpers';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (authError) {
        throw authError;
      }

      if (data.session) {
        // Clear guest session flag on successful login
        localStorage.removeItem('sw_guest');

        // Check if there is guest data to sync/merge
        const localDataRaw = localStorage.getItem('spendwise_v1');
        if (localDataRaw) {
          try {
            const localData = JSON.parse(localDataRaw);
            // Fetch cloud data and merge if needed
            const { data: cloudRow } = await supabase
              .from('user_data')
              .select('data')
              .eq('user_id', data.user.id)
              .maybeSingle();

            if (cloudRow?.data) {
              // Merging will be formalized by our sync engine
              console.log('[Auth] Found cloud data to merge with local session');
            } else {
              // Push local data directly to cloud
              await supabase.from('user_data').upsert({
                user_id: data.user.id,
                data: localData,
                updated_at: new Date().toISOString(),
              });
            }
          } catch (mergeErr) {
            console.warn('[Auth] Data sync attempt during login:', mergeErr);
          }
        }

        router.push('/overview');
        router.refresh();
      }
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    localStorage.setItem('sw_guest', '1');
    router.push('/overview');
  };

  return (
    <div>
      <AuthTabs />
      <div id="af">
        <h2>Welcome back</h2>
        <p className="mut">Log in to sync your expenses across all your devices.</p>

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

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="login-email" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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
              id="login-email"
              type="email"
              placeholder="you@example.com"
              maxLength={80}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label htmlFor="login-password" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
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
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              maxLength={72}
              autoComplete="current-password"
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

          <div style={{ textAlign: 'right' }}>
            <Link href="/forgot-password" className="lk" style={{ alignSelf: 'flex-end' }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="b cta"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? (
              <>
                <span className="sp" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <button
            type="button"
            className="lk"
            onClick={handleGuestContinue}
            style={{ fontWeight: 600 }}
          >
            Continue without an account
          </button>
        </div>

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
    </div>
  );
}
