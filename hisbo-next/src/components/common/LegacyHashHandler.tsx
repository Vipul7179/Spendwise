'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ROUTE_HASH_MAP: Record<string, string> = {
  overview: '/overview',
  home: '/overview',
  transactions: '/overview',
  budgets: '/budgets',
  bud: '/budgets',
  categories: '/budgets',
  automate: '/automate',
  rec: '/automate',
  savings: '/savings',
  sav: '/savings',
  groups: '/groups',
  grp: '/groups',
  alerts: '/alerts',
  alr: '/alerts',
  blog: '/blog',
  'blog/': '/blog',
  journal: '/blog',
  login: '/login',
  signup: '/signup',
};

export default function LegacyHashHandler() {
  const router = useRouter();

  const handleHash = useCallback(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash) return;

    const clean = hash.replace(/^#/, '').trim();
    const lower = clean.toLowerCase();

    if (lower.startsWith('blog/')) {
      const slug = clean.slice(5).trim();
      if (slug) {
        try {
          router.replace(`/blog/${encodeURIComponent(decodeURIComponent(slug))}`);
        } catch {
          router.replace(`/blog/${encodeURIComponent(slug)}`);
        }
        return;
      }
    }

    const targetRoute = ROUTE_HASH_MAP[lower];
    if (targetRoute) {
      router.replace(targetRoute);
    }
  }, [router]);

  useEffect(() => {
    // Check hash on mount
    handleHash();

    // Listen for subsequent hash changes
    window.addEventListener('hashchange', handleHash);
    return () => {
      window.removeEventListener('hashchange', handleHash);
    };
  }, [handleHash]);

  return null;
}

