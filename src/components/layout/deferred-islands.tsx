'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// None of these paint on first load: the install banner depends on a browser
// prompt, What's New waits 1.5s, and SelfDestruct listens for a battery event.
// Mount them once the page is idle so their JS stays off the critical path.
// Konami and the egg launcher stay eager: a key sequence pressed immediately
// after load must still count.
const PwaInstallPrompt = dynamic(() => import('@/components/pwa'), { ssr: false });
const WhatsNew = dynamic(() => import('@/components/layout/whats-new'), { ssr: false });
const SelfDestruct = dynamic(() => import('@/components/self-destruct'), { ssr: false });

export default function DeferredIslands() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2_500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 1_500);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    <>
      <PwaInstallPrompt />
      <WhatsNew />
      <SelfDestruct />
    </>
  );
}
