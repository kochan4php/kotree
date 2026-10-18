'use client';

import { useRef } from 'react';
import { TerminalSquare } from 'lucide-react';
import { discoverSecret } from '@/lib/secrets';

// M57: press and hold the copyright line for a moment.
export default function FooterSecret() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = () => {
    stop();
    timer.current = setTimeout(() => discoverSecret('footer'), 700);
  };

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <p
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="flex cursor-default touch-manipulation select-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <TerminalSquare className="w-3.5 h-3.5" aria-hidden="true" />
      &copy; 2022-{new Date().getFullYear()} Deo Subarno
    </p>
  );
}
