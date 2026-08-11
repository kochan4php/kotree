'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="absolute top-4 right-4 z-50 p-2 rounded-full border border-border bg-background/50 backdrop-blur-md shadow-sm transition-all duration-300 hover:bg-muted/60 active:scale-95"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" aria-hidden="true" />
      <Moon className="absolute top-2 left-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" aria-hidden="true" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
