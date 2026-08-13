'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useBatteryAlert } from './battery';
import { CountdownOverlay, TerminatedOverlay } from './overlays';

export default function SelfDestruct() {
  const [isTerminated, setIsTerminated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Ref mirror so the battery listener never reads a stale closure
  const countdownRef = useRef<number | null>(null);
  const setCount = useCallback((n: number | null) => {
    countdownRef.current = n;
    setCountdown(n);
  }, []);

  const executeTermination = async () => {
    setIsTerminated(true);

    // Purge everything
    localStorage.clear();
    sessionStorage.clear();

    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // Delete IndexedDB databases
    const indexedDB = window.indexedDB;
    if (indexedDB) {
      try {
        const dbs = await window.indexedDB.databases();
        dbs.forEach(db => {
          if (db.name) window.indexedDB.deleteDatabase(db.name);
        });
      } catch {
        // Fallback for older browsers
        window.indexedDB.deleteDatabase('keyval-store');
      }
    }
  };

  const onArm = useCallback(() => {
    setCount(10);
    toast.error('CRITICAL BATTERY: SELF-DESTRUCT SEQUENCE INITIATED');
  }, [setCount]);

  const onDisarm = useCallback(() => setCount(null), [setCount]);

  useBatteryAlert(onArm, onDisarm);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCount(countdown - 1), 1000);
    } else if (countdown === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot state transition when the countdown ends; no cascading renders
      executeTermination();
    }
    return () => clearTimeout(timer);
  }, [countdown, setCount]);

  if (isTerminated) return <TerminatedOverlay />;
  if (countdown !== null) return <CountdownOverlay countdown={countdown} onCancel={() => setCount(null)} />;
  return null;
}
