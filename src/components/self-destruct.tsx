'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type BatteryManagerLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: string, fn: () => void) => void;
};

export default function SelfDestruct() {
  const [isTerminated, setIsTerminated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Ref mirror so the battery listener never reads a stale closure
  const countdownRef = useRef<number | null>(null);
  const setCount = (n: number | null) => {
    countdownRef.current = n;
    setCountdown(n);
  };

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

  useEffect(() => {
    let disposed = false;

    const checkBattery = async () => {
      try {
        const getBattery = (navigator as unknown as { getBattery?: () => Promise<BatteryManagerLike> }).getBattery;
        if (!getBattery) return;
        const battery = await getBattery();
        if (disposed) return;

        const evaluateBattery = () => {
          // Self destruct if battery is less than or equal to 5% and not charging
          if (battery.level <= 0.05 && !battery.charging) {
            if (countdownRef.current === null) {
              setCount(10);
              toast.error('CRITICAL BATTERY: SELF-DESTRUCT SEQUENCE INITIATED');
            }
          } else {
            setCount(null);
          }
        };

        evaluateBattery();
        battery.addEventListener('levelchange', evaluateBattery);
        battery.addEventListener('chargingchange', evaluateBattery);
      } catch {
        console.warn('Battery API not supported or blocked');
      }
    };

    checkBattery();

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCount(countdown - 1), 1000);
    } else if (countdown === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot state transition when the countdown ends; no cascading renders
      executeTermination();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (isTerminated) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center pointer-events-auto">
        <div className="text-red-600 font-mono text-4xl animate-pulse tracking-widest text-center">
          SYSTEM TERMINATED
          <p className="text-sm mt-4 text-red-600/50">Battery critical. All local data purged.</p>
        </div>
      </div>
    );
  }

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[9998] bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
        <div className="text-red-500 font-bold text-6xl md:text-9xl animate-ping">
          {countdown}
        </div>
        <div className="text-red-400 font-mono mt-8 text-xl font-bold bg-black/50 px-4 py-2 rounded">
          SELF-DESTRUCT INITIATED
        </div>
        <button
          onClick={() => setCount(null)}
          className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/25 text-white font-bold rounded-xl cursor-pointer transition-colors"
        >
          CANCEL
        </button>
      </div>
    );
  }

  return null;
}
