'use client';

import { useEffect, useRef, useState } from 'react';
import { FolderOpen, LayoutGrid, Monitor, Power, User } from 'lucide-react';
import type { WindowState } from './types';

interface TaskbarProps {
  windows: WindowState[];
  topZ: number;
  onBringToFront: (id: string) => void;
  onDisplayProperties: () => void;
  onShutDown: () => void;
  onExit: () => void;
}

// G7: the Start menu does something now — Display Properties, Exit and Shut
// Down. A disclosure, not an ARIA menu: Tab reaches every item and Escape
// closes it, which is what a menu this small actually needs.
const menuItem =
  'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm font-bold text-black hover:bg-[#000080] hover:text-white focus-visible:bg-[#000080] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white';

export default function Taskbar({
  windows,
  topZ,
  onBringToFront,
  onDisplayProperties,
  onShutDown,
  onExit,
}: TaskbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or pressing Escape, closes the menu
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!startRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const choose = (action: () => void) => () => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center px-1 z-9999 justify-between">
      <div className="flex items-center gap-1">
        <div className="relative" ref={startRef}>
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="h-6 px-2 flex items-center gap-1 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black font-bold active:border-black active:border-b-white active:border-r-white text-black shadow-[1px_1px_0px_#000]"
          >
            <LayoutGrid className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
            Start
          </button>

          {menuOpen && (
            <div className="absolute bottom-7 left-0 w-52 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] p-0.5 shadow-[3px_3px_0_0_#000]">
              <button type="button" className={menuItem} onClick={choose(onDisplayProperties)}>
                <Monitor className="w-4 h-4" aria-hidden="true" />
                Display Properties…
              </button>
              <button type="button" className={menuItem} onClick={choose(onExit)}>
                <Power className="w-4 h-4" aria-hidden="true" />
                Exit Windows 95
              </button>
              <div className="my-0.5 border-t-2 border-white border-b-black" aria-hidden="true" />
              <button type="button" className={menuItem} onClick={choose(onShutDown)}>
                <Power className="w-4 h-4" aria-hidden="true" />
                Shut Down…
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 px-2 flex gap-1 items-center">
          {windows.map(w => (
            <button
              key={w.id}
              onClick={() => onBringToFront(w.id)}
              className={`h-6 px-2 truncate min-w-25 max-w-[150px] text-left text-black font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000] ${
                w.zIndex === topZ && !w.isMinimized
                  ? 'border-2 border-black border-b-white border-r-white bg-[#e0e0e0]'
                  : 'border-2 border-white border-b-black border-r-black bg-[#c0c0c0]'
              }`}
            >
              {w.id === 'links' ? (
                <FolderOpen className="w-4 h-4 shrink-0" />
              ) : (
                <User className="w-4 h-4 shrink-0" />
              )}
              {w.title}
            </button>
          ))}
        </div>
      </div>
      <div className="h-6 px-2 flex items-center bg-[#c0c0c0] border-2 border-b-white border-r-white border-t-black border-l-black text-black shadow-[1px_1px_0px_#fff]">
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
}
