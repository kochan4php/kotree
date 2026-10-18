'use client';

import { useEffect, useRef } from 'react';
import { MousePointer2 } from 'lucide-react';
import { readPrefs, prefersReducedMotion } from '@/lib/prefs';

export default function GhostCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on desktop/larger screens to avoid mobile mess
    if (window.innerWidth < 768) return;

    // Respect user's motion preferences
    if (prefersReducedMotion()) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;

    const el = ref.current;
    if (!el) return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let animationFrameId = 0;

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
      cancelAnimationFrame(animationFrameId);
      el.style.display = 'none';
    };

    const start = () => {
      if (interval) return; // already running
      el.style.display = '';

      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight / 2;
      let currentX = targetX;
      let currentY = targetY;

      const updateTarget = () => {
        // Pick a random interactive element to move towards
        const elements = Array.from(document.querySelectorAll('a, button'));
        if (elements.length > 0 && Math.random() > 0.3) {
          const randomEl = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;
          const rect = randomEl.getBoundingClientRect();
          targetX = rect.left + rect.width / 2 + (Math.random() * 20 - 10);
          targetY = rect.top + rect.height / 2 + (Math.random() * 20 - 10);
        } else {
          targetX = Math.random() * window.innerWidth;
          targetY = Math.random() * window.innerHeight;
        }
      };
      interval = setInterval(updateTarget, 2500);

      // Drive the element via direct style mutation — no React re-render per frame
      const animate = () => {
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;
        el.style.transform = `translate(${currentX}px, ${currentY}px)`;
        animationFrameId = requestAnimationFrame(animate);
      };

      animate();
    };

    // Start/stop with the "Background effects" preference
    const fromPrefs = () => (readPrefs().fx ? start() : stop());
    fromPrefs();
    window.addEventListener('kotree:prefs', fromPrefs);

    // M23: the rAF loop parks itself in a hidden tab, but the "pick a new
    // target" interval would keep firing — clear it until the tab returns.
    const onVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
        interval = null;
      } else {
        fromPrefs();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('kotree:prefs', fromPrefs);
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-100 flex flex-col items-center"
      style={{ left: 0, top: 0, transform: 'translate(-100px, -100px)' }}
      aria-hidden="true"
    >
      <MousePointer2
        className="w-5 h-5 -ml-2 -mt-2"
        style={{ fill: '#ff7c47', color: '#14110f' }}
      />
      <div
        className="mt-2 px-2 py-1 text-[#14110f] border-2 border-foreground text-[10px] rounded-full whitespace-nowrap font-mono font-bold"
        style={{ backgroundColor: '#ff7c47' }}
      >
        ghost (demo)
      </div>
    </div>
  );
}
