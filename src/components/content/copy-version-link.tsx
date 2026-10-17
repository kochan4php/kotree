'use client';

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';

// K25: deep link to a single changelog version — /changelog#3.3.0
export default function CopyVersionLink({ version }: { version: string }) {
  // K43: confirm with a soft tone when the copy lands
  const { playSuccess } = useSensory();
  const copy = () => {
    const url = `${location.origin}/changelog#${version}`;
    navigator.clipboard.writeText(url).then(
      () => {
        toast.success(`Link to ${version} copied!`);
        playSuccess();
      },
      () => toast.error('Could not copy the link'),
    );
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy link to version ${version}`}
      title={`Copy link to ${version}`}
      className="inline-flex min-h-9 items-center gap-1.5 rounded border-2 border-foreground bg-secondary px-2 py-1 text-[10px] font-mono font-bold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <Link2 className="w-3 h-3" aria-hidden="true" />
      Copy link
    </button>
  );
}
