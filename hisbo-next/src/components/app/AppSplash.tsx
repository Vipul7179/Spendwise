'use client';

import Image from '@/components/common/SkeletonImage';

export default function AppSplash({ ready }: { ready: boolean }) {
  if (ready) return null;
  return <div className="app-splash" role="status" aria-live="polite" aria-label="Loading Hisbo">
    <div><Image src="/splash-icon.webp" alt="Hisbo" width={140} height={140} priority /><p>Preparing your dashboard...</p></div>
  </div>;
}
