'use client';

export function TerminatedOverlay() {
  return (
    <div className="fixed inset-0 z-9999 bg-black flex items-center justify-center pointer-events-auto">
      <div className="text-red-600 font-mono text-4xl animate-pulse tracking-widest text-center">
        SYSTEM TERMINATED
        <p className="text-sm mt-4 text-red-600/50">Battery critical. All local data purged.</p>
      </div>
    </div>
  );
}

export function CountdownOverlay({ countdown, onCancel }: { countdown: number; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-9998 bg-red-900/40 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
      <div className="text-red-500 font-bold text-6xl md:text-9xl animate-ping">{countdown}</div>
      <div className="text-red-400 font-mono mt-8 text-xl font-bold bg-black/50 px-4 py-2 rounded">
        SELF-DESTRUCT INITIATED
      </div>
      <button
        onClick={onCancel}
        className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/25 text-white font-bold rounded-xl cursor-pointer transition-colors"
      >
        CANCEL
      </button>
    </div>
  );
}
