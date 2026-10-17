'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'group/card text-card-foreground flex flex-col gap-6 rounded-lg border-[3px] border-foreground bg-card p-6 relative overflow-hidden shadow-[4px_4px_0_0_var(--foreground)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card };
