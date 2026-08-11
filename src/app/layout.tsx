import { Geist } from 'next/font/google';
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
          {children}
          <Toaster position="bottom-center" theme="system" richColors />
          <PwaInstallPrompt />
          <PwaSyncManager />
          <KonamiCode />
          <GhostCursor />
          {/* Top Status Bar & Tools */}
          <div className="fixed top-2 left-2 right-2 z-50 flex items-center justify-between p-1">
            <WasmEngine />
            <div className="flex items-center gap-1 p-1 bg-background/40 backdrop-blur-2xl border border-border/40 rounded-full shadow-lg">
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
