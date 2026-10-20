'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function AppSplash({ ready }: { ready: boolean }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setVisible(false), 220);
    return () => clearTimeout(timer);
  }, [ready]);
  if (!visible) return null;
  return <div className={`app-splash${ready ? ' app-splash-exit' : ''}`} role="status" aria-label="Loading Hisbo">
    <div><Image src="/splash-icon.webp" alt="Hisbo" width={140} height={140} priority /><p>Track. Budget. Save.</p></div>
  </div>;
}
