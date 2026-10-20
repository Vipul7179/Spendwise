'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AuthTabs() {
  const pathname = usePathname();
  const isSignUp = pathname === '/signup';

  return (
    <div className={`tabs ${isSignUp ? 'up' : ''}`} id="tabs">
      <i className="ind" />
      <Link href="/login" className={!isSignUp ? 'on' : ''}>
        Log in
      </Link>
      <Link href="/signup" className={isSignUp ? 'on' : ''}>
        Sign up
      </Link>
    </div>
  );
}

