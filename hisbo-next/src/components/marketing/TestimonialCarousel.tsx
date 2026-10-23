'use client';

import React, { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';

export interface Testimonial {
  name: string;
  role: string;
  avatarBg: string;
  avatarInitials: string;
  quote: string;
  rating: number;
  isDemo?: boolean;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Aditi Sharma',
    role: 'Working Professional',
    avatarBg: 'linear-gradient(135deg, #0f7a58, #27c08a)',
    avatarInitials: 'AS',
    quote: 'Hisbo made it so easy to track my daily expenses. I finally stay within my budget!',
    rating: 5,
  },
  {
    name: 'Rohan Mehta',
    role: 'College Student',
    avatarBg: 'linear-gradient(135deg, #14a37f, #22d3ee)',
    avatarInitials: 'RM',
    quote: 'The budget alerts are super helpful. Now I save more every month.',
    rating: 5,
  },
  {
    name: 'Neha Verma',
    role: 'Freelancer',
    avatarBg: 'linear-gradient(135deg, #8a5cf6, #e0529c)',
    avatarInitials: 'NV',
    quote: 'I love the clean design and simple charts. It just works!',
    rating: 5,
  },
  {
    name: 'Karan Singh',
    role: 'Small Business Owner',
    avatarBg: 'linear-gradient(135deg, #e29a00, #f59e0b)',
    avatarInitials: 'KS',
    quote: 'Perfect for managing personal and business expenses together.',
    rating: 5,
  },
  {
    name: 'Priya Patel',
    role: 'Product Designer',
    avatarBg: 'linear-gradient(135deg, #059669, #34d399)',
    avatarInitials: 'PP',
    quote: 'Splitting group dinner bills with roommates is completely painless now. Love the instant WhatsApp breakdown.',
    rating: 5,
    isDemo: true,
  },
  {
    name: 'Vikram Malhotra',
    role: 'Software Architect',
    avatarBg: 'linear-gradient(135deg, #0284c7, #38bdf8)',
    avatarInitials: 'VM',
    quote: 'Automated recurring expense reminders have saved me from missing subscription renewals multiple times.',
    rating: 5,
    isDemo: true,
  },
  {
    name: 'Ananya Iyer',
    role: 'Content Creator',
    avatarBg: 'linear-gradient(135deg, #c026d3, #f472b6)',
    avatarInitials: 'AI',
    quote: 'Visual category charts help me spot unnecessary lifestyle creep before it affects my quarterly savings target.',
    rating: 5,
    isDemo: true,
  },
  {
    name: 'Rajesh Kulkarni',
    role: 'Financial Consultant',
    avatarBg: 'linear-gradient(135deg, #d97706, #fbbf24)',
    avatarInitials: 'RK',
    quote: 'Guest mode gave me the confidence to test everything without giving away credentials. Transition to sync was seamless.',
    rating: 5,
    isDemo: true,
  },
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
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  const touchStartX = useRef<number | null>(null);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerSnapshot
  );

  // Responsive visible count tracking (3 on desktop, 2 on tablet, 1 on mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setVisibleCount(3);
      } else if (window.innerWidth >= 768) {
        setVisibleCount(2);
      } else {
        setVisibleCount(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const slideNext = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const slidePrev = useCallback(() => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  }, []);

  // Handle seamless infinite loop jump when transition completes
  const handleTransitionEnd = () => {
    if (currentIndex >= TESTIMONIALS.length + PRE_BUFFER) {
      // Reached post-buffer clone: snap back to original start
      setIsTransitioning(false);
      setCurrentIndex(PRE_BUFFER);
    } else if (currentIndex < PRE_BUFFER) {
      // Reached pre-buffer clone: snap to corresponding end
      setIsTransitioning(false);
      setCurrentIndex(TESTIMONIALS.length + currentIndex);
    }
  };

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
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      slidePrev();
    } else if (e.key === 'ArrowRight') {
      slideNext();
    }
  };

  // Mobile Touch Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 45) {
      slideNext();
    } else if (diff < -45) {
      slidePrev();
    }
    touchStartX.current = null;
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 2500);
  };

  // Real review index for pagination dots (0 to 7)
  const normalizedIndex =
    ((currentIndex - PRE_BUFFER) % TESTIMONIALS.length + TESTIMONIALS.length) %
    TESTIMONIALS.length;

  const goToReview = (reviewIdx: number) => {
    setIsPaused(true);
    setIsTransitioning(true);
    setCurrentIndex(PRE_BUFFER + reviewIdx);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 4000);
  };

  // Transform calculation based on visibleCount and 20px gap
  const transformStyle: React.CSSProperties = {
    transform: `translateX(calc(-${currentIndex} * ((100% + 20px) / ${visibleCount})))`,
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="testimonials-header">
        <h2 id="testimonials-heading">Real people. Better money habits.</h2>
        <p>Join thousands who are already taking control with Hisbo.</p>
      </div>

      <div className="testimonials-wrapper">
        {/* Navigation Arrow Previous */}
        <button
          type="button"
          className="t-nav-btn t-prev-btn"
          onClick={() => {
            setIsPaused(true);
            slidePrev();
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = setTimeout(() => setIsPaused(false), 4000);
          }}
          aria-label="Previous testimonials"
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
          aria-live="polite"
        >
          <div
            className="testimonials-track"
            style={transformStyle}
            onTransitionEnd={handleTransitionEnd}
          >
            {EXTENDED_ITEMS.map((t, idx) => {
              const cardKey = `${t.name}-${idx}`;
              return (
                <div key={cardKey} className="testimonial-slide">
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

                    <div
                      className="t-stars"
                      aria-label={`${t.rating} out of 5 stars`}
                    >
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <span key={i} className="t-star" aria-hidden="true">
                          ★
                        </span>
                      ))}
                    </div>

                    <p className="t-quote">&ldquo;{t.quote}&rdquo;</p>
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
            setIsPaused(true);
            slideNext();
            if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = setTimeout(() => setIsPaused(false), 4000);
          }}
          aria-label="Next testimonials"
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

      {/* Pagination Indicators (Clickable Dots) */}
      <div
        className="t-pagination-dots"
        role="tablist"
        aria-label="Testimonial selection"
      >
        {TESTIMONIALS.map((t, idx) => {
          const isSelected = idx === normalizedIndex;
          return (
            <button
              key={t.name}
              type="button"
              className={`t-dot ${isSelected ? 'active' : ''}`}
              onClick={() => goToReview(idx)}
              aria-label={`Go to review by ${t.name}`}
              aria-selected={isSelected}
              role="tab"
            />
          );
        })}
      </div>
    </section>
  );
}

