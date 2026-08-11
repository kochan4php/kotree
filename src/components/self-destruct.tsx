'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function SelfDestruct() {
  const [isTerminated, setIsTerminated] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    let batteryTimer: any;
    
    const checkBattery = async () => {
      try {
        if ('getBattery' in navigator) {
          const battery: any = await (navigator as any).getBattery();
          
          const evaluateBattery = () => {
            // Self destruct if battery is less than or equal to 5% and not charging
            if (battery.level <= 0.05 && !battery.charging) {
              if (countdown === null) {
                setCountdown(10);
                toast.error('CRITICAL BATTERY: SELF-DESTRUCT SEQUENCE INITIATED');
              }
            } else {
              setCountdown(null);
            }
          };

          evaluateBattery();
          battery.addEventListener('levelchange', evaluateBattery);
          battery.addEventListener('chargingchange', evaluateBattery);
        }
      } catch (err) {
        console.warn('Battery API not supported or blocked');
      }
    };

    checkBattery();

    return () => clearInterval(batteryTimer);
  }, [countdown]);

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      executeTermination();
    }
    return () => clearTimeout(timer);
  }, [countdown]);

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
      } catch (e) {
        // Fallback for older browsers
        window.indexedDB.deleteDatabase('keyval-store');
      }
    }
  };

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
      <div className="fixed inset-0 z-[9998] bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none">
        <div className="text-red-500 font-bold text-6xl md:text-9xl animate-ping">
          {countdown}
        </div>
        <div className="text-red-400 font-mono mt-8 text-xl font-bold bg-black/50 px-4 py-2 rounded">
          SELF-DESTRUCT INITIATED
        </div>
      </div>
    );
  }

  return null;
}
