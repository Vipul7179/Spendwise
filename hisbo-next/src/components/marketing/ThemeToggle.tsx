'use client';

import React, { useSyncExternalStore } from 'react';
import { restoreTheme } from '@/lib/theme';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

const THEME_CHANGE_EVENT = 'hisbo_theme_change';

function subscribeTheme(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === 'sw_theme' || event.key === 'spendwise_v1') {
      restoreTheme();
      callback();
    }
  };
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  systemTheme.addEventListener('change', callback);
  window.addEventListener('storage', onStorage);
  window.addEventListener(THEME_CHANGE_EVENT, callback);

  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined' && document.documentElement) {
    observer = new MutationObserver(() => callback());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }

  return () => {
    window.removeEventListener('storage', onStorage);
    systemTheme.removeEventListener('change', callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
    if (observer) observer.disconnect();
  };
}

function getThemeSnapshot(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  try {
    const raw = localStorage.getItem('spendwise_v1');
    const saved = raw ? JSON.parse(raw)?.theme : undefined;
    const swTheme = localStorage.getItem('sw_theme');
    if (saved === 'auto' || swTheme === 'auto') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
  } catch {
    // Local storage access error fallback
  }
  return 'light';
}

function getThemeServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

export default function ThemeToggle({ compact = false, className = '' }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('sw_theme', nextTheme);
      const raw = localStorage.getItem('spendwise_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.theme = nextTheme;
        localStorage.setItem('spendwise_v1', JSON.stringify(parsed));
      }
    } catch {
      // Storage access may be restricted
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  if (compact) {
    return (
      <button
        type="button"
        className={`theme-toggle-compact ${className}`}
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <span className="theme-toggle-compact-icon" aria-hidden="true">
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`theme-toggle-pill ${isDark ? 'is-dark' : 'is-light'} ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDark}
    >
      <span className="theme-toggle-thumb" aria-hidden="true" />
      <span className="theme-toggle-slot sun-slot" aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      </span>
      <span className="theme-toggle-slot moon-slot" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>
    </button>
  );
}
