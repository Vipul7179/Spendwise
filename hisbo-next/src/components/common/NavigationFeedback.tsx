'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useLinkStatus } from 'next/link';

export function LinkFeedback() {
  const { pending } = useLinkStatus();
  // Render outside links/cards so loading never shifts their content or inherits transforms.
  return pending ? createPortal(
    <span role="status" aria-label="Opening page" className="navigation-progress" />,
    document.body,
  ) : null;
}

export default function NavigationHistory() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const current = sessionStorage.getItem('hisbo_current_route');
      if (current && current !== pathname) sessionStorage.setItem('hisbo_previous_route', current);
      sessionStorage.setItem('hisbo_current_route', pathname);
    } catch { /* Navigation remains available when browser storage is disabled. */ }
  }, [pathname]);
  return null;
}
