'use client';

import React from 'react';
import { Expense } from '@/types/state';
import { fmt } from '@/lib/state/calculations';

interface DeleteExpenseModalProps {
  expense: Expense | null;
  categoryName?: string;
  isHide: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteExpenseModal({
  expense,
  categoryName,
  isHide,
  onConfirm,
  onCancel,
}: DeleteExpenseModalProps) {
  if (!expense) return null;

  const displayName = expense.note || categoryName || 'Expense';

  return (
    <div
      className="mod"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="box expense-delete-dialog" role="dialog" aria-modal="true" aria-label="Delete expense">
        <div className="nm">
          <div className="av bad">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </div>
          <h2>Delete this expense?</h2>
          <p className="mut" style={{ textAlign: 'center' }}>
            <b>{displayName}</b> &middot; {fmt(expense.amt, isHide)}
            <br />
            This cannot be undone.
          </p>
          <button
            type="button"
            className="b dng"
            onClick={onConfirm}
          >
            Delete
          </button>
          <button
            type="button"
            className="g"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

