'use client';

import { useEffect } from 'react';

// G7: the classic screensaver — a logo drifting across a black screen after a
// minute of nothing. The idle timer belongs to the shell, so this component
// only draws and reports being woken; every key or tap on the document takes
// it away again.

export default function Screensaver({ onWake }: { onWake: () => void }) {
  useEffect(() => {
    const wake = () => onWake();
    window.addEventListener('keydown', wake);
    return () => window.removeEventListener('keydown', wake);
  }, [onWake]);

  return (
    <div
      data-testid="screensaver"
      onClick={onWake}
      onPointerDown={onWake}
      className="fixed inset-0 z-10000 cursor-none overflow-hidden bg-black"
    >
      <div className="kt-saver-x absolute left-0 top-0">
        <p className="kt-saver-y ml-6 font-display text-4xl font-black tracking-tight text-[#00ff9c] sm:text-6xl">
          KOTREE
        </p>
      </div>
      <p className="absolute inset-x-0 bottom-8 text-center text-xs font-bold text-[#c0c0c0]">
        Move the mouse or press any key to come back
      </p>
    </div>
  );
}
