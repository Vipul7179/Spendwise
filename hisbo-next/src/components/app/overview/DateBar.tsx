'use client';

import React from 'react';
import { NOW, mk } from '@/lib/state/calculations';

interface DateBarProps {
  selectedMonth: string; // YYYY-MM
  selectedDay: string; // YYYY-MM-DD or ''
  onMonthChange: (month: string) => void;
  onDayChange: (day: string) => void;
  onResetToday: () => void;
}

export function formatMonthLabel(m: string): string {
  try {
    return new Date(m + '-01T00:00').toLocaleString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return m;
  }
}

export default function DateBar({
  selectedMonth,
  selectedDay,
  onMonthChange,
  onDayChange,
  onResetToday,
}: DateBarProps) {
  const currentMonth = mk(NOW());
  const isCurrentToday = selectedMonth >= currentMonth && !selectedDay;

  const handleShiftMonth = (delta: number) => {
    try {
      const d = new Date(selectedMonth + '-01T00:00');
      d.setMonth(d.getMonth() + delta);
      const nextMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (nextMonth > currentMonth) {
        onMonthChange(currentMonth);
      } else {
        onMonthChange(nextMonth);
      }
    } catch {
      onMonthChange(currentMonth);
    }
  };

  return (
    <div className="dbar">
      <div className="mnav">
        <button
          type="button"
          className="nb"
          onClick={() => handleShiftMonth(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="mt">
          <b>{selectedDay || formatMonthLabel(selectedMonth)}</b>
          <span className="mut">
            {selectedDay ? 'Showing a single day' : 'Showing the full month'}
          </span>
        </div>
        <button
          type="button"
          className="nb"
          onClick={() => handleShiftMonth(1)}
          aria-label="Next month"
          disabled={selectedMonth >= currentMonth}
        >
          ›
        </button>
      </div>

      <div className="dpk">
        <label>
          Month
          <input
            type="month"
            value={selectedMonth}
            max={currentMonth}
            min="2000-01"
            onChange={(e) => {
              if (e.target.value) onMonthChange(e.target.value);
            }}
          />
        </label>
        <label>
          Day
          <input
            type="date"
            value={selectedDay || (selectedMonth === currentMonth ? NOW() : '')}
            max={NOW()}
            min="2000-01-01"
            onChange={(e) => onDayChange(e.target.value)}
          />
        </label>
        {!isCurrentToday && (
          <button type="button" className="chip" onClick={onResetToday}>
            Back to today
          </button>
        )}
      </div>
    </div>
  );
}
