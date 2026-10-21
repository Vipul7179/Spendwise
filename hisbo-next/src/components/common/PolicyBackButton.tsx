'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export default function PolicyBackButton() {
  const router = useRouter();
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  return <button type="button" className="back" disabled={busy} aria-busy={busy} onClick={() => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    // Signup opens policy in a separate tab so its password and form stay in memory.
    if (new URLSearchParams(window.location.search).get('from') === 'signup' && window.history.length === 1) {
      window.close();
      router.replace('/signup'); // Safe fallback if this browser disallows close().
      return;
    }
    let previous: string | null = null;
    try { previous = sessionStorage.getItem('hisbo_previous_route'); } catch { /* Use referrer or fallback. */ }
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (window.history.length > 1 && (previous || referrer?.origin === window.location.origin)) router.back();
    else router.replace('/');
  }}>{busy ? 'Opening…' : '← Back to Hisbo'}</button>;
}
