'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';
import { NOW, paise, fmt } from '@/lib/state/calculations';

export default function QuickAddModal() {
  const { state, addExpense, showToast } = useApp();
  const { closeModal } = useModal();
  const [amtStr, setAmtStr] = useState('');
  const [catId, setCatId] = useState(state.cats[0]?.id || '');
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const amtPaise = paise(amtStr);
    if (amtPaise <= 0) {
      showToast('Enter a valid amount greater than ₹0.', 'err');
      return;
    }
    if (amtPaise > 1000000000) {
      showToast('Amount is too large (maximum ₹10 crore).', 'err');
      return;
    }

    if (!catId || !state.cats.some((c) => c.id === catId)) {
      showToast('Please choose a valid category.', 'err');
      return;
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > 60) {
      showToast('Note must be 60 characters or fewer.', 'err');
      return;
    }

    addExpense({
      amt: amtPaise,
      cat: catId,
      date: NOW(),
      note: trimmedNote || undefined,
    }, 'quick_add');

    const categoryObj = state.cats.find((c) => c.id === catId);
    showToast(`${fmt(amtPaise, state.hide)} added successfully to ${categoryObj?.name || 'category'}.`);
    closeModal();
  };

  return (
    <div
      className="mod"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="box" role="dialog" aria-modal="true" aria-label="Quick add expense">
        <h2>Quick add expense</h2>
        <form onSubmit={handleSubmit}>
          <div className="row">
            <input
              ref={inputRef}
              id="qa"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount ₹"
              inputMode="decimal"
              value={amtStr}
              onChange={(e) => setAmtStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              required
            />
            <select
              id="qc"
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              aria-label="Category"
            >
              {state.cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              id="qn"
              type="text"
              placeholder="Note (optional)"
              maxLength={60}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div className="row" style={{ marginTop: '12px' }}>
            <button type="submit" className="b">
              Add expense
            </button>
            <button type="button" className="g" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
