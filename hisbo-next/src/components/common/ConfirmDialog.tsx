'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div className="mod" onClick={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <div className="box" role="dialog" aria-modal="true" aria-label={title}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
          if (event.key === 'Tab') {
            const buttons = event.currentTarget.querySelectorAll('button');
            const next = event.shiftKey ? buttons[0] : buttons[buttons.length - 1];
            if (event.target === next) {
              event.preventDefault();
              (event.shiftKey ? buttons[buttons.length - 1] : buttons[0])?.focus();
            }
          }
        }}>
        <div className="nm">
          <h2>{title}</h2>
          <button type="button" className="b dng" onClick={onConfirm}>{confirmLabel}</button>
          <button ref={cancelRef} type="button" className="g" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
