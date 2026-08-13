'use client';

import { useEffect, useState } from 'react';

// Telepathy (text fallback) modal state with exit-animation timing
export function useTelepathy() {
  const [isTelepathy, setIsTelepathy] = useState(false);
  const [isTelepathyRendered, setIsTelepathyRendered] = useState(false);
  const [telepathyInput, setTelepathyInput] = useState('');

  const openTelepathy = () => {
    setIsTelepathy(true);
    setIsTelepathyRendered(true);
  };

  const closeTelepathy = () => {
    setIsTelepathy(false);
    // Keep it mounted briefly so the exit animation plays
    setTimeout(() => setIsTelepathyRendered(false), 200);
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
