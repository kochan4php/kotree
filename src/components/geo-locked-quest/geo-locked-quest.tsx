'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ALLOWED_RADIUS, checkDistance, fallbackToIP } from './geo';

export default function GeoLockedQuest() {
  const [distance, setDistance] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const callbacks = {
    onDistance: setDistance,
    onUnlocked: () => setUnlocked(true),
  };

  const handleCheckLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('GPS not supported. Trying IP detection...');
      fallbackToIP(callbacks);
      return;
    }

    toast.info('Requesting GPS permission...');

    // Set a manual timeout to fallback faster
    const timeoutId = setTimeout(() => {
      fallbackToIP(callbacks);
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        checkDistance(position.coords.latitude, position.coords.longitude, callbacks);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.warn('Geolocation error, falling back to IP:', err);
        fallbackToIP(callbacks);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
    );
  };

  return (
    <div
      className="fluid-glass bg-[#ffd9b8]! w-full h-full p-4 text-[#14110f] rounded-lg text-center relative flex flex-col justify-center items-center"
    >
      <div className="liquid-gradient opacity-30 saturate-100"></div>
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
        <h2 className="font-bold text-sm text-[#14110f] mb-1 flex items-center justify-center gap-1.5 tracking-wider">
          <span className="text-sm">📍</span> GEO-QUEST
        </h2>
        {distance === null ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full mt-1">
            <p className="text-xs font-medium text-[#5f5147] mb-3 px-1 leading-snug">Verify physical location to unlock.</p>
            <button
              onClick={handleCheckLocation}
              className="w-full px-3 py-2 bg-accent text-[#14110f] border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)] font-bold rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all text-xs cursor-pointer min-h-11"
            >
              Check GPS
            </button>
          </div>
        ) : unlocked ? (
          <a
            href="https://github.com/kochan4php/kotree"
            target="_blank"
            rel="noreferrer"
            className="block w-full p-2 mt-2 bg-[#a8e94d] border-[3px] border-foreground shadow-[3px_3px_0_0_var(--foreground)] text-[#14110f] font-bold rounded-xl hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all text-xs cursor-pointer min-h-11 flex items-center justify-center"
          >
            ENTER SANCTUARY
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 w-full mt-2">
            <p className="text-xs font-medium text-[#5f5147] mb-1">Distance to target:</p>
            <p className="font-mono text-xl text-[#14110f] font-black">{distance.toFixed(0)}m</p>
            <p className="text-[10px] mt-1 font-bold text-red-600">
              Must be {'<'} {ALLOWED_RADIUS}m
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
