'use client';

import { decryptMessage } from './obfuscation';
import { LockKeyhole } from 'lucide-react';

interface EntryListProps {
  entries: { message: string; createdAt: string }[];
  decryptedIndexes: Set<number>;
  onToggle: (index: number) => void;
}

export default function EntryList({ entries, decryptedIndexes, onToggle }: EntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <LockKeyhole className="w-5 h-5 text-accent-ink" aria-hidden="true" />
        <p className="text-sm text-muted-foreground italic">No secrets yet. Be the first!</p>
      </div>
    );
  }

  return (
    <>
      {entries.map((entry, i) => {
        const isDecrypted = decryptedIndexes.has(i);
        return (
          <div
            key={i}
            onClick={() => onToggle(i)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(i);
              }
            }}
            role="button"
            tabIndex={0}
            aria-pressed={isDecrypted}
            className="text-xs font-mono break-all border-2 border-foreground bg-secondary rounded-md pl-3 py-1 shadow-[2px_2px_0_0_var(--foreground)] cursor-pointer hover:bg-muted transition-colors"
            title="Click to reveal/hide"
          >
            <p className={isDecrypted ? 'text-foreground' : 'text-muted-foreground'}>
              {isDecrypted ? '👁 ' + decryptMessage(entry.message) : entry.message}
            </p>
          </div>
        );
      })}
    </>
  );
}
