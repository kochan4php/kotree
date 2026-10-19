'use client';

import { useCallback, useEffect, useState } from 'react';
import DesktopIcons from './desktop';
import DesktopProperties from './desktop-properties';
import Screensaver from './screensaver';
import Taskbar from './taskbar';
import Win95Window from './window';
import { useDrag } from './use-drag';
import { useWindows } from './use-windows';
import {
  desktopColourOf,
  readDesktopColour,
  readScreensaver,
  rememberDesktopColour,
  rememberScreensaver,
  type DesktopColour,
} from './win95-prefs';

// G7: a minute of nothing brings the screensaver.
const SCREENSAVER_MS = 60_000;

export default function Win95Mode() {
  const [isActive, setIsActive] = useState(false);
  const [desktop, setDesktop] = useState<DesktopColour>('teal');
  const [screensaverWanted, setScreensaverWanted] = useState(true);
  const [screensaver, setScreensaver] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);

  const { windows, topZ, setWindows, openWindow, closeWindow, bringToFront, toggleMinimize, toggleMaximize, openProfileWindow } =
    useWindows();
  const { setWindowRef, handlePointerDown, nudge } = useDrag({ windows, setWindows, isActive, bringToFront });

  // Listen for the activation event: mount the overlay AND auto-open the profile window
  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
      openProfileWindow();
    };
    window.addEventListener('ACTIVATE_WIN95', handleActivate);
    return () => window.removeEventListener('ACTIVATE_WIN95', handleActivate);
  }, [openProfileWindow]);

  // Preferences are browser-only: read them the moment the shell boots
  useEffect(() => {
    if (!isActive) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only, read after the shell mounts
    setDesktop(readDesktopColour());
    setScreensaverWanted(readScreensaver());
  }, [isActive]);

  // G7: idle for a minute and the screensaver drifts in; any input resets the
  // clock. Reduced motion gets no screensaver at all — it is nothing but motion.
  useEffect(() => {
    if (!isActive || !screensaverWanted) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = window.setTimeout(() => setScreensaver(true), SCREENSAVER_MS);
    const wake = () => {
      setScreensaver(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScreensaver(true), SCREENSAVER_MS);
    };
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    for (const name of events) window.addEventListener(name, wake, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const name of events) window.removeEventListener(name, wake);
    };
  }, [isActive, screensaverWanted]);

  const finishShutdown = useCallback(() => {
    setShuttingDown(false);
    setIsActive(false);
  }, []);

  // Any key brings the machine back
  useEffect(() => {
    if (!shuttingDown) return;
    window.addEventListener('keydown', finishShutdown);
    return () => window.removeEventListener('keydown', finishShutdown);
  }, [shuttingDown, finishShutdown]);

  if (!isActive) return null;

  if (shuttingDown) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shut down Windows 95"
        onClick={finishShutdown}
        className="fixed inset-0 z-10000 flex flex-col items-center justify-center gap-5 bg-black px-6 text-center"
      >
        <p className="font-display text-2xl font-black text-[#ffb000] sm:text-3xl">
          It&rsquo;s now safe to turn off your computer.
        </p>
        <button
          type="button"
          autoFocus
          onClick={finishShutdown}
          className="border-2 border-[#c0c0c0] bg-black px-4 py-1.5 text-sm font-bold text-[#c0c0c0] hover:bg-[#c0c0c0] hover:text-black"
        >
          Come back to Kotree
        </button>
        <p className="text-xs text-[#808080]">Any key or click works too.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="win95-desktop"
      className="fixed inset-0 z-9000 font-[System] text-sm overflow-hidden pointer-events-auto selection:bg-[#000080] selection:text-white"
      style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif', backgroundColor: desktopColourOf(desktop) }}
    >
      <DesktopIcons onOpen={openWindow} onExit={() => setIsActive(false)} />

      {/* Windows */}
      {windows.map(w => (
        <Win95Window
          key={w.id}
          w={w}
          onFocus={bringToFront}
          onMinimize={toggleMinimize}
          onMaximize={toggleMaximize}
          onClose={closeWindow}
          onPointerDown={handlePointerDown}
          onNudge={nudge}
          setWindowRef={setWindowRef}
        />
      ))}

      <Taskbar
        windows={windows}
        topZ={topZ}
        onBringToFront={bringToFront}
        onDisplayProperties={() => setPropertiesOpen(true)}
        onShutDown={() => setShuttingDown(true)}
        onExit={() => setIsActive(false)}
      />

      {propertiesOpen && (
        <DesktopProperties
          current={desktop}
          screensaver={screensaverWanted}
          onColour={(id) => {
            setDesktop(id);
            rememberDesktopColour(id);
          }}
          onScreensaver={(on) => {
            setScreensaverWanted(on);
            rememberScreensaver(on);
          }}
          onClose={() => setPropertiesOpen(false)}
        />
      )}

      {screensaver && <Screensaver onWake={() => setScreensaver(false)} />}
    </div>
  );
}
