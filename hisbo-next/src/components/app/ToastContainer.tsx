'use client';

import { useApp } from '@/context/AppContext';

const ICONS = {
  ok: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  err: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  warn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
};

const TITLES = {
  ok: 'Done',
  err: 'Please check',
  warn: 'Heads up',
};

export default function ToastContainer() {
  const { toastInfo, dismissToast } = useApp();

  if (!toastInfo) return null;

  return (
    <div
      className={`toast ${toastInfo.type}`}
      role={toastInfo.type === 'err' ? 'alert' : 'status'}
      onClick={dismissToast}
    >
      <span className="ti">{ICONS[toastInfo.type]}</span>
      <div className="tt">
        <b>{TITLES[toastInfo.type]}</b>
        <span>{toastInfo.msg}</span>
      </div>
      <button className="tx" aria-label="Dismiss toast">
        &times;
      </button>
    </div>
  );
}

