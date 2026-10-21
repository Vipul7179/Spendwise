'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PAL } from '@/lib/state/initial-state';
import { fmt, NOW, mk } from '@/lib/state/calculations';
import { formatMonthLabel } from './DateBar';

interface OverviewChartsProps {
  selectedMonth: string;
  selectedDay: string;
  onToggleDay: (day: string) => void;
}

const CHART_TABS = [
  { id: 'donut', label: 'Donut' },
  { id: 'pie', label: 'Pie' },
  { id: 'bar', label: 'Bars' },
  { id: 'line', label: 'Daily' },
] as const;

function formatCompact(p: number, hide: boolean): string {
  if (hide) return '● ●';
  const r = p / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1).replace('.0', '')}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1).replace('.0', '')}k`;
  return `₹${Math.round(r)}`;
}

function niceMax(v: number): number {
  const r = v / 100;
  if (r <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(r)));
  const n = r / p;
  const k = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return k * p * 100;
}

export default function OverviewCharts({
  selectedMonth,
  selectedDay,
  onToggleDay,
}: OverviewChartsProps) {
  const { state, setChartType } = useApp();
  const currentChartType = state.ct || 'donut';
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);

  // Compute spend for each category
  const categoryRows = state.cats
    .map((c, i) => {
      const v = state.exps
        .filter((e) => {
          if (selectedDay) {
            return e.cat === c.id && e.date === selectedDay;
          }
          return e.cat === c.id && mk(e.date) === selectedMonth;
        })
        .reduce((sum, e) => sum + e.amt, 0);

      return {
        id: c.id,
        name: c.name,
        v,
        color: PAL[i % PAL.length],
      };
    })
    .filter((r) => r.v > 0);

  const totalSpent = categoryRows.reduce((a, r) => a + r.v, 0);

  const handlePick = (i: number) => {
    setPickedIndex(pickedIndex === i ? null : i);
  };

  const activeRow = pickedIndex !== null && categoryRows[pickedIndex] ? categoryRows[pickedIndex] : null;

  // Donut render
  const renderDonut = () => {
    let offset = 0;
    const segments = totalSpent
      ? categoryRows.map((r, i) => {
          const pct = (r.v / totalSpent) * 100;
          const len = Math.max(pct - 0.8, 0.2);
          const isSelected = pickedIndex === i;
          const strokeWidth = isSelected ? 7 : 6;
          const opacity = pickedIndex === null || isSelected ? 1 : 0.35;
          const currentOffset = offset;
          offset += pct;

          return (
            <circle
              key={r.id}
              className="seg"
              tabIndex={0}
              role="img"
              aria-label={`${r.name} ${Math.round(pct)}%`}
              r="15.9155"
              cx="21"
              cy="21"
              fill="none"
              stroke={r.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${100 - len}`}
              strokeDashoffset={-currentOffset}
              style={{ opacity, cursor: 'pointer', transition: 'opacity 0.2s, stroke-width 0.2s' }}
              onClick={() => handlePick(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePick(i);
              }}
            />
          );
        })
      : null;

    return (
      <>
        <div className="donut">
          <svg viewBox="0 0 42 42" style={{ display: 'block', width: '100%' }}>
            <circle r="15.9155" cx="21" cy="21" fill="none" stroke="var(--line)" strokeWidth="6" />
            <g transform="rotate(-90 21 21)">{segments}</g>
          </svg>
          <div
            className="ctr"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <span className="mut" style={{ fontSize: '0.85em' }}>
              {activeRow ? activeRow.name : totalSpent ? 'Total spent' : 'No spending yet'}
            </span>
            <b style={{ fontSize: '1.5em', letterSpacing: '-0.03em' }}>
              {fmt(activeRow ? activeRow.v : totalSpent, state.hide)}
            </b>
            {activeRow && (
              <span className="mut" style={{ fontSize: '0.78rem' }}>
                {Math.round((activeRow.v / totalSpent) * 100)}% of spending
              </span>
            )}
          </div>
        </div>

        <div className="legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: '14px' }}>
          {categoryRows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePick(i)}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--ink)',
                font: 'inherit',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px',
                opacity: pickedIndex === null || pickedIndex === i ? 1 : 0.5,
              }}
            >
              <span className="dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>
      </>
    );
  };

  // Pie render
  const renderPie = () => {
    let offset = 0;
    const slices = totalSpent
      ? categoryRows.map((r, i) => {
          const pct = (r.v / totalSpent) * 100;
          const len = Math.max(pct - 0.6, 0.2);
          const isSelected = pickedIndex === i;
          const opacity = pickedIndex === null || isSelected ? 1 : 0.35;
          const currentOffset = offset;
          offset += pct;

          return (
            <circle
              key={r.id}
              className="seg"
              tabIndex={0}
              role="img"
              aria-label={`${r.name} ${Math.round(pct)}%`}
              r="10.5"
              cx="21"
              cy="21"
              pathLength="100"
              fill="none"
              stroke={r.color}
              strokeWidth="21"
              strokeDasharray={`${len} ${100 - len}`}
              strokeDashoffset={-currentOffset}
              style={{ opacity, cursor: 'pointer', transition: 'opacity 0.2s' }}
              onClick={() => handlePick(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePick(i);
              }}
            />
          );
        })
      : null;

    return (
      <>
        <div className="donut">
          <svg viewBox="0 0 42 42" style={{ display: 'block', width: '100%' }}>
            <circle r="10.5" cx="21" cy="21" fill="none" stroke="var(--line)" strokeWidth="21" />
            <g transform="rotate(-90 21 21)">{slices}</g>
          </svg>
        </div>

        <div className="pinfo" style={{ textAlign: 'center', marginTop: '12px' }}>
          <b style={{ fontSize: '1.4rem', letterSpacing: '-0.03em' }}>
            {fmt(activeRow ? activeRow.v : totalSpent, state.hide)}
          </b>{' '}
          <span>{activeRow ? activeRow.name : totalSpent ? 'Total spent' : 'No spending yet'}</span>{' '}
          {activeRow && (
            <span className="mut" style={{ fontSize: '0.85em' }}>
              {Math.round((activeRow.v / totalSpent) * 100)}% of spending
            </span>
          )}
        </div>

        <div className="legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: '14px' }}>
          {categoryRows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handlePick(i)}
              style={{
                background: 'none',
                border: 0,
                color: 'var(--ink)',
                font: 'inherit',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px',
                opacity: pickedIndex === null || pickedIndex === i ? 1 : 0.5,
              }}
            >
              <span className="dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: r.color }} />
              {r.name}
            </button>
          ))}
        </div>
      </>
    );
  };

  // Horizontal Bars render
  const renderBars = () => {
    if (!totalSpent) {
      return <div className="empty">No spending yet</div>;
    }

    const sorted = [...categoryRows].sort((a, b) => b.v - a.v);
    const maxVal = sorted[0]?.v || 1;

    return (
      <div style={{ marginTop: '10px' }}>
        {sorted.map((r) => (
          <div key={r.id} className="hb">
            <span>{r.name}</span>
            <div className="bar">
              <i style={{ width: `${(r.v / maxVal) * 100}%`, background: r.color }} />
            </div>
            <b>{fmt(r.v, state.hide)}</b>
          </div>
        ))}
      </div>
    );
  };

  // Daily Histogram render
  const renderDaily = () => {
    const y = parseInt(selectedMonth.slice(0, 4), 10);
    const mo = parseInt(selectedMonth.slice(5), 10);
    const dim = new Date(y, mo, 0).getDate();
    const daysData = Array(dim).fill(0);

    state.exps.forEach((e) => {
      if (mk(e.date) === selectedMonth) {
        const dayNum = parseInt(e.date.slice(8), 10);
        if (dayNum >= 1 && dayNum <= dim) {
          daysData[dayNum - 1] += e.amt;
        }
      }
    });

    const monthTotal = daysData.reduce((a, v) => a + v, 0);
    if (!monthTotal) {
      return <div className="empty">No spending in this month yet</div>;
    }

    const todayStr = NOW();
    const isCurMonth = selectedMonth === mk(todayStr);
    const lastActiveDay = isCurMonth ? parseInt(todayStr.slice(8), 10) : dim;
    const maxVal = Math.max(...daysData);
    const niceM = niceMax(maxVal);

    const W = 320;
    const H = 200;
    const L = 40;
    const R = 8;
    const TP = 14;
    const B = 28;
    const cw = (W - L - R) / dim;
    const bw = Math.max(cw * 0.68, 3);
    const py = (v: number) => TP + (H - TP - B) * (1 - v / niceM);
    const avg = monthTotal / lastActiveDay;
    const selectedDayNum = selectedDay && mk(selectedDay) === selectedMonth ? parseInt(selectedDay.slice(8), 10) : 0;
    const monthShort = formatMonthLabel(selectedMonth).split(' ')[0].slice(0, 3);

    // Grid lines
    const gridLines = [0, 0.5, 1].map((f) => {
      const v = niceM * f;
      const yy = py(v);
      return (
        <React.Fragment key={f}>
          <line
            x1={L}
            x2={W - R}
            y1={yy}
            y2={yy}
            stroke="var(--line)"
            strokeDasharray={f ? '3 3' : '0'}
          />
          <text x={L - 6} y={yy + 3} textAnchor="end" style={{ fontSize: '9.5px', fill: 'var(--mut)' }}>
            {formatCompact(v, !!state.hide)}
          </text>
        </React.Fragment>
      );
    });

    // Bars
    const bars = daysData.map((v, i) => {
      const d = i + 1;
      const x = L + i * cw + (cw - bw) / 2;
      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const h = Math.max(H - B - py(v), v ? 2 : 1.5);

      if (isCurMonth && d > lastActiveDay) {
        return (
          <rect
            key={d}
            x={x}
            y={H - B - 1.5}
            width={bw}
            height={1.5}
            rx={0.75}
            fill="var(--line)"
          />
        );
      }

      const isSelected = d === selectedDayNum;
      const isToday = isCurMonth && d === lastActiveDay;
      const fillColor = isSelected
        ? 'var(--acc)'
        : isToday
        ? '#27c08a'
        : v
        ? 'color-mix(in srgb, var(--acc) 40%, transparent)'
        : 'var(--line)';

      return (
        <rect
          key={d}
          className="db"
          role="button"
          tabIndex={0}
          aria-label={`${d} ${monthShort}: ${state.hide ? 'amount hidden' : fmt(v)}`}
          x={x}
          y={H - B - h}
          width={bw}
          height={h}
          rx={2}
          fill={fillColor}
          onClick={() => onToggleDay(dateStr)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onToggleDay(dateStr);
          }}
          style={{ cursor: 'pointer' }}
        >
          <title>{`${d} ${monthShort}: ${fmt(v, state.hide)}`}</title>
        </rect>
      );
    });

    // X Axis Day labels
    const axisDays = [1, 5, 10, 15, 20, 25, dim].filter((d, i, arr) => d <= dim && arr.indexOf(d) === i);
    const xLabels = axisDays.map((d) => (
      <text
        key={d}
        x={L + (d - 1) * cw + cw / 2}
        y={H - 10}
        textAnchor="middle"
        style={{ fontSize: '9.5px', fill: 'var(--mut)' }}
      >
        {d}
      </text>
    ));

    const highestDayNum = daysData.indexOf(maxVal) + 1;
    const noSpendDays = daysData.slice(0, lastActiveDay).filter((v) => !v).length;
    const avgY = py(avg);

    return (
      <>
        <svg
          className="dch"
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', display: 'block' }}
          role="group"
          aria-label={`Daily spending for ${formatMonthLabel(selectedMonth)}`}
        >
          {gridLines}
          {bars}
          <line
            x1={L}
            x2={W - R}
            y1={avgY}
            y2={avgY}
            stroke="var(--warn)"
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />
          <text
            x={W - R}
            y={avgY - 4}
            textAnchor="end"
            style={{ fontSize: '9.5px', fill: 'var(--warn)' }}
          >
            avg {formatCompact(avg, !!state.hide)}
          </text>
          {xLabels}
        </svg>

        <div className="dstat">
          <div>
            <b>{fmt(maxVal, state.hide)}</b>
            <span>Highest day ({highestDayNum} {monthShort})</span>
          </div>
          <div>
            <b>{fmt(Math.round(avg), state.hide)}</b>
            <span>Daily average</span>
          </div>
          <div>
            <b>{noSpendDays}</b>
            <span>No-spend days</span>
          </div>
        </div>

        <div className="hint">
          Tap a bar to see that day. Tap it again to go back to the full month.
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="seg3">
        {CHART_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={currentChartType === tab.id ? 'on' : ''}
            onClick={() => setChartType(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!totalSpent && (currentChartType !== 'line' || !state.exps.some(expense => mk(expense.date) === selectedMonth && expense.amt > 0)) ? (
        <div className="overview-chart-empty">
          <span className="chart-empty-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><rect x="8" y="22" width="5" height="12" rx="2.5" fill="currentColor" /><rect x="18" y="8" width="5" height="26" rx="2.5" fill="currentColor" /><rect x="28" y="15" width="5" height="19" rx="2.5" fill="currentColor" /></svg></span>
          <strong>No spending data yet</strong>
          <p>Your spending will appear here once you add transactions.</p>
        </div>
      ) : (
        <div className="cw">
          {currentChartType === 'donut' && renderDonut()}
          {currentChartType === 'pie' && renderPie()}
          {currentChartType === 'bar' && renderBars()}
          {currentChartType === 'line' && renderDaily()}
        </div>
      )}
    </div>
  );
}
