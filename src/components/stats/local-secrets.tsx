'use client';

import { useEffect, useState } from 'react';
import { SECRETS, discoveredSecrets } from '@/lib/secrets';

// Secrets are deliberately device-local (no accounts, no sync), so the public
// stats pages can only ever show the visitor their own tally.
export default function LocalSecrets() {
  const [found, setFound] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
    setFound(discoveredSecrets().length);
    const onSecrets = () => setFound(discoveredSecrets().length);
    window.addEventListener('kotree:secrets', onSecrets);
    return () => window.removeEventListener('kotree:secrets', onSecrets);
  }, []);

  return (
    <span>
      You&apos;ve found <strong className="text-foreground">{found}</strong>/{SECRETS.length} secrets on this device
    </span>
  );
}
