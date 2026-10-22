'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon, AlertTriangleIcon, CheckCircleIcon, ExternalLinkIcon } from '@/components/icons';
import { GENERIC_AUTH_ERROR } from '@/lib/auth/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Enforces Requirement 2: Uniform generic message for all authentication & authorization failures
        setErrorMsg(result.error || GENERIC_AUTH_ERROR);
        return;
      }

      setSuccessMsg('Authentication verified. Redirecting to console...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 800);
    } catch {
      // Uniform generic message on network or client-side fetch failure
      setErrorMsg(GENERIC_AUTH_ERROR);
    } finally {
      setLoading(false);
    }
  };

  // Production builds unconditionally reject demo mode, regardless of any env flag
  const isDemoPermitted = process.env.NODE_ENV !== 'production';

  const handleDemoLogin = async () => {
    if (!isDemoPermitted) {
      setErrorMsg('Demo evaluation mode is restricted to local development environments.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/auth/demo', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setErrorMsg('Demo evaluation mode is restricted to local development environments.');
        return;
      }

      setSuccessMsg('Demo session initialized as Super Admin. Redirecting...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 600);
    } catch {
      setErrorMsg('Failed to initialize demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #0d2a20 0%, #071510 70%)',
        padding: '1.5rem',
      }}
    >
      <div
        className="admin-card"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '2.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-light)',
          background: 'rgba(15, 39, 30, 0.95)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.75rem',
              letterSpacing: '-0.05em',
              marginBottom: '1rem',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            H
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Hisbo Control
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Administrative Operations & Security Console
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              🔒 Internal Staff Only
            </span>
          </div>
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertTriangleIcon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircleIcon size={18} style={{ flexShrink: 0 }} />
            <div>{successMsg}</div>
          </div>
        )}

        {/* Live Admin Credentials Form */}
        <form onSubmit={handleLiveLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Admin Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@hisbo.in"
              required
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontWeight: 600, marginTop: '0.5rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In with Supabase'}
          </button>
        </form>

        {isDemoPermitted ? (
          <>
            <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>OR EVALUATE</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* Quick Demo Login Option */}
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '0.65rem',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                background: 'var(--accent-muted)',
                fontWeight: 600,
              }}
            >
              <span>⚡ Enter Demo Console (Super Admin)</span>
            </button>

            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', lineHeight: 1.5 }}>
              Demo mode loads simulated telemetry without granting mutation rights on live user financial databases.
            </p>
          </>
        ) : (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.75rem', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            🔒 Demo evaluation mode is disabled in production. Authenticate with verified Supabase credentials.
          </div>
        )}

        {/* Security Notice */}
        <div
          style={{
            marginTop: '1.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <LockIcon size={14} />
          <span>RLS & Server Session Gated</span>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <a
          href="https://www.hisbo.in"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <span>Return to Hisbo Public Website</span>
          <ExternalLinkIcon size={13} />
        </a>
      </div>
    </div>
  );
}
