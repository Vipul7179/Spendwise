import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hisbo Control — Admin Management Console',
  description: 'Privileged administrative dashboard and operations console for Hisbo.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body>{children}</body>
    </html>
  );
}

