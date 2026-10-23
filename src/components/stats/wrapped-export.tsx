'use client';

import { Check, Download, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { qrPngBlob } from '@/lib/qr-download';

interface WrappedExportProps {
  year: number;
  clicks: number;
  share: number;
  topLink: { name: string; count: number } | null;
  busiestDay: string | null;
  messages: number;
  reaction: string | null;
  url: string;
}

// The recap as one image, drawn on a canvas by hand: no library, no round-trip
// to a server, and the colours and fonts are read from the page's own computed
// style — so the card uses the site's light palette and current accent.
const W = 1080;
const H = 1620;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export default function WrappedExport({
  year,
  clicks,
  share,
  topLink,
  busiestDay,
  messages,
  reaction,
  url,
}: WrappedExportProps) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  // The QR that gets painted into the image lives off-screen: /qr is where
  // anyone can scan or download one by hand.
  const qrRef = useRef<HTMLDivElement>(null);

  const download = async () => {
    setState('busy');
    try {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      const ink = root.getPropertyValue('--foreground').trim() || '#14110f';
      const paper = root.getPropertyValue('--background').trim() || '#fff7e9';
      const accent = root.getPropertyValue('--accent-ink').trim() || '#c2410c';
      const display = getComputedStyle(document.querySelector('h1') ?? document.body).fontFamily;
      const body = getComputedStyle(document.body).fontFamily;

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas unavailable');

      // The site's own frame at ten times the size: ink border, hard paper card
      const M = 96;
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = paper;
      ctx.fillRect(24, 24, W - 48, H - 48);

      ctx.fillStyle = accent;
      ctx.font = `700 40px ${body}`;
      ctx.fillText(`${year}`, M, 160);

      ctx.fillStyle = ink;
      ctx.font = `900 88px ${display}`;
      ctx.fillText('Kotree Wrapped', M, 266);

      ctx.fillStyle = accent;
      ctx.font = `700 30px ${body}`;
      ctx.fillText('TOTAL CLICKS', M, 372);

      ctx.fillStyle = ink;
      ctx.font = `900 170px ${display}`;
      ctx.fillText(`${clicks}`, M, 540);

      const rows: [string, string][] = [
        ['Top link', topLink ? `${topLink.name} · ${share}% of the year` : '—'],
        ['Busiest day', busiestDay ?? '—'],
        ['Messages on the wall', `${messages}`],
        ['Reigning reaction', reaction ?? '—'],
      ];

      let y = 620;
      for (const [label, value] of rows) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.setLineDash([14, 12]);
        ctx.beginPath();
        ctx.moveTo(M, y - 46);
        ctx.lineTo(W - M, y - 46);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        ctx.fillStyle = accent;
        ctx.font = `700 26px ${body}`;
        ctx.fillText(label.toUpperCase(), M, y);

        ctx.fillStyle = ink;
        ctx.font = `900 42px ${display}`;
        let lineY = y + 60;
        for (const line of wrapText(ctx, value, W - M * 2).slice(0, 2)) {
          ctx.fillText(line, M, lineY);
          lineY += 54;
        }
        y += 190;
      }

      // G6: the QR keeps the cream palette for readability — scanners need
      // contrast more than they need style. Drawn at twice its size so the
      // modules stay crisp, and a QR that will not draw never costs the image.
      const qrSvg = qrRef.current?.querySelector('svg');
      if (qrSvg) {
        try {
          const bitmap = await createImageBitmap(await qrPngBlob(qrSvg, '#fff7e9', 352, 16));
          ctx.drawImage(bitmap, M, 1330, 176, 176);
          bitmap.close();
        } catch {
          // no QR this time
        }
      }

      ctx.fillStyle = accent;
      ctx.font = `700 30px ${body}`;
      ctx.fillText(url.replace(/^https?:\/\//, ''), M + 208, 1440);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('nothing to save');

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `kotree-wrapped-${year}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking straight away can cancel the download in some browsers
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);

      setState('done');
      window.setTimeout(() => setState('idle'), 2400);
    } catch {
      setState('failed');
      window.setTimeout(() => setState('idle'), 2400);
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <div ref={qrRef} className="hidden" aria-hidden="true">
        <QRCode value={url} size={160} fgColor="#14110f" bgColor="#fff7e9" />
      </div>
      <button
        type="button"
        onClick={download}
        disabled={state === 'busy'}
        className="neo-press inline-flex items-center gap-2 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-2 text-xs font-black uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_var(--foreground)] transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60"
      >
        {state === 'busy' ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : state === 'done' ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" aria-hidden="true" />
        )}
        {state === 'done' ? 'Saved' : 'Save as an image'}
      </button>
      <span aria-live="polite" className="text-[11px] text-muted-foreground">
        {state === 'failed'
          ? 'The image could not be drawn — try again'
          : state === 'done'
            ? `kotree-wrapped-${year}.png is in your downloads`
            : 'A 1080 × 1620 PNG of the numbers above'}
      </span>
    </div>
  );
}
