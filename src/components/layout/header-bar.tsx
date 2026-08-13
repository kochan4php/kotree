'use client';

import HeaderLeft from './header-left';
import dynamic from 'next/dynamic';

const AITerminal = dynamic(() => import('@/components/ai-terminal'));
const VoiceCommand = dynamic(() => import('@/components/voice-command'));
const WebBluetooth = dynamic(() => import('@/components/web-bluetooth'));

// Fixed top bar: logo left, dock icons right
export default function HeaderBar() {
  return (
    <div className="fixed top-4 left-3 right-3 z-[60] flex items-center justify-between pointer-events-none">
      <HeaderLeft />
      <div className="ml-auto pointer-events-auto flex items-center gap-1.5 h-12 px-1.5 fluid-glass !rounded-full !bg-accent/5 !border-accent/20">
        <AITerminal />
        <VoiceCommand />
        <WebBluetooth />
      </div>
    </div>
  );
}
