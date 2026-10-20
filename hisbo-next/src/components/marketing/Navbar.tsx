'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function subscribeToGuest(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}
function guestSnapshot() {
  try { return localStorage.getItem('sw_guest'); } catch { return null; }
}

export default function Navbar() {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState(false);
  const isGuest = useSyncExternalStore(subscribeToGuest, guestSnapshot, () => null) === '1';
  const isAuthenticated = sessionUser || isGuest;

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (active) setSessionUser(!!session?.user);
      }).catch(() => { /* Guest access remains available if auth is offline. */ });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setSessionUser(!!session?.user);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch { /* Render the public navigation if auth is not configured. */ }
    return () => { active = false; unsubscribe(); };
  }, []);

  const isBlogActive = pathname.startsWith('/blog');
  const homeHref = isAuthenticated ? '/overview' : '/';

  return (
    <header className="lh">
      <Link className="abrand" href={homeHref} aria-label="Hisbo home">
        <span className="tlogo">
          <Image
            src="/logo-mark.webp"
            alt="Hisbo logo"
            width={32}
            height={32}
            priority
            className="lgi"
          />
        </span>
        <span>Hisbo</span>
      </Link>

      <nav className="lnavc" role="navigation" aria-label="Sections">
        <Link href="/#features">Features</Link>
        <Link href="/#how">How it works</Link>
        <Link href="/#faq">FAQ</Link>
      </nav>

      <div className="lnav">
        <Link
          className={`landing-blog-link ${isBlogActive ? 'on' : ''}`}
          href="/blog"
          style={isBlogActive ? { color: 'var(--acc)', fontWeight: 700 } : undefined}
        >
          Blog
        </Link>

        {sessionUser ? (
          <Link
            className="lbtn p"
            href="/overview"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Go to App</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ) : (
          <>
            <Link className="lbtn ol" href="/login">
              Log in
            </Link>
            <Link className="lbtn p" href="/signup">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}


