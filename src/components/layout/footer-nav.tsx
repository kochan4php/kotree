'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// M19: the site nav with aria-current on the active page (plus the
// accessibility statement, M18).
const LINKS = [
  ['About', '/about'],
  ['Now', '/now'],
  ['Uses', '/uses'],
  ['Links', '/links'],
  ['Projects', '/projects'],
  ['Notes', '/notes'],
  ['Search', '/search'],
  ['Guestbook', '/guestbook'],
  ['Secrets', '/secrets'],
  ['Stats', '/stats'],
  ['Status', '/status'],
  ['Privacy', '/privacy'],
  ['Accessibility', '/accessibility'],
] as const;

export default function FooterNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Site"
      className="grid grid-cols-2 gap-x-4 text-[13px] font-bold text-muted-foreground sm:grid-cols-3 sm:gap-x-6 sm:text-sm lg:grid-cols-4 xl:grid-cols-5"
    >
      {LINKS.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          className="group flex min-h-9 items-center gap-2 border-b border-dashed border-foreground/15 py-1 transition-colors hover:text-foreground aria-[current=page]:text-foreground sm:min-h-10"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/30 transition-colors group-hover:bg-accent-ink"
            aria-hidden="true"
          />
          {label}
        </Link>
      ))}
    </nav>
  );
}
