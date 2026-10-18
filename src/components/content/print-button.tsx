'use client';

import { Printer } from 'lucide-react';

// M86: notes print cleanly (see src/app/css/print.css) — this just hands the
// page to the browser's print / save-as-PDF dialog. Hidden on paper itself.
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden ml-auto inline-flex items-center gap-1 rounded border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-wider text-foreground cursor-pointer hover:bg-secondary"
    >
      <Printer className="w-3 h-3" aria-hidden="true" />
      Print
    </button>
  );
}
