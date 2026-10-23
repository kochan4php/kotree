import { Card } from '@/components/ui/card';
import Skeleton from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Info, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

// Every shared primitive in one place, so a change to a button, a pill or a
// card can be looked at (and screenshotted) without hunting through pages.
// Development only: a production build answers 404 here, and robots never
// learn it exists.
export const metadata: Metadata = {
  title: 'Kitchen sink',
  robots: { index: false, follow: false },
};

// Not for visitors: this page exists to be looked at on a local build. Anywhere
// that counts as deployed answers 404 instead. It cannot key off NODE_ENV —
// Turbopack does not inline that into server components, so at request time it
// is empty even in a production build — so it uses the same marker the proxy
// uses for "a real deployment".
const deployed =
  process.env.NETLIFY === 'true' || (process.env.NEXT_PUBLIC_BASE_URL ?? '').startsWith('https://');

const BUTTONS = [
  ['Primary', 'border-[3px] border-foreground bg-accent text-accent-foreground shadow-[4px_4px_0_0_var(--foreground)]'],
  ['Secondary', 'border-[3px] border-foreground bg-secondary text-foreground shadow-[4px_4px_0_0_var(--foreground)]'],
  ['Ghost', 'border-[3px] border-transparent text-muted-foreground hover:text-foreground'],
  ['Danger', 'border-[3px] border-foreground bg-red-300 text-[#14110f] shadow-[4px_4px_0_0_var(--foreground)]'],
] as const;

export default function KitchenSinkPage() {
  if (deployed) notFound();

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-3">
        <Card className="fluid-glass">
          <div className="relative z-10">
            <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground">
              Kitchen sink
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The shared pieces, in every state worth checking. Dressed for light and forced
              colours — and every pair here is already held to AA.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Buttons</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {BUTTONS.map(([label, classes]) => (
                <button
                  key={label}
                  type="button"
                  className={`neo-press rounded-lg px-4 py-2 text-sm font-black uppercase tracking-wide ${classes}`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                disabled
                className="rounded-lg border-[3px] border-foreground/40 bg-background px-4 py-2 text-sm font-black uppercase tracking-wide text-muted-foreground opacity-60"
              >
                Disabled
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Pressed states come from <code className="font-mono">.neo-press</code>; focus rings are
              global.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Pills and badges</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border-2 border-foreground bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                12 clicks
              </span>
              <span className="inline-block rounded border-2 border-foreground bg-green-300 px-1.5 text-[11px] font-black uppercase text-[#14110f]">
                Good
              </span>
              <span className="inline-block rounded border-2 border-foreground bg-amber-300 px-1.5 text-[11px] font-black uppercase text-[#14110f]">
                Needs work
              </span>
              <span className="inline-block rounded border-2 border-foreground bg-red-300 px-1.5 text-[11px] font-black uppercase text-[#14110f]">
                Poor
              </span>
              <kbd className="rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 text-[10px] font-mono font-bold text-foreground">
                /
              </kbd>
            </div>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Inputs</h2>
            <div className="mt-3 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Text
                <input
                  type="text"
                  placeholder="Type something"
                  className="rounded-lg border-[3px] border-foreground bg-background px-3 py-2 text-sm font-bold text-foreground shadow-[4px_4px_0_0_var(--foreground)] placeholder:font-medium placeholder:text-muted-foreground focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Area
                <textarea
                  rows={2}
                  placeholder="A longer thought"
                  className="rounded-lg border-[3px] border-foreground bg-background px-3 py-2 text-sm font-bold text-foreground shadow-[4px_4px_0_0_var(--foreground)] placeholder:font-medium placeholder:text-muted-foreground focus:outline-none"
                />
              </label>
            </div>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              Messages and states
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              <li className="flex items-start gap-2 text-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                Informational line, the everyday case.
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                Something found — secrets, achievements, Wrapped.
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" aria-hidden="true" />
                Warning: a queued message waiting for the network.
              </li>
              <li className="flex items-center gap-2 text-muted-foreground italic">
                Nothing here yet — the empty state.
              </li>
            </ul>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <a
                  href="/kitchen-sink-anchor"
                  className="inline-flex items-center gap-1 font-bold text-foreground underline underline-offset-2"
                >
                  Inline link
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </li>
              <li>
                <code className="rounded border-2 border-foreground/20 bg-background/60 px-1.5 py-0.5 font-mono text-xs text-foreground">
                  npm run check:bundle
                </code>
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">Loading</h2>
            <div className="mt-3">
              <Skeleton rows={3} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="relative z-10">
            <h2 className="text-xs font-black uppercase tracking-wider text-foreground">
              Plain card (no glass)
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The same border and hard shadow, without the gradient layer.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
