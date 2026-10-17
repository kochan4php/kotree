import { Space_Grotesk, Archivo_Black } from 'next/font/google';
import Script from 'next/script';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

import { Toaster } from 'sonner';
import PwaInstallPrompt from '@/components/pwa';
import PwaRegister from '@/components/pwa/pwa-register';
import { KonamiCode } from '@/components/easter-eggs';
import { GhostCursor } from '@/components/effects';
import dynamic from 'next/dynamic';
const Background = dynamic(() => import('@/components/effects'));
import { ScrollFades } from '@/components/effects';
import HeaderBar from '@/components/layout/header-bar';
import KeyboardHelp from '@/components/layout/keyboard-help';
import SelfDestruct from '@/components/self-destruct';
import EasterEggLauncher from '@/components/easter-eggs';

import { Viewport } from 'next';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo-black' });

export { metadata };

export const viewport: Viewport = {
  themeColor: '#fff7e9',
  colorScheme: 'light',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${archivoBlack.variable} antialiased transition-colors duration-500`}>
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
            `,
          }}
        />
        <Background />
        <ScrollFades />

        <div className="relative z-10">
          {children}
        </div>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: 'rounded-xl! border-[3px]! border-foreground! shadow-[4px_4px_0_0_var(--foreground)]! font-bold',
              default: 'bg-[#ffe6d1]! [&_svg]:text-accent!',
              info: 'bg-[#d6ecff]! [&_svg]:text-blue-600!',
              success: 'bg-[#dcf7c4]! [&_svg]:text-green-700!',
              warning: 'bg-[#ffeeb0]! [&_svg]:text-amber-600!',
              error: 'bg-[#ffd6d6]! [&_svg]:text-red-600!',
              title: 'text-sm font-black text-foreground font-display',
              description: 'text-xs text-muted-foreground font-medium',
              actionButton: 'bg-foreground! text-background! font-bold rounded-md! px-4 py-1.5 text-xs border-2! border-foreground! hover:bg-accent! hover:text-accent-foreground! transition-colors',
              cancelButton: 'bg-transparent! text-muted-foreground! hover:text-foreground! transition-colors font-semibold',
            },
          }}
        />
        <PwaInstallPrompt />
        <PwaRegister />
        <KonamiCode />
        <KeyboardHelp />
        <GhostCursor />
        <HeaderBar />

        <SelfDestruct />
        <EasterEggLauncher />
      </body>
    </html>
  );
}
