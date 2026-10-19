'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECONDARY_LINKS = [
  {
    href: '/automate',
    label: 'Automate',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
];

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname();
  const { state, user, isGuest, syncStatus, isAdmin, syncNow, logout, showToast } = useApp();
  const { openName } = useModal();

  if (!isOpen) return null;

  const initialLetter = (state.name?.trim() || '?')[0].toUpperCase();
  const sessionLabel = user ? user.email : 'Guest mode · saved on this device';

  const handleEditName = () => {
    onClose();
    openName(false);
  };

  const handleSyncNow = async () => {
    showToast('Syncing...');
    await syncNow();
  };

  const handleSignOut = async () => {
    onClose();
    await logout();
  };

  const supHref = () => {
    const n = state.name || '';
    const em = user?.email || '';
    const b = `Hi Hisbo support,\n\n[Please describe your question or issue here]\n\n---\n${n ? `Name: ${n}\n` : ''}${em ? `Account email: ${em}\n` : ''}Page: https://www.hisbo.in`;
    return `mailto:vipulsingh.prof@gmail.com?subject=${encodeURIComponent('Hisbo support request')}&body=${encodeURIComponent(b)}`;
  };

  return (
    <>
      <div
        className="mobile-backdrop visible"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="mobile-drawer open"
        role="dialog"
        aria-modal="true"
        aria-label="Hisbo menu"
      >
        <div className="drawer-head">
          <div className="drawer-title">
            <span className="tlogo">
              <Image
                src="/logo-mark.webp"
                alt="Hisbo"
                width={34}
                height={34}
                className="lgi"
              />
            </span>
            <span>Hisbo</span>
          </div>
          <button
            type="button"
            className="ib drawer-close"
            onClick={onClose}
            aria-label="Close menu"
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
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        <section className="drawer-profile" aria-label="Account">
          <div className="drawer-avatar">{initialLetter}</div>
          <div className="drawer-user">
            <strong>{state.name || 'Guest session'}</strong>
            <span>{sessionLabel}</span>
          </div>

          <div className="drawer-actions">
            <button type="button" className="drawer-action" onClick={handleEditName}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>
              <span>Edit name</span>
            </button>

            <a className="drawer-action" href={supHref()} onClick={onClose}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 6L2 7" />
              </svg>
              <span>Contact support</span>
            </a>

            {user ? (
              <>
                <button
                  type="button"
                  className="drawer-action"
                  onClick={handleSyncNow}
                  disabled={syncStatus === 'syncing'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 7v5h-5" />
                    <path d="M4 17v-5h5" />
                    <path d="M5.64 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.36-3" />
                  </svg>
                  <span>{syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}</span>
                </button>

                <button type="button" className="drawer-action primary" onClick={handleSignOut}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <path d="m16 17 5-5-5-5" />
                    <path d="M21 12H9" />
                  </svg>
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="drawer-action primary" onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="m10 17 5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Sign in</span>
                </Link>

                <Link href="/signup" className="drawer-action" onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Sign up</span>
                </Link>

                <Link href="/" className="drawer-action full" onClick={onClose}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m3 10 9-7 9 7" />
                    <path d="M5 9v11h14V9" />
                    <path d="M9 20v-6h6v6" />
                  </svg>
                  <span>Back to landing page</span>
                </Link>
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="drawer-section-title">More in Hisbo</h2>
          <div className="drawer-links">
            {SECONDARY_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="drawer-link"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onClose}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin/banners"
                className="drawer-link"
                aria-current={pathname === '/admin/banners' ? 'page' : undefined}
                onClick={onClose}
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <span>Manage banners</span>
              </Link>
            )}
          </div>
        </section>
      </aside>
    </>
  );
}
