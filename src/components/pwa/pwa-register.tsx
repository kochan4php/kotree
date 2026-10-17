'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    };

    // Don't register from inside a speculative prerender — defer to the real
    // navigation. document.prerendering is Chromium-only; undefined elsewhere.
    if ((document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener('prerenderingchange', register, { once: true });
      return () => document.removeEventListener('prerenderingchange', register);
    }
    register();
  }, []);

  return null;
}
