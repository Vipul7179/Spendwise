'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { useModal } from '@/context/ModalContext';

interface NameModalProps {
  first?: boolean;
}

export default function NameModal({ first = false }: NameModalProps) {
  const { state, updateName, showToast } = useApp();
  const { closeModal } = useModal();
  const [name, setName] = useState(state.name || '');
  const [bump, setBump] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    setBump(true);
    setTimeout(() => setBump(false), 300);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      showToast('Enter your name.', 'err');
      return;
    }
    if (trimmed.length > 30) {
      showToast('Name must be 30 characters or fewer.', 'err');
      return;
    }
    // Only letters, spaces, dots, hyphens, apostrophes
    const PN = /^\p{L}[\p{L} .'-]*$/u;
    if (!PN.test(trimmed)) {
      showToast('Use letters only for your name (spaces, dots, hyphens and apostrophes are fine).', 'err');
      return;
    }

    updateName(trimmed);
    showToast(first ? `Welcome, ${trimmed}!` : 'Name updated successfully.');
    closeModal();
  };

  const initialLetter = (name.trim() || '?')[0].toUpperCase();

  return (
    <div
      className="mod"
      onClick={(e) => {
        if (!first && e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="box" role="dialog" aria-modal="true" aria-label={first ? 'Welcome to Hisbo' : 'Edit your name'}>
        <div className="nm">
          <div className={`av ${bump ? 'bump' : ''}`}>{initialLetter}</div>
          <h2>{first ? 'Welcome to Hisbo' : 'Edit your name'}</h2>
          <p className="mut">
            {first
              ? 'Tell us what to call you so we can personalise your dashboard.'
              : 'This is the name shown in your dashboard greeting.'}
          </p>
          <label className="lbl" htmlFor="nm">
            Your name
          </label>
          <form onSubmit={handleSave} style={{ width: '100%' }}>
            <input
              ref={inputRef}
              id="nm"
              type="text"
              placeholder="e.g. John"
              maxLength={30}
              autoComplete="given-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              required
            />
            <button type="submit" className="b" style={{ width: '100%', marginTop: '8px' }}>
              {first ? 'Get started' : 'Save changes'}
            </button>
            {!first && (
              <button
                type="button"
                className="g"
                style={{ width: '100%', marginTop: '6px' }}
                onClick={closeModal}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
