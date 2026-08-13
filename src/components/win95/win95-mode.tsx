'use client';

import { useEffect, useState } from 'react';
import DesktopIcons from './desktop';
import Taskbar from './taskbar';
import Win95Window from './window';
import { useDrag } from './use-drag';
import { useWindows } from './use-windows';

export default function Win95Mode() {
  const [isActive, setIsActive] = useState(false);
  const { windows, topZ, setWindows, openWindow, closeWindow, bringToFront, toggleMinimize, toggleMaximize, openProfileWindow } =
    useWindows();
  const { setWindowRef, handlePointerDown } = useDrag({ windows, setWindows, isActive, bringToFront });

  // Listen for the activation event: mount the overlay AND auto-open the profile window
  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
      openProfileWindow();
    };
    window.addEventListener('ACTIVATE_WIN95', handleActivate);
    return () => window.removeEventListener('ACTIVATE_WIN95', handleActivate);
  }, [openProfileWindow]);

  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-9000 bg-[#008080] font-[System] text-sm overflow-hidden pointer-events-auto selection:bg-[#000080] selection:text-white"
      style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}
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
          setWindowRef={setWindowRef}
        />
      ))}

      <Taskbar windows={windows} topZ={topZ} onBringToFront={bringToFront} />
    </div>
  );
}
