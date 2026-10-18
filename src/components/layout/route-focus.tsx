'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// M19: after a client-side navigation, hand focus to the page's main landmark
// so keyboard and screen-reader users land on the new content instead of
// staying on a link that no longer exists. The first load is untouched, so
// the skip link remains the first Tab stop.
export default function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);

  useEffect(() => {
    if (pathname === previous.current) return;
    previous.current = pathname;
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [pathname]);

  return null;
}
