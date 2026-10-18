'use client';

import type { ReactNode } from 'react';
import { User, FolderOpen, Power, Bomb, FileText, Calculator, Paintbrush } from 'lucide-react';
import Minesweeper from './minesweeper';
import Notepad from './notepad';
import Calc from './calculator';
import Paint from './paint';
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

const iconButton = 'flex flex-col items-center gap-1 group w-20 text-white';

export default function DesktopIcons({ onOpen, onExit }: DesktopIconsProps) {
  // K28 + M48: double-click like the other icons, Enter for keyboard users
  const openApp = (
    id: string,
    title: string,
    content: ReactNode,
    width: number | string = 320,
    height: number | string = 'auto'
  ) => {
    const pos = randomWindowPos();
    onOpen(id, title, content, pos.x, pos.y, width, height);
  };

  const keyboardOpen = (
    id: string,
    title: string,
    content: ReactNode,
    width: number | string,
    height: number | string
  ) => ({
    onDoubleClick: () => openApp(id, title, content, width, height),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openApp(id, title, content, width, height);
      }
    },
  });

  return (
    <div className="flex flex-col gap-6 p-4 items-start">
      <button {...keyboardOpen('profile', 'Profile.exe', profileWindowContent, 320, 300)} className={iconButton}>
        <User className="w-10 h-10 text-[#bcd9ff]" strokeWidth={1.75} />
        <span className={iconLabel}>My Profile</span>
      </button>

      <button {...keyboardOpen('links', 'Links.folder', linksWindowContent, 400, 350)} className={iconButton}>
        <FolderOpen className="w-10 h-10 text-[#ffe066]" strokeWidth={1.75} />
        <span className={iconLabel}>My Links</span>
      </button>

      <button
        {...keyboardOpen('minesweeper', 'Minesweeper.exe', <Minesweeper />, 'min(94vw, 780px)', 'min(80vh, 680px)')}
        className={iconButton}
      >
        <Bomb className="w-10 h-10 text-[#d7d7d7]" strokeWidth={1.75} />
        <span className={iconLabel}>Minesweeper</span>
      </button>

      <button
        {...keyboardOpen('notepad', 'Notepad.exe', <Notepad />, 'min(92vw, 400px)', 'min(70vh, 380px)')}
        className={iconButton}
      >
        <FileText className="w-10 h-10 text-[#ffffff]" strokeWidth={1.75} />
        <span className={iconLabel}>Notepad</span>
      </button>

      <button
        {...keyboardOpen('calculator', 'Calculator.exe', <Calc />, 'min(90vw, 280px)', 'min(80vh, 400px)')}
        className={iconButton}
      >
        <Calculator className="w-10 h-10 text-[#ffd7d7]" strokeWidth={1.75} />
        <span className={iconLabel}>Calculator</span>
      </button>

      <button
        {...keyboardOpen('paint', 'Paint.exe', <Paint />, 'min(94vw, 430px)', 'min(80vh, 430px)')}
        className={iconButton}
      >
        <Paintbrush className="w-10 h-10 text-[#c9f5ff]" strokeWidth={1.75} />
        <span className={iconLabel}>Paint</span>
      </button>

      <button onClick={onExit} className={iconButton}>
        <Power className="w-10 h-10 text-[#ff9b9b]" strokeWidth={1.75} />
        <span className={iconLabel}>Exit Win95</span>
      </button>
    </div>
  );
}
