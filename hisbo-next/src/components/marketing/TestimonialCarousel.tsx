'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';

// Product examples, not endorsements. No approved customer reviews are stored here.
const TESTIMONIALS = [
  { name: 'Track daily spending', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #0f7a58, #27c08a)', avatarInitials: '01', quote: 'Log an expense, choose its category and see how it contributes to your monthly spending.' },
  { name: 'Plan category budgets', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #14a37f, #22d3ee)', avatarInitials: '02', quote: 'Set category limits and use budget alerts to keep an eye on spending as the month progresses.' },
  { name: 'Follow savings goals', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #8a5cf6, #e0529c)', avatarInitials: '03', quote: 'Create a savings target, record contributions and follow your progress towards it.' },
  { name: 'Organize shared bills', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #e29a00, #f59e0b)', avatarInitials: '04', quote: 'Record shared expenses and review who owes whom before sending a payment reminder.' },
  { name: 'Remember recurring costs', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #059669, #34d399)', avatarInitials: '05', quote: 'Add recurring expenses such as rent and subscriptions to keep regular costs organized.' },
  { name: 'Try guest mode', role: 'Feature example', avatarBg: 'linear-gradient(135deg, #0284c7, #38bdf8)', avatarInitials: '06', quote: 'Explore Hisbo without an account. Guest data stays in this browser on this device.' },
];

const PRE_BUFFER = 3;
const POST_BUFFER = 3;
const EXTENDED_ITEMS = [
  ...TESTIMONIALS.slice(-PRE_BUFFER),
  ...TESTIMONIALS,
  ...TESTIMONIALS.slice(0, POST_BUFFER),
];

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

export default function TestimonialCarousel() {
  // extended index: starts at PRE_BUFFER (which corresponds to TESTIMONIALS[0])
  const [currentIndex, setCurrentIndex] = useState(PRE_BUFFER);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [interactionPause, setInteractionPause] = useState(false);
  const indexRef = useRef(PRE_BUFFER);
  const busyRef = useRef(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const touchStartX = useRef<number | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot
  );

  // Both transitionend and this timer settle a move. Never depend on CSS events
  // (reduced motion, interrupted transitions and background tabs may omit them).
  const finishSlide = useCallback(() => {
    if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
    transitionTimer.current = null;
    const normalized = PRE_BUFFER + ((indexRef.current - PRE_BUFFER) % TESTIMONIALS.length + TESTIMONIALS.length) % TESTIMONIALS.length;
    if (normalized !== indexRef.current) {
      indexRef.current = normalized;
      setIsTransitioning(false);
      setCurrentIndex(normalized);
    }
    busyRef.current = false;
  }, []);

  const moveTo = useCallback((index: number) => {
    if (busyRef.current) return;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    indexRef.current = instant
      ? PRE_BUFFER + ((index - PRE_BUFFER) % TESTIMONIALS.length + TESTIMONIALS.length) % TESTIMONIALS.length
      : index;
    setIsTransitioning(!instant);
    setCurrentIndex(indexRef.current);
    if (!instant) {
      busyRef.current = true;
      transitionTimer.current = setTimeout(finishSlide, 600);
    }
  }, [finishSlide]);
  const slideNext = useCallback(() => moveTo(indexRef.current + 1), [moveTo]);
  const slidePrev = useCallback(() => moveTo(indexRef.current - 1), [moveTo]);
  const pauseAfterInteraction = () => {
    setInteractionPause(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setInteractionPause(false), 4000);
  };

  const isPaused = isHovered || hasFocus || isTouching || manualPause || interactionPause;

  // Autoplay advancing carousel every 5s (pauses on hover, focus, touch, or reduced motion)
  useEffect(() => {
    if (isPaused || reducedMotion) return;

    const timer = setInterval(() => {
      slideNext();
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused, reducedMotion, slideNext]);

  // Cleanup resume timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (transitionTimer.current !== null) clearTimeout(transitionTimer.current);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault(); pauseAfterInteraction();
      slidePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); pauseAfterInteraction();
      slideNext();
    }
  };

  // Mobile Touch Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsTouching(true);
    pauseAfterInteraction();
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsTouching(false);
    pauseAfterInteraction();
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 45) {
      slideNext();
    } else if (diff < -45) {
      slidePrev();
    }
    touchStartX.current = null;

  };

  // Original example index for pagination indicators.
  const normalizedIndex =
    ((currentIndex - PRE_BUFFER) % TESTIMONIALS.length + TESTIMONIALS.length) %
    TESTIMONIALS.length;

  const goToReview = (reviewIdx: number) => {
    pauseAfterInteraction();
    moveTo(PRE_BUFFER + reviewIdx);
  };

  // CSS owns card count and translation at every breakpoint, including SSR.
  const transformStyle: React.CSSProperties = {
    transform: `translateX(calc(-${currentIndex} * ((100% + 20px) / var(--testimonials-visible))))`,
    transition:
      reducedMotion || !isTransitioning
        ? 'none'
        : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <section
      className="lsec testimonials-section"
      id="testimonials"
      aria-labelledby="testimonials-heading"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocus(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false); }}
    >
      <div className="testimonials-header">
        <h2 id="testimonials-heading">Explore better money habits.</h2>
        <p>Feature examples to help you explore Hisbo. These are not customer reviews.</p>
      </div>

      <div className="testimonials-wrapper">
        {/* Navigation Arrow Previous */}
        <button
          type="button"
          className="t-nav-btn t-prev-btn"
          onClick={() => {
            pauseAfterInteraction();
            slidePrev();
          }}
          aria-label="Previous feature examples"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Multi-Card Sliding Viewport */}
        <div
          className="testimonials-viewport"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => { touchStartX.current = null; setIsTouching(false); pauseAfterInteraction(); }}
          aria-live={isPaused || reducedMotion ? 'polite' : 'off'}
        >
          <div
            className="testimonials-track"
            style={transformStyle}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget && event.propertyName === 'transform') finishSlide();
            }}
          >
            {EXTENDED_ITEMS.map((t, idx) => {
              const cardKey = `${t.name}-${idx}`;
              return (
                <div key={cardKey} className="testimonial-slide"
                  aria-hidden={idx < PRE_BUFFER || idx >= PRE_BUFFER + TESTIMONIALS.length}>
                  <div className="testimonial-card">
                    <div className="t-user-header">
                      <div
                        className="t-avatar"
                        style={{ background: t.avatarBg }}
                        aria-hidden="true"
                      >
                        <span>{t.avatarInitials}</span>
                      </div>
                      <div className="t-user-info">
                        <h3 className="t-user-name">{t.name}</h3>
                        <span className="t-user-role">{t.role}</span>
                      </div>
                    </div>

                    <p className="t-quote">{t.quote}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Arrow Next */}
        <button
          type="button"
          className="t-nav-btn t-next-btn"
          onClick={() => {
            pauseAfterInteraction();
            slideNext();
          }}
          aria-label="Next feature examples"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="t-pagination-dots">
        <button type="button" className="calc-ghost-btn" aria-pressed={manualPause}
          onClick={() => setManualPause(!manualPause)}>
          {manualPause ? 'Resume automatic scrolling' : 'Pause automatic scrolling'}
        </button>
      </div>

      {/* Pagination Indicators (Clickable Dots) */}
      <div
        className="t-pagination-dots"
        role="group"
        aria-label="Feature example selection"
      >
        {TESTIMONIALS.map((t, idx) => {
          const isSelected = idx === normalizedIndex;
          return (
            <button
              key={t.name}
              type="button"
              className={`t-dot ${isSelected ? 'active' : ''}`}
              onClick={() => goToReview(idx)}
              aria-label={`Show ${t.name.toLowerCase()}`}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>
    </section>
  );
}
