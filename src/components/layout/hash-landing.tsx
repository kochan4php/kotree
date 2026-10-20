'use client';

import { useEffect } from 'react';

const MAX_FRAMES = 60;

function jumpTo(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  // Force an instant jump even though the document scrolls smoothly.
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  target.scrollIntoView({ block: 'start' });
  root.style.scrollBehavior = previous;
  return true;
}

// Next resets the scroll on a fresh load, so the browser's own fragment jump is
// lost and a copied /changelog#3.4.0 link opens at the top. Restore it once the
// target has streamed in. In-page clicks are already handled by the browser.
export default function HashLanding() {
  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;

    let id: string;
    try {
      id = decodeURIComponent(raw);
    } catch {
      return;
    }

    let frames = 0;
    let raf = 0;
    let cancelled = false;
    const findAndJump = () => {
      if (cancelled || jumpTo(id) || ++frames >= MAX_FRAMES) return;
      raf = requestAnimationFrame(findAndJump);
    };
    raf = requestAnimationFrame(findAndJump);

    // Next can finish restoring scroll after the first jump; if the target has
    // fallen out of view by then, put it back once.
    const settle = window.setTimeout(() => {
      const target = document.getElementById(id);
      if (!target) return;
      const top = target.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight) jumpTo(id);
    }, 700);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, []);

  return null;
}
