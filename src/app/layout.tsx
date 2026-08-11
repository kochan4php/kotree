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
import AITerminal from '@/components/ai-terminal';
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

import { I18nProvider } from '@/contexts/i18n-context';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased transition-colors duration-500`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <I18nProvider>
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
          <AITerminal />
          <PwaRegister />
          <WasmEngine />
          <SelfDestruct />
          <Win95Mode />
          <WebBluetooth />
          <BossFight />
          <DoomMode />
          <VoiceCommand />
          <InfiniteMirror />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
