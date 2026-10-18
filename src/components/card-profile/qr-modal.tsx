'use client';

import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import QRCode from 'react-qr-code';
import { Check, Copy, Download, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';

interface QRModalProps {
  isOpen: boolean;
  isRendered: boolean;
  url: string;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

// High-contrast pairs only — scanners need the contrast more than the style.
const COLORS = [
  { id: 'classic', label: 'Classic', fg: '#14110f', bg: '#ffffff' },
  { id: 'cream', label: 'Cream', fg: '#14110f', bg: '#fff7e9' },
  { id: 'invert', label: 'Inverted', fg: '#fff7e9', bg: '#14110f' },
];

export default function QRModal({ isOpen, isRendered, url, closeBtnRef, onClose }: QRModalProps) {
  // K43: soft tone when the link copy lands
  const { playSuccess } = useSensory();
  const [colors, setColors] = useState(COLORS[0]);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  // Move focus to the close button once the dialog mounts (also on reopen)
  useEffect(() => {
    if (isOpen) closeBtnRef.current?.focus();
  }, [isOpen, closeBtnRef]);

  if (!isRendered || typeof window === 'undefined') return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied!');
      playSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const downloadPng = async () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    // Re-render the SVG into a padded 512px PNG so it scans well when shared
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
    );
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('svg load failed'));
        img.src = svgUrl;
      });
      const size = 512;
      const pad = 48;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('no blob');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kotree-qr.png';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('QR code downloaded!');
    } catch {
      toast.error('Could not create the PNG');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 ${isOpen ? 'animate-modal-backdrop' : 'animate-modal-backdrop-out'}`}
        onClick={onClose}
      />
      <Card
        role="dialog"
        aria-modal="true"
        aria-label="QR Code"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          // Cycle focus inside the dialog only
          const focusables = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button'));
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className={`relative w-full max-w-sm text-center p-8 flex flex-col items-center justify-center fluid-glass will-change-transform ${
          isOpen ? 'animate-modal-content' : 'animate-modal-content-out'
        }`}
      >
        <div className="liquid-gradient opacity-40"></div>
        <button
          ref={closeBtnRef}
          onClick={onClose}
          aria-label="Close QR"
          className="absolute top-4 right-4 p-2 rounded-full bg-card border-2 border-foreground shadow-[2px_2px_0_0_var(--foreground)] text-foreground hover:bg-destructive hover:-translate-y-0.5 transition-all cursor-pointer z-20 min-w-11 min-h-11 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-2xl font-bold mb-6 text-foreground relative z-10">Scan QR Code</h3>
        <div
          ref={qrRef}
          style={{ backgroundColor: colors.bg }}
          className="p-4 rounded-xl border-[3px] border-foreground shadow-[4px_4px_0_0_var(--foreground)] w-fit mx-auto mb-5 relative z-10 transition-colors"
        >
          <QRCode
            value={url}
            size={180}
            fgColor={colors.fg}
            bgColor={colors.bg}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 relative z-10">
          <button
            type="button"
            onClick={downloadPng}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground border-[3px] border-foreground px-3 py-2 text-xs font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Download PNG
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-foreground border-[3px] border-foreground px-3 py-2 text-xs font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all cursor-pointer min-h-11"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4 relative z-10" role="group" aria-label="QR colours">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColors(c)}
              aria-label={`QR, ${c.label} colours`}
              aria-pressed={colors.id === c.id}
              style={{ backgroundColor: c.bg, color: c.fg }}
              className={`w-10 h-10 rounded-lg border-[3px] border-foreground shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer text-[10px] font-black transition-transform hover:-translate-y-0.5 ${
                colors.id === c.id ? 'ring-3 ring-accent' : ''
              }`}
            >
              QR
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed relative z-10">
          Point your camera at the QR code to open this profile on another device.
        </p>
      </Card>
    </div>,
    document.body,
  );
}
