'use client';

import { useEffect, useRef, useState } from 'react';

// Telepathy (text fallback) modal state with exit-animation timing
export function useTelepathy() {
  const [isTelepathy, setIsTelepathy] = useState(false);
  const [isTelepathyRendered, setIsTelepathyRendered] = useState(false);
  const [telepathyInput, setTelepathyInput] = useState('');
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const openTelepathy = () => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setIsTelepathy(true);
    setIsTelepathyRendered(true);
  };

  const closeTelepathy = () => {
    setIsTelepathy(false);
    // Keep it mounted briefly so the exit animation plays
    setTimeout(() => setIsTelepathyRendered(false), 200);
    prevFocusRef.current?.focus(); // WCAG 2.4.3: return focus to the trigger
  };

  useEffect(() => {
    if (!isTelepathy) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTelepathy();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTelepathy]);

  return { isTelepathy, isTelepathyRendered, telepathyInput, setTelepathyInput, openTelepathy, closeTelepathy };
}
