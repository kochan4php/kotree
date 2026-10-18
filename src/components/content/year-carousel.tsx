'use client';

import Link from 'next/link';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';

// M71: the year strip above the recap. Touch screens scroll it natively;
// mouse users get a grab-drag; ArrowLeft/ArrowRight/Home/End move focus
// between the chips (they are plain links, so Tab keeps working too).
export default function YearCarousel({ years, active }: { years: number[]; active: number }) {
  const drag = useRef<{ x: number; left: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return; // native touch scrolling is better than ours
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    e.currentTarget.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
  };

  const stopDrag = () => {
    drag.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const links = [...e.currentTarget.querySelectorAll('a')];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) return;
    e.preventDefault();
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? links.length - 1
          : Math.min(links.length - 1, Math.max(0, index + (e.key === 'ArrowRight' ? 1 : -1)));
    links[next]?.focus();
  };

  return (
    <div
      role="group"
      aria-label="Choose a year"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerLeave={stopDrag}
      onKeyDown={onKeyDown}
      className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1 select-none cursor-grab active:cursor-grabbing"
    >
      {years.map((year) => (
        <Link
          key={year}
          href={`/wrapped?year=${year}`}
          aria-current={year === active ? 'page' : undefined}
          draggable={false}
          className={`shrink-0 snap-start rounded-lg border-[3px] border-foreground px-3 py-1 text-sm font-black shadow-[2px_2px_0_0_var(--foreground)] transition-all ${
            year === active
              ? 'bg-accent text-accent-foreground'
              : 'bg-card text-foreground hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]'
          }`}
        >
          {year}
        </Link>
      ))}
    </div>
  );
}
