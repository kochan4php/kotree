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
      className="fluid-glass bg-orange-900/10! w-full h-full p-4 text-orange-100 rounded-lg text-center relative flex flex-col justify-center items-center"
      style={{ '--accent': '#ea580c' } as React.CSSProperties}
    >
      <div className="liquid-gradient opacity-30 saturate-100"></div>
      <div className="relative z-10 w-full h-full flex flex-col justify-center items-center">
        <h2 className="font-bold text-sm text-orange-200 mb-1 flex items-center justify-center gap-1.5 tracking-wider">
          <span className="text-sm">📍</span> GEO-QUEST
        </h2>
        {distance === null ? (
          <div className="flex flex-col items-center justify-center flex-1 w-full mt-1">
            <p className="text-xs font-medium text-orange-300 mb-3 px-1 leading-snug">Verify physical location to unlock.</p>
            <button
              onClick={handleCheckLocation}
              className="w-full px-3 py-2 bg-orange-700 text-white shadow-sm font-bold rounded-xl hover:bg-orange-600 transition-colors text-xs cursor-pointer min-h-11"
            >
              Check GPS
            </button>
          </div>
        ) : unlocked ? (
          <a
            href="https://github.com/kochan4php/kotree"
            target="_blank"
            rel="noreferrer"
            className="block w-full p-2 mt-2 bg-green-600 shadow-md text-white font-bold rounded-xl hover:bg-green-500 transition-all hover:scale-105 active:scale-95 text-xs cursor-pointer"
          >
            ENTER SANCTUARY
          </a>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 w-full mt-2">
            <p className="text-xs font-medium text-orange-300 mb-1">Distance to target:</p>
            <p className="font-mono text-xl text-orange-100 font-black">{distance.toFixed(0)}m</p>
            <p className="text-[10px] mt-1 font-bold text-red-400">
              Must be {'<'} {ALLOWED_RADIUS}m
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
