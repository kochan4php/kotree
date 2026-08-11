'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', onMouseMove);
    return () => card.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div
      ref={cardRef}
      data-slot="card"
      className={cn(
        'group/card solid-card text-card-foreground flex flex-col gap-6 rounded-lg border p-6 shadow-sm relative overflow-hidden',
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition duration-300 group-hover/card:opacity-100 z-0"
        style={{
          background: 'radial-gradient(600px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(255,255,255,0.06), transparent 40%)',
        }}
      />
      {children}
    </div>
  );
}

export { Card };
