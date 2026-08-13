import Link from 'next/link';
import { Sparkles, TerminalSquare, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-4 w-full pb-4">
      <div className="fluid-glass p-6 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-6 text-sm relative group overflow-hidden">
        <div className="liquid-gradient opacity-30"></div>
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-linear-to-r from-accent/0 via-accent/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-all duration-[1.5s] -translate-x-full group-hover:translate-x-full ease-in-out" />
        
        <div className="flex flex-col items-center sm:items-start gap-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
            </span>
            <p className="font-bold text-foreground tracking-widest text-xs uppercase opacity-80">
              System Online
            </p>
          </div>
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 opacity-60">
            <TerminalSquare className="w-3.5 h-3.5" />
            &copy; 2022-{new Date().getFullYear()} Deo Subarno
          </p>
        </div>
        
        <Link 
          href="/changelog" 
          className="relative z-10 group/btn flex items-center gap-2 px-6 py-2.5 fluid-glass rounded-full! text-xs font-black uppercase tracking-wider bg-accent/10! border-accent/30! text-accent hover:bg-accent/20! hover:scale-105 hover:shadow-[0_0_25px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] transition-all duration-300 min-h-11"
        >
          <div className="relative z-10 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            <span>Changelog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </footer>
  );
}
