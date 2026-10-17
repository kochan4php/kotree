'use client';

import { useEffect } from 'react';

// K1 — real-user monitoring with plain PerformanceObserver calls (no library).
// ~10% of visitors are sampled (decided once per browser) and the report is
// sent with sendBeacon when the page is hidden or unloaded.
const SAMPLE_RATE = 0.1;
const FLAG_KEY = 'kotree-vitals-sample';

export default function VitalsReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      // Respect data savers — their connection would be skewed anyway
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (connection?.saveData) return;

      const stored = localStorage.getItem(FLAG_KEY);
      if (stored === null) {
        localStorage.setItem(FLAG_KEY, Math.random() < SAMPLE_RATE ? '1' : '0');
      }
      if (localStorage.getItem(FLAG_KEY) !== '1') return;
    } catch {
      return; // storage unavailable — skip rather than sample everyone
    }

    const metrics: Record<string, number> = {};
    const observers: PerformanceObserver[] = [];
    let sent = false;

    const observe = (type: string, callback: PerformanceObserverCallback, extra: Record<string, unknown> = {}) => {
      try {
        const observer = new PerformanceObserver(callback);
        observer.observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
        observers.push(observer);
      } catch {
        // entry type unsupported in this browser — the metric simply stays out
      }
    };

    observe('largest-contentful-paint', (list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) metrics.LCP = Math.round(last.startTime);
    });

    let cls = 0;
    observe('layout-shift', (list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!shift.hadRecentInput) cls += shift.value ?? 0;
      }
      metrics.CLS = Math.round(cls * 1000) / 1000;
    });

    let worstEvent = 0;
    observe(
      'event',
      (list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > worstEvent) worstEvent = entry.duration;
        }
        if (worstEvent > 0) metrics.INP = Math.round(worstEvent);
      },
      { durationThreshold: 40 }
    );

    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav) metrics.TTFB = Math.round(nav.responseStart);
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcp) metrics.FCP = Math.round(fcp.startTime);
    } catch {
      // timing APIs unavailable
    }

    const send = () => {
      if (sent) return;
      sent = true;
      observers.forEach((observer) => observer.disconnect());
      if (Object.keys(metrics).length === 0) return;
      try {
        navigator.sendBeacon(
          '/api/vitals',
          new Blob([JSON.stringify({ path: location.pathname, metrics })], { type: 'application/json' })
        );
      } catch {
        // beacon unavailable — metrics are best-effort by nature
      }
    };

    const onHidden = () => {
      if (document.visibilityState === 'hidden') send();
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', send);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', send);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return null;
}
