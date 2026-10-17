'use client';

import { useEffect } from 'react';
import { applyPrefs, readPrefs } from '@/lib/prefs';

// Keeps <html> data-attributes in step with the stored prefs: on mount (the
// inline script in the layout already ran before first paint), when the
// system colour scheme changes (auto mode), and when another tab writes new
// prefs (storage event).
export default function ThemeSync() {
  useEffect(() => {
    applyPrefs(readPrefs());

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => {
      if (readPrefs().theme === 'auto') applyPrefs(readPrefs());
    };
    const onPrefs = () => applyPrefs(readPrefs());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kotree-prefs') applyPrefs(readPrefs());
    };

    media.addEventListener('change', onMedia);
    window.addEventListener('kotree:prefs', onPrefs);
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onMedia);
      window.removeEventListener('kotree:prefs', onPrefs);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
