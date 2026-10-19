'use client';

import { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { readShelf, recordRead, toggleSaved } from '@/lib/shelf';

// G2: the save button and the reading-progress recorder. Progress is kept per
// device and only moves forward, so scrolling back up — or coming back for a
// skim — never loses how far you once read.
export default function ShelfActions({ path, title }: { path: string; title: string }) {
  const [saved, setSaved] = useState(false);
  const best = useRef(0);
  const stored = useRef(0);

  useEffect(() => {
    let alive = true;
    readShelf().then((shelf) => {
      if (!alive) return;
      setSaved(shelf.saved.some((page) => page.path === path));
      stored.current = shelf.read.find((page) => page.path === path)?.progress ?? 0;
    });
    return () => {
      alive = false;
    };
  }, [path]);

  useEffect(() => {
    const progress = () => {
      const doc = document.documentElement;
      const seen = window.scrollY + window.innerHeight;
      return doc.scrollHeight <= window.innerHeight
        ? 100
        : Math.min(100, Math.round((seen / doc.scrollHeight) * 100));
    };
    const keep = () => {
      best.current = Math.max(best.current, progress());
      if (best.current - stored.current >= 10) {
        stored.current = best.current;
        void recordRead(path, title, best.current);
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        keep();
      });
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') keep();
    };

    // Opening the page already counts as reading as far as you can see.
    keep();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
      if (frame) cancelAnimationFrame(frame);
      keep();
    };
  }, [path, title]);

  const toggle = async () => {
    const next = await toggleSaved(path, title);
    setSaved(next.saved.some((page) => page.path === path));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label="Save to your shelf"
      className="print:hidden inline-flex items-center gap-1 rounded border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wider text-foreground cursor-pointer hover:bg-secondary aria-pressed:bg-accent aria-pressed:text-accent-foreground transition-colors"
    >
      {saved ? (
        <BookmarkCheck className="w-3 h-3" aria-hidden="true" />
      ) : (
        <Bookmark className="w-3 h-3" aria-hidden="true" />
      )}
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
