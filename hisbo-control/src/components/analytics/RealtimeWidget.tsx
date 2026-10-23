'use client';

import React, { useState, useEffect } from 'react';
import { RefreshIcon } from '@/components/icons';
import { GA4RealtimeData } from '@/lib/analytics/ga4-client';

export function RealtimeWidget() {
  const [data, setData] = useState<GA4RealtimeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const executeRealtimeFetch = async (force = false) => {
    try {
      const res = await fetch(`/api/admin/analytics/realtime${force ? '?refresh=true' : ''}`);
      const json = await res.json();
      if (res.ok && json.success && json.realtime) {
        setData(json.realtime);
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString());
      } else if (!json.success && json.error) {
        setError(json.error);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    void executeRealtimeFetch(true);
  };

  useEffect(() => {
    let ignore = false;

    async function loadInitial() {
      try {
        const res = await fetch('/api/admin/analytics/realtime');
        const json = await res.json();
        if (ignore) return;
        if (res.ok && json.success && json.realtime) {
          setData(json.realtime);
          setError(null);
          setLastUpdated(new Date().toLocaleTimeString());
        } else if (!json.success && json.error) {
          setError(json.error);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Network error');
        }
      }
    }

    void loadInitial();

    if (!isPolling) {
      return () => {
        ignore = true;
      };
    }

    const interval = setInterval(() => {
      void executeRealtimeFetch(true);
    }, 30000);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [isPolling]);

  const activeCount = data ? data.activeUsersLast30m : 0;

  return (
    <div
      className="admin-card"
      style={{
        background: 'linear-gradient(135deg, rgba(7, 20, 15, 0.95) 0%, rgba(15, 39, 30, 0.9) 100%)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--accent)',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Top Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Pulsing Beacon */}
          <div style={{ position: 'relative', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--accent)',
                opacity: 0.6,
                animation: 'pulse 1.8s infinite cubic-bezier(0.4, 0, 0.6, 1)',
              }}
            />
            <span
              style={{
                position: 'relative',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent)',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Real-Time Traffic Stream
              </h3>
              <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                GA4 Realtime API
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Active users within the last 30 minutes. {lastUpdated && `Updated at ${lastUpdated}.`}
            </p>
          </div>
        </div>

        {/* Polling & Refresh Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
            title={isPolling ? 'Pause 30s auto-refresh' : 'Resume auto-refresh'}
          >
            <span>{isPolling ? 'Auto-refresh: ON' : 'Auto-refresh: PAUSED'}</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.5rem' }}
            title="Refresh Real-Time Data"
          >
            <RefreshIcon size={13} className={isLoading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--danger)', padding: '0.5rem 0' }}>
          Realtime status notice: {error}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', paddingTop: '0.25rem' }}>
          {/* Active Users Counter */}
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 8,
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Visitors
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
                {activeCount}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                right now
              </span>
            </div>
          </div>

          {/* Top Active Pages */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
            }}
          >
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Pages (Last 30m)
            </span>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {data?.topPages && data.topPages.length > 0 ? (
                data.topPages.map((p, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                      {p.path}
                    </span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{p.activeUsers}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No pageviews in last 30 minutes</span>
              )}
            </div>
          </div>

          {/* Top Countries */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
            }}
          >
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Locations
            </span>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {data?.topCountries && data.topCountries.length > 0 ? (
                data.topCountries.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-main)' }}>{c.country}</span>
                    <span style={{ color: 'var(--info)', fontWeight: 600 }}>{c.activeUsers}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting live visitors</span>
              )}
            </div>
          </div>

          {/* Device Split */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
            }}
          >
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Device Split
            </span>
            <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {data?.topDevices && data.topDevices.length > 0 ? (
                data.topDevices.map((d, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>{d.device}</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{d.activeUsers}</span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Awaiting live visitors</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
