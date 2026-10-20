'use client';

import { useEffect, useRef, useState } from 'react';
import { createDoomGame } from './game';

export default function DoomMode() {
  const [isActive, setIsActive] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleActivate = () => {
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      // The game pulls three.js and a renderer; on a metered or tiny device,
      // ask first instead of downloading it silently.
      if (conn?.saveData || memory <= 2) {
        setBlocked(true);
        return;
      }
      setIsActive(true);
    };
    // Triggered by typing 'doom' in the AI Terminal or via voice command
    window.addEventListener('ACTIVATE_DOOM', handleActivate);
    return () => window.removeEventListener('ACTIVATE_DOOM', handleActivate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isActive || !container) return;
    return createDoomGame(container, crosshairRef.current);
  }, [isActive]);

  if (blocked && !isActive) {
    return (
      <div className="fixed inset-0 z-99999 bg-black/80 flex items-center justify-center p-4" onKeyDown={(event) => { if (event.key === 'Escape') setBlocked(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="doom-save-data-title" className="max-w-sm border-[3px] border-white bg-black p-5 text-[#00ff00] font-mono">
          <h2 id="doom-save-data-title" className="font-display text-lg">Doom needs a little bandwidth</h2>
          <p className="mt-2 text-sm">Your connection is in save-data mode, so the 3D game was not loaded. The rest of the site works normally.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button autoFocus onClick={() => { setBlocked(false); setIsActive(true); }} className="border-2 border-[#00ff00] px-3 py-1 text-sm font-bold cursor-pointer">Play anyway</button>
            <button onClick={() => setBlocked(false)} className="border-2 border-[#00ff00] px-3 py-1 text-sm font-bold cursor-pointer">Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-99999 bg-black">
      <div ref={containerRef} className="w-full h-full" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          ref={crosshairRef}
          className="w-4 h-4 border-2 border-[#00ff00] rounded-full flex items-center justify-center transition-transform"
        >
          <div className="w-1 h-1 bg-[#00ff00] rounded-full" />
        </div>
      </div>

      <div className="absolute top-4 left-4 pointer-events-none text-[#00ff00] font-mono text-xl">
        DOOM MODE ACTIVE
        <br />
        <span className="text-sm">Click to lock mouse. W,A,S,D to move. Left Click to SHOOT links!</span>
      </div>

      <button onClick={() => setIsActive(false)} className="absolute top-4 right-4 bg-destructive text-[#14110f] font-display px-4 py-2 border-[3px] border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.85)] hover:-translate-y-0.5 transition-all pointer-events-auto">
        EXIT DOOM
      </button>
    </div>
  );
}
