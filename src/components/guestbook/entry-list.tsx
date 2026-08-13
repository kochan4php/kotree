'use client';

import { decryptMessage } from './obfuscation';

interface EntryListProps {
  entries: { message: string; createdAt: string }[];
  decryptedIndexes: Set<number>;
  onToggle: (index: number) => void;
}

export default function EntryList({ entries, decryptedIndexes, onToggle }: EntryListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic text-center py-4">No secrets yet. Be the first!</p>;
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
            className="text-xs font-mono break-all border-l-2 border-red-500/40 pl-3 py-1 bg-muted/10 rounded-r-md cursor-pointer hover:bg-muted/20 transition-colors"
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
