'use client';

import { useEffect, useState } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ownerToken } from '@/components/guestbook/mine';
import { downloadBlob } from '@/lib/qr-download';

// H5: the self-service half of the privacy page — read the server's copy of
// this device's guestbook messages, take it away as a file, or ask for all of
// it to be removed. The token involved is the same one the wall mints for
// edit and delete; it never leaves this browser except to prove ownership.

const button =
  'inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground px-3 py-2 text-xs font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-60 disabled:hover:translate-y-0';

interface MyEntry {
  id: string;
  message: string;
  createdAt: string;
  hidden?: boolean;
  deleted?: boolean;
}

export default function PrivacyData() {
  const [entries, setEntries] = useState<MyEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // localStorage is browser-only, so the token is read after mount. It is
  // minted once and never changes, which is why the effect can hold it locally
  // and the delete handler can simply ask for it again.
  useEffect(() => {
    const minted = ownerToken();

    let alive = true;
    fetch(`/api/privacy?owner=${encodeURIComponent(minted)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((data: { entries?: MyEntry[] }) => {
        if (alive) setEntries(data.entries ?? []);
      })
      .catch(() => {
        if (alive) setEntries([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const download = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      what: 'The guestbook messages the server holds for this browser.',
      also: 'Clicks, page views and reactions are stored as counts only — no row is ever tied to you.',
      entries,
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      'kotree-my-data.json'
    );
    toast.success('Saved as kotree-my-data.json');
  };

  const remove = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/privacy?owner=${encodeURIComponent(ownerToken())}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { deleted?: number };
      setEntries([]);
      setConfirming(false);
      toast.success(
        data.deleted ? `Removed ${data.deleted} of your messages` : 'Nothing left to remove'
      );
    } catch {
      toast.error('Could not remove them — try again');
    } finally {
      setBusy(false);
    }
  };

  const live = entries?.filter((entry) => !entry.deleted) ?? [];

  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm font-bold text-foreground" aria-live="polite">
        {entries === null
          ? 'Checking what this browser posted…'
          : live.length === 0
            ? 'This browser has no live messages on the wall.'
            : `This browser posted ${live.length} live message${live.length === 1 ? '' : 's'} to the wall.`}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={button} onClick={download} disabled={entries === null}>
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Download my data
        </button>

        {confirming ? (
          <>
            <button type="button" className={button} onClick={remove} disabled={busy}>
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Yes, remove them
            </button>
            <button type="button" className={button} onClick={() => setConfirming(false)} disabled={busy}>
              Keep them
            </button>
          </>
        ) : (
          <button
            type="button"
            className={button}
            onClick={() => setConfirming(true)}
            disabled={entries === null || live.length === 0}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete my guestbook messages
          </button>
        )}
      </div>

      <p className="text-xs font-medium leading-relaxed text-muted-foreground">
        The download covers the server copy. Everything else — theme, shelf, drafts, queued messages —
        lives in this browser alone and goes when you clear its site data.
      </p>
    </div>
  );
}
