'use client';

import type { ReactNode } from 'react';
import { User, FolderOpen, Power, Bomb } from 'lucide-react';
import Minesweeper from './minesweeper';
import { linksWindowContent, profileWindowContent, randomWindowPos } from './content';

interface DesktopIconsProps {
  onOpen: (
    id: string,
    title: string,
    content: ReactNode,
    x: number,
    y: number,
    width: number | string,
    height: number | string
  ) => void;
  onExit: () => void;
}

const iconLabel =
  'bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center [text-shadow:1px_1px_0_#000]';

export default function DesktopIcons({ onOpen, onExit }: DesktopIconsProps) {
  // K28: double-click like the other icons, Enter for keyboard users
  const openMinesweeper = () => {
    const pos = randomWindowPos();
    onOpen(
      'minesweeper',
      'Minesweeper.exe',
      <Minesweeper />,
      pos.x,
      pos.y,
      'min(94vw, 780px)',
      'min(80vh, 680px)'
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 items-start">
      <button
        onDoubleClick={() => {
          const pos = randomWindowPos();
          onOpen('profile', 'Profile.exe', profileWindowContent, pos.x, pos.y, 320, 300);
        }}
        className="flex flex-col items-center gap-1 group w-20 text-white"
      >
        <User className="w-10 h-10 text-[#bcd9ff]" strokeWidth={1.75} />
        <span className={iconLabel}>My Profile</span>
      </button>

      <button
        onDoubleClick={() => {
          const pos = randomWindowPos();
          onOpen('links', 'Links.folder', linksWindowContent, pos.x, pos.y, 400, 350);
        }}
        className="flex flex-col items-center gap-1 group w-20 text-white"
      >
        <FolderOpen className="w-10 h-10 text-[#ffe066]" strokeWidth={1.75} />
        <span className={iconLabel}>My Links</span>
      </button>

      <button
        onDoubleClick={openMinesweeper}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            openMinesweeper();
          }
        }}
        className="flex flex-col items-center gap-1 group w-20 text-white"
      >
        <Bomb className="w-10 h-10 text-[#d7d7d7]" strokeWidth={1.75} />
        <span className={iconLabel}>Minesweeper</span>
      </button>

      <button onClick={onExit} className="flex flex-col items-center gap-1 group w-20 text-white">
        <Power className="w-10 h-10 text-[#ff9b9b]" strokeWidth={1.75} />
        <span className={iconLabel}>Exit Win95</span>
      </button>
    </div>
  );
}
