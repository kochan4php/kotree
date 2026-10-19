import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { pageOg } from '@/lib/seo';
import { site } from '@/lib/site';
import { Accessibility } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility',
  description: 'How accessible Kotree is, what is checked every release, and what is deliberately not covered.',
  alternates: { canonical: `${site.baseUrl}/accessibility` },
  ...pageOg('accessibility', 'Accessibility — how Kotree is built to be usable'),
};

const email = socialLinks.find((link) => link.name === 'Email')?.url ?? '/guestbook';

export default function AccessibilityPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <Accessibility className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Accessibility
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Short version: Kotree aims to meet WCAG 2.2 level AA. That is checked by automated tests on every
              change, plus keyboard-only journeys — and this page is honest about the parts that are not.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Checked on every release</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>
                <strong className="text-foreground">Automatic audits</strong> — every page runs through axe in
                light, dark, high-contrast and reduced-motion modes; the command palette, terminal, QR dialog and
                preferences panel are audited too.
              </li>
              <li>
                <strong className="text-foreground">Keyboard only</strong> — a skip link opens every page, the
                command palette (<kbd className="rounded border border-foreground bg-secondary px-1 font-mono">Ctrl</kbd>{' '}
                + <kbd className="rounded border border-foreground bg-secondary px-1 font-mono">K</kbd>) navigates
                without a mouse, and focus is always visible.
              </li>
              <li>
                <strong className="text-foreground">Dragging is never the only way</strong> — a Windows 95 window
                moves with the arrow keys once its title bar has focus (hold Shift for bigger steps), and every
                dialog closes with a visible button as well as{' '}
                <kbd className="rounded border border-foreground bg-secondary px-1 font-mono">Esc</kbd>.
              </li>
              <li>
                <strong className="text-foreground">Shortcuts you can find</strong> — pressing{' '}
                <kbd className="rounded border border-foreground bg-secondary px-1 font-mono">?</kbd> opens the full
                list, and each one has a visible control or gesture that does the same job.
              </li>
              <li>
                <strong className="text-foreground">Zoom and reflow</strong> — pages survive 400% zoom (a 320&nbsp;px
                viewport) without sideways scrolling, and text still reads correctly with doubled letter and line
                spacing.
              </li>
              <li>
                <strong className="text-foreground">Comfortable targets</strong> — every button and link is at least
                24&nbsp;×&nbsp;24&nbsp;px; contrast stays at AA or better in both themes.
              </li>
              <li>
                <strong className="text-foreground">Screen readers</strong> — one main landmark, one first-level
                heading and ordered headings on every page; live updates are announced once, not twice.
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Make it yours</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>
                The preferences panel (the gear in the dock) switches theme, accent, background effects, sound and{' '}
                <strong className="text-foreground">Reduce motion</strong> — the last one stops every animation
                even when your system is happy with motion.
              </li>
              <li>
                Kotree also honours your system settings directly:{' '}
                <em>prefers-reduced-motion</em>, <em>prefers-contrast</em> and Windows High Contrast mode.
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Known limits</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>
                The canvas easter eggs — <strong className="text-foreground">Doom</strong>, the boss fight and the
                infinite mirror — are visual toys, not playable with a screen reader. They never hide or replace
                any content.
              </li>
              <li>
                The <strong className="text-foreground">Win95 shell</strong> is a nostalgia trip: windows can be
                moved with the arrow keys once the title bar is focused, but the shell itself is decoration and can
                be left at any time.
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Tell me about a barrier</h2>
            <p className="mt-3 text-sm text-muted-foreground font-medium">
              Found something that does not work for you? Email{' '}
              <a href={email} className="inline-flex min-h-6 items-center font-bold text-foreground underline underline-offset-2">
                aprodeosubarno@gmail.com
              </a>{' '}
              or leave a note on the{' '}
              <Link href="/guestbook" className="inline-flex min-h-6 items-center font-bold text-foreground underline underline-offset-2">
                guestbook
              </Link>
              . Accessibility reports get priority over ordinary bug fixes.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
