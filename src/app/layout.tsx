import { Geist } from 'next/font/google';
import Script from 'next/script';
import PwaRegister from '@/components/pwa-register';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

import { ThemeProvider } from '@/components/theme-provider';

import { Toaster } from 'sonner';
import PwaInstallPrompt from '@/components/pwa-install-prompt';
import KonamiCode from '@/components/konami-code';
import GhostCursor from '@/components/ghost-cursor';
import dynamic from 'next/dynamic';

const AITerminal = dynamic(() => import('@/components/ai-terminal'));
const Background = dynamic(() => import('@/components/background'));
import PwaSyncManager from '@/components/pwa-sync-manager';
import WasmEngine from '@/components/wasm-engine';
import SelfDestruct from '@/components/self-destruct';
import Win95Mode from '@/components/win95-mode';
import WebBluetooth from '@/components/web-bluetooth';
import BossFight from '@/components/boss-fight';
import DoomMode from '@/components/doom-mode';
import VoiceCommand from '@/components/voice-command';
import InfiniteMirror from '@/components/infinite-mirror';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export { metadata };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased transition-colors duration-500`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
          {children}
          <Toaster position="bottom-center" theme="system" richColors />
          <PwaInstallPrompt />
          <PwaSyncManager />
          <KonamiCode />
          <GhostCursor />
          <div className="fixed top-4 left-3 right-3 z-50 flex items-center justify-between pointer-events-none">
            <div id="global-logo" className="pointer-events-auto">
              <WasmEngine />
            </div>
            <div className="ml-auto pointer-events-auto flex items-center gap-1.5 h-12 px-1.5 bg-accent/10 backdrop-blur-2xl border border-accent/30 rounded-full">
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
        </ThemeProvider>
      </body>
    </html>
  );
}
