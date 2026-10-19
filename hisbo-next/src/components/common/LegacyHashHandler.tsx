'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash) return;

    if (hash.startsWith('#blog/')) {
      const slug = hash.replace('#blog/', '').trim();
      if (slug) {
        router.replace(`/blog/${slug}`);
      }
    } else if (hash === '#blog' || hash === '#journal') {
      router.replace('/blog');
    } else if (hash === '#login') {
      router.replace('/login');
    } else if (hash === '#signup') {
      router.replace('/signup');
    }
  }, [router]);

  return null;
}

