import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '@/lib/seo';

import LegacyHashHandler from '@/components/common/LegacyHashHandler';
import NavigationHistory from '@/components/common/NavigationFeedback';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
  weight: ['400', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Hisbo — Track spending, stay on budget, save more',
    template: '%s · Hisbo',
  },
  description: 'Hisbo brings your expenses, budgets, savings goals and shared bills into one clear, beautiful app.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0b4d3a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bricolage.variable}>
      <body>
        <LegacyHashHandler />
        <NavigationHistory />
        {children}
      </body>
    </html>
  );
}

