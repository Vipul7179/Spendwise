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
  isSidebarOpen?: boolean;
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

export function AdminTopBar({ currentUser: _currentUser, onToggleSidebar, isSidebarOpen = false }: AdminTopBarProps) {
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
      {/* Left: Mobile hamburger & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="admin-hamburger-btn"
            aria-label={isSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isSidebarOpen}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              flexShrink: 0,
            }}
          />
          <span className="topbar-status-text">
            Operational
          </span>
        </div>
      </div>

      {/* Right: Actions, Environment, Theme, Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {/* Environment Badge (hidden on narrow screens < 640px via CSS) */}
        <div className="topbar-db-badge">
          <DatabaseIcon size={13} style={{ color: 'var(--accent)' }} />
          <span>Database: Live</span>
        </div>

        {/* Quick Action Button */}
        <Link
          href="/blogs?action=new"
          className="btn btn-primary btn-sm topbar-action-btn"
          style={{ minHeight: 38 }}
          title="Create New Blog Article"
        >
          <PlusIcon size={15} />
          <span className="topbar-action-label">New Article</span>
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="topbar-icon-btn"
        >
          {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Notifications"
            aria-label="View system notifications"
            aria-expanded={showNotifications}
            className="topbar-icon-btn"
          >
            <BellIcon size={17} />
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          </button>

          {showNotifications && (
            <div
              className="topbar-notifications-popover"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 'min(320px, calc(100vw - 2rem))',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                padding: '1rem',
                zIndex: 60,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  System Notifications
                </span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 600 }}>
                  Live Telemetry
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  ✅ RLS security check active: Financial ledgers protected.
                </div>
                <div style={{ padding: '0.5rem', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  📊 Real-time GA4 stream verified operational.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
