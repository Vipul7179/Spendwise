'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useModal } from '@/context/ModalContext';

export default function FloatingAddButton() {
  const pathname = usePathname();
  const { openQuickAdd, activeModal } = useModal();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 'n' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !activeModal &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        openQuickAdd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openQuickAdd, activeModal]);

  // Hide on blog pages
  if (pathname.startsWith('/blog')) {
    return null;
  }

  const handleClick = () => {
    if (pathname === '/groups') {
      const el = document.getElementById('gd');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        return;
      }
    }
    openQuickAdd();
  };

  return (
    <button
      type="button"
      className="fab"
      onClick={handleClick}
      aria-label={pathname === '/groups' ? 'Add shared expense' : 'Add expense'}
    >
      +
    </button>
  );
}
