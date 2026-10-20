'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getFriendlyAuthErrorMessage } from '@/lib/auth-helpers';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="af">
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <div
          className="av"
          style={{
            margin: '0 auto 12px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'color-mix(in srgb, var(--acc) 16%, var(--card))',
            color: 'var(--acc)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <svg
            width="28"
            height="28"
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
        </div>
        <h2>Forgot your password?</h2>
        <p className="mut" style={{ margin: '6px 0 0' }}>
          Enter your account email and we will send you a link to set a new password.
        </p>
      </div>

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

      {submitted ? (
        <div
          style={{
            padding: '14px',
            borderRadius: '14px',
            background: 'color-mix(in srgb, var(--ok) 14%, transparent)',
            border: '1px solid var(--ok)',
            textAlign: 'center',
          }}
        >
          <b style={{ color: 'var(--ok)', display: 'block', fontSize: '1.05rem', marginBottom: '4px' }}>
            Check your inbox
          </b>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink)', lineHeight: 1.5 }}>
            If an account exists for <b>{email}</b>, we have sent a link to reset your password. It
            can take a minute, so check your spam folder too.
          </p>
          <div style={{ marginTop: '16px' }}>
            <Link href="/login" className="b" style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label htmlFor="reset-email" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Account email
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
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              maxLength={80}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
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
                Sending reset link...
              </>
            ) : (
              'Send reset link'
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <Link href="/login" className="g" style={{ width: '100%', display: 'inline-block', textAlign: 'center', boxSizing: 'border-box', padding: '10px' }}>
              Back to login
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

