import { Space_Grotesk, Archivo_Black } from 'next/font/google';
import { headers } from 'next/headers';
import Script from 'next/script';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

import { Toaster } from 'sonner';
import PwaInstallPrompt from '@/components/pwa';
import PwaRegister from '@/components/pwa/pwa-register';
import ErrorReporter from '@/components/error-reporter';
import VitalsReporter from '@/components/analytics/vitals-reporter';
import PageViewReporter from '@/components/analytics/pageview-reporter';
import { KonamiCode } from '@/components/easter-eggs';
import { GhostCursor } from '@/components/effects';
import dynamic from 'next/dynamic';
const Background = dynamic(() => import('@/components/effects'));
import { ScrollFades } from '@/components/effects';
import HeaderBar from '@/components/layout/header-bar';
import KeyboardHelp from '@/components/layout/keyboard-help';
import ThemeSync from '@/components/layout/theme-sync';
import CommandPalette from '@/components/layout/command-palette';
import SelfDestruct from '@/components/self-destruct';
import EasterEggLauncher from '@/components/easter-eggs';
import WhatsNew from '@/components/layout/whats-new';

import { Viewport } from 'next';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' });
const archivoBlack = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo-black' });

export { metadata };

export const viewport: Viewport = {
  themeColor: '#fff7e9',
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // K54: the per-response CSP nonce set by src/proxy.ts. Next stamps it onto
  // its own inline scripts; this gives ours the same permission. Reading it
  // here is what opts routes into dynamic rendering — the cost of not needing
  // 'unsafe-inline' for scripts in production.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${archivoBlack.variable} antialiased transition-colors duration-500`}>
        {/* Resolve the stored theme before anything paints — no flash of the
            wrong theme. Logic mirrors src/lib/prefs.ts. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=JSON.parse(localStorage.getItem('kotree-prefs')||'{}')||{};var t=p.theme||'auto';var d=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.dataset.accent=p.accent||'orange';r.dataset.fx=p.fx===false?'off':'on';r.dataset.sound=p.sound===false?'off':'on';var a={orange:'#ff7c47',pink:'#ff90e8',blue:'#4cc9f0',green:'#a8e94d',violet:'#b39dfb',yellow:'#ffd93d'};var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#1a1613':(a[p.accent]||a.orange));}catch(e){}})();`,
          }}
        />
        {/* Prerender the static pages on hover (moderate eagerness) where the
            Speculation Rules API exists; the block is inert everywhere else. */}
        <script
          nonce={nonce}
          type="speculationrules"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              prerender: ['/changelog', '/about', '/now', '/projects', '/notes', '/guestbook', '/secrets'].map(
                (href) => ({ where: { href_matches: href }, eagerness: 'moderate' })
              ),
            }),
          }}
        />
        {/* First focusable element on the page: keyboard users can jump straight
            past the fixed dock into the content. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-200 focus:rounded-lg focus:border-[3px] focus:border-foreground focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-accent-foreground focus:shadow-[4px_4px_0_0_var(--foreground)]"
        >
          Skip to content
        </a>
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Feeds are advertised here so every page carries them, including the
            ones whose own metadata replaces the root alternates (K21). */}
        <link rel="alternate" type="application/rss+xml" title="Kotree RSS" href="/rss.xml" />
        <link rel="alternate" type="application/feed+json" title="Kotree JSON Feed" href="/feed.json" />
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
              title: 'text-sm font-black text-[#14110f]! font-display',
              description: 'text-xs text-[#14110f]/70! font-medium',
              actionButton: 'bg-foreground! text-background! font-bold rounded-md! px-4 py-1.5 text-xs border-2! border-foreground! hover:bg-accent! hover:text-accent-foreground! transition-colors',
              cancelButton: 'bg-transparent! text-[#6f6257]! hover:text-[#14110f]! transition-colors font-semibold',
            },
          }}
        />
        <PwaInstallPrompt />
        <PwaRegister />
        <ErrorReporter />
        <VitalsReporter />
        <PageViewReporter />
        <ThemeSync />
        <WhatsNew />
        <KonamiCode />
        <KeyboardHelp />
        <GhostCursor />
        <HeaderBar />
        <CommandPalette />

        <SelfDestruct />
        <EasterEggLauncher />
      </body>
    </html>
  );
}
