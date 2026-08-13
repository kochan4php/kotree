'use client';

import { useEffect, useRef } from 'react';
import { MousePointer2 } from 'lucide-react';

export default function GhostCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only run on desktop/larger screens to avoid mobile mess
    if (window.innerWidth < 768) return;

    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = ref.current;
    if (!el) return;

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
    const interval = setInterval(updateTarget, 2500);

    // Drive the element via direct style mutation — no React re-render per frame
    let animationFrameId: number;
    const animate = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      el.style.transform = `translate(${currentX}px, ${currentY}px)`;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[100] flex flex-col items-center"
      style={{ left: 0, top: 0, transform: 'translate(-100px, -100px)' }}
      aria-hidden="true"
    >
      <MousePointer2
        className="w-5 h-5 -ml-2 -mt-2 drop-shadow-md"
        style={{ fill: '#ff7c47', color: '#ff7c47' }}
      />
      <div
        className="mt-2 px-2 py-1 text-white text-[10px] rounded-full whitespace-nowrap shadow-lg font-mono opacity-80"
        style={{ backgroundColor: '#ff7c47' }}
      >
        ghost (demo)
      </div>
    </div>
  );
}
