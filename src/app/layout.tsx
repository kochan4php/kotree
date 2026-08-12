import { Geist } from 'next/font/google';
import Script from 'next/script';
import PwaRegister from '@/components/pwa-register';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';



import { Toaster } from 'sonner';
import PwaInstallPrompt from '@/components/pwa-install-prompt';
import KonamiCode from '@/components/konami-code';
import GhostCursor from '@/components/ghost-cursor';
import dynamic from 'next/dynamic';

const AITerminal = dynamic(() => import('@/components/ai-terminal'));
const Background = dynamic(() => import('@/components/background'));
import ScrollFades from '@/components/scroll-fades';
import PwaSyncManager from '@/components/pwa-sync-manager';
import HeaderLeft from '@/components/header-left';
import SelfDestruct from '@/components/self-destruct';
import Win95Mode from '@/components/win95-mode';
import WebBluetooth from '@/components/web-bluetooth';
import BossFight from '@/components/boss-fight';
import DoomMode from '@/components/doom-mode';
import VoiceCommand from '@/components/voice-command';
import InfiniteMirror from '@/components/infinite-mirror';

import { Viewport } from 'next';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export { metadata };

export const viewport: Viewport = {
  themeColor: '#201613',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased transition-colors duration-500`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          id="silence-threejs"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (!window.__consoleWarnPatched) {
                var originalWarn = console.warn;
                console.warn = function(...args) {
                  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
                  originalWarn.apply(console, args);
                };
                window.__consoleWarnPatched = true;
              }
            `
          }}
        />
        <Background />
        <ScrollFades />

        <div className="relative z-10">
          {children}
        </div>
        <Toaster 
          position="bottom-center" 
          theme="dark"
          toastOptions={{ 
            classNames: {
              toast: 'fluid-glass !rounded-2xl shadow-xl',
              default: '!bg-accent/5 !border-accent/20 [&_svg]:!text-accent',
              info: '!bg-blue-500/10 !border-blue-500/20 [&_svg]:!text-blue-500',
              success: '!bg-emerald-500/10 !border-emerald-500/20 [&_svg]:!text-emerald-500',
              warning: '!bg-orange-500/10 !border-orange-500/20 [&_svg]:!text-orange-500',
              error: '!bg-red-500/10 !border-red-500/20 [&_svg]:!text-red-500',
              title: 'text-sm font-bold text-foreground',
              description: 'text-xs text-muted-foreground font-medium',
              actionButton: '!bg-accent !text-accent-foreground font-bold !rounded-md px-4 py-1.5 text-xs hover:!bg-accent/90 transition-colors',
              cancelButton: '!bg-transparent !text-muted-foreground hover:!text-foreground transition-colors font-semibold'
            }
          }} 
        />
        <PwaInstallPrompt />
        <PwaSyncManager />
        <KonamiCode />
        <GhostCursor />
        <div className="fixed top-4 left-3 right-3 z-[60] flex items-center justify-between pointer-events-none">
          <HeaderLeft />
          <div className="ml-auto pointer-events-auto flex items-center gap-1.5 h-12 px-1.5 fluid-glass !rounded-full !bg-accent/5 !border-accent/20">
            <AITerminal />
            <VoiceCommand />
            <WebBluetooth />
          </div>
        </div>

        <PwaRegister />
        <SelfDestruct />
        <Win95Mode />
        <BossFight />
        <DoomMode />
        <InfiniteMirror />
      </body>
    </html>
  );
}
