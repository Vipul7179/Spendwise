import React from 'react';
import { ArrowUpRightIcon, ArrowDownRightIcon } from '@/components/icons';

export interface StatCardProps {
  title: string;
  value: string | number;
  changePct?: number;
  changePeriod?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  isDemo?: boolean;
}

export function StatCard({
  title,
  value,
  changePct,
  changePeriod = 'vs last month',
  icon,
  subtitle,
  isDemo,
}: StatCardProps) {
  const isPositive = changePct !== undefined && changePct >= 0;

  return (
    <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--accent-muted)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
          {value}
        </span>
        {isDemo && (
          <span
            style={{
              fontSize: '0.6875rem',
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(245, 158, 11, 0.15)',
              color: 'var(--warning)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontWeight: 600,
            }}
          >
            Demo
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
        {changePct !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontWeight: 600,
              gap: 2,
              color: isPositive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {isPositive ? <ArrowUpRightIcon size={14} /> : <ArrowDownRightIcon size={14} />}
            {isPositive ? `+${changePct}%` : `${changePct}%`}
          </span>
        )}
        <span style={{ color: 'var(--text-muted)' }}>
          {subtitle || changePeriod}
        </span>
      </div>
    </div>
  );
}

