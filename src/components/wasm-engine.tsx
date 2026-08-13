'use client';

import { useEffect } from 'react';

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
    <div className="flex items-center gap-2 pointer-events-none">
      <div className="flex items-center justify-center w-12 h-12 fluid-glass !rounded-full !bg-accent/5 !border-accent/20 cursor-pointer hover:!bg-accent/20 transition-colors">
        <span className="text-sm font-mono text-accent font-bold tracking-tighter relative z-10">{'<k/>'}</span>
      </div>
    </div>
  );
}
