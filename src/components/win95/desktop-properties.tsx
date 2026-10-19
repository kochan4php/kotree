'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { DESKTOP_COLOURS, type DesktopColour } from './win95-prefs';

// G7: Display Properties — a desktop colour and the screensaver switch, both
// remembered on this device. Same manners as every other dialog on the site:
// focus lands inside it, Escape closes it, and the colours carry their names
// for anyone who cannot see them.

interface DesktopPropertiesProps {
  current: DesktopColour;
  screensaver: boolean;
  onColour: (id: DesktopColour) => void;
  onScreensaver: (on: boolean) => void;
  onClose: () => void;
}

export default function DesktopProperties({
  current,
  screensaver,
  onColour,
  onScreensaver,
  onClose,
}: DesktopPropertiesProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-10001 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Display Properties"
        className="relative w-full max-w-sm bg-[#c0c0c0] border-2 border-white border-b-black border-r-black p-1 shadow-[4px_4px_0_0_#000]"
      >
        <div className="flex items-center justify-between bg-[#000080] px-2 py-0.5">
          <p className="text-xs font-bold text-white">Display Properties</p>
          <button
            type="button"
            aria-label="Close display properties"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-black active:border-black active:border-b-white active:border-r-white"
          >
            <X className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className="p-3">
          <p className="text-xs font-bold text-black">Background colour</p>
          <div role="group" aria-label="Desktop colour" className="mt-2 flex flex-wrap gap-2">
            {DESKTOP_COLOURS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={current === entry.id}
                onClick={() => onColour(entry.id)}
                style={{ backgroundColor: entry.colour }}
                className="h-9 w-9 border-2 border-white border-b-black border-r-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-black"
              >
                <span className="sr-only">{entry.label}</span>
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-black">
            <input
              type="checkbox"
              checked={screensaver}
              onChange={(event) => onScreensaver(event.target.checked)}
            />
            Screensaver after a minute of nothing
          </label>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="h-7 min-w-20 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] px-3 text-xs font-bold text-black active:border-b-white active:border-r-white active:border-t-black active:border-l-black"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
