'use client';

import { useEffect, useRef } from 'react';

export default function ScrollFades() {
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // rAF-throttle: the scroll event fires more often than we can paint
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;

        // Top opacity: 0 at very top, 1 at 50px scrolled
        const newTopOpacity = Math.min(1, Math.max(0, scrollTop / 50));
        // Bottom opacity: 0 at very bottom, 1 at 50px from bottom
        const distanceToBottom = documentHeight - (scrollTop + windowHeight);
        const newBottomOpacity = Math.min(1, Math.max(0, distanceToBottom / 50));

        if (topRef.current) topRef.current.style.opacity = String(newTopOpacity);
        if (bottomRef.current) bottomRef.current.style.opacity = String(newBottomOpacity);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial check
    handleScroll();

    // Check again after a small delay in case of dynamic content loading
    setTimeout(handleScroll, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between h-screen">
      {/* Top Edge */}
      <div ref={topRef} className="relative h-16 w-full mask-gradient-top" style={{ opacity: 0 }}>
        <div className="absolute inset-0 backdrop-blur-md bg-black/1"></div>
        <div className="absolute inset-0 bg-linear-to-b from-[#201613] to-transparent"></div>
      </div>

      {/* Bottom Edge */}
      <div ref={bottomRef} className="relative h-20 w-full mask-gradient-bottom" style={{ opacity: 0 }}>
        <div className="absolute inset-0 backdrop-blur-md bg-black/1"></div>
        <div className="absolute inset-0 bg-linear-to-t from-[#201613] to-transparent"></div>
      </div>
    </div>
  );
}
