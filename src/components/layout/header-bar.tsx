'use client';

import HeaderLeft from './header-left';
import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';

const AITerminal = dynamic(() => import('@/components/ai-terminal'));
const VoiceCommand = dynamic(() => import('@/components/voice-command'));
const WebBluetooth = dynamic(() => import('@/components/web-bluetooth'));

// Fixed top bar: logo left, dock icons right
export default function HeaderBar() {
  return (
    <div className="fixed top-4 left-4 right-4 z-60 flex items-center justify-between pointer-events-none">
      <HeaderLeft />
      <div className="ml-auto pointer-events-auto flex items-center gap-1.5 h-12 px-1.5 fluid-glass rounded-full! bg-accent/5! border-accent/20!">
        <AITerminal />
        <VoiceCommand />
        <WebBluetooth />
        <button
          onClick={() => window.dispatchEvent(new Event('kotree:search'))}
          aria-label="Search links"
          className="w-11 h-11 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-foreground hover:bg-accent/20"
        >
          <Search className="w-5 h-5 text-accent" />
        </button>
      </div>
    </div>
  );
}
