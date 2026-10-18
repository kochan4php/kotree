import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import FooterNav from './footer-nav';
import FooterSecret from './footer-secret';

export default function Footer() {
  return (
    <footer className="mt-3 w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="fluid-glass p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-6 text-sm relative group overflow-hidden">
        <div className="liquid-gradient opacity-30"></div>
        
        <div className="flex flex-col items-center sm:items-start gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-foreground"></span>
            </span>
            <p className="font-bold text-foreground tracking-widest text-xs uppercase">
              System Online
            </p>
          </div>
          <FooterSecret />
        </div>

        <FooterNav />

        <Link 
          href="/changelog" 
          className="relative z-10 group/btn flex items-center gap-2 px-6 py-2.5 fluid-glass rounded-full! text-xs font-black uppercase tracking-wider text-foreground hover:bg-secondary! hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)]! transition-all duration-300 min-h-11"
        >
          <div className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent-ink" />
            <span>Changelog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </footer>
  );
}
