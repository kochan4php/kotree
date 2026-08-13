'use client';

import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';
import QRCode from 'react-qr-code';
import { X } from 'lucide-react';

interface QRModalProps {
  isOpen: boolean;
  isRendered: boolean;
  url: string;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export default function QRModal({ isOpen, isRendered, url, closeBtnRef, onClose }: QRModalProps) {
  if (!isRendered || typeof window === 'undefined') return null;

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
          if (e.key === 'Tab') {
            // Only the close button is focusable inside — keep Tab in the dialog
            e.preventDefault();
            closeBtnRef.current?.focus();
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
          className="absolute top-4 right-4 p-2 rounded-full bg-accent/10 hover:bg-red-500/20 text-accent hover:text-red-500 transition-colors cursor-pointer z-20 min-w-11 min-h-11 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-2xl font-bold mb-6 text-foreground relative z-10">Scan QR Code</h3>
        <div className="bg-white p-4 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.2)] ring-4 ring-white/20 w-fit mx-auto mb-6 relative z-10">
          <QRCode value={url} size={180} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
        </div>
        <p className="text-base text-muted-foreground leading-relaxed relative z-10">
          Point your camera at the QR code to open this profile on another device.
        </p>
      </Card>
    </div>,
    document.body
  );
}
