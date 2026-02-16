"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '@/types';

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const count = banners.length;

  const goTo = useCallback((index: number) => {
    setCurrent(((index % count) + count) % count);
  }, [count]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-advance every 5s unless hovered
  useEffect(() => {
    if (count <= 1) return;
    if (isHovered) return;

    intervalRef.current = setInterval(next, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, count, isHovered]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  if (count === 0) return null;

  const banner = banners[current];

  const Wrapper = banner.link_url ? 'a' : 'div';
  const wrapperProps = banner.link_url
    ? { href: banner.link_url, target: banner.link_target || '_self', rel: banner.link_target === '_blank' ? 'noopener noreferrer' : undefined }
    : {};

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Banner slide */}
      <Wrapper
        {...wrapperProps as any}
        className="block relative w-full aspect-[21/9] sm:aspect-[21/7] bg-slate-800/50 overflow-hidden"
      >
        {/* Desktop image */}
        <img
          src={banner.image_url}
          alt={banner.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            banner.image_mobile_url ? 'hidden sm:block' : 'block'
          }`}
          draggable={false}
        />
        {/* Mobile image (if provided) */}
        {banner.image_mobile_url && (
          <img
            src={banner.image_mobile_url}
            alt={banner.title}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 block sm:hidden"
            draggable={false}
          />
        )}

        {/* Optional HTML overlay */}
        {banner.html_content && (
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
            <div
              className="banner-overlay-content text-center"
              dangerouslySetInnerHTML={{ __html: banner.html_content }}
            />
          </div>
        )}
      </Wrapper>

      {/* Navigation arrows (desktop, hidden on single banner) */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Banner anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            aria-label="Próximo banner"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {count > 1 && (
        <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Ir para banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
