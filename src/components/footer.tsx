import { Heart } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-8 mb-2">
      <div className="flex items-center justify-center gap-3 text-muted-foreground/60 text-xs">
        <span className="h-px w-10 bg-border"></span>
        <Heart className="w-3.5 h-3.5 text-accent/70 fill-accent/20" />
        <span className="h-px w-10 bg-border"></span>
      </div>

      <div className="text-center mt-4 text-sm text-muted-foreground">
        <p>&copy; Copyright 2022-{new Date().getFullYear()} Deo Subarno</p>
        <p className="mt-1 text-muted-foreground/80">
          Made with care. Built with Next.js and Tailwind CSS.
        </p>
        <Link href="/changelog" className="mt-2 inline-block text-accent hover:underline">
          Changelog
        </Link>
      </div>
    </footer>
  );
}
