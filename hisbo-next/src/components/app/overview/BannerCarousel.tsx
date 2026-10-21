'use client';

import SkeletonImage from '@/components/common/SkeletonImage';

import React, { useEffect, useState, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Banner {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  link_url: string | null;
}

const STORAGE_KEY = 'sw_banners';

function safeUrl(v: string | null): string {
  if (!v) return '';
  try {
    const u = new URL(v.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

function subscribeToCache(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}
function cachedSnapshot() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export default function BannerCarousel() {
  const [liveBanners, setBanners] = useState<Banner[] | null>(null);
  const cached = useSyncExternalStore(subscribeToCache, cachedSnapshot, () => null);
  const cachedBanners = useMemo<Banner[]>(() => {
    try {
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed.filter(banner => safeUrl(banner.image_url)) : [];
    } catch { return []; }
  }, [cached]);
  const banners = liveBanners ?? cachedBanners;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const pauseUntilRef = useRef<number>(0);

  // Load from cache then fetch live
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('banners')
          .select('id, title, description, image_url, link_url')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const valid = data.filter((b) => safeUrl(b.image_url));
          setBanners(valid);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
          } catch {}
        }
      } catch (err) {
        console.warn('[Banners] fetch error:', err);
      }
    };

    fetchBanners();
  }, []);

  const scrollToBanner = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track || !track.children[index]) return;
    const el = track.children[index] as HTMLElement;
    track.scrollTo({
      left: el.offsetLeft,
      behavior: 'smooth',
    });
    setCurrentIndex(index);
  }, []);

  const handleNext = useCallback(() => {
    if (banners.length < 2) return;
    const next = (currentIndex + 1) % banners.length;
    scrollToBanner(next);
  }, [banners.length, currentIndex, scrollToBanner]);

  const handlePrev = useCallback(() => {
    if (banners.length < 2) return;
    const prev = (currentIndex - 1 + banners.length) % banners.length;
    scrollToBanner(prev);
  }, [banners.length, currentIndex, scrollToBanner]);

  // Autoscroll timer
  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      if (isHovered || Date.now() < pauseUntilRef.current || document.hidden) {
        return;
      }
      handleNext();
    }, 4500);

    return () => clearInterval(timer);
  }, [banners.length, isHovered, handleNext]);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const scrollLeft = track.scrollLeft;
    const children = Array.from(track.children) as HTMLElement[];
    let closestIndex = 0;
    let minDiff = Infinity;

    children.forEach((el, i) => {
      const diff = Math.abs(el.offsetLeft - scrollLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
      }
    });

    setCurrentIndex(closestIndex);
  };

  const handleUserInteract = () => {
    pauseUntilRef.current = Date.now() + 8000;
  };

  if (!banners.length) return null;

  const isMulti = banners.length > 1;

  return (
    <div id="bnr" style={{ marginBottom: '14px' }}>
      <section
        className={`bnr ${isMulti ? 'multi' : ''}`}
        role="region"
        aria-roledescription="carousel"
        aria-label="Promotions"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handleUserInteract}
        onWheel={handleUserInteract}
      >
        <div className="bn-wrap">
          <div
            className="bn-track"
            ref={trackRef}
            aria-live="off"
            tabIndex={isMulti ? 0 : undefined}
            onScroll={handleScroll}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
              } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
              }
            }}
          >
            {banners.map((b, i) => {
              const link = safeUrl(b.link_url);
              const imgSrc = safeUrl(b.image_url);
              const alt = b.title || 'Promotion';

              const content = (
                <>
                  <SkeletonImage native
                    src={imgSrc}
                    alt={alt}
                    width={1600}
                    height={600}
                    decoding="async"
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                  {(b.title || b.description) && (
                    <div className="bn-t">
                      {b.title && <b>{b.title}</b>}
                      {b.description && <span>{b.description}</span>}
                    </div>
                  )}
                </>
              );

              return link ? (
                <a
                  key={b.id || i}
                  className="bn"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${b.title || 'Open promotion'}${b.description ? `. ${b.description}` : ''}`}
                >
                  {content}
                </a>
              ) : (
                <div key={b.id || i} className="bn" role="group" aria-label={alt}>
                  {content}
                </div>
              );
            })}
          </div>

          {isMulti && (
            <>
              <button
                type="button"
                className="bn-ar l"
                onClick={handlePrev}
                aria-label="Previous banner"
              >
                ‹
              </button>
              <button
                type="button"
                className="bn-ar r"
                onClick={handleNext}
                aria-label="Next banner"
              >
                ›
              </button>
            </>
          )}
        </div>

        {isMulti && (
          <div className="bn-dots">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                className={i === currentIndex ? 'on' : ''}
                onClick={() => scrollToBanner(i)}
                aria-label={`Go to banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

