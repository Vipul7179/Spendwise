'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UsersIcon,
  AnalyticsIcon,
  BlogIcon,
  MonitoringIcon,
  ActivityIcon,
  RefreshIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  ShieldIcon,
} from '@/components/icons';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard } from '@/components/ui/ChartCard';

interface OverviewMetrics {
  totalUsers: number;
  activeUsersMonth: number;
  adminCount: number;
  totalExpensesLogged: number | null;
  systemUptime: number;
  avgLatencyMs: number;
  dbStatus: string;
  realUserTrends: Array<{ date: string; value: number }>;
  lastUpdated: string;
}

export default function OverviewDashboardPage() {
  // Default data source is PRODUCTION metrics
  const [dataSource, setDataSource] = useState<'production' | 'staging'>('production');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isServiceRoleNeeded, setIsServiceRoleNeeded] = useState(false);
  const [isProdConfigNeeded, setIsProdConfigNeeded] = useState(false);

  const fetchOverview = async (source = dataSource) => {
    setErrorMsg(null);
    setIsServiceRoleNeeded(false);
    setIsProdConfigNeeded(false);

    try {
      const res = await fetch(`/api/admin/overview?source=${source}`);
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresConfiguration) {
          setIsProdConfigNeeded(true);
          setErrorMsg(data.error || 'Production reporting is not yet configured or enabled.');
        } else if (data.requiresServiceRoleKey) {
          setIsServiceRoleNeeded(true);
          setErrorMsg('Staging service-role key is not configured in hisbo-control/.env.local.');
        } else {
          setErrorMsg(data.error || `Failed to load platform metrics from ${source} database.`);
        }
        setMetrics(null);
        return;
      }

      setMetrics(data.metrics || null);
    } catch {
      setErrorMsg(`Network error connecting to administrative overview API (${source}).`);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    void fetchOverview(dataSource);
  };

  const handleSourceChange = (newSource: 'production' | 'staging') => {
    if (newSource === dataSource) return;
    setDataSource(newSource);
    setIsLoading(true);
    void fetchOverview(newSource);
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialOverview() {
      try {
        // DEFAULT: Spendwise Production
        const res = await fetch('/api/admin/overview?source=production');
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
            setErrorMsg(data.error || 'Failed to load platform metrics.');
          }
          setMetrics(null);
          return;
        }

        setMetrics(data.metrics || null);
      } catch {
        if (!ignore) {
          setErrorMsg('Network error connecting to administrative overview API.');
          setMetrics(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialOverview();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Platform Overview
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
              ? 'Real customer metrics aggregated from Spendwise production via least-privilege reporting routine.'
              : 'Synthetic sandbox telemetry from hisbo-staging. Staging admin accounts are excluded.'}
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
              Production Telemetry
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
            title="Refresh Telemetry"
          >
            <RefreshIcon size={15} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
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
            Overview KPI statistics and customer growth trends are designed to aggregate directly from the main Spendwise production database (<code>omnhxlqykmtzxdagppcl</code>) via the dedicated least-privilege reporting role (<code>hisbo_readonly_reporter</code>).
            Staging admin accounts are not counted here.
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
              <li>Click &quot;Refresh&quot; to load your real production platform metrics.</li>
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
              To view sandbox counts, configure <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>hisbo-control/.env.local</code>.
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
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

      {/* 4 Primary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.25rem' }}>
        <StatCard
          title="Total Registered Customers"
          value={isLoading ? '...' : metrics ? (metrics.totalUsers ?? 0).toLocaleString() : '—'}
          icon={<UsersIcon size={20} />}
          subtitle={dataSource === 'production' ? (metrics ? 'Spendwise production' : 'Awaiting Production Setup') : 'Staging sandbox'}
        />
        <StatCard
          title="Monthly Active Customers"
          value={isLoading ? '...' : metrics ? (metrics.activeUsersMonth ?? 0).toLocaleString() : '—'}
          icon={<ActivityIcon size={20} />}
          subtitle={metrics ? 'Active in last 30 days' : 'Awaiting Production Setup'}
        />
        <StatCard
          title="Production Admins"
          value={isLoading ? '...' : metrics ? (metrics.adminCount ?? 0).toLocaleString() : '—'}
          icon={<ShieldIcon size={20} />}
          subtitle={metrics ? 'Production profiles' : 'Awaiting Production Setup'}
        />
        <StatCard
          title="Reporting Link Status"
          value={
            isLoading
              ? '...'
              : metrics
              ? (metrics.dbStatus || 'Connected')
              : isProdConfigNeeded
              ? 'Unconfigured'
              : errorMsg
              ? 'Connection Error'
              : dataSource === 'production'
              ? 'Connection Error'
              : 'Connected'
          }
          icon={<MonitoringIcon size={20} />}
          subtitle={
            isLoading
              ? 'Testing connection...'
              : metrics
              ? `${metrics.avgLatencyMs ?? 0}ms latency`
              : errorMsg && !isProdConfigNeeded
              ? 'Database connection failed'
              : isProdConfigNeeded
              ? 'Awaiting Migration 003'
              : 'Standby'
          }
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '1.5rem' }}>
        <ChartCard
          title="Customer Growth Trajectory"
          subtitle={metrics ? `Real cumulative customers in ${dataSource}` : 'Awaiting Production Reporting'}
          data={
            metrics?.realUserTrends && metrics.realUserTrends.length > 0
              ? metrics.realUserTrends
              : [{ date: 'Current', value: metrics?.totalUsers ?? 0 }]
          }
          color={dataSource === 'production' ? '#38bdf8' : '#10b981'}
          badge={dataSource === 'production' ? 'Spendwise Production' : 'Staging Sandbox'}
        />

        {/* Real Platform Activity Summary */}
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Platform Activity Summary
              </h3>
              <span className={`badge ${metrics ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.6875rem' }}>
                {metrics ? 'Live Production' : 'Awaiting Setup'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Aggregate volume from Spendwise production customer profiles.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.5rem 0' }}>
            <div style={{ padding: '1rem', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Customers (30d)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.25rem' }}>
                {isLoading ? '...' : metrics ? (metrics.activeUsersMonth ?? 0).toLocaleString() : '—'}
              </div>
            </div>

            <div style={{ padding: '1rem', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Platform Admins</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.25rem' }}>
                {isLoading ? '...' : metrics ? (metrics.adminCount ?? 0).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            🔒 Customer financial records and transaction ledgers are isolated and inaccessible from the console.
          </div>
        </div>
      </div>

      {/* Secondary Row: Integration Telemetry Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
        {/* Acquisition Channels (External Telemetry Notice) */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Acquisition Channels
            </h3>
            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>External GA4</span>
          </div>

          <div
            style={{
              padding: '2rem 1.5rem',
              textAlign: 'center',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border)',
            }}
          >
            <AnalyticsIcon size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
              Google Analytics 4 Telemetry
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: 360, margin: '0.35rem auto 0 auto' }}>
              Traffic acquisition channels require a direct Google Analytics 4 API connection. The console does not invent synthetic web traffic.
            </p>
          </div>
        </div>

        {/* Top Public Routes Notice */}
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Top Public Routes
            </h3>
            <Link href="/blogs" style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
              Blog Manager <ChevronRightIcon size={14} />
            </Link>
          </div>

          <div
            style={{
              padding: '2rem 1.5rem',
              textAlign: 'center',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              border: '1px dashed var(--border)',
            }}
          >
            <BlogIcon size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.875rem' }}>
              Route Performance Telemetry
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: 360, margin: '0.35rem auto 0 auto' }}>
              Pageview and route tracking are managed client-side via Google Analytics 4 (<code>G-LCMEK1R5HY</code>). No fake visits are populated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
