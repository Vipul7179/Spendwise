'use client';

import React from 'react';
import BlogEmptyState from '@/components/blog/BlogEmptyState';

export default function BlogError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="blog-shell">
      <BlogEmptyState kind="error" retry={false} />
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
    </section>
  );
}

