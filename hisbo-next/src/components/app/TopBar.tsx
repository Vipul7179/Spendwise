'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenAccountModal?: () => void;
}

export default function TopBar({ onOpenMobileMenu, onOpenAccountModal }: TopBarProps) {
  const { state, toggleHide, cycleTheme } = useApp();
  const { openAccount } = useModal();
  const unreadAlerts = (state.alerts || []).filter((a) => !a.read).length;
  const isHidden = state.hide === true;
  const currentTheme = state.theme || 'auto';

  const themeIcons = {
    light: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </>
    ),
    dark: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    auto: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  };

  const initialLetter = (state.name?.trim() || '?')[0].toUpperCase();

  return (
    <div className="tb">
      <Link className="tbrand" href="/overview" aria-label="Hisbo home">
        <span className="tlogo">
          <Image
            src="/logo-mark.webp"
            alt="Hisbo"
            width={32}
            height={32}
            className="lgi"
          />
        </span>
        <span>Hisbo</span>
      </Link>

      <div className="tr">
        <div className="tools" role="toolbar" aria-label="Quick settings" style={{ display: 'flex', gap: '8px' }}>
          {/* Privacy Eye Toggle */}
          <button
            className={`ib ${isHidden ? 'on' : ''}`}
            onClick={toggleHide}
            aria-label={isHidden ? 'Show amounts' : 'Hide amounts'}
            title={isHidden ? 'Show amounts' : 'Hide amounts'}
            style={{
              background: 'none',
              border: 0,
              cursor: 'pointer',
              color: 'var(--ink)',
              padding: '6px',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {isHidden ? (
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

          {/* Theme Toggle */}
          <button
            className="ib"
            onClick={cycleTheme}
            aria-label={`Theme: ${currentTheme}. Tap to change`}
            title={`Theme: ${currentTheme}. Tap to change`}
            style={{
              background: 'none',
              border: 0,
              cursor: 'pointer',
              color: 'var(--ink)',
              padding: '6px',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {themeIcons[currentTheme]}
            </svg>
          </button>

          {/* Alerts Bell */}
          <Link
            href="/alerts"
            className="ib bell"
            aria-label={`Alerts ${unreadAlerts ? `(${unreadAlerts} unread)` : ''}`}
            title={`Alerts ${unreadAlerts ? `(${unreadAlerts} unread)` : ''}`}
            style={{ position: 'relative', display: 'grid', placeItems: 'center' }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {unreadAlerts > 0 && <i>{unreadAlerts > 9 ? '9+' : unreadAlerts}</i>}
          </Link>
        </div>

        {/* Mobile Hamburger Menu Toggle */}
        <button
          className="ib menu-toggle"
          onClick={onOpenMobileMenu}
          aria-label="Open menu"
          style={{
            background: 'none',
            border: 0,
            cursor: 'pointer',
            color: 'var(--ink)',
            padding: '6px',
            placeItems: 'center',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Desktop User Avatar Button */}
        <button
          className="avt desktop-account"
          onClick={onOpenAccountModal || openAccount}
          aria-label="Account"
          title="Account"
        >
          {initialLetter}
        </button>
      </div>
    </div>
  );
}
