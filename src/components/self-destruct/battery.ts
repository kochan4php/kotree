'use client';

import { useEffect, useRef } from 'react';

type BatteryManagerLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: string, fn: () => void) => void;
};

// Single subscription: arms/disarms the self-destruct sequence on battery state
export function useBatteryAlert(onArm: () => void, onDisarm: () => void) {
  const onArmRef = useRef(onArm);
  const onDisarmRef = useRef(onDisarm);
  useEffect(() => {
    onArmRef.current = onArm;
    onDisarmRef.current = onDisarm;
  });

  useEffect(() => {
    let disposed = false;
    let armed = false;

    const checkBattery = async () => {
      try {
        const getBattery = (navigator as unknown as { getBattery?: () => Promise<BatteryManagerLike> }).getBattery;
        if (!getBattery) return;
        const battery = await getBattery();
        if (disposed) return;

        const evaluate = () => {
          // Self destruct if battery is <= 5% and not charging
          if (battery.level <= 0.05 && !battery.charging) {
            if (!armed) {
              armed = true;
              onArmRef.current();
            }
          } else {
            armed = false;
            onDisarmRef.current();
          }
        };

        evaluate();
        battery.addEventListener('levelchange', evaluate);
        battery.addEventListener('chargingchange', evaluate);
      } catch {
        console.warn('Battery API not supported or blocked');
      }
    };

    checkBattery();

    return () => {
      disposed = true;
    };
  }, []);
}
