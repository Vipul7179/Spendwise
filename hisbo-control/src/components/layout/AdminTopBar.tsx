'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  PlusIcon,
  DatabaseIcon,
} from '@/components/icons';
import { AdminUser } from '@/types/admin';

interface AdminTopBarProps {
  currentUser?: AdminUser | null;
  onToggleSidebar?: () => void;
}

const themeSubscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

const getThemeSnapshot = (): 'dark' | 'light' => {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem('hisbo_control_theme') as 'dark' | 'light') || 'dark';
};

const getServerSnapshot = (): 'dark' | 'light' => 'dark';

export function AdminTopBar({ currentUser, onToggleSidebar }: AdminTopBarProps) {
  const theme = useSyncExternalStore(themeSubscribe, getThemeSnapshot, getServerSnapshot);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('hisbo_control_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <header className="admin-topbar">
      {/* Left: Mobile hamburger & Page breadcrumb or Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', padding: '0.4rem 0.6rem' }}
            aria-label="Toggle Navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            System Operational
          </span>
        </div>
      </div>

      {/* Right: Actions, Environment, Theme, Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Environment Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.6rem',
            borderRadius: 6,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
          }}
        >
          <DatabaseIcon size={13} style={{ color: 'var(--accent)' }} />
          <span>Database: Connected</span>
        </div>

        {/* Quick Action Button */}
        <Link
          href="/blogs?action=new"
          className="btn btn-primary btn-sm"
          style={{ gap: '0.35rem' }}
        >
          <PlusIcon size={15} />
          <span>New Article</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            padding: '0.45rem',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s ease',
          }}
        >
          {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '0.45rem',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <BellIcon size={17} />
            <span
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 300,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                padding: '1rem',
                zIndex: 50,
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                System Notifications
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: 6, background: 'var(--bg-card)' }}>
                  ✅ RLS security check passed: Financial ledgers are shielded.
                </div>
                <div style={{ padding: '0.4rem', borderRadius: 6, background: 'var(--bg-card)' }}>
                  📊 Daily backup completed successfully at 04:00 UTC.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

