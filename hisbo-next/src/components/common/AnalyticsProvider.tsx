'use client';

import Script from 'next/script';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  analyticsConfigured, analyticsIdentityReady, analyticsInitialized, analyticsScriptReady,
  analyticsServerSnapshot, analyticsSnapshot, clearAnalyticsUser,
  consumeGoogleAnalyticsFlow, getAnalyticsConsent, initializeAnalytics, measurementId,
  setAnalyticsUser, subscribeAnalytics, trackPageView,
} from '@/lib/analytics';
import type { User } from '@supabase/supabase-js';

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribeAnalytics, analyticsSnapshot, analyticsServerSnapshot);
  const consent = snapshot.split(':')[0];
  const currentUser = useRef<User | null>(null);

  useEffect(() => {
    if (consent === 'granted' && analyticsConfigured) initializeAnalytics();
  }, [consent]);

  useEffect(() => {
    if (consent !== 'granted' || !analyticsConfigured) return;
    let active = true;
    let authChanged = false;
    let unsubscribe = () => {};
    try {
      const client = createClient();
      void client.auth.getSession().then(({ data: { session } }) => {
        if (!active || authChanged) return;
        currentUser.current = session?.user || null;
        setAnalyticsUser(session?.user.id || null);
      }).catch(() => { if (active && !authChanged) setAnalyticsUser(null); });
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        authChanged = true;
        currentUser.current = session?.user || null;
        if (event === 'SIGNED_OUT') clearAnalyticsUser();
        else setAnalyticsUser(session?.user.id || null);
        // SIGNED_IN also fires on tab focus. Only explicit OAuth flow markers
        // generate conversions; session restoration itself is never a login.
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch { setAnalyticsUser(null); }
    return () => { active = false; unsubscribe(); };
  }, [consent]);

  useEffect(() => {
    if (consent !== 'granted' || !analyticsIdentityReady()) return;
    consumeGoogleAnalyticsFlow(currentUser.current, pathname);
    trackPageView(pathname);
  }, [pathname, snapshot, consent]);

  return consent === 'granted' && analyticsConfigured && analyticsInitialized() && getAnalyticsConsent() === 'granted' ? (
      <Script id="hisbo-ga4" src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive" onReady={analyticsScriptReady} />
  ) : null;
}
