'use client';

export function TerminatedOverlay() {
  return (
    <div className="fixed inset-0 z-9999 bg-black flex items-center justify-center pointer-events-auto">
      <div className="text-red-500 font-mono text-4xl animate-pulse tracking-widest text-center">
        SYSTEM TERMINATED
        <p className="text-sm mt-4 text-red-400/90">Battery critical. All local data purged.</p>
      </div>
    </div>
  );
}

export function CountdownOverlay({ countdown, onCancel }: { countdown: number; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-9998 bg-red-500/25 flex flex-col items-center justify-center pointer-events-auto">
      <div className="text-red-600 font-display text-6xl md:text-9xl animate-ping">{countdown}</div>
      <div className="text-red-400 font-mono mt-8 text-xl font-bold bg-[#14110f] border-[3px] border-foreground px-4 py-2 rounded">
        SELF-DESTRUCT INITIATED
      </div>
      <button
        onClick={onCancel}
        className="mt-6 px-6 py-2 bg-card text-foreground font-display border-[3px] border-foreground shadow-[4px_4px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[2px_2px_0_0_var(--foreground)] rounded-xl cursor-pointer transition-all"
      >
        CANCEL
      </button>
    </div>
  );
}
