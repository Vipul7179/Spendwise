'use client';

import React, { useState } from 'react';
import { MetricTrendPoint } from '@/types/analytics';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: MetricTrendPoint[];
  color?: string;
  height?: number;
  badge?: string;
}

export function ChartCard({
  title,
  subtitle,
  data,
  color = '#10b981',
  height = 220,
  badge,
}: ChartCardProps) {
  const [activePoint, setActivePoint] = useState<MetricTrendPoint | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="admin-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No metric trend data available.
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const valRange = maxVal - minVal || 1;

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const width = 600; // viewBox width

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const points = data.map((d, index) => {
    const x = paddingLeft + (index / (data.length - 1)) * chartW;
    const y = paddingTop + chartH - ((d.value - minVal) / valRange) * chartH;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, curr, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)},${(paddingTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)},${(paddingTop + chartH).toFixed(1)} Z`;

  return (
    <div className="admin-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)' }}>{title}</h3>
            {badge && (
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
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {subtitle}
            </p>
          )}
        </div>

        {activePoint && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activePoint.date}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 700, color: color }}>
              {activePoint.value.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`grad-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal gridlines */}
          {[0, 0.33, 0.66, 1].map((ratio) => {
            const y = paddingTop + chartH * ratio;
            const gridVal = Math.round(maxVal - ratio * valRange);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : gridVal}
                </text>
              </g>
            );
          })}

          {/* Gradient area */}
          <path d={areaD} fill={`url(#grad-${title.replace(/\s+/g, '-')})`} />

          {/* Stroke path */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activePoint?.date === pt.data.date ? 5 : 3}
                fill={activePoint?.date === pt.data.date ? '#ffffff' : color}
                stroke={color}
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                onMouseEnter={() => setActivePoint(pt.data)}
                onMouseLeave={() => setActivePoint(null)}
              />
              <text
                x={pt.x}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {pt.data.date}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

