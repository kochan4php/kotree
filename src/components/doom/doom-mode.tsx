'use client';

import { useEffect, useRef, useState } from 'react';
import { createDoomGame } from './game';

export default function DoomMode() {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleActivate = () => {
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

      <div className="absolute top-4 left-4 pointer-events-none text-[#00ff00] font-mono text-xl shadow-black drop-shadow-md">
        DOOM MODE ACTIVE
        <br />
        <span className="text-sm">Click to lock mouse. W,A,S,D to move. Left Click to SHOOT links!</span>
      </div>

      <button onClick={() => setIsActive(false)} className="absolute top-4 right-4 bg-red-600 text-white font-mono px-4 py-2 hover:bg-red-700 pointer-events-auto">
        EXIT DOOM
      </button>
    </div>
  );
}
