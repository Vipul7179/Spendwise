'use client';

import React, { useState } from 'react';
import { GA4DailyDataPoint } from '@/lib/analytics/ga4-client';

interface TimeSeriesChartProps {
  data: GA4DailyDataPoint[];
  isLoading?: boolean;
}

type MetricType = 'activeUsers' | 'sessions' | 'pageviews';

export function TimeSeriesChart({ data, isLoading }: TimeSeriesChartProps) {
  const [metric, setMetric] = useState<MetricType>('activeUsers');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="admin-card" style={{ padding: '1.5rem', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading telemetry trend...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="admin-card" style={{ padding: '2rem', textAlign: 'center', minHeight: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No daily traffic recorded for this date range.</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Select a broader date range or verify that web traffic has streamed to GA4.</p>
      </div>
    );
  }

  const metricLabel = metric === 'activeUsers' ? 'Active Users' : metric === 'sessions' ? 'Sessions' : 'Pageviews';
  const metricColor = metric === 'activeUsers' ? '#10b981' : metric === 'sessions' ? '#38bdf8' : '#a855f7';
  const gradientId = `chartGrad_${metric}`;

  // Dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 40;

  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const values = data.map((d) => d[metric]);
  const maxVal = Math.max(...values, 4);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  // Grid steps
  const gridLines = 4;
  const gridStep = maxVal / gridLines;

  // Map data to coordinates
  const points = data.map((d, i) => {
    const x = padLeft + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padTop + chartHeight - ((d[metric] - minVal) / range) * chartHeight;
    return { x, y, data: d, val: d[metric] };
  });

  // Build SVG path
  const linePath = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    return `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padTop + chartHeight} L ${points[0].x} ${padTop + chartHeight} Z`
    : '';

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="admin-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Chart Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-main)' }}>
            Daily Traffic Velocity
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
            Daily distribution of audience engagement over time.
          </p>
        </div>

        {/* Metric Switcher */}
        <div style={{ display: 'inline-flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
          {(['activeUsers', 'sessions', 'pageviews'] as MetricType[]).map((m) => {
            const active = metric === m;
            const label = m === 'activeUsers' ? 'Active Users' : m === 'sessions' ? 'Sessions' : 'Pageviews';
            return (
              <button
                key={m}
                onClick={() => setMetric(m)}
                style={{
                  background: active ? 'var(--bg-card)' : 'transparent',
                  color: active ? 'var(--text-main)' : 'var(--text-secondary)',
                  border: active ? '1px solid var(--border-light)' : '1px solid transparent',
                  borderRadius: 6,
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Container */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', display: 'block', minWidth: 500 }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={metricColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={metricColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {Array.from({ length: gridLines + 1 }).map((_, i) => {
            const val = Math.round(maxVal - i * gridStep);
            const y = padTop + (i / gridLines) * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartWidth}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="sans-serif"
                >
                  {val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

          {/* Main Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={metricColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g key={i}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : points.length > 30 ? 2 : 3.5}
                  fill={isHovered ? '#ffffff' : metricColor}
                  stroke={metricColor}
                  strokeWidth={isHovered ? 3 : 1.5}
                  style={{ transition: 'all 0.15s ease' }}
                />
                {/* Invisible hover target */}
                <rect
                  x={pt.x - (chartWidth / Math.max(points.length, 1)) / 2}
                  y={padTop}
                  width={chartWidth / Math.max(points.length, 1)}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(i)}
                />
              </g>
            );
          })}

          {/* X-Axis Date Labels (sample labels if data is large) */}
          {points.map((pt, i) => {
            const step = Math.ceil(points.length / 8);
            if (i % step !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={i}
                x={pt.x}
                y={padTop + chartHeight + 20}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
                fontFamily="sans-serif"
              >
                {pt.data.formattedDate}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: Math.min(Math.max(hoveredPoint.x, 60), svgWidth - 140),
              transform: 'translateX(-50%)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 6,
              padding: '0.4rem 0.75rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
              zIndex: 10,
              fontSize: '0.75rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem' }}>
              {hoveredPoint.data.formattedDate} ({hoveredPoint.data.date})
            </div>
            <div style={{ fontWeight: 700, color: metricColor, marginTop: 2 }}>
              {metricLabel}: {hoveredPoint.val.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

