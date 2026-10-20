'use client';

import React from 'react';
import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import BlogEmptyState from '@/components/blog/BlogEmptyState';

export default function BlogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="lp">
      <Navbar />

      <main className="blog-shell">
        <BlogEmptyState kind="error" />
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            className="b"
            onClick={() => reset()}
            style={{ minWidth: '130px' }}
          >
            Try again
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
