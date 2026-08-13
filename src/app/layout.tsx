import { Geist } from 'next/font/google';
import Script from 'next/script';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

import { Toaster } from 'sonner';
import PwaInstallPrompt from '@/components/pwa';
import { KonamiCode } from '@/components/easter-eggs';
import { GhostCursor } from '@/components/effects';
import dynamic from 'next/dynamic';

const Background = dynamic(() => import('@/components/effects'));
import { ScrollFades } from '@/components/effects';
import HeaderBar from '@/components/layout/header-bar';
import SelfDestruct from '@/components/self-destruct';
import EasterEggLauncher from '@/components/easter-eggs';

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
          theme="dark"
          toastOptions={{
            classNames: {
              toast: 'fluid-glass rounded-2xl! shadow-xl',
              default: 'bg-accent/5! border-accent/20! [&_svg]:text-accent!',
              info: 'bg-blue-500/10! border-blue-500/20! [&_svg]:text-blue-500!',
              success: 'bg-emerald-500/10! border-emerald-500/20! [&_svg]:text-emerald-500!',
              warning: 'bg-orange-500/10! border-orange-500/20! [&_svg]:text-orange-500!',
              error: 'bg-red-500/10! border-red-500/20! [&_svg]:text-red-500!',
              title: 'text-sm font-bold text-foreground',
              description: 'text-xs text-muted-foreground font-medium',
              actionButton: 'bg-accent! text-accent-foreground! font-bold rounded-md! px-4 py-1.5 text-xs hover:bg-accent/90! transition-colors',
              cancelButton: 'bg-transparent! text-muted-foreground! hover:text-foreground! transition-colors font-semibold',
            },
          }}
        />
        <PwaInstallPrompt />
        <KonamiCode />
        <GhostCursor />
        <HeaderBar />

        <SelfDestruct />
        <EasterEggLauncher />
      </body>
    </html>
  );
}
