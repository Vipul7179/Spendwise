'use client';

import React, { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from '@/components/common/SkeletonImage';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LinkFeedback } from '@/components/common/NavigationFeedback';
import ThemeToggle from '@/components/marketing/ThemeToggle';
import GuestEntryButton from '@/components/auth/GuestEntryButton';

function subscribeToGuest(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function guestSnapshot() {
  try {
    return localStorage.getItem('sw_guest');
  } catch {
    return null;
  }
}

export default function Navbar() {
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isGuest = useSyncExternalStore(subscribeToGuest, guestSnapshot, () => null) === '1';
  const isAuthenticated = sessionUser || isGuest;

  // Track window scroll position for floating glass header elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    try {
      const supabase = createClient();
      void supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (active) setSessionUser(!!session?.user);
        })
        .catch(() => {
          /* Guest access remains available if auth is offline. */
        });
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setSessionUser(!!session?.user);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      /* Render the public navigation if auth is not configured. */
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Prevent scrolling when mobile drawer is open & handle Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const isBlogActive = pathname.startsWith('/blog');
  const homeHref = isAuthenticated ? '/overview' : '/';

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header className={`lh ${scrolled ? 'is-scrolled' : ''}`}>
        <Link className="abrand" href={homeHref} aria-label="Hisbo home">
          <span className="tlogo">
            <Image
              src="/logo-mark.webp"
              alt="Hisbo logo"
              width={34}
              height={34}
              priority
              className="lgi"
            />
          </span>
          <span className="abrand-text">Hisbo</span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="lnavc" role="navigation" aria-label="Primary navigation">
          <Link href="/#features">Features</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/#faq">FAQ</Link>
          <Link
            className={`landing-blog-link ${isBlogActive ? 'on' : ''}`}
            href="/blog"
            style={isBlogActive ? { color: 'var(--acc)', fontWeight: 700 } : undefined}
          >
            Blog<LinkFeedback />
          </Link>
        </nav>

        {/* Desktop Actions */}
        <div className="lnav desktop-actions">
          <ThemeToggle />

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
              <Link className="lbtn ol header-login-btn" href="/login">
                Log in<LinkFeedback />
              </Link>
              <Link className="lbtn p header-signup-btn" href="/signup">
                <span>Sign up</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <LinkFeedback />
              </Link>
            </>
          )}
        </div>

        {/* Mobile Header Actions */}
        <div className="mobile-header-actions">
          <ThemeToggle compact />
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Slide-in Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={closeMenu}>
          <div
            className="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-nav-header">
              <Link className="abrand" href={homeHref} onClick={closeMenu} aria-label="Hisbo home">
                <span className="tlogo">
                  <Image
                    src="/logo-mark.webp"
                    alt="Hisbo logo"
                    width={32}
                    height={32}
                    className="lgi"
                  />
                </span>
                <span className="abrand-text">Hisbo</span>
              </Link>
              <button
                type="button"
                className="mobile-nav-close-btn"
                onClick={closeMenu}
                aria-label="Close navigation menu"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="mobile-nav-body">
              <nav className="mobile-nav-links" aria-label="Mobile Sections">
                <Link href="/#features" onClick={closeMenu}>
                  Features
                </Link>
                <Link href="/#calculator" onClick={closeMenu}>
                  Expense Calculator
                </Link>
                <Link href="/#how" onClick={closeMenu}>
                  How it works
                </Link>
                <Link href="/#testimonials" onClick={closeMenu}>
                  Reviews
                </Link>
                <Link href="/#faq" onClick={closeMenu}>
                  FAQ
                </Link>
                <Link
                  className={`landing-blog-link ${isBlogActive ? 'on' : ''}`}
                  href="/blog"
                  onClick={closeMenu}
                >
                  Blog
                </Link>
              </nav>

              <div className="mobile-nav-cta-stack">
                {sessionUser ? (
                  <Link className="lbtn p full-w" href="/overview" onClick={closeMenu}>
                    Go to App &rarr;
                  </Link>
                ) : (
                  <>
                    <Link className="lbtn p full-w" href="/signup" onClick={closeMenu}>
                      Sign up free &rarr;
                    </Link>
                    <Link className="lbtn ol full-w" href="/login" onClick={closeMenu}>
                      Log in
                    </Link>
                    <div style={{ marginTop: '4px' }}>
                      <GuestEntryButton className="lbtn ol full-w guest-drawer-btn">
                        Try without an account
                      </GuestEntryButton>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
