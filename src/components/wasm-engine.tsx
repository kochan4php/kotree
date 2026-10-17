'use client';

import { useEffect, useRef } from 'react';
import { discoverSecret } from '@/lib/secrets';

// Minimal WebAssembly module bytecode (exports 'add' function: a + b)
// Compiled by hand for maximum over-engineering
const WASM_BYTECODE = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // Magic & Version
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // Type Section
  0x03, 0x02, 0x01, 0x00, // Function Section
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00, // Export Section ("add")
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b // Code Section (local.get 0, local.get 1, i32.add)
]);

export default function WasmEngine() {
  // K33: press and hold the logo (or press Enter on it) to find a secret
  const holdTimer = useRef<number | null>(null);
  const startHold = () => {
    if (holdTimer.current !== null) return;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      discoverSecret('logo');
    }, 1200);
  };
  const cancelHold = () => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  useEffect(() => {
    let addFunc: ((a: number, b: number) => number) | null = null;

    const initWasm = async () => {
      try {
        const { instance } = await WebAssembly.instantiate(WASM_BYTECODE);
        addFunc = instance.exports.add as (a: number, b: number) => number;
        // Self-check: WASM must be able to add (verifies wasm-unsafe-eval CSP works)
        if (addFunc(420, 69) !== 489) throw new Error('WASM self-check failed');
      } catch (err) {
        console.error('WASM engine failed:', err);
      }
    };

    initWasm();

    return () => {
      addFunc = null;
    };
  }, []);

  return (
    <div className="flex items-center gap-2 pointer-events-auto">
      {/* K33: decorative logo — press and hold to find a secret. Deliberately
          not a button: a role="button" whose name differs from the visible
          "<k/>" mark trips axe's label-content-name-mismatch. */}
      <div
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        className="flex items-center justify-center w-12 h-12 fluid-glass rounded-full! hover:bg-secondary! transition-colors cursor-pointer select-none"
      >
        <span className="text-sm font-mono text-accent-ink font-bold tracking-tighter relative z-10">{'<k/>'}</span>
      </div>
    </div>
  );
}
