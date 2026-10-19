'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const NAV_ITEMS = [
  {
    href: '/overview',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    href: '/budgets',
    label: 'Budgets',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    href: '/automate',
    label: 'Automate',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 3 14h9l-1 8 10-12h-9z" />
      </svg>
    ),
  },
  {
    href: '/savings',
    label: 'Savings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m22 7-8.5 8.5-5-5L2 17" />
        <path d="M16 7h6v6" />
      </svg>
    ),
  },
  {
    href: '/groups',
    label: 'Groups',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    ),
  },
  {
    href: '/blog',
    label: 'Blog',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5A2.5 2.5 0 0 1 17.5 21H6.5A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M8 7h8M8 11h8M8 15h6" />
      </svg>
    ),
  },
];

export default function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <div className="side">
      <Link className="brand" href="/overview" aria-label="Hisbo home">
        <span className="tlogo" style={{ width: '36px', height: '36px', display: 'inline-block', verticalAlign: 'middle', marginRight: '10px' }}>
          <Image
            src="/logo-mark.webp"
            alt="Hisbo"
            width={36}
            height={36}
            className="lgi"
          />
        </span>
        Hisbo
      </Link>

      <nav id="nav">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'on' : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '11px 14px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '0.95rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--acc)' : 'var(--mut)',
                background: isActive ? 'color-mix(in srgb, var(--acc) 12%, transparent)' : 'transparent',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              <span style={{ display: 'grid', placeItems: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
