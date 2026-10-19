import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import FooterNav from './footer-nav';
import FooterSecret from './footer-secret';

// Two tiers instead of one long line: identity and the one call to action on
// top, the site map as aligned columns underneath, the copyright last. A row
// of thirteen links reads as a stretched sentence at any width wider than a
// phone, which is what this replaces.
export default function Footer() {
  return (
    <footer className="mt-3 w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="fluid-glass p-5 sm:p-6 rounded-lg relative overflow-hidden">
        <div className="liquid-gradient opacity-30"></div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-foreground"></span>
            </span>
            <p className="font-bold text-foreground tracking-widest text-xs uppercase">
              System Online
            </p>
          </div>

          <Link
            href="/changelog"
            className="relative z-10 group/btn flex items-center gap-2 px-5 py-2.5 fluid-glass rounded-full! text-xs font-black uppercase tracking-wider text-foreground hover:bg-secondary! hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]! transition-all duration-300 min-h-11"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-ink" aria-hidden="true" />
            <span>Changelog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

        {/* The site map: columns that stay aligned from phone to ultrawide */}
        <div className="relative z-10 mt-4 border-t-2 border-dashed border-foreground/25 pt-3">
          <FooterNav />
        </div>

        <div className="relative z-10 mt-3 border-t border-dashed border-foreground/25 pt-3">
          <FooterSecret />
        </div>
      </div>
    </footer>
  );
}
