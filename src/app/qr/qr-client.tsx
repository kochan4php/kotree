'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Copy, Download, FileImage } from 'lucide-react';
import { toast } from '@/lib/toast';
import { downloadBlob, downloadQrSvg, qrPngBlob } from '@/lib/qr-download';

// High-contrast pairs only — scanners need the contrast more than the style.
const COLORS = [
  { id: 'classic', label: 'Classic', fg: '#14110f', bg: '#ffffff' },
  { id: 'cream', label: 'Cream', fg: '#14110f', bg: '#fff7e9' },
  { id: 'invert', label: 'Inverted', fg: '#fff7e9', bg: '#14110f' },
];

const button =
  'inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground px-3 py-2 text-xs font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11';

export default function QrClient({ path, label }: { path: string; label: string }) {
  const [colors, setColors] = useState(COLORS[0]);
  const [url, setUrl] = useState('');
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window-only value, applied after mount by design
    setUrl(new URL(path, window.location.origin).toString());
  }, [path]);

  const svg = () => holderRef.current?.querySelector('svg') as SVGSVGElement | null;

  const saveSvg = () => {
    const element = svg();
    if (!element) return;
    downloadQrSvg(element);
    toast.success('SVG downloaded!');
  };

  const savePng = async () => {
    const element = svg();
    if (!element) return;
    try {
      downloadBlob(await qrPngBlob(element, colors.bg), 'kotree-qr.png');
      toast.success('PNG downloaded!');
    } catch {
      toast.error('Could not create the PNG');
    }
  };

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied!'),
      () => toast.error('Could not copy the link'),
    );
  };

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-black tracking-tight text-foreground">QR code</h1>
      <p className="mt-1 max-w-full truncate text-xs font-medium text-muted-foreground">
        {label} · {url || path}
      </p>

      <div
        ref={holderRef}
        style={{ backgroundColor: colors.bg }}
        className="mt-4 w-fit rounded-xl border-[3px] border-foreground p-4 shadow-[4px_4px_0_0_var(--foreground)]"
      >
        {url ? (
          <QRCode value={url} size={200} fgColor={colors.fg} bgColor={colors.bg} />
        ) : (
          <div className="h-[200px] w-[200px]" aria-hidden="true" />
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={savePng} className={`${button} bg-accent text-accent-foreground`}>
          <FileImage className="w-4 h-4" aria-hidden="true" /> Download PNG
        </button>
        <button type="button" onClick={saveSvg} className={`${button} bg-accent text-accent-foreground`}>
          <Download className="w-4 h-4" aria-hidden="true" /> Download SVG
        </button>
        <button type="button" onClick={copy} className={`${button} bg-secondary text-foreground`}>
          <Copy className="w-4 h-4" aria-hidden="true" /> Copy link
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2" role="group" aria-label="QR colours">
        {COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setColors(c)}
            aria-label={`QR, ${c.label} colours`}
            aria-pressed={colors.id === c.id}
            style={{ backgroundColor: c.bg, color: c.fg }}
            className={`h-10 w-10 rounded-lg border-[3px] border-foreground text-[10px] font-black shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer transition-transform hover:-translate-y-0.5 ${
              colors.id === c.id ? 'ring-3 ring-accent' : ''
            }`}
          >
            QR
          </button>
        ))}
      </div>
    </div>
  );
}
