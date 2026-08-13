'use client';

import { X, Minus, Square } from 'lucide-react';
import type { WindowState } from './types';

interface Win95WindowProps {
  w: WindowState;
  onFocus: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onClose: (id: string) => void;
  onPointerDown: (e: React.PointerEvent, id: string, w: WindowState) => void;
  setWindowRef: (id: string) => (el: HTMLDivElement | null) => void;
}

const chromeButton =
  'w-4 h-4 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black flex items-center justify-center text-black active:border-black active:border-b-white active:border-r-white font-bold transition-transform active:scale-95';

export default function Win95Window({
  w,
  onFocus,
  onMinimize,
  onMaximize,
  onClose,
  onPointerDown,
  setWindowRef,
}: Win95WindowProps) {
  // Calculate transform for minimize animation
  const minimizeStyle: React.CSSProperties = w.isMinimized
    ? { transform: 'scale(0) translateY(50vh)', opacity: 0, pointerEvents: 'none' }
    : { transform: 'scale(1) translateY(0)', opacity: 1, pointerEvents: 'auto' };

  return (
    <div
      ref={setWindowRef(w.id)}
      onClick={() => onFocus(w.id)}
      className="absolute bg-[#c0c0c0] border-2 border-white border-b-black border-r-black shadow-[2px_2px_0px_#000] flex flex-col origin-bottom"
      style={{
        left: w.x,
        top: w.y,
        zIndex: w.zIndex,
        width: w.width,
        height: w.height,
        transition: 'all 0.3s ease-in-out',
        ...minimizeStyle,
      }}
    >
      {/* Title Bar */}
      <div
        onPointerDown={(e) => onPointerDown(e, w.id, w)}
        onDoubleClick={() => onMaximize(w.id)}
        className="bg-[#000080] text-white font-bold p-1 m-0.5 flex justify-between items-center cursor-default select-none touch-none"
      >
        <span className="pl-1 truncate">{w.title}</span>
        <div className="flex gap-0.5 pointer-events-auto">
          <button
            aria-label={`Minimize ${w.title}`}
            onClick={(e) => { e.stopPropagation(); onMinimize(w.id); }}
            className={chromeButton}
          >
            <Minus size={10} strokeWidth={4} />
          </button>
          <button
            aria-label={w.isMaximized ? `Restore ${w.title}` : `Maximize ${w.title}`}
            onClick={(e) => { e.stopPropagation(); onMaximize(w.id); }}
            className={chromeButton}
          >
            {w.isMaximized ? (
              <div className="w-2 h-2 border-[1.5px] border-black relative">
                <div className="w-2 h-2 border-[1.5px] border-black absolute -top-1 -right-1 bg-[#c0c0c0]"></div>
              </div>
            ) : (
              <Square size={10} strokeWidth={3} />
            )}
          </button>
          <button
            aria-label={`Close ${w.title}`}
            onClick={(e) => { e.stopPropagation(); onClose(w.id); }}
            className={`${chromeButton} ml-0.5`}
          >
            <X size={12} strokeWidth={4} />
          </button>
        </div>
      </div>
      {/* Content Area */}
      <div className="border-t-[#808080] border-l-[#808080] border-b-white border-r-white border m-0.5 flex-1 overflow-auto bg-white">
        {w.content}
      </div>
    </div>
  );
}
