// M69: generates the apple-touch-startup-image PNGs with Playwright — no image
// library, no hand-drawn files. Every size below has a matching media query in
// src/app/layout.tsx; change both together, then run:
//   npm run gen:splash
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The exact PNG pixels iOS asks for on common iPhones
const DEVICES = [
  { w: 1290, h: 2796 }, // iPhone 15 Pro Max
  { w: 1179, h: 2556 }, // iPhone 15 / 14 Pro
  { w: 1170, h: 2532 }, // iPhone 13 / 14
  { w: 1125, h: 2436 }, // iPhone X / XS / 11 Pro
  { w: 828, h: 1792 }, // iPhone XR / 11
  { w: 750, h: 1334 }, // iPhone 8 / SE2 / SE3
];

const html = (w, h) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}
  body{background:#fff7e9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(h / 40)}px;
    font-family:'Archivo Black','Arial Black',system-ui,sans-serif;color:#14110f}
  .name{font-size:${Math.round(w / 7)}px;letter-spacing:-0.02em;text-shadow:${Math.round(w / 90)}px ${Math.round(w / 90)}px 0 #ff7c47}
  .sub{font-family:ui-monospace,'Courier New',monospace;font-size:${Math.round(w / 30)}px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase}
  .dot{width:${Math.round(w / 8)}px;height:${Math.round(w / 8)}px;background:#ff7c47;border:${Math.round(w / 220)}px solid #14110f;
    border-radius:999px;box-shadow:${Math.round(w / 130)}px ${Math.round(w / 130)}px 0 #14110f}
</style></head><body>
  <div class="dot"></div><div class="name">Kotree</div><div class="sub">Deo Subarno</div>
</body></html>`;

const outDir = path.join(__dirname, '..', 'public', 'splash');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { w, h } of DEVICES) {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(html(w, h));
    await page.screenshot({ path: path.join(outDir, `splash-${w}x${h}.png`) });
    console.log(`splash-${w}x${h}.png`);
  }
} finally {
  await browser.close();
}
