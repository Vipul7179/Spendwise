import React from 'react';
import { AlertCircleIcon, DatabaseIcon } from '@/components/icons';

export interface DemoBannerProps {
  message?: string;
  source?: 'demo' | 'live' | 'hybrid';
}

export function DemoBanner({
  message = 'Demonstration Mode Active: Analytics and audit metrics reflect simulated production telemetry. Live user financial records remain strictly shielded.',
  source = 'demo',
}: DemoBannerProps) {
  if (source === 'live') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.625rem 1rem',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 8,
          marginBottom: '1.5rem',
          fontSize: '0.8125rem',
          color: '#34d399',
        }}
      >
        <DatabaseIcon size={16} />
        <span>Live Production Connection: Authenticated directly against Hisbo Supabase cluster.</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.625rem 1rem',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.22)',
        borderRadius: 8,
        marginBottom: '1.5rem',
        fontSize: '0.8125rem',
        color: '#fbbf24',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <AlertCircleIcon size={16} />
        <span>{message}</span>
      </div>
      <span
        style={{
          fontSize: '0.6875rem',
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(245, 158, 11, 0.18)',
          color: '#fef3c7',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
        }}
      >
        Simulated Data
      </span>
    </div>
  );
}

