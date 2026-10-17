'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// K3: one beacon per navigation. The server dedupes to one view per visitor
// per page per day, so sending on every visit costs nothing extra.
// Admin/status are excluded — owner tooling, not content interest.
export default function PageViewReporter() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (pathname.startsWith('/admin') || pathname.startsWith('/status')) return;
    // Prerendered pages fire nothing until they become the active document
    if ((document as Document & { prerendering?: boolean }).prerendering) return;

    try {
      const key = `kotree-pv:${pathname}`;
      if (sessionStorage.getItem(key)) return; // one send per path per tab session
      sessionStorage.setItem(key, '1');
    } catch {
      // private mode — send anyway, the server dedupes
    }

    try {
      navigator.sendBeacon?.(
        '/api/pageview',
        new Blob([JSON.stringify({ path: pathname })], { type: 'application/json' })
      );
    } catch {
      // beacon unavailable — views are best-effort
    }
  }, [pathname]);

  return null;
}
