'use client';

import { useEffect } from 'react';
import { applyPrefs, readPrefs } from '@/lib/prefs';

// Keeps <html> data-attributes in step with stored preferences across tabs.
export default function PrefsSync() {
  useEffect(() => {
    applyPrefs(readPrefs());

    const onPrefs = () => applyPrefs(readPrefs());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'kotree-prefs') applyPrefs(readPrefs());
    };

    window.addEventListener('kotree:prefs', onPrefs);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('kotree:prefs', onPrefs);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
