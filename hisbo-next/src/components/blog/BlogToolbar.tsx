'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, useState } from 'react';
import Link from 'next/link';
import { BlogCategory } from '@/types/blog';

interface BlogToolbarProps {
  categories: BlogCategory[];
  currentCategory?: string;
  currentSearch?: string;
}

export default function BlogToolbar({
  categories,
  currentCategory = 'all',
  currentSearch = '',
}: BlogToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ source: currentSearch, value: currentSearch });
  // Reconcile URL history before rendering children, without remounting the
  // focused search input on every live-search navigation.
  if (draft.source !== currentSearch) setDraft({ source: currentSearch, value: currentSearch });
  const searchValue = draft.source === currentSearch ? draft.value : currentSearch;
  const setSearchValue = (value: string) => setDraft({ source: currentSearch, value });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters(currentCategory, searchValue);
  };

  const handleCategoryChange = (catId: string) => {
    updateFilters(catId, searchValue);
  };

  const updateFilters = (cat: string, query: string, replace = false) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (cat && cat !== 'all') {
      params.set('category', cat);
    } else {
      params.delete('category');
    }

    if (query && query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }

    startTransition(() => {
      const url = params.toString() ? `/blog?${params.toString()}` : '/blog';
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  };

  return (
    <div className="blog-toolbar">
      <div className="row">
        <Link className="g" href="/blog">
          Blog
        </Link>
      </div>

      <div className="row blog-search">
        <form onSubmit={handleSearchSubmit} style={{ margin: 0, width: '100%' }}>
          <input
            type="search"
            aria-label="Search blog posts"
            placeholder="Search articles…"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              updateFilters(currentCategory, e.target.value, true);
            }}
          />
        </form>
      </div>

      <div className="row">
        <select
          aria-label="Filter blog posts by category"
          value={currentCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {isPending && <span style={{ fontSize: '0.8rem', color: 'var(--mut)' }}>Updating…</span>}
    </div>
  );
}

