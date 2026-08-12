import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-12 w-full pb-8">
      <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <p className="font-medium text-foreground/80 tracking-tight">&copy; 2022-{new Date().getFullYear()} Deo Subarno</p>
          <p className="text-xs text-muted-foreground/60">
            Powered by Next.js & Tailwind
          </p>
        </div>
        
        <Link href="/changelog" className="text-xs font-medium bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors border border-border/30">
          Changelog
        </Link>
      </div>
    </footer>
  );
}
