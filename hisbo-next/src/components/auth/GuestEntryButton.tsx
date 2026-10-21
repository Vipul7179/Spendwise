'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trackGuestModeStarted } from '@/lib/analytics';

export default function GuestEntryButton({ className, children }: { className: string; children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} onClick={() => {
      if (localStorage.getItem('sw_guest') === '1') router.push('/overview');
      else setOpen(true);
    }}>{children}</button>
    {open && <div className="mod" onClick={event => {
      if (event.currentTarget === event.target) setOpen(false);
    }}>
      <div className="box" role="dialog" aria-modal="true" aria-label="Continue without an account?"
        onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
        <div className="nm">
          <div className="av" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
          </div>
          <h2>Continue without an account?</h2>
          <p className="mut">You can start right away. Please note:</p>
          <ul className="gl">
            <li>Your data is saved <b>only in this browser on this device</b>.</li>
            <li>If you open Hisbo in another browser or on another device, your saved data <b>will not appear there</b>.</li>
            <li>Clearing your browser data will erase it.</li>
            <li>You can create a free account any time to sync and back up your data.</li>
          </ul>
          <button type="button" className="b cta" onClick={() => {
            localStorage.setItem('sw_guest', '1');
            trackGuestModeStarted();
            setOpen(false);
            router.push('/overview');
          }}>Continue as guest</button>
          <Link className="g" href="/signup" onClick={() => setOpen(false)}>Create a free account instead</Link>
        </div>
      </div>
    </div>}
  </>;
}
