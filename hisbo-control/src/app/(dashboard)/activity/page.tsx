'use client';

import React, { useState, useEffect } from 'react';
import {
  ActivityIcon,
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  CheckCircleIcon,
  ShieldIcon,
  RefreshIcon,
  AlertTriangleIcon,
  LockIcon,
} from '@/components/icons';
import { AuditLogEntry } from '@/types/admin';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [requiresMigration, setRequiresMigration] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  const fetchLogs = async (cat = categoryFilter) => {
    setErrorMsg(null);

    try {
      const url = cat !== 'all'
        ? `/api/admin/activity?category=${encodeURIComponent(cat)}`
        : '/api/admin/activity';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load audit logs.');
        setLogs([]);
        return;
      }

      setIsConfigured(Boolean(data.configured));
      setRequiresMigration(Boolean(data.requiresMigration));
      setLogs(data.logs || []);
    } catch {
      setErrorMsg('Network error connecting to audit log API.');
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadLogs() {
      try {
        const url = categoryFilter !== 'all'
          ? `/api/admin/activity?category=${encodeURIComponent(categoryFilter)}`
          : '/api/admin/activity';
        const res = await fetch(url);
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to load audit logs.');
          setLogs([]);
          return;
        }

        setIsConfigured(Boolean(data.configured));
        setRequiresMigration(Boolean(data.requiresMigration));
        setLogs(data.logs || []);
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to audit log API.');
          setLogs([]);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadLogs();
    return () => {
      ignore = true;
    };
  }, [categoryFilter]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      setToast('No audit entries to export.');
      setTimeout(() => setToast(null), 3000);
      return;
    }

    const headers = ['Timestamp', 'Admin', 'Action', 'Category', 'Details', 'IP Hash', 'Status'];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.adminEmail,
      `"${l.action.replace(/"/g, '""')}"`,
      l.category,
      `"${l.details.replace(/"/g, '""')}"`,
      l.ipHash,
      l.status,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hisbo_admin_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setToast('Audit trail exported successfully.');
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Administrative Audit Trail
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Immutable recording of staff operations, role modifications, content updates, and security events.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => void fetchLogs()}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            disabled={isLoading}
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
          <button onClick={handleExport} className="btn btn-primary btn-sm" style={{ gap: '0.4rem' }}>
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Migration Required Notice */}
      {requiresMigration && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid #f59e0b',
            background: 'rgba(245, 158, 11, 0.05)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <AlertTriangleIcon size={22} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Audit Logging Table Not Initialized
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Persistent audit trail storage requires <code>public.admin_audit_logs</code> in your <code>hisbo-staging</code> database (<code>klvbtoxyeixxjydnanlz</code>).
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              To enable persistent audit trails: apply <code>migrations/001_admin_roles_and_audit_logs.sql</code> inside the Supabase SQL Editor.
            </p>
          </div>
        </div>
      )}

      {/* Security Architecture Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1.25rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          fontSize: '0.8125rem',
          color: '#34d399',
        }}
      >
        <LockIcon size={18} style={{ flexShrink: 0 }} />
        <div>
          <strong>Append-Only Audit Guarantee:</strong> Audit log rows are strictly protected by Row Level Security without <code>UPDATE</code> or <code>DELETE</code> policies, ensuring historical integrity.
        </div>
      </div>

      {toast && (
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
          <span>{toast}</span>
        </div>
      )}

      {/* Search and Category Filter */}
      <div className="admin-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 260 }}>
          <SearchIcon size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, administrator email, or details..."
            className="input-field"
            style={{ border: 'none', background: 'transparent', padding: '0.35rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FilterIcon size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem' }}
          >
            <option value="all">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="users">User Access</option>
            <option value="admins">Admin Team</option>
            <option value="roles">Role Assignments</option>
            <option value="blogs">Blog Content</option>
            <option value="banners">Banners</option>
            <option value="monitoring">System Monitoring</option>
            <option value="settings">Platform Settings</option>
            <option value="security">Security Events</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading audit trail records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {requiresMigration
              ? 'Execute migration 001 in hisbo-staging to start capturing persistent audit logs.'
              : 'No administrative audit logs found for the selected filter.'}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Admin Operator</th>
                <th>Action</th>
                <th>Category</th>
                <th>Details</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                      {log.adminEmail}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                      {log.action}
                    </code>
                  </td>
                  <td>
                    <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                      {log.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.details}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        log.status === 'success'
                          ? 'badge-success'
                          : log.status === 'denied'
                          ? 'badge-danger'
                          : 'badge-warning'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
