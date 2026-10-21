'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

// Verification uses root metadata. Advertising consent must come from a future
// advertising-specific CMP integration, never from Hisbo's analytics preference.
export default function AdSenseScript({ advertisingConsent = false }: { advertisingConsent?: boolean }) {
  const pathname = usePathname();
  if (typeof window === 'undefined' || !advertisingConsent || !(pathname === '/blog' || pathname.startsWith('/blog/'))) return null;
  const navigator = window.navigator as Navigator & { globalPrivacyControl?: boolean };
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes') return null;

  return <Script
    id="hisbo-adsense"
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6490828357850980"
    crossOrigin="anonymous"
    strategy="afterInteractive"
  />;
}
