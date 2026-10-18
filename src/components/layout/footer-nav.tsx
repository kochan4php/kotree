'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// M19: the site nav with aria-current on the active page (plus the
// accessibility statement, M18).
const LINKS = [
  ['About', '/about'],
  ['Now', '/now'],
  ['Projects', '/projects'],
  ['Notes', '/notes'],
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
      className="relative z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground"
    >
      {LINKS.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? 'page' : undefined}
          className="inline-flex min-h-6 items-center hover:text-foreground hover:underline underline-offset-2 transition-colors aria-[current=page]:text-foreground aria-[current=page]:underline"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
