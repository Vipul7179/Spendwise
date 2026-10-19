'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PAL } from '@/lib/state/initial-state';
import {
  fmt,
  paise,
  NOW,
  mk,
  col,
  spent,
  MASK_DOTS,
} from '@/lib/state/calculations';
import { Category } from '@/types/state';

export default function BudgetsPage() {
  const { state, addCategory, setCategoryLimit, deleteCategory, showToast } = useApp();
  const currentMonth = mk(NOW());

  const [catName, setCatName] = useState('');
  const [catLimit, setCatLimit] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = catName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      showToast('Enter a category name.', 'err');
      return;
    }
    if (trimmed.length > 24) {
      showToast('Category name must be 24 characters or fewer.', 'err');
      return;
    }
    // Basic alphanumeric and punctuation
    const NM = /^[\p{L}\p{N}][\p{L}\p{N} .,'&()\/-]*$/u;
    if (!NM.test(trimmed)) {
      showToast('Category can have letters, numbers and basic punctuation only.', 'err');
      return;
    }

    const limitPaise = paise(catLimit);
    if (limitPaise > 1000000000) {
      showToast('Monthly limit is too large (maximum ₹10 crore).', 'err');
      return;
    }

    const success = addCategory(trimmed, limitPaise);
    if (success) {
      setCatName('');
      setCatLimit('');
    }
  };

  const handleLimitChange = (id: string, val: string) => {
    const trimmed = val.trim();
    if (trimmed !== '' && (!/^\d+(\.\d{1,2})?$/.test(trimmed) || parseFloat(trimmed) > 100000000)) {
      showToast('A limit must be a number with up to 2 decimals.', 'err');
      return;
    }
    const newLimit = paise(trimmed || '0');
    setCategoryLimit(id, newLimit);
    showToast('Budget limit updated.');
  };

  return (
    <div>
      {/* New Category Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>New category</h2>
        <form onSubmit={handleAddCategory}>
          <div className="row">
            <input
              id="cn"
              type="text"
              placeholder="Name (e.g. Medicine)"
              maxLength={24}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              required
            />
            <input
              id="cl"
              type="number"
              min="0"
              step="0.01"
              placeholder="Monthly limit ₹"
              inputMode="decimal"
              value={catLimit}
              onChange={(e) => setCatLimit(e.target.value)}
            />
            <button type="submit" className="b">
              Add category
            </button>
          </div>
        </form>
        <div className="note">Alerts fire at 50%, 80% and 100% of each limit.</div>
      </div>

      {/* Categories List Card */}
      <div className="card">
        <h2>Your budgets</h2>
        {state.cats.length ? (
          state.cats.map((c, i) => {
            const s = spent(c.id, currentMonth, state.exps);
            const p = c.limit ? (s / c.limit) * 100 : 0;
            const color = PAL[i % PAL.length];

            return (
              <div key={c.id} className="li">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="dot"
                    style={{ background: color, display: 'inline-block', marginRight: '6px' }}
                  />
                  <b>{c.name}</b>{' '}
                  <span className="mut">
                    {Math.round(p)}% used &middot; {fmt(s, state.hide)} / {fmt(c.limit, state.hide)}
                  </span>
                  <div className="bar">
                    <i
                      style={{
                        width: `${Math.min(p, 100)}%`,
                        background: col(p),
                      }}
                    />
                  </div>
                </div>

                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  {state.hide ? (
                    <input
                      style={{ width: '96px', flex: '0 0 96px', textAlign: 'center' }}
                      type="text"
                      disabled
                      value={MASK_DOTS}
                      title="Show amounts to edit"
                    />
                  ) : (
                    <input
                      style={{ width: '96px', flex: '0 0 96px' }}
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={c.limit ? (c.limit / 100).toFixed(2).replace(/\.00$/, '') : ''}
                      onBlur={(e) => handleLimitChange(c.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleLimitChange(c.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                      aria-label={`Limit for ${c.name}`}
                    />
                  )}
                  <button
                    type="button"
                    className="g"
                    onClick={() => setCategoryToDelete(c)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty">No categories yet.</div>
        )}
      </div>

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCategoryToDelete(null);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Delete category">
            <div className="nm">
              <div className="av bad">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <h2>Delete category &quot;{categoryToDelete.name}&quot;?</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                This will delete the category and all its associated expenses and recurring deductions.
                <br />
                This cannot be undone.
              </p>
              <button
                type="button"
                className="b dng"
                style={{ width: '100%', background: 'var(--bad)', color: '#fff', marginTop: '8px' }}
                onClick={() => {
                  deleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
              >
                Delete category
              </button>
              <button
                type="button"
                className="g"
                style={{ width: '100%', marginTop: '6px' }}
                onClick={() => setCategoryToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
