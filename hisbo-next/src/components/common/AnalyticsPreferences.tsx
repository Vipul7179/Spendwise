'use client';

import Link from 'next/link';
import { useRef, useSyncExternalStore } from 'react';
import { analyticsServerSnapshot, analyticsSnapshot, setAnalyticsConsent, subscribeAnalytics } from '@/lib/analytics';

export default function AnalyticsPreferences({ embedded = false }: { embedded?: boolean }) {
  const snapshot = useSyncExternalStore(subscribeAnalytics, analyticsSnapshot, analyticsServerSnapshot);
  const consent = snapshot.split(':')[0];
  const optedOut = snapshot.endsWith(':optout');
  const details = useRef<HTMLDetailsElement>(null);
  const choose = (value: 'granted' | 'denied') => {
    setAnalyticsConsent(value);
    if (details.current) {
      details.current.open = false;
      details.current.querySelector('summary')?.focus();
    }
  };

  const content = <div className="analytics-preferences-content">
    <details ref={details} className="analytics-preferences-details">
      <summary>Analytics Preferences</summary>
      <div className="analytics-preferences-panel">
        <p>Optional Google Analytics measures page visits and feature usage. We don’t send your financial records or form entries. Analytics stays off until you choose to allow it.</p>
        {optedOut && <p>Your browser’s privacy preference keeps analytics off.</p>}
        <div className="analytics-preferences-actions">
          <button type="button" className="b" onClick={() => choose('denied')}>Reject analytics</button>
          <button type="button" className="b" disabled={optedOut} onClick={() => choose('granted')}>Allow analytics</button>
        </div>
        <p>You can change your choice here anytime. <Link href="/privacy">Privacy policy</Link></p>
      </div>
    </details>
    <span className="analytics-preferences-status" role="status">{consent === 'granted' ? 'Analytics allowed' : 'Analytics off'}</span>
  </div>;

  return embedded
    ? <section className="analytics-preferences-inline" aria-label="Analytics privacy settings">{content}</section>
    : <footer className="analytics-privacy-footer" aria-label="Privacy settings">{content}</footer>;
}
