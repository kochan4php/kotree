'use client';

import { useEffect, useState } from 'react';

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
  const [wasmStatus, setWasmStatus] = useState<string>('Booting WASM Virtual Machine...');
  const [calculation, setCalculation] = useState<number | null>(null);

  useEffect(() => {
    let addFunc: any = null;

    const initWasm = async () => {
      try {
        const { instance } = await WebAssembly.instantiate(WASM_BYTECODE);
        addFunc = instance.exports.add;
        setWasmStatus('WebAssembly Native Engine: ONLINE');
        
        // Use WASM to add two numbers because JS is too mainstream
        setCalculation(addFunc(420, 69));
      } catch (err) {
        console.error(err);
        setWasmStatus('WASM Engine: FAILED');
      }
    };

    initWasm();

    return () => {
      addFunc = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-50 pointer-events-none flex flex-col items-start gap-1">
      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-accent/20 px-3 py-1.5 rounded-full shadow-lg">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-[10px] font-mono text-green-400 font-medium tracking-wide uppercase">{wasmStatus}</span>
      </div>
      {calculation && (
        <div className="bg-black/40 backdrop-blur-md border border-accent/20 px-3 py-1.5 rounded-full shadow-lg">
          <span className="text-[10px] font-mono text-white/70">WASM CALC (420+69): {calculation}</span>
        </div>
      )}
    </div>
  );
}
