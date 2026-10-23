'use client';

import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon } from '@/components/icons';

export function InstrumentationGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="admin-card" style={{ padding: '1.25rem 1.5rem' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--accent)' }}>
            {isOpen ? <ChevronDownIcon size={18} /> : <ChevronRightIcon size={18} />}
          </span>
          <div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Website Event Instrumentation Specification
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Standard gtag.js and Google Analytics 4 event snippets for tracking customer conversion actions on hisbo.in.
            </p>
          </div>
        </div>

        <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
          Developer Reference
        </span>
      </div>

      {isOpen && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Hisbo web client (<code>hisbo.in</code>) emits events using standard Google Tag (<code>gtag.js</code>). To enable conversion milestone reporting in this console without fabricating synthetic counts, instrument the following event calls in the user-facing web codebase:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Snippet 1: Sign up */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  1. Account Registration (`sign_up`)
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Auth Page</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Trigger when a new user successfully verifies their email or signs up via Supabase.
              </p>
              <pre style={{ fontSize: '0.75rem', background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 6, color: 'var(--accent)', overflowX: 'auto' }}>
{`if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('event', 'sign_up', {
    method: 'email', // or 'google'
  });
}`}
              </pre>
            </div>

            {/* Snippet 2: CTA Click */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  2. CTA Button Click (`cta_click`)
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Landing Page</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Trigger when visitors click &quot;Get Started&quot;, &quot;Download App&quot;, or &quot;Join Waitlist&quot;.
              </p>
              <pre style={{ fontSize: '0.75rem', background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 6, color: 'var(--info)', overflowX: 'auto' }}>
{`window.gtag('event', 'cta_click', {
  cta_name: 'hero_get_started',
  cta_location: 'home_hero',
});`}
              </pre>
            </div>

            {/* Snippet 3: Expense Logged */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  3. Financial Transaction (`expense_created`)
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Already active in hisbo.in. Tracks when customer records a financial ledger entry.
              </p>
              <pre style={{ fontSize: '0.75rem', background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 6, color: 'var(--text-main)', overflowX: 'auto' }}>
{`window.gtag('event', 'expense_created', {
  category: expenseCategory,
  has_receipt: Boolean(receiptUrl),
});`}
              </pre>
            </div>

            {/* Snippet 4: Cloud Sync */}
            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  4. Ledger Synchronization (`sync_completed`)
                </span>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Emitted when offline cache updates flush to Spendwise cloud database.
              </p>
              <pre style={{ fontSize: '0.75rem', background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 6, color: 'var(--text-main)', overflowX: 'auto' }}>
{`window.gtag('event', 'sync_completed', {
  records_synced: count,
});`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

