'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';

export default function AccountModal() {
  const router = useRouter();
  const { state, user, isGuest, syncStatus, syncError, isAdmin, syncNow, logout, showToast } = useApp();
  const { closeModal, openName } = useModal();

  const initialLetter = (state.name?.trim() || '?')[0].toUpperCase();

  const handleEditName = () => {
    closeModal();
    openName(false);
  };

  const handleSyncNow = async () => {
    showToast('Syncing...');
    await syncNow();
  };

  const handleLogout = async () => {
    closeModal();
    await logout();
  };

  const supHref = () => {
    const n = state.name || '';
    const em = user?.email || '';
    const b = `Hi Hisbo support,\n\n[Please describe your question or issue here]\n\n---\n${n ? `Name: ${n}\n` : ''}${em ? `Account email: ${em}\n` : ''}Page: https://www.hisbo.in`;
    return `mailto:vipulsingh.prof@gmail.com?subject=${encodeURIComponent('Hisbo support request')}&body=${encodeURIComponent(b)}`;
  };

  return (
    <div
      className="mod"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="box" role="dialog" aria-modal="true" aria-label="Account Settings">
        <div className="nm">
          <div className="av">{initialLetter}</div>
          <h2>{state.name || 'Your account'}</h2>

          <p className="mut" style={{ textAlign: 'center' }}>
            {!user ? (
              'Guest mode. Your data stays on this device only.'
            ) : (
              <>
                {user.email}
                <br />
                {syncStatus === 'synced' && 'Synced to your account'}
                {syncStatus === 'syncing' && 'Syncing…'}
                {syncStatus === 'error' && (
                  <span style={{ color: 'var(--bad)' }}>
                    Not synced yet
                    {syncError && <small style={{ display: 'block' }}>{syncError}</small>}
                  </span>
                )}
                {syncStatus === 'idle' && 'Connected'}
              </>
            )}
          </p>

          <button type="button" className="g" onClick={handleEditName}>
            Edit name
          </button>

          <a className="g" href={supHref()}>
            Contact support
          </a>

          {isAdmin && (
            <Link
              href="/admin/banners"
              className="g"
              onClick={closeModal}
            >
              Admin: manage banners
            </Link>
          )}

          {user ? (
            <>
              <button
                type="button"
                className="g"
                onClick={handleSyncNow}
                disabled={syncStatus === 'syncing'}
              >
                {syncStatus === 'syncing' ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                type="button"
                className="b dng"
                onClick={handleLogout}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="b"
                onClick={closeModal}
              >
                Create account to sync
              </Link>
              <Link
                href="/"
                className="g"
                onClick={closeModal}
              >
                Back to landing page
              </Link>
            </>
          )}

          <button
            type="button"
            className="g"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

