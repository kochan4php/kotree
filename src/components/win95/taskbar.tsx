'use client';

import type { WindowState } from './types';

interface TaskbarProps {
  windows: WindowState[];
  topZ: number;
  onBringToFront: (id: string) => void;
}

export default function Taskbar({ windows, topZ, onBringToFront }: TaskbarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-white flex items-center px-1 z-[9999] justify-between">
      <div className="flex items-center gap-1">
        <button className="h-6 px-2 flex items-center gap-1 bg-[#c0c0c0] border-2 border-white border-b-black border-r-black font-bold active:border-black active:border-b-white active:border-r-white text-black shadow-[1px_1px_0px_#000]">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote pixel icon */}
          <img src="https://win98icons.alexmeub.com/icons/png/windows_slanted-1.png" className="w-4 h-4" alt="Start" />
          Start
        </button>
        <div className="flex-1 px-2 flex gap-1 items-center">
          {windows.map(w => (
            <button
              key={w.id}
              onClick={() => onBringToFront(w.id)}
              className={`h-6 px-2 truncate min-w-[100px] max-w-[150px] text-left text-black font-bold flex items-center gap-1 shadow-[1px_1px_0px_#000] ${
                w.zIndex === topZ && !w.isMinimized
                  ? 'border-2 border-black border-b-white border-r-white bg-[#e0e0e0]'
                  : 'border-2 border-white border-b-black border-r-black bg-[#c0c0c0]'
              }`}
            >
              <div
                className={`w-4 h-4 bg-contain bg-no-repeat ${
                  w.id === 'links'
                    ? "bg-[url('https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png')]"
                    : "bg-[url('https://win98icons.alexmeub.com/icons/png/user_computer-0.png')]"
                }`}
              />
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
