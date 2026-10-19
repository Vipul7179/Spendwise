'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyAuthErrorMessage, calculatePasswordStrength } from '@/lib/auth-helpers';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pwdStrength = calculatePasswordStrength(password);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/overview');
      }, 1500);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="af">
      <h2>Set a new password</h2>
      <p className="mut">Choose a strong password you have not used before.</p>

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
            marginBottom: '10px',
          }}
        >
          {error}
        </div>
      )}

      {success ? (
        <div
          style={{
            padding: '16px',
            borderRadius: '14px',
            background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
            border: '1px solid var(--ok)',
            textAlign: 'center',
          }}
        >
          <b style={{ color: 'var(--ok)', display: 'block', fontSize: '1.1rem', marginBottom: '6px' }}>
            Password updated!
          </b>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink)' }}>
            Redirecting to your dashboard...
          </p>
        </div>
      ) : (
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="new-password" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            New password
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
              id="new-password"
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

          {password && (
            <div className="pws" data-s={pwdStrength.score}>
              <i />
              <i />
              <i />
              <i />
              <span>{pwdStrength.label}</span>
            </div>
          )}

          <button
            type="submit"
            className="b cta"
            disabled={loading}
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? (
              <>
                <span className="sp" />
                Updating password...
              </>
            ) : (
              'Update password'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Link href="/login" className="g" style={{ width: '100%', display: 'inline-block', textAlign: 'center', boxSizing: 'border-box' }}>
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
