import type { ReactNode } from 'react';

// M72: one consistent empty state for every list that can be empty — a tiny
// CSS illustration (no image assets to load), a bold line, an optional hint.
export default function EmptyState({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <div aria-hidden="true" className="relative h-14 w-20">
        <div className="absolute inset-x-3 top-2.5 h-9 rounded border-[3px] border-dashed border-foreground/40" />
        <div className="absolute left-1 top-0 h-4 w-4 rotate-12 rounded-sm border-2 border-foreground bg-accent shadow-[2px_2px_0_0_var(--foreground)]" />
        <div className="absolute right-1.5 bottom-0 h-3.5 w-3.5 -rotate-12 rounded-full border-2 border-foreground bg-secondary shadow-[2px_2px_0_0_var(--foreground)]" />
      </div>
      <p className="text-sm font-bold text-foreground">{title}</p>
      {hint && <p className="max-w-xs text-xs font-medium text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
