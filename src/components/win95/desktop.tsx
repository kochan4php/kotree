'use client';

import type { ReactNode } from 'react';
import { linksWindowContent, profileWindowContent, randomWindowPos } from './content';

interface DesktopIconsProps {
  onOpen: (
    id: string,
    title: string,
    content: ReactNode,
    x: number,
    y: number,
    width: number,
    height: number
  ) => void;
  onExit: () => void;
}

const iconLabel =
  'bg-transparent group-focus:bg-[#000080] group-focus:text-white group-focus:border-dotted group-focus:border px-1 text-center';

export default function DesktopIcons({ onOpen, onExit }: DesktopIconsProps) {
  return (
    <div className="flex flex-col gap-6 p-4 items-start">
      <button
        onDoubleClick={() => {
          const pos = randomWindowPos();
          onOpen('profile', 'Profile.exe', profileWindowContent, pos.x, pos.y, 320, 300);
        }}
        className="flex flex-col items-center gap-1 group w-20 text-white"
      >
        <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/user_computer-0.png')] bg-contain bg-no-repeat" />
        <span className={iconLabel}>My Profile</span>
      </button>

      <button
        onDoubleClick={() => {
          const pos = randomWindowPos();
          onOpen('links', 'Links.folder', linksWindowContent, pos.x, pos.y, 400, 350);
        }}
        className="flex flex-col items-center gap-1 group w-20 text-white"
      >
        <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png')] bg-contain bg-no-repeat" />
        <span className={iconLabel}>My Links</span>
      </button>

      <button onClick={onExit} className="flex flex-col items-center gap-1 group w-20 text-white">
        <div className="w-10 h-10 bg-[url('https://win98icons.alexmeub.com/icons/png/shut_down_normal-0.png')] bg-contain bg-no-repeat" />
        <span className={iconLabel}>Exit Win95</span>
      </button>
    </div>
  );
}
