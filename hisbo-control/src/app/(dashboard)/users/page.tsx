'use client';

import React, { useState, useEffect } from 'react';
import {
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  LockIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  UsersIcon,
  RefreshIcon,
  ShieldIcon,
} from '@/components/icons';
import { UserManagementItem } from '@/types/admin';

export default function UserManagementPage() {
  // Default data source is PRODUCTION customer directory
  const [dataSource, setDataSource] = useState<'production' | 'staging'>('production');
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isServiceRoleNeeded, setIsServiceRoleNeeded] = useState(false);
  const [isProdConfigNeeded, setIsProdConfigNeeded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<UserManagementItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchUsers = async (source = dataSource) => {
    setErrorMsg(null);
    setIsServiceRoleNeeded(false);
    setIsProdConfigNeeded(false);

    try {
      const res = await fetch(`/api/admin/users?source=${source}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfiguration) {
          setIsProdConfigNeeded(true);
          setErrorMsg(data.error || 'Production reporting is not yet configured or enabled.');
        } else if (data.requiresServiceRoleKey) {
          setIsServiceRoleNeeded(true);
          setErrorMsg('Staging service-role key is not configured in hisbo-control/.env.local.');
        } else {
          setErrorMsg(data.error || `Failed to load user records from ${source} database.`);
        }
        setUsers([]);
        return;
      }

      setUsers(data.users || []);
    } catch {
      setErrorMsg(`Network error connecting to administrative user API (${source}).`);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    void fetchUsers(dataSource);
  };

  const handleSourceChange = (newSource: 'production' | 'staging') => {
    if (newSource === dataSource) return;
    setDataSource(newSource);
    setIsLoading(true);
    void fetchUsers(newSource);
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialUsers() {
      try {
        // DEFAULT: Spendwise Production
        const res = await fetch('/api/admin/users?source=production');
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          if (data.requiresConfiguration) {
            setIsProdConfigNeeded(true);
            setErrorMsg(data.error || 'Production reporting is not yet configured.');
          } else if (data.requiresServiceRoleKey) {
            setIsServiceRoleNeeded(true);
            setErrorMsg('Staging service-role key is not configured.');
          } else {
            setErrorMsg(data.error || 'Failed to load user records.');
          }
          setUsers([]);
          return;
        }

        setUsers(data.users || []);
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to customer user API.');
          setUsers([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialUsers();
    return () => {
      ignore = true;
    };
  }, []);

  // Filter users based on query and status filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return u.status === 'active';
    if (statusFilter === 'inactive') return u.status === 'inactive';
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      showToast('No user records available to export.');
      return;
    }

    const headers = ['ID', 'Email', 'Name', 'Created At', 'Last Sign In', 'Provider', 'Status'];
    const rows = filteredUsers.map((u) => [
      u.id,
      u.email,
      `"${u.name}"`,
      u.createdAt,
      u.lastSignIn || 'N/A',
      u.authProvider,
      u.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hisbo_${dataSource}_customers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredUsers.length} customer records.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Customer User Directory
            </h1>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: dataSource === 'production' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: dataSource === 'production' ? '#38bdf8' : '#34d399',
                border: `1px solid ${dataSource === 'production' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {dataSource === 'production'
                ? 'Spendwise Production (omnhxlqykmtzxdagppcl)'
                : 'Staging Sandbox (klvbtoxyeixxjydnanlz)'}
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {dataSource === 'production'
              ? 'Real Hisbo customers from Spendwise production database. Read-only least-privilege reporting.'
              : 'Synthetic staging sandbox accounts. Platform admin staff are excluded.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Data Source Selector */}
          <div
            style={{
              display: 'inline-flex',
              padding: '0.25rem',
              borderRadius: 8,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => handleSourceChange('production')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: dataSource === 'production' ? '#0284c7' : 'transparent',
                color: dataSource === 'production' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Production Customers
            </button>
            <button
              onClick={() => handleSourceChange('staging')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: dataSource === 'staging' ? 'var(--accent)' : 'transparent',
                color: dataSource === 'staging' ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Staging Sandbox
            </button>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            title="Refresh Users"
          >
            <RefreshIcon size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" style={{ gap: '0.5rem' }}>
            <DownloadIcon size={16} />
            <span>Export Metadata (CSV)</span>
          </button>
        </div>
      </div>

      {/* Production Reporting Unconfigured / Disabled State */}
      {isProdConfigNeeded && dataSource === 'production' && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid #38bdf8',
            padding: '1.25rem 1.5rem',
            background: 'rgba(56, 189, 248, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <ShieldIcon size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Production Reporting Not Configured
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Customer user accounts are retrieved directly from the main Spendwise production database (<code>omnhxlqykmtzxdagppcl</code>) via a dedicated least-privilege reporting role (<code>hisbo_readonly_reporter</code>).
            Staging admin accounts are not displayed here.
          </p>

          <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <strong>Remaining Setup Steps:</strong>
            <ol style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li>
                Execute <code>migrations/003_production_reporting_setup.sql</code> in the Supabase SQL Editor for Spendwise production (<code>omnhxlqykmtzxdagppcl</code>).
              </li>
              <li>
                Add your reporting role credentials to <code>hisbo-control/.env.local</code>:
                <code
                  style={{
                    display: 'block',
                    marginTop: '0.35rem',
                    padding: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    color: '#e2e8f0',
                  }}
                >
                  PROD_REPORTING_ENABLED=true<br />
                  # If using Supabase Pooler (Port 5432 or 6543 - user must include project ref):<br />
                  PROD_REPORTING_DATABASE_URL=postgresql://hisbo_readonly_reporter.omnhxlqykmtzxdagppcl:&lt;PASSWORD&gt;@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require<br />
                  # Or Direct Connection:<br />
                  # PROD_REPORTING_DATABASE_URL=postgresql://hisbo_readonly_reporter:&lt;PASSWORD&gt;@db.omnhxlqykmtzxdagppcl.supabase.co:5432/postgres?sslmode=require
                </code>
              </li>
              <li>Click &quot;Refresh&quot; to load your real customers.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Service Role Configuration Notice for Staging if needed */}
      {isServiceRoleNeeded && dataSource === 'staging' && (
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
              To view sandbox accounts, configure <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>hisbo-control/.env.local</code>.
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && !isServiceRoleNeeded && !isProdConfigNeeded && (
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

      {/* Privacy Guarantee Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 8,
          fontSize: '0.8125rem',
          color: '#34d399',
        }}
      >
        <LockIcon size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Zero Financial Data Access:</strong> In compliance with privacy standards and RLS policies, customer transaction entries, budget ledgers, and financial records are completely isolated and inaccessible.
        </span>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: 'var(--bg-card)',
            border: '1px solid var(--accent)',
            padding: '0.75rem 1.25rem',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            zIndex: 100,
          }}
        >
          <CheckCircleIcon size={18} style={{ color: 'var(--accent)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="admin-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <SearchIcon size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, email, or account ID..."
            className="input-field"
            style={{ border: 'none', background: 'transparent', padding: '0.35rem' }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FilterIcon size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status:</span>
          {(['all', 'active', 'inactive'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: statusFilter === filter ? 'var(--accent)' : 'var(--bg-secondary)',
                color: statusFilter === filter ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Last Sign-In</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={`loading-${i}`}>
                  <td colSpan={6} style={{ padding: '1.25rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading {dataSource === 'production' ? 'production customer' : 'staging sandbox'} records...
                  </td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <UsersIcon size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9375rem' }}>
                    {users.length === 0
                      ? dataSource === 'production'
                        ? isProdConfigNeeded
                          ? 'Production Reporting Awaiting Setup'
                          : errorMsg
                          ? 'Production Reporting Connection Error'
                          : 'No registered customer records'
                        : 'No sandbox customer accounts in staging'
                      : 'No matching customer records'}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', maxWidth: 460, margin: '0.25rem auto 0 auto' }}>
                    {users.length === 0
                      ? dataSource === 'production'
                        ? isProdConfigNeeded
                          ? 'Connect to Spendwise production using Migration 003 to view real registered Hisbo customers.'
                          : errorMsg
                          ? errorMsg
                          : 'No user accounts found in production database.'
                        : 'No non-admin accounts exist in staging. Sign up a test user to populate sandbox records.'
                      : 'Try adjusting your search query or status filter.'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
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
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {user.authProvider}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {user.lastSignIn
                      ? new Date(user.lastSignIn).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Drawer Modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: 520,
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    background: 'var(--accent-muted)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.125rem',
                  }}
                >
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {selectedUser.name}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Account ID</div>
                <code style={{ fontSize: '0.6875rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {selectedUser.id}
                </code>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Activity Status</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <span className={`badge ${selectedUser.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>
                    {selectedUser.status}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                fontSize: '0.75rem',
                color: '#34d399',
                marginBottom: '1.5rem',
              }}
            >
              🔒 <strong>Privacy Shield Active:</strong> Individual ledger entries, transaction notes, and financial amounts are strictly isolated from administrator inspection.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedUser(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
