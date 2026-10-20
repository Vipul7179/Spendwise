'use client';

import React from 'react';
import Image from 'next/image';
import { useModal } from '@/context/ModalContext';
import { useApp } from '@/context/AppContext';

const UPI_ID = 'vpsvipulsingh100@oksbi';

export default function CoffeeModal() {
  const { closeModal } = useModal();
  const { showToast } = useApp();

  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(UPI_ID)
        .then(() => showToast('UPI ID copied.'))
        .catch(() => showToast('Please select and copy the UPI ID.', 'warn'));
    } else {
      showToast('Please select and copy the UPI ID.', 'warn');
    }
  };

  return (
    <div
      className="mod"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="box" role="dialog" aria-modal="true" aria-label="Buy me a coffee">
        <div className="nm">
          <h2>Buy me a coffee</h2>
          <p className="mut" style={{ textAlign: 'center' }}>
            Hisbo is free to use. If it helps you, you can support its development with any amount.
          </p>

          <div style={{ position: 'relative', width: '240px', height: '240px', margin: '8px auto' }}>
            <Image
              src="/qr.png"
              alt="UPI QR code to support the developer"
              width={240}
              height={240}
              className="qr"
              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
            />
          </div>

          <span className="mut" style={{ fontSize: '0.85rem' }}>
            Scan with any UPI app
          </span>

          <div className="upi" style={{ width: '100%', marginTop: '8px' }}>
            <span className="mut" style={{ fontSize: '0.82rem' }}>
              or pay to this UPI ID
            </span>
            <div className="upirow">
              <code>{UPI_ID}</code>
              <button
                type="button"
                className="g"
                onClick={handleCopyUpi}
                aria-label="Copy UPI ID"
              >
                Copy
              </button>
            </div>
          </div>

          <button
            type="button"
            className="g"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

