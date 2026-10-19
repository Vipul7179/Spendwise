'use client';

import { useEffect, useState } from 'react';

const SVG_ICONS = {
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  ),
  alert: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  goal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </svg>
  ),
};

export default function InteractivePreview() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = 12480;
    const duration = 1200;
    const start = performance.now();

    let frameId: number;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const bars = [
    { label: 'Food', pct: '62%', val: 62, color: 'var(--ok)' },
    { label: 'Bills', pct: '85%', val: 85, color: 'var(--warn)' },
    { label: 'Shopping', pct: '100%', val: 100, color: 'var(--bad)' },
  ];

  return (
    <div className="mkw">
      <div className="mkf">
        <div className="mkbar">
          <i />
          <i />
          <i />
          <span>Sample preview</span>
        </div>
        <div className="mkb2">
          <div>
            <div className="mkg">
              <span className="mut" style={{ color: 'var(--mut)', display: 'block', fontSize: '0.9rem' }}>Good afternoon,</span>
              <b>Vipul &#128075;</b>
            </div>
            <div className="mkh">
              <div className="mhi">Spent this month</div>
              <div className="mbig">₹{count.toLocaleString('en-IN')}</div>
              <div className="mhd">↓ 13% vs last month</div>
              <div className="mkt">
                <div>
                  <span>Today</span>
                  <b>₹350</b>
                </div>
                <div>
                  <span>This week</span>
                  <b>₹2,140</b>
                </div>
                <div>
                  <span>Remaining budget</span>
                  <b>₹13,520</b>
                </div>
                <div>
                  <span>Monthly budget</span>
                  <b>₹26,000</b>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mkc">
              <h4>Spending overview</h4>
              <div className="mkd">
                <div className="mdn" />
                <ul>
                  <li><i style={{ background: '#0f7a58' }} />Food 38%</li>
                  <li><i style={{ background: '#27c08a' }} />Bills 25%</li>
                  <li><i style={{ background: '#22d3ee' }} />Travel 20%</li>
                  <li><i style={{ background: '#f5b301' }} />Other 17%</li>
                </ul>
              </div>
            </div>

            <div className="mkc" style={{ marginTop: '12px' }}>
              <h4>Budget progress</h4>
              {bars.map((b) => (
                <div key={b.label} className="mbr">
                  <div className="row2">
                    <span>{b.label}</span>
                    <span>{b.pct}</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${b.val}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating interactive status pills */}
      <div className="fcl a">
        <span className="ic2" style={{ background: 'color-mix(in srgb, var(--ok) 16%, transparent)', color: 'var(--ok)' }}>
          {SVG_ICONS.user}
        </span>
        <div>
          <b>Aman owes you ₹33.33</b>
          <span className="mut">Dinner order &middot; Mark received</span>
        </div>
      </div>

      <div className="fcl b">
        <span className="ic2" style={{ background: 'color-mix(in srgb, var(--warn) 18%, transparent)', color: 'var(--warn)' }}>
          {SVG_ICONS.alert}
        </span>
        <div>
          <b>Bills budget alert</b>
          <span className="mut">80% of your Bills budget used</span>
        </div>
      </div>

      <div className="fcl c">
        <span className="ic2" style={{ background: 'color-mix(in srgb, var(--acc) 16%, transparent)', color: 'var(--acc)' }}>
          {SVG_ICONS.goal}
        </span>
        <div>
          <b>New phone</b>
          <span className="mut">62% saved &middot; keep going</span>
        </div>
      </div>
    </div>
  );
}

