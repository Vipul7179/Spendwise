'use client';

import React, { useState, useEffect } from 'react';
import {
  AnalyticsIcon,
  ExternalLinkIcon,
  RefreshIcon,
  AlertTriangleIcon,
} from '@/components/icons';
import { StatCard } from '@/components/ui/StatCard';

interface TelemetryData {
  activeUsers28d: number;
  totalSessions: number;
  bounceRate: number;
}

export default function AnalyticsDashboardPage() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [requiresConfiguration, setRequiresConfiguration] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [measurementId, setMeasurementId] = useState('G-LCMEK1R5HY');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGA4Data = async () => {
    try {
      const res = await fetch('/api/admin/analytics/data');
      const data = await res.json();

      if (data.measurementId) {
        setMeasurementId(data.measurementId);
      }

      if (res.ok && data.success && data.configured && data.telemetry) {
        setIsConfigured(true);
        setTelemetry(data.telemetry);
        setConnectionError(null);
        setRequiresConfiguration(false);
      } else if (data.requiresConfiguration) {
        setIsConfigured(false);
        setTelemetry(null);
        setConnectionError(null);
        setRequiresConfiguration(true);
      } else {
        setIsConfigured(false);
        setTelemetry(null);
        setRequiresConfiguration(false);
        setConnectionError(data.error || data.message || 'Failed to authenticate with Google Analytics 4 API.');
      }
    } catch (err: unknown) {
      setIsConfigured(false);
      setTelemetry(null);
      setRequiresConfiguration(false);
      setConnectionError(err instanceof Error ? err.message : 'Network error communicating with analytics endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    void fetchGA4Data();
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitialGA4() {
      try {
        const res = await fetch('/api/admin/analytics/data');
        const data = await res.json();
        if (ignore) return;

        if (data.measurementId) {
          setMeasurementId(data.measurementId);
        }

        if (res.ok && data.success && data.configured && data.telemetry) {
          setIsConfigured(true);
          setTelemetry(data.telemetry);
          setConnectionError(null);
          setRequiresConfiguration(false);
        } else if (data.requiresConfiguration) {
          setIsConfigured(false);
          setTelemetry(null);
          setConnectionError(null);
          setRequiresConfiguration(true);
        } else {
          setIsConfigured(false);
          setTelemetry(null);
          setRequiresConfiguration(false);
          setConnectionError(data.error || data.message || 'Failed to authenticate with Google Analytics 4 API.');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setIsConfigured(false);
          setTelemetry(null);
          setRequiresConfiguration(false);
          setConnectionError(err instanceof Error ? err.message : 'Network error communicating with analytics endpoint.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialGA4();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
            Analytics & Traffic Telemetry
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Audience metrics, traffic channels, and pageview telemetry for Hisbo web applications.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
            title="Refresh GA4 Data"
          >
            <RefreshIcon size={14} className={isLoading ? 'spin' : ''} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ gap: '0.4rem' }}
          >
            <span>Open Google Analytics</span>
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </div>

      {/* GA4 Integration Status Banner */}
      <div
        className="admin-card"
        style={{
          borderLeft: `4px solid ${
            isConfigured ? 'var(--accent)' : connectionError ? 'var(--danger, #ef4444)' : '#38bdf8'
          }`,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
          padding: '1.25rem',
        }}
      >
        <AnalyticsIcon
          size={24}
          style={{
            color: isConfigured ? 'var(--accent)' : connectionError ? 'var(--danger, #ef4444)' : '#38bdf8',
            flexShrink: 0,
            marginTop: 2,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Google Analytics 4 Measurement Stream
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
              {isConfigured ? 'API Connected' : connectionError ? 'Connection Error' : 'Client Streaming Only'}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
            Hisbo web client (<code>hisbo.in</code>) collects client-side analytics via Measurement ID{' '}
            <strong>{measurementId}</strong>. To embed live traffic telemetry and session metrics directly into Hisbo Control,
            configure a Google Cloud Service Account with the Google Analytics Data API (v1beta).
          </p>
        </div>
      </div>

      {/* Connection Error Diagnostic Banner */}
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: 1.5 }}>
              Check that your Google Cloud Service Account has <strong>Viewer</strong> access to GA4 Property ID{' '}
              <code>559947530</code>, and that <code>GA4_PRIVATE_KEY</code> in Vercel contains a valid PEM key.
            </p>
          </div>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        <StatCard
          title="Total Unique Visitors (28d)"
          value={telemetry ? telemetry.activeUsers28d.toLocaleString() : '—'}
          subtitle={isConfigured ? 'Active Users (28d)' : connectionError ? 'Connection Error' : 'Awaiting GA4 Data API'}
          icon={<AnalyticsIcon size={18} />}
        />
        <StatCard
          title="Total Sessions"
          value={telemetry ? telemetry.totalSessions.toLocaleString() : '—'}
          subtitle={isConfigured ? 'Direct & Organic' : connectionError ? 'Connection Error' : 'Awaiting GA4 Data API'}
        />
        <StatCard
          title="Bounce Rate"
          value={telemetry ? `${telemetry.bounceRate.toFixed(1)}%` : '—'}
          subtitle={isConfigured ? 'Weighted Average' : connectionError ? 'Connection Error' : 'Awaiting GA4 Data API'}
        />
        <StatCard
          title="Active Web Properties"
          value="1"
          subtitle="hisbo.in (Production)"
        />
      </div>

      {/* GA4 Setup & Instructions Card (shown when unconfigured) */}
      {!isConfigured && requiresConfiguration && (
        <div className="admin-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Configuring GA4 Telemetry Ingestion
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Follow these steps to authorize Hisbo Control to stream aggregated metrics securely from Google Cloud:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                1
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Enable <strong>Google Analytics Data API</strong> in your Google Cloud Platform Console for project{' '}
                <code>Spendwise</code>.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                2
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Create a Service Account with <strong>Viewer</strong> access to GA4 Property ID linked to <code>G-LCMEK1R5HY</code>.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--bg-secondary)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                3
              </span>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Add credentials to <code>hisbo-control/.env.local</code> or Vercel Environment Variables:
                <pre
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.75rem',
                    borderRadius: 6,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                  }}
                >
{`GA4_PROPERTY_ID=your_property_id
GA4_CLIENT_EMAIL=hisbo-analytics@...iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Links to Live Analytics */}
      <div className="admin-card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
          Configured Web Stream Endpoints
        </h3>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Web Property</th>
                <th>Measurement ID</th>
                <th>Stream Type</th>
                <th>Tracking Status</th>
                <th style={{ textAlign: 'right' }}>Target</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Hisbo Production Web Application</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>https://www.hisbo.in</div>
                </td>
                <td>
                  <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{measurementId}</code>
                </td>
                <td>
                  <span className="badge badge-neutral">Web Stream</span>
                </td>
                <td>
                  <span className="badge badge-success">Active Ingestion</span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <a
                    href="https://www.hisbo.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', padding: '0.25rem 0.5rem' }}
                  >
                    <span>Visit Site</span>
                    <ExternalLinkIcon size={12} />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

