'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  DashboardIcon,
  UsersIcon,
  AnalyticsIcon,
  BlogIcon,
  ImageIcon,
  MonitoringIcon,
  ActivityIcon,
  ShieldIcon,
  SettingsIcon,
  LogOutIcon,
  ExternalLinkIcon,
  XIcon,
} from '@/components/icons';
import { AdminUser } from '@/types/admin';
import { formatRoleName, getRoleBadgeClass } from '@/lib/permissions/rbac';

interface AdminSidebarProps {
  currentUser?: AdminUser | null;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export function AdminSidebar({ currentUser, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems: NavItem[] = [
    { name: 'Overview', href: '/', icon: <DashboardIcon size={18} /> },
    { name: 'User Management', href: '/users', icon: <UsersIcon size={18} /> },
    { name: 'Analytics & Traffic', href: '/analytics', icon: <AnalyticsIcon size={18} /> },
    { name: 'Blog Management', href: '/blogs', icon: <BlogIcon size={18} /> },
    { name: 'Banners', href: '/banners', icon: <ImageIcon size={18} /> },
    { name: 'Platform Health', href: '/monitoring', icon: <MonitoringIcon size={18} /> },
    { name: 'Audit Logs', href: '/activity', icon: <ActivityIcon size={18} /> },
    { name: 'Admin Team (RBAC)', href: '/admins', icon: <ShieldIcon size={18} /> },
    { name: 'System Settings', href: '/settings', icon: <SettingsIcon size={18} /> },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    document.cookie = 'hisbo_control_demo=; Path=/; Max-Age=0;';
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={`admin-sidebar ${isOpen ? 'open' : ''}`}
      aria-label="Admin Navigation"
      role="dialog"
      aria-modal={isOpen ? 'true' : undefined}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: '1.25rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 'var(--topbar-height)',
        }}
      >
        <Link
          href="/"
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.125rem',
              letterSpacing: '-0.05em',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              flexShrink: 0,
            }}
          >
            H
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Hisbo
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Control
              </span>
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Admin Operations</div>
          </div>
        </Link>

        {/* Mobile Close Button (Touch target >= 44x44px) */}
        <button
          type="button"
          onClick={onClose}
          className="sidebar-close-btn"
          aria-label="Close navigation drawer"
          title="Close navigation"
        >
          <XIcon size={20} />
        </button>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            padding: '0.5rem 0.75rem',
          }}
        >
          Management
        </div>

        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="sidebar-nav-link"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    transition: 'all 0.15s ease',
                    minHeight: 44,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: isActive ? '#ffffff' : 'var(--text-muted)', display: 'flex' }}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'var(--bg-card)',
                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                        border: isActive ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Live Public Website Link */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              padding: '0.25rem 0.75rem 0.5rem',
            }}
          >
            External Links
          </div>
          <a
            href="https://www.hisbo.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.625rem 0.75rem',
              borderRadius: 8,
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              transition: 'background-color 0.15s ease',
              minHeight: 44,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <span>Live Hisbo Website</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </nav>

      {/* User Footer Profile */}
      <div
        style={{
          padding: '1rem 1.25rem',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
                flexShrink: 0,
              }}
            >
              {currentUser?.name?.charAt(0) || 'A'}
            </div>
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser?.name || 'Administrator'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.125rem' }}>
                <span
                  className={`badge ${currentUser ? getRoleBadgeClass(currentUser.role) : 'badge-neutral'}`}
                  style={{ fontSize: '0.625rem', padding: '1px 5px' }}
                >
                  {currentUser ? formatRoleName(currentUser.role) : 'Admin'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of Admin Console"
            aria-label="Sign out of Admin Console"
            className="sidebar-logout-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
              minWidth: 44,
              minHeight: 44,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOutIcon size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
