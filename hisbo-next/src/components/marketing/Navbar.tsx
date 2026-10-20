'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fast check via localStorage
    try {
      const isGuest = localStorage.getItem('sw_guest') === '1';
      const hasSess = !!localStorage.getItem('sw_sess');
      const rawState = localStorage.getItem('spendwise_v1');
      if (rawState) {
        try {
          const parsed = JSON.parse(rawState);
          if (parsed?.name) setUserName(parsed.name);
        } catch {}
      }
      if (isGuest || hasSess) {
        setIsAuthenticated(true);
      }
    } catch {}

    // Verify Supabase session asynchronously
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!isMounted) return;
        if (session?.user) {
          setIsAuthenticated(true);
        } else {
          // If not in guest mode either, then unauthenticated
          const isGuest = typeof window !== 'undefined' && localStorage.getItem('sw_guest') === '1';
          setIsAuthenticated(isGuest);
        }
      });
    } catch {
      // Fallback
    }

    return () => {
      isMounted = false;
    };
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

        {isAuthenticated ? (
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


