'use client';

import React, { useState, useEffect } from 'react';
import {
  AnalyticsIcon,
  ExternalLinkIcon,
  RefreshIcon,
  AlertTriangleIcon,
  DownloadIcon,
  SearchIcon,
  UsersIcon,
} from '@/components/icons';
import { StatCard } from '@/components/ui/StatCard';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { RealtimeWidget } from '@/components/analytics/RealtimeWidget';
import { InstrumentationGuide } from '@/components/analytics/InstrumentationGuide';
import { AdvancedGA4ReportData } from '@/lib/analytics/ga4-client';

type TabView = 'overview' | 'traffic' | 'audience' | 'pages' | 'events';
type DateRangeOption = 'today' | '7d' | '28d' | '90d' | 'custom';

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [dateRange, setDateRange] = useState<DateRangeOption>('28d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [report, setReport] = useState<AdvancedGA4ReportData | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [requiresConfiguration, setRequiresConfiguration] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [measurementId, setMeasurementId] = useState('G-LCMEK1R5HY');
  const [isLoading, setIsLoading] = useState(true);

  // Search filters
  const [pageSearch, setPageSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  const fetchReportData = async (forceRefresh = false) => {
    try {
      let url = `/api/admin/analytics/data?range=${dateRange}`;
      if (dateRange === 'custom' && customStart && customEnd) {
        url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
      }
      if (forceRefresh) {
        url += '&refresh=true';
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.measurementId) {
        setMeasurementId(data.measurementId);
      }

      if (res.ok && data.success && data.configured && data.report) {
        setReport(data.report);
        setIsConfigured(true);
        setConnectionError(null);
        setRequiresConfiguration(false);
      } else if (data.requiresConfiguration) {
        setIsConfigured(false);
        setReport(null);
        setConnectionError(null);
        setRequiresConfiguration(true);
      } else {
        setIsConfigured(false);
        setReport(null);
        setRequiresConfiguration(false);
        setConnectionError(data.error || data.message || 'Failed to authenticate with Google Analytics 4 API.');
      }
    } catch (err: unknown) {
      setIsConfigured(false);
      setReport(null);
      setRequiresConfiguration(false);
      setConnectionError(err instanceof Error ? err.message : 'Network error communicating with analytics endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    void fetchReportData(true);
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        let url = `/api/admin/analytics/data?range=${dateRange}`;
        if (dateRange === 'custom' && customStart && customEnd) {
          url += `&startDate=${encodeURIComponent(customStart)}&endDate=${encodeURIComponent(customEnd)}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        if (ignore) return;

        if (data.measurementId) {
          setMeasurementId(data.measurementId);
        }

        if (res.ok && data.success && data.configured && data.report) {
          setReport(data.report);
          setIsConfigured(true);
          setConnectionError(null);
          setRequiresConfiguration(false);
        } else if (data.requiresConfiguration) {
          setIsConfigured(false);
          setReport(null);
          setConnectionError(null);
          setRequiresConfiguration(true);
        } else {
          setIsConfigured(false);
          setReport(null);
          setRequiresConfiguration(false);
          setConnectionError(data.error || data.message || 'Failed to authenticate with Google Analytics 4 API.');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setIsConfigured(false);
          setReport(null);
          setRequiresConfiguration(false);
          setConnectionError(err instanceof Error ? err.message : 'Network error communicating with analytics endpoint.');
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
  }, [dateRange, customStart, customEnd]);

  // CSV Exporters
  const exportPagesCsv = () => {
    if (!report?.pages || report.pages.length === 0) return;
    const headers = ['Page Path', 'Page Title', 'Pageviews', 'Active Users', 'Avg Duration (sec)', 'Views Per Session'];
    const rows = report.pages.map((p) => [p.path, p.title, p.views, p.activeUsers, p.avgDurationSeconds, p.viewsPerSession]);
    downloadCsv(`hisbo-pages-${report.range}-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportSourcesCsv = () => {
    if (!report?.sources || report.sources.length === 0) return;
    const headers = ['Source / Medium', 'Sessions', 'Active Users', 'Session Share (%)'];
    const rows = report.sources.map((s) => [s.sourceMedium, s.sessions, s.activeUsers, s.share]);
    downloadCsv(`hisbo-sources-${report.range}-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportGeoCsv = () => {
    if (!report?.geo || report.geo.length === 0) return;
    const headers = ['Country', 'City', 'Active Users', 'Sessions', 'User Share (%)'];
    const rows = report.geo.map((g) => [g.country, g.city, g.activeUsers, g.sessions, g.share]);
    downloadCsv(`hisbo-audience-geo-${report.range}-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  // Duration Formatter
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const remSec = seconds % 60;
    return `${mins}m ${remSec}s`;
  };

  // Filtered pages and events
  const filteredPages = (report?.pages || []).filter(
    (p) => p.path.toLowerCase().includes(pageSearch.toLowerCase()) || p.title.toLowerCase().includes(pageSearch.toLowerCase())
  );

  const filteredEvents = (report?.events || []).filter(
    (e) => e.eventName.toLowerCase().includes(eventSearch.toLowerCase())
  );

  const rangeLabel =
    dateRange === 'today'
      ? 'Today'
      : dateRange === '7d'
      ? 'Past 7 Days'
      : dateRange === '28d'
      ? 'Past 28 Days'
      : dateRange === '90d'
      ? 'Past 90 Days'
      : `${customStart || 'Custom'} to ${customEnd || ''}`;

  const compLabel =
    dateRange === 'today'
      ? 'vs yesterday'
      : dateRange === '7d'
      ? 'vs prior 7 days'
      : dateRange === '28d'
      ? 'vs prior 28 days'
      : dateRange === '90d'
      ? 'vs prior 90 days'
      : 'vs prior period';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Analytics & Traffic Telemetry
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Audience metrics, traffic channels, pageview telemetry, and real-time events for hisbo.in.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Date Range Selector Pills */}
          <div style={{ display: 'inline-flex', background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '28d', label: '28D' },
              { id: '90d', label: '90D' },
              { id: 'custom', label: 'Custom' },
            ].map((opt) => {
              const active = dateRange === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.id === 'custom') {
                      setShowCustomModal(true);
                    } else {
                      setDateRange(opt.id as DateRangeOption);
                    }
                  }}
                  style={{
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            title="Force refresh Google Analytics data"
          >
            <RefreshIcon size={14} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* External Google Analytics Link */}
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <span>Google Analytics</span>
            <ExternalLinkIcon size={13} />
          </a>
        </div>
      </div>

      {/* Custom Date Range Modal / Popover */}
      {showCustomModal && (
        <div
          className="admin-card"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)' }}>Custom Date Range:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="date"
              className="input-field"
              style={{ width: 140, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="input-field"
              style={{ width: 140, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              if (customStart && customEnd) {
                setDateRange('custom');
                setShowCustomModal(false);
              }
            }}
            disabled={!customStart || !customEnd}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Apply Range
          </button>
          <button
            onClick={() => setShowCustomModal(false)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* 2. Integration Status Banner */}
      <div
        className="admin-card"
        style={{
          borderLeft: `4px solid ${
            isConfigured ? 'var(--accent)' : connectionError ? 'var(--danger, #ef4444)' : '#38bdf8'
          }`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          padding: '1rem 1.25rem',
        }}
      >
        <AnalyticsIcon
          size={22}
          style={{
            color: isConfigured ? 'var(--accent)' : connectionError ? 'var(--danger, #ef4444)' : '#38bdf8',
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Google Analytics 4 Telemetry Stream
            </h3>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 4,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              Tag: {measurementId}
            </span>
            <span
              className={`badge ${
                isConfigured ? 'badge-success' : connectionError ? 'badge-danger' : 'badge-neutral'
              }`}
            >
              {isConfigured ? 'Data API Active' : connectionError ? 'Connection Error' : 'Client Streaming Only'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Selected Range: <strong>{rangeLabel}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div
          className="admin-card"
          style={{
            borderLeft: '4px solid var(--danger, #ef4444)',
            background: 'rgba(239, 68, 68, 0.04)',
            padding: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          <AlertTriangleIcon size={22} style={{ color: 'var(--danger, #ef4444)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Google Analytics Data API Connection Error
              </h4>
              <button
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="btn btn-secondary btn-sm"
                style={{ gap: '0.4rem' }}
              >
                <RefreshIcon size={13} className={isLoading ? 'spin' : ''} />
                <span>{isLoading ? 'Retrying...' : 'Retry Connection'}</span>
              </button>
            </div>
            <p
              style={{
                fontSize: '0.8125rem',
                color: 'var(--danger, #ef4444)',
                marginTop: '0.4rem',
                fontFamily: 'monospace',
                background: 'rgba(239, 68, 68, 0.08)',
                padding: '0.5rem 0.75rem',
                borderRadius: 4,
                wordBreak: 'break-word',
              }}
            >
              {connectionError}
            </p>
          </div>
        </div>
      )}

      {/* 3. Real-Time Pulse Section */}
      <RealtimeWidget />

      {/* 4. Executive KPI Stat Grid (9 Cards with Comparison) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
        <StatCard
          title="Active Users"
          value={report ? report.overview.activeUsers.value.toLocaleString() : '—'}
          changePct={report ? report.overview.activeUsers.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
          icon={<UsersIcon size={18} />}
        />
        <StatCard
          title="Total Users"
          value={report ? report.overview.totalUsers.value.toLocaleString() : '—'}
          changePct={report ? report.overview.totalUsers.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="New Users"
          value={report ? report.overview.newUsers.value.toLocaleString() : '—'}
          changePct={report ? report.overview.newUsers.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Total Sessions"
          value={report ? report.overview.sessions.value.toLocaleString() : '—'}
          changePct={report ? report.overview.sessions.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Total Pageviews"
          value={report ? report.overview.pageviews.value.toLocaleString() : '—'}
          changePct={report ? report.overview.pageviews.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Engagement Rate"
          value={report ? `${report.overview.engagementRate.value}%` : '—'}
          changePct={report ? report.overview.engagementRate.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Bounce Rate"
          value={report ? `${report.overview.bounceRate.value}%` : '—'}
          changePct={report ? report.overview.bounceRate.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Avg Engagement Time"
          value={report ? formatDuration(report.overview.avgEngagementDurationSeconds.value) : '—'}
          changePct={report ? report.overview.avgEngagementDurationSeconds.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
        <StatCard
          title="Events / Session"
          value={report ? report.overview.eventsPerSession.value.toFixed(1) : '—'}
          changePct={report ? report.overview.eventsPerSession.changePercent ?? undefined : undefined}
          changePeriod={compLabel}
        />
      </div>

      {/* 5. Navigation View Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview & Velocity' },
          { id: 'traffic', label: 'Traffic & Acquisition' },
          { id: 'audience', label: 'Audience & Devices' },
          { id: 'pages', label: 'Page Performance' },
          { id: 'events', label: 'Events & Conversions' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabView)}
              style={{
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: active ? '1px solid var(--border)' : '1px solid transparent',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: '8px 8px 0 0',
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & VELOCITY */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Daily Trend Chart */}
          <TimeSeriesChart data={report?.dailyTrend || []} isLoading={isLoading} />

          {/* Acquisition Channels Summary & Top Pages Split */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
            {/* Acquisition Channels */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Traffic Channels
                </h3>
                <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                  Default Grouping
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report?.channels && report.channels.length > 0 ? (
                  report.channels.map((ch, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{ch.channel}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {ch.sessions.toLocaleString()} sessions ({ch.share}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${Math.min(ch.share, 100)}%`,
                            height: '100%',
                            background: idx === 0 ? 'var(--accent)' : idx === 1 ? 'var(--info)' : '#f59e0b',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>No channel distribution found for period.</p>
                )}
              </div>
            </div>

            {/* Top 5 Pages Summary */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Top Visited Pages
                </h3>
                <button
                  onClick={() => setActiveTab('pages')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                >
                  View All
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(report?.pages || []).slice(0, 5).map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.path}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{p.title}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{p.views.toLocaleString()} views</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{p.activeUsers} visitors</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRAFFIC & ACQUISITION */}
      {activeTab === 'traffic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <TimeSeriesChart data={report?.dailyTrend || []} isLoading={isLoading} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
            {/* Source / Medium Table */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Source / Medium Breakdown
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Referring channels and campaigns.</p>
                </div>
                <button onClick={exportSourcesCsv} className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
                  <DownloadIcon size={13} />
                  <span>CSV</span>
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Source / Medium</th>
                      <th>Sessions</th>
                      <th>Users</th>
                      <th style={{ textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.sources && report.sources.length > 0 ? (
                      report.sources.map((s, idx) => (
                        <tr key={idx}>
                          <td>
                            <code style={{ color: 'var(--text-main)' }}>{s.sourceMedium}</code>
                          </td>
                          <td>{s.sessions.toLocaleString()}</td>
                          <td>{s.activeUsers.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{s.share}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No source telemetry available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Performance */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Marketing Campaigns
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Performance of UTM tagged campaign links.</p>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Sessions</th>
                      <th style={{ textAlign: 'right' }}>Users</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.campaigns && report.campaigns.length > 0 ? (
                      report.campaigns.map((c, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.campaign}</td>
                          <td>{c.sessions.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{c.activeUsers.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
                          <div>No UTM campaign parameters detected in current range.</div>
                          <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Tag your marketing links with <code>?utm_campaign=...</code> to track specific funnels.</div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIENCE & DEVICES */}
      {activeTab === 'audience' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Device Distribution Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1.25rem' }}>
            {report?.devices && report.devices.length > 0 ? (
              report.devices.map((d, idx) => (
                <div key={idx} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {d.device} Users
                    </span>
                    <span className="badge badge-info">{d.share}%</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    {d.activeUsers.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {d.sessions.toLocaleString()} sessions recorded
                  </div>
                </div>
              ))
            ) : (
              <div className="admin-card" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
                No device category telemetry available.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
            {/* Geography Table */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Audience Locations
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visitor geographical breakdown by country and city.</p>
                </div>
                <button onClick={exportGeoCsv} className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
                  <DownloadIcon size={13} />
                  <span>CSV</span>
                </button>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Country</th>
                      <th>City</th>
                      <th>Users</th>
                      <th style={{ textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.geo && report.geo.length > 0 ? (
                      report.geo.map((g, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{g.country}</td>
                          <td>{g.city || '(not set)'}</td>
                          <td>{g.activeUsers.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{g.share}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No location telemetry</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tech Stack Table (Browser / OS) */}
            <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Browser & Operating System
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Client environments connecting to hisbo.in.</p>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Browser</th>
                      <th>Operating System</th>
                      <th>Users</th>
                      <th style={{ textAlign: 'right' }}>Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report?.tech && report.tech.length > 0 ? (
                      report.tech.map((t, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.browser}</td>
                          <td>{t.operatingSystem}</td>
                          <td>{t.activeUsers.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{t.sessions.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No environment telemetry</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAGE PERFORMANCE */}
      {activeTab === 'pages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Web Pageview Performance
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Audience traffic, average reading duration, and views per session by page path.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search page paths..."
                    className="input-field"
                    style={{ paddingLeft: '2rem', width: 220, fontSize: '0.8125rem' }}
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                  />
                </div>

                <button onClick={exportPagesCsv} className="btn btn-secondary btn-sm" style={{ gap: '0.35rem' }}>
                  <DownloadIcon size={13} />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Page Path</th>
                    <th>Page Title</th>
                    <th>Pageviews</th>
                    <th>Unique Users</th>
                    <th>Avg Duration</th>
                    <th style={{ textAlign: 'right' }}>Views / Session</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.length > 0 ? (
                    filteredPages.map((p, idx) => (
                      <tr key={idx}>
                        <td>
                          <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.path}</code>
                        </td>
                        <td style={{ color: 'var(--text-main)' }}>{p.title}</td>
                        <td style={{ fontWeight: 700 }}>{p.views.toLocaleString()}</td>
                        <td>{p.activeUsers.toLocaleString()}</td>
                        <td>{formatDuration(p.avgDurationSeconds)}</td>
                        <td style={{ textAlign: 'right' }}>{p.viewsPerSession.toFixed(1)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                        No matching pages found for this query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EVENTS & CONVERSIONS */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key Milestone Conversions Grid */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Key Customer Milestones & Conversions
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Key user journey events captured by Google Tag on hisbo.in. Un-instrumented events display honest configuration requirements.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
              {report?.conversions && report.conversions.length > 0 ? (
                report.conversions.map((conv, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${conv.isInstrumented ? 'var(--border-light)' : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          {conv.displayName}
                        </span>
                        <span className={`badge ${conv.isInstrumented ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.6875rem' }}>
                          {conv.isInstrumented ? 'Active Event' : 'Not Configured'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        <code>{conv.eventName}</code> &bull; {conv.category}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                        {conv.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Count:</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: conv.isInstrumented ? 'var(--text-main)' : 'var(--text-muted)' }}>
                        {conv.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          {/* All Tracked Events Table */}
          <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  All Tracked Events
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Raw event telemetry captured in current date range.</p>
              </div>

              <div style={{ position: 'relative' }}>
                <SearchIcon size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Filter event name..."
                  className="input-field"
                  style={{ paddingLeft: '2rem', width: 220, fontSize: '0.8125rem' }}
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event Identifier</th>
                    <th>Total Occurrences</th>
                    <th style={{ textAlign: 'right' }}>Total Users</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.length > 0 ? (
                    filteredEvents.map((e, idx) => (
                      <tr key={idx}>
                        <td>
                          <code style={{ color: 'var(--info)', fontWeight: 600 }}>{e.eventName}</code>
                        </td>
                        <td style={{ fontWeight: 700 }}>{e.count.toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>{e.users.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                        No events matching search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Website Instrumentation Guide Accordion */}
          <InstrumentationGuide />
        </div>
      )}
    </div>
  );
}

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
