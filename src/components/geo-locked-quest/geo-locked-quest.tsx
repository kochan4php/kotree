'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Copy, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ALLOWED_RADIUS, checkDistance, fallbackToIP } from './geo';
import { discoverSecret } from '@/lib/secrets';

// Same card surface and button geometry as every other tile; only the fills
// keep this tile's own palette.
const BUTTON =
  'flex w-full min-h-11 items-center justify-center gap-2 rounded-lg border-[3px] border-foreground px-3 py-2 text-xs font-bold text-[#14110f] shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer';

export default function GeoLockedQuest() {
  const [distance, setDistance] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const callbacks = {
    onDistance: setDistance,
    onUnlocked: () => {
      setUnlocked(true);
      discoverSecret('monas');
      // Celebratory confetti — loaded on demand, honours reduced motion
      import('@/components/effects/confetti').then((m) => m.fireConfetti());
    },
    onCoords: (lat: number, lng: number) => setCoords({ lat, lng }),
  };

  const copyCoords = async () => {
    if (!coords) return;
    try {
      await navigator.clipboard.writeText(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      toast.success('Coordinates copied!');
    } catch {
      toast.error('Could not copy the coordinates');
    }
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
    <Card className="fluid-glass cv-auto bg-[#ffd9b8]! h-full gap-1 p-4 text-center text-[#14110f]">
      <div className="liquid-gradient opacity-30 saturate-100"></div>
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center">
        <h2 className="mb-1 flex items-center justify-center gap-1.5 text-sm font-bold uppercase tracking-wider">
          <MapPin className="w-4 h-4" aria-hidden="true" /> Geo-Quest
        </h2>
        {distance === null ? (
          <>
            <p className="mb-3 px-1 text-xs font-medium leading-snug text-[#5f5147]">
              Verify physical location to unlock.
            </p>
            <button onClick={handleCheckLocation} className={`${BUTTON} bg-accent`}>
              Check GPS
            </button>
          </>
        ) : unlocked ? (
          <a
            href="https://github.com/kochan4php/kotree"
            target="_blank"
            rel="noreferrer"
            className={`${BUTTON} bg-[#a8e94d]`}
          >
            ENTER SANCTUARY
          </a>
        ) : (
          <>
            <p className="mb-1 text-xs font-medium text-[#5f5147]">Distance to target:</p>
            <p className="font-mono text-xl font-black">{distance.toFixed(0)}m</p>
            <p className="mt-1 text-[10px] font-bold text-red-600">
              Must be {'<'} {ALLOWED_RADIUS}m
            </p>
            {coords && (
              <button
                type="button"
                onClick={copyCoords}
                className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-[#5f5147] underline underline-offset-2 transition-colors hover:text-[#14110f]"
              >
                <Copy className="w-3 h-3" aria-hidden="true" /> Copy my coordinates
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
