'use client';

import React, { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';
import Image from '@/components/common/SkeletonImage';

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerSnapshot() {
  return false;
}

export default function HeroDeviceMockup() {
  const [spentCount, setSpentCount] = useState(16735);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot
  );

  const phoneRef = useRef<HTMLDivElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    if (touchTimer.current !== null) clearTimeout(touchTimer.current);
  }, []);

  // Spent count counter animation
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = 16735;
    const duration = 1200;
    const start = performance.now();

    let frameId: number;
    const step = (now: number) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setSpentCount(target);
        return;
      }
      const progress = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setSpentCount(Math.round(target * ease));
      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, []);

  // Desktop subtle pointer-based 3D tilt
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotion || !phoneRef.current) return;
      const rect = phoneRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      // Range -0.5 to 0.5
      const pctX = clientX / rect.width - 0.5;
      const pctY = clientY / rect.height - 0.5;

      // Subtle tilt: max 8 degrees
      const tiltX = -pctY * 12;
      const tiltY = pctX * 14;

      setTilt({ x: tiltX, y: tiltY });
      setIsHovered(true);
    },
    [reducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const handleClick = useCallback(() => {
    if (reducedMotion) return;
    setIsClicked(true);
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setIsClicked(false), 600);
  }, [reducedMotion]);

  const handleTouchStart = useCallback(() => {
    if (reducedMotion) return;
    if (touchTimer.current !== null) clearTimeout(touchTimer.current);
    setIsTapped(true);
  }, [reducedMotion]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimer.current !== null) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setIsTapped(false), 250);
  }, []);

  // Compute inline transform style
  const phoneTransformStyle: React.CSSProperties = reducedMotion
    ? {}
    : {
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
          : undefined,
        transition: isHovered
          ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
          : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease',
      };

  return (
    <div className="hero-mockup-container" aria-label="Hisbo platform product preview">
      {/* Botanical ambient background accents */}
      <div className="botanical-accent botanical-left" aria-hidden="true">
        <svg viewBox="0 0 160 160" fill="none">
          <path
            d="M20 140 C20 80, 80 20, 140 20 C140 80, 80 140, 20 140 Z"
            fill="url(#botanicalGrad1)"
            opacity="0.6"
          />
          <path
            d="M30 150 C40 90, 100 40, 150 40 C130 100, 80 150, 30 150 Z"
            fill="url(#botanicalGrad2)"
            opacity="0.4"
          />
          <defs>
            <linearGradient id="botanicalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14a37f" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f7a58" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="botanicalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3fd9a0" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06382a" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="botanical-accent botanical-right" aria-hidden="true">
        <svg viewBox="0 0 160 160" fill="none">
          <path
            d="M140 140 C140 80, 80 20, 20 20 C20 80, 80 140, 140 140 Z"
            fill="url(#botanicalGrad3)"
            opacity="0.5"
          />
          <defs>
            <linearGradient id="botanicalGrad3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#27c08a" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0f7a58" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Desktop Laptop Device (Visible on Desktop / Large Tablet) */}
      <div className="laptop-wrapper">
        <div className="laptop-screen-frame">
          <div className="laptop-camera-notch" aria-hidden="true">
            <span className="camera-lens" />
          </div>

          <div className="laptop-screen-inner">
            {/* Topbar matching real Hisbo TopBar */}
            <div className="laptop-app-header">
              <div className="laptop-app-brand">
                <span className="laptop-logo-badge">
                  <Image
                    src="/logo-mark.webp"
                    alt="Hisbo"
                    width={22}
                    height={22}
                    className="lgi"
                  />
                </span>
                <span className="laptop-brand-name">Hisbo</span>
              </div>

              {/* Month selector & quick tool icons matching actual platform */}
              <div className="laptop-app-user-slot">
                <span className="laptop-date-badge">October 2026 ▾</span>
                <span className="laptop-icon-tool" title="Privacy mode">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                <span className="laptop-icon-tool" title="Alerts">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                  </svg>
                </span>
                <span className="laptop-avatar-badge">V</span>
              </div>
            </div>

            {/* Dashboard Content with Sidebar and Main Overview */}
            <div className="laptop-app-content-row">
              {/* Mini Sidebar matching real DesktopSidebar nav items */}
              <div className="laptop-mini-sidebar" aria-hidden="true">
                <div className="sidebar-item active">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                  <span>Overview</span>
                </div>
                <div className="sidebar-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  <span>Budgets</span>
                </div>
                <div className="sidebar-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Automate</span>
                </div>
                <div className="sidebar-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m22 7-8.5 8.5-5-5L2 17" />
                    <path d="M16 7h6v6" />
                  </svg>
                  <span>Savings</span>
                </div>
                <div className="sidebar-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>Groups</span>
                </div>
                <div className="sidebar-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  <span>Blog</span>
                </div>
              </div>

              {/* Main Overview Canvas mirroring actual Hisbo Overview */}
              <div className="laptop-main-canvas">
                {/* Greeting banner matching actual app */}
                <div className="laptop-canvas-greeting">
                  <div>
                    <span className="laptop-greeting-sub">Good afternoon,</span>
                    <h3 className="laptop-greeting-name">Vipul 👋</h3>
                  </div>
                </div>

                {/* Real Spending Card & Donut Chart Row */}
                <div className="laptop-cards-grid">
                  {/* Left: Spent this month card matching SpendOverviewCard.tsx */}
                  <div className="laptop-spend-card">
                    <div className="spend-card-header">
                      <span className="spend-card-badge">Spent this month</span>
                      <span className="spend-card-icon" title="Privacy mode active">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </span>
                    </div>

                    <div className="spend-card-amount">
                      ₹{spentCount.toLocaleString('en-IN')}
                    </div>
                    <div className="spend-card-sub">
                      of ₹34,800 budget
                    </div>

                    {/* Progress Bar matching real app */}
                    <div className="spend-progress-bar">
                      <div className="spend-progress-fill" style={{ width: '48%' }} />
                    </div>

                    <div className="spend-meta-row">
                      <span className="meta-left">48% used</span>
                      <span className="meta-right">₹18,065 left</span>
                    </div>
                  </div>

                  {/* Right: Chart Card with Real Donut & Tabs */}
                  <div className="laptop-chart-card">
                    <div className="chart-card-header">
                      <span className="chart-title">Spending overview</span>
                      <div className="chart-type-tabs">
                        <span className="chart-tab active">Donut</span>
                        <span className="chart-tab">Pie</span>
                        <span className="chart-tab">Bars</span>
                        <span className="chart-tab">Daily</span>
                      </div>
                    </div>

                    <div className="chart-content-row">
                      {/* Donut SVG with real colors */}
                      <div className="donut-wrap">
                        <svg width="78" height="78" viewBox="0 0 100 100">
                          {/* Food (35%) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#0f7a58"
                            strokeWidth="15"
                            strokeDasharray="83.5 155.5"
                          />
                          {/* Bills (28%) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#e29a00"
                            strokeWidth="15"
                            strokeDasharray="66.8 172.2"
                            strokeDashoffset="-83.5"
                          />
                          {/* Travel (20%) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#22d3ee"
                            strokeWidth="15"
                            strokeDasharray="47.7 191.3"
                            strokeDashoffset="-150.3"
                          />
                          {/* Shopping (10%) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#e0529c"
                            strokeWidth="15"
                            strokeDasharray="23.8 215.2"
                            strokeDashoffset="-198.0"
                          />
                          {/* Other (7%) */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            fill="transparent"
                            stroke="#8a5cf6"
                            strokeWidth="15"
                            strokeDasharray="16.7 222.3"
                            strokeDashoffset="-221.8"
                          />
                        </svg>
                      </div>

                      {/* Legend matching actual platform categories */}
                      <div className="chart-legend-grid">
                        <div className="legend-item">
                          <span className="dot" style={{ background: '#0f7a58' }} />
                          <span className="label">Food</span>
                          <b className="val">35%</b>
                        </div>
                        <div className="legend-item">
                          <span className="dot" style={{ background: '#e29a00' }} />
                          <span className="label">Bills</span>
                          <b className="val">28%</b>
                        </div>
                        <div className="legend-item">
                          <span className="dot" style={{ background: '#22d3ee' }} />
                          <span className="label">Travel</span>
                          <b className="val">20%</b>
                        </div>
                        <div className="legend-item">
                          <span className="dot" style={{ background: '#e0529c' }} />
                          <span className="label">Shopping</span>
                          <b className="val">10%</b>
                        </div>
                        <div className="legend-item">
                          <span className="dot" style={{ background: '#8a5cf6' }} />
                          <span className="label">Other</span>
                          <b className="val">7%</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom 4 Real Overview Stat Tiles */}
                <div className="laptop-stats-row">
                  <div className="stat-pill-card">
                    <span className="stat-pill-label">Today</span>
                    <b className="stat-pill-val">₹1,200</b>
                    <span className="stat-pill-sub">23 Oct</span>
                  </div>
                  <div className="stat-pill-card">
                    <span className="stat-pill-label">This week</span>
                    <b className="stat-pill-val">₹7,372</b>
                    <span className="stat-pill-sub">19 Oct – 25 Oct</span>
                  </div>
                  <div className="stat-pill-card">
                    <span className="stat-pill-label">Remaining</span>
                    <b className="stat-pill-val">₹18,065</b>
                    <span className="stat-pill-sub">Oct 2026</span>
                  </div>
                  <div className="stat-pill-card">
                    <span className="stat-pill-label">Monthly budget</span>
                    <b className="stat-pill-val">₹34,800</b>
                    <span className="stat-pill-sub">Oct 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Laptop Base Stand / Hinge */}
        <div className="laptop-base-stand">
          <div className="laptop-base-notch" />
        </div>
      </div>

      {/* Realistic iPhone-Style Smartphone Device (Fixed Aspect Ratio with 3D Tilt) */}
      <div
        className={`phone-wrapper ${isClicked ? 'phone-clicked' : ''} ${
          isTapped ? 'phone-tapped' : ''
        }`}
        ref={phoneRef}
        style={phoneTransformStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        title="Interactive Hisbo Mobile Preview"
      >
        <div className="iphone-chassis">
          {/* Side Hardware Buttons */}
          <div className="iphone-btn-volume-up" aria-hidden="true" />
          <div className="iphone-btn-volume-down" aria-hidden="true" />
          <div className="iphone-btn-power" aria-hidden="true" />

          <div className="phone-frame">
            {/* Dynamic Island Capsule */}
            <div className="phone-island" aria-hidden="true">
              <span className="phone-lens" />
              <span className="phone-sensor" />
            </div>

            <div className="phone-screen-inner">
              {/* Phone Status Bar */}
              <div className="phone-status-bar">
                <span className="phone-time">9:41</span>
                <div className="phone-status-icons">
                  <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
                    <path d="M1 9h2v3H1zm4-3h2v6H5zm4-3h2v9H9zm4-3h2v12h-2z" />
                  </svg>
                  <svg width="12" height="10" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
                    <path d="M8 2.5a8.5 8.5 0 0 1 6.5 3l-1.5 1.5A6.5 6.5 0 0 0 8 4.5 6.5 6.5 0 0 0 3 7L1.5 5.5A8.5 8.5 0 0 1 8 2.5zM8 6a5 5 0 0 1 3.5 1.5L8 11 4.5 7.5A5 5 0 0 1 8 6z" />
                  </svg>
                  <span className="phone-battery-pill" />
                </div>
              </div>

              {/* Mobile App Header with Official Logo */}
              <div className="phone-app-header">
                <div className="phone-brand-title">
                  <span className="phone-logo-badge">
                    <Image
                      src="/logo-mark.webp"
                      alt="Hisbo logo"
                      width={20}
                      height={20}
                      className="lgi"
                    />
                  </span>
                  <span className="phone-brand-name">Hisbo</span>
                </div>
                <div className="phone-header-tools">
                  <span className="phone-tool-btn" title="Alerts">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                    </svg>
                  </span>
                  <div className="phone-user-icon">V</div>
                </div>
              </div>

              {/* Mobile Greeting */}
              <div className="phone-greeting">
                <span className="phone-greeting-sub">Good afternoon,</span>
                <b className="phone-greeting-title">Vipul 👋</b>
              </div>

              {/* Mobile Spend Card matching actual Hisbo overview spending card */}
              <div className="phone-spend-card">
                <div className="phone-spend-header">
                  <span className="phone-spend-label">Spent this month</span>
                  <span className="phone-eye-icon" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                </div>
                <div className="phone-spend-amount">
                  ₹{spentCount.toLocaleString('en-IN')}
                </div>
                <div className="phone-spend-sub">of ₹34,800 budget</div>
                <div className="phone-progress-bar">
                  <div className="phone-progress-fill" style={{ width: '48%' }} />
                </div>
                <div className="phone-spend-meta">
                  <span>48% used</span>
                  <span>₹18,065 left</span>
                </div>
              </div>

              {/* Mobile Donut Card */}
              <div className="phone-donut-card">
                <div className="phone-donut-title">Spending overview</div>
                <div className="phone-donut-row">
                  <div className="phone-donut-graphic">
                    <svg width="68" height="68" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#0f7a58"
                        strokeWidth="16"
                        strokeDasharray="83.5 155.5"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#e29a00"
                        strokeWidth="16"
                        strokeDasharray="66.8 172.2"
                        strokeDashoffset="-83.5"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#22d3ee"
                        strokeWidth="16"
                        strokeDasharray="47.7 191.3"
                        strokeDashoffset="-150.3"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#e0529c"
                        strokeWidth="16"
                        strokeDasharray="23.8 215.2"
                        strokeDashoffset="-198.0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        fill="transparent"
                        stroke="#8a5cf6"
                        strokeWidth="16"
                        strokeDasharray="16.7 222.3"
                        strokeDashoffset="-221.8"
                      />
                    </svg>
                  </div>
                  <div className="phone-legend-list">
                    <div className="phone-legend-row">
                      <span className="phone-cat-dot" style={{ background: '#0f7a58' }} aria-hidden="true" />
                      <span className="phone-cat-name">Food</span>
                      <b className="phone-cat-pct">35%</b>
                    </div>
                    <div className="phone-legend-row">
                      <span className="phone-cat-dot" style={{ background: '#e29a00' }} aria-hidden="true" />
                      <span className="phone-cat-name">Bills</span>
                      <b className="phone-cat-pct">28%</b>
                    </div>
                    <div className="phone-legend-row">
                      <span className="phone-cat-dot" style={{ background: '#22d3ee' }} aria-hidden="true" />
                      <span className="phone-cat-name">Travel</span>
                      <b className="phone-cat-pct">20%</b>
                    </div>
                    <div className="phone-legend-row">
                      <span className="phone-cat-dot" style={{ background: '#e0529c' }} aria-hidden="true" />
                      <span className="phone-cat-name">Shopping</span>
                      <b className="phone-cat-pct">10%</b>
                    </div>
                    <div className="phone-legend-row">
                      <span className="phone-cat-dot" style={{ background: '#8a5cf6' }} aria-hidden="true" />
                      <span className="phone-cat-name">Other</span>
                      <b className="phone-cat-pct">7%</b>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Bottom Tab Bar matching actual MobileNav.tsx */}
              <div className="phone-bottom-nav">
                <span className="phone-nav-btn active" title="Overview">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21.2 15.9A10 10 0 1 1 8 2.8" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                </span>
                <span className="phone-nav-btn" title="Budgets">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </span>
                <span className="phone-nav-btn phone-add-btn" title="Add expense">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </span>
                <span className="phone-nav-btn" title="Savings">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="m22 7-8.5 8.5-5-5L2 17" />
                    <path d="M16 7h6v6" />
                  </svg>
                </span>
                <span className="phone-nav-btn" title="Groups">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Shiny Gold Rupee Coin Accessory */}
        <div className="gold-coin-accessory" aria-hidden="true">
          <div className="gold-coin-outer">
            <div className="gold-coin-inner">
              <span className="gold-coin-symbol">₹</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
