'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldIcon,
  CheckIcon,
  XIcon,
  LockIcon,
  RefreshIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { AdminUser } from '@/types/admin';
import { ROLE_PERMISSIONS, formatRoleName, getRoleBadgeClass } from '@/lib/permissions/rbac';

export default function AdminTeamPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isServiceRoleNeeded, setIsServiceRoleNeeded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const permissionsList = [
    { key: 'overview:read', label: 'View Overview KPI Dashboard' },
    { key: 'users:read', label: 'Inspect User Metadata (No Financial Data)' },
    { key: 'users:export', label: 'Export User List to CSV' },
    { key: 'analytics:read', label: 'Access Traffic & Analytics Telemetry' },
    { key: 'blogs:read', label: 'View Blog Posts & Categories' },
    { key: 'blogs:write', label: 'Create, Edit, Publish Blog Articles' },
    { key: 'monitoring:read', label: 'View Infrastructure Health & Edge Telemetry' },
    { key: 'activity:read', label: 'Inspect Administrative Audit Trail' },
    { key: 'admins:read', label: 'View Admin Team Members' },
    { key: 'admins:write', label: 'Assign & Revoke Admin Roles' },
    { key: 'settings:read', label: 'View System Settings' },
    { key: 'settings:write', label: 'Update Production & Security Configurations' },
  ];

  const fetchAdmins = async () => {
    setErrorMsg(null);
    setIsServiceRoleNeeded(false);

    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresServiceRoleKey) {
          setIsServiceRoleNeeded(true);
          setErrorMsg('Staging service-role key is not configured in hisbo-control/.env.local.');
        } else {
          setErrorMsg(data.error || 'Failed to load administrator records from staging database.');
        }
        setAdmins([]);
        return;
      }

      setAdmins(data.admins || []);
    } catch {
      setErrorMsg('Network error connecting to administrative staff API.');
      setAdmins([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        const res = await fetch('/api/admin/admins');
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          if (data.requiresServiceRoleKey) {
            setIsServiceRoleNeeded(true);
            setErrorMsg('Staging service-role key is not configured in hisbo-control/.env.local.');
          } else {
            setErrorMsg(data.error || 'Failed to load administrator records from staging database.');
          }
          setAdmins([]);
          return;
        }

        setAdmins(data.admins || []);
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to administrative staff API.');
          setAdmins([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Admin Team & RBAC Permissions
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Live Staging (klvbtoxyeixxjydnanlz)
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Inspect verified staff authorization levels from staging public.profiles.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setIsLoading(true);
              void fetchAdmins();
            }}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            title="Refresh Admins"
          >
            <RefreshIcon size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setToast('Role modification disabled: Database schema changes require manual SQL migration.');
              setTimeout(() => setToast(null), 4000);
            }}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <LockIcon size={15} />
            <span>Assign New Role</span>
          </button>
        </div>
      </div>

      {/* Service Role Configuration Notice if needed */}
      {isServiceRoleNeeded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 8,
            color: '#fbbf24',
            fontSize: '0.8125rem',
          }}
        >
          <AlertTriangleIcon size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Configuration Needed:</strong> Staging service-role key is not configured.
            <div style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
              To view staging administrators, configure <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>hisbo-control/.env.local</code>.
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && !isServiceRoleNeeded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            fontSize: '0.8125rem',
            color: '#f87171',
          }}
        >
          <AlertTriangleIcon size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--warning)',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--warning)',
            fontSize: '0.875rem',
            zIndex: 100,
          }}
        >
          <ShieldIcon size={18} />
          <span>{toast}</span>
        </div>
      )}

      {/* Admin Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Admin Staff Member</th>
              <th>Assigned Role</th>
              <th>Status</th>
              <th>Last Console Session</th>
              <th>Provisioned Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2].map((i) => (
                <tr key={`loading-admin-${i}`}>
                  <td colSpan={5} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading verified administrative accounts...
                  </td>
                </tr>
              ))
            ) : admins.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <ShieldIcon size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                    No Administrative Accounts Found
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: 440, margin: '0.25rem auto 0 auto' }}>
                    No users in hisbo-staging have <code>is_admin = true</code> yet. To grant administrative privileges, run migration <code>002_profiles_is_admin_security_fix.sql</code> or update the user profile via Supabase SQL.
                  </p>
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'var(--accent-muted)',
                          color: 'var(--accent)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8125rem',
                        }}
                      >
                        {admin.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{admin.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{admin.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(admin.role)}`}>
                      {formatRoleName(admin.role)}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-success">{admin.status}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RBAC Permission Matrix */}
      <div className="admin-card">
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Role-Based Access Control (RBAC) Permission Matrix
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Granular privileges enforced on every server-side route and API action.
          </p>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Capability / Action</th>
                <th style={{ textAlign: 'center' }}>Viewer</th>
                <th style={{ textAlign: 'center' }}>Admin</th>
                <th style={{ textAlign: 'center' }}>Super Admin</th>
              </tr>
            </thead>
            <tbody>
              {permissionsList.map((perm) => (
                <tr key={perm.key}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{perm.label}</div>
                    <code style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{perm.key}</code>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {ROLE_PERMISSIONS.viewer.includes(perm.key as any) ? (
                      <CheckIcon size={16} style={{ color: '#10b981', margin: '0 auto' }} />
                    ) : (
                      <XIcon size={16} style={{ color: 'var(--border-light)', margin: '0 auto' }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {ROLE_PERMISSIONS.admin.includes(perm.key as any) ? (
                      <CheckIcon size={16} style={{ color: '#10b981', margin: '0 auto' }} />
                    ) : (
                      <XIcon size={16} style={{ color: 'var(--border-light)', margin: '0 auto' }} />
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {ROLE_PERMISSIONS.super_admin.includes(perm.key as any) ? (
                      <CheckIcon size={16} style={{ color: '#10b981', margin: '0 auto' }} />
                    ) : (
                      <XIcon size={16} style={{ color: 'var(--border-light)', margin: '0 auto' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
