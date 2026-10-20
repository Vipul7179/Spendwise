'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthSessionRedirect() {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (pathname !== '/login' && pathname !== '/signup') return;
    let active = true;
    try {
      void createClient().auth.getSession().then(({ data: { session } }) => {
        if (active && session?.user) router.replace('/overview');
      }).catch(() => { /* Keep the login form available when offline. */ });
    } catch { /* Missing config is handled by form submission. */ }
    return () => { active = false; };
  }, [pathname, router]);
  return null;
}
