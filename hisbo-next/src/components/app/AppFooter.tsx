'use client';

import React from 'react';
import { useModal } from '@/context/ModalContext';

export default function AppFooter() {
  const { openCoffee } = useModal();

  return (
    <footer className="ft">
      <div className="card sup">
        <div>
          <b>Enjoying Hisbo?</b>
          <div className="mut">Support the developer with a small coffee. Every bit helps keep it free.</div>
        </div>
        <button type="button" className="b" onClick={openCoffee}>
          Buy me a coffee
        </button>
      </div>

      <div className="cred">
        Designed and developed by <b>Vipul Singh</b>
        <div className="soc">
          <a
            href="https://www.instagram.com/thevipulshow"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z" />
              <path d="M17.5 6.5h.01" />
            </svg>
            Instagram
          </a>

          <a
            href="https://www.linkedin.com/in/vipul-singh-46792a1a4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            LinkedIn
          </a>

          <a
            href="mailto:vipulsingh.prof@gmail.com?subject=Hisbo%20support%20request"
            aria-label="Contact support"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 6L2 7" />
            </svg>
            Contact Support
          </a>
        </div>
        <div>&copy; 2026 Hisbo. Your data stays on your device.</div>
      </div>
    </footer>
  );
}

