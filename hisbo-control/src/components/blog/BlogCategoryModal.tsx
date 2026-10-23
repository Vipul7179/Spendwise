'use client';

import React, { useState } from 'react';
import { XIcon } from '@/components/icons';
import { slugifyBlogTitle, validateBlogSlug } from '@/lib/blog/slug-utils';
import { BlogCategory } from '@/types/blog';

interface BlogCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (category: BlogCategory) => void;
}

export function BlogCategoryModal({ isOpen, onClose, onCategoryCreated }: BlogCategoryModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(slugifyBlogTitle(val).slice(0, 50));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 40) {
      setError('Category name must be between 2 and 40 characters.');
      return;
    }

    const trimmedSlug = (slug.trim() || slugifyBlogTitle(trimmedName)).slice(0, 50);
    const slugValidation = validateBlogSlug(trimmedSlug);
    if (!slugValidation.valid) {
      setError(slugValidation.error || 'Invalid slug.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/blogs/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          slug: trimmedSlug,
          sort_order: parseInt(sortOrder, 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create category');
      }

      onCategoryCreated(data.category);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '1.5rem', maxWidth: 440, width: '92%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
            + Create New Blog Category
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.6rem 0.8rem',
              background: 'rgba(239, 68, 68, 0.08)',
              color: '#ef4444',
              borderRadius: 6,
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Category Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Personal Finance"
              maxLength={40}
              required
              className="input-field"
              autoFocus
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {name.length}/40 characters (2–40 required)
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Category Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'));
                setError(null);
              }}
              placeholder="personal-finance"
              maxLength={50}
              required
              className="input-field"
            />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Letters, numbers, and single hyphens only.
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input-field"
              style={{ width: 100 }}
              min={0}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create & Select Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

