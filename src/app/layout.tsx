import { Space_Grotesk, Archivo_Black } from 'next/font/google';
import { headers } from 'next/headers';
import { ViewTransition } from 'react';
import Script from 'next/script';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

import Toaster from '@/components/ui/toaster';
import PwaRegister from '@/components/pwa/pwa-register';
import ErrorReporter from '@/components/error-reporter';
import VitalsReporter from '@/components/analytics/vitals-reporter';
import PageViewReporter from '@/components/analytics/pageview-reporter';
import { KonamiCode } from '@/components/easter-eggs';
import dynamic from 'next/dynamic';
const Background = dynamic(() => import('@/components/effects'));
// M8: the cursor’s JS only matters on desktop after the page is idle-ish —
// load the chunk lazily instead of shipping it with the initial bundle.
const GhostCursor = dynamic(() => import('@/components/effects/ghost-cursor'));
import { ScrollFades } from '@/components/effects';
import HeaderBar from '@/components/layout/header-bar';
import KeyboardHelp from '@/components/layout/keyboard-help';
import ThemeSync from '@/components/layout/theme-sync';
import RouteFocus from '@/components/layout/route-focus';
import HashLanding from '@/components/layout/hash-landing';
import VisitTracker from '@/components/layout/visit-tracker';
import CommandPalette from '@/components/layout/command-palette';
import EasterEggLauncher from '@/components/easter-eggs';
import DeferredIslands from '@/components/layout/deferred-islands';
import { Viewport } from 'next';

// M4: both faces paint above the fold, so both stay preloaded; the explicit
// fallback metrics keep the swap from shifting layout (CLS).
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});
const archivoBlack = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-archivo-black',
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

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
            wrong theme. Logic mirrors src/lib/prefs.ts. The script also strips
            React's `vt-*` markers: they exist only so its inline streaming
            replay can wrap the first paint in a view transition, and WebKit
            crashes rendering that on narrow, tall pages. Nothing is lost —
            React's caller runs the queued work directly when nothing is
            named — and navigation transitions never read these attributes. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{try{var VA=['vt-update','vt-enter','vt-exit','vt-share','vt-name','vt-parent-enter','vt-parent-exit'],VS=function(r){for(var i=0;i<VA.length;i++){var q=r.querySelectorAll?r.querySelectorAll('['+VA[i]+']'):[];for(var j=0;j<q.length;j++)q[j].removeAttribute(VA[i]);}};VS(document);new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==='attributes')m.target.removeAttribute(m.attributeName);else for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(1===n.nodeType||9===n.nodeType)VS(n);}}}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:VA});}catch(e){}var p=JSON.parse(localStorage.getItem('kotree-prefs')||'{}')||{};var t=p.theme||'auto';var d=t==='dark'||t==='oled'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=t==='oled'?'oled':(d?'dark':'light');var hx=/^#[0-9a-f]{6}$/i;var c=p.customAccent;var custom=c&&hx.test(c.hex||'')&&hx.test(c.inkLight||'')&&hx.test(c.inkDark||'')&&hx.test(c.foreground||'');if(custom){r.dataset.accent='custom';r.style.setProperty('--accent',c.hex);r.style.setProperty('--accent-ink',d?c.inkDark:c.inkLight);r.style.setProperty('--accent-foreground',c.foreground);}else{r.dataset.accent=p.accent||'orange';}r.dataset.fx=p.fx===false?'off':'on';r.dataset.sound=p.sound===false?'off':'on';r.dataset.motion=p.reduceMotion===true?'off':'on';r.dataset.readableFont=p.readableFont===true?'on':'off';r.style.setProperty('--reading-scale',String(Math.min(1.4,Math.max(0.9,typeof p.textScale==='number'?p.textScale:1))));r.style.setProperty('--reading-leading',String(Math.min(2,Math.max(1.4,typeof p.lineHeight==='number'?p.lineHeight:1.7))));var a={orange:'#ff7c47',pink:'#ff90e8',blue:'#4cc9f0',green:'#a8e94d',violet:'#b39dfb',yellow:'#ffd93d'};var ms=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<ms.length;i++)ms[i].setAttribute('content',t==='oled'?'#000000':(d?'#1a1613':(custom?c.hex:(a[p.accent]||a.orange))));}catch(e){}})();`,
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
        {/* M69: iOS launch images. The PNGs are generated by
            scripts/gen-splash.mjs; each media query is that file's device
            list in logical points (pixels ÷ device-pixel-ratio). */}
        {[
          ['430px', '932px', '3', '1290x2796'],
          ['393px', '852px', '3', '1179x2556'],
          ['390px', '844px', '3', '1170x2532'],
          ['375px', '812px', '3', '1125x2436'],
          ['414px', '896px', '2', '828x1792'],
          ['375px', '667px', '2', '750x1334'],
        ].map(([width, height, ratio, file]) => (
          <link
            key={file}
            rel="apple-touch-startup-image"
            href={`/splash/splash-${file}.png`}
            media={`(device-width: ${width}) and (device-height: ${height}) and (-webkit-device-pixel-ratio: ${ratio})`}
          />
        ))}
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
          {/* M81: route changes crossfade through the native View Transitions
              API — React (19.3) drives the default animation, browsers without
              it navigate exactly as before. */}
          <ViewTransition>{children}</ViewTransition>
        </div>
        <Toaster />
        <PwaRegister />
        <ErrorReporter />
        <VitalsReporter />
        <PageViewReporter />
        <ThemeSync />
        <RouteFocus />
        <HashLanding />
        <VisitTracker />
        <KonamiCode />
        <KeyboardHelp />
        <GhostCursor />
        <HeaderBar />
        <CommandPalette />

        <EasterEggLauncher />
        <DeferredIslands />
      </body>
    </html>
  );
}
