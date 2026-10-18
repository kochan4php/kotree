'use client';

import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

// M36: one copy-link button per heading. The hash is set either way, so the
// link still works when the clipboard API is unavailable or denied.
export default function HeadingAnchor({ id }: { id: string }) {
  const copy = async () => {
    const url = `${location.origin}${location.pathname}#${id}`;
    history.replaceState(null, '', `#${id}`);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy — the section link is in the address bar');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy link to this section"
      data-heading-anchor
      className="kt-anchor ml-2 inline-flex min-h-6 min-w-6 items-center justify-center align-middle text-muted-foreground hover:text-accent-ink transition-colors rounded"
    >
      <Link2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
