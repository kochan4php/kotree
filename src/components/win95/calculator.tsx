'use client';

import { useCallback, useState } from 'react';
import { discoverSecret } from '@/lib/secrets';

type Op = '+' | '-' | '*' | '/';

const OPERATORS: Record<Op, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => (b === 0 ? NaN : a / b),
};

const DITTO = /^-?\d+(\.\d+)?$/;

// M48: Calculator.exe — immediate-execution, no eval in sight.
export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<Op | null>(null);
  const [fresh, setFresh] = useState(true); // next digit starts a new number

  const show = (value: number) => {
    const rounded = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8)));
    return rounded.length > 12 ? rounded.slice(0, 12) : rounded;
  };

  const inputDigit = useCallback(
    (digit: string) => {
      setDisplay((current) => {
        if (fresh) return digit;
        const next = current === '0' ? digit : current + digit;
        return next.length > 12 ? current : next;
      });
      setFresh(false);
    },
    [fresh],
  );

  const applyOperator = useCallback(
    (nextOp: Op) => {
      const current = DITTO.test(display) ? Number(display) : 0;
      const result = accumulator !== null && operator && !fresh ? OPERATORS[operator](accumulator, current) : current;
      setAccumulator(result);
      setDisplay(Number.isFinite(result) ? show(result) : 'Error');
      setOperator(nextOp);
      setFresh(true);
    },
    [accumulator, display, fresh, operator],
  );

  const equals = useCallback(() => {
    if (accumulator === null || !operator) return;
    const current = DITTO.test(display) ? Number(display) : 0;
    const result = OPERATORS[operator](accumulator, current);
    const text = Number.isFinite(result) ? show(result) : 'Error';
    setDisplay(text);
    setAccumulator(null);
    setOperator(null);
    setFresh(true);
    // M57: there is exactly one number this calculator cares about
    if (text === '1337') discoverSecret('leet');
  }, [accumulator, display, operator]);

  const clear = useCallback(() => {
    setDisplay('0');
    setAccumulator(null);
    setOperator(null);
    setFresh(true);
  }, []);

  const backspace = useCallback(() => {
    setDisplay((current) => (fresh || current.length <= 1 ? '0' : current.slice(0, -1)));
  }, [fresh]);

  const dot = useCallback(() => {
    setDisplay((current) => {
      if (fresh) return '0.';
      return current.includes('.') ? current : `${current}.`;
    });
    setFresh(false);
  }, [fresh]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    if (/^\d$/.test(key)) {
      e.preventDefault();
      inputDigit(key);
    } else if (key === '+' || key === '-' || key === '*' || key === '/') {
      e.preventDefault();
      applyOperator(key);
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      equals();
    } else if (key === 'Escape') {
      e.preventDefault();
      clear();
    } else if (key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (key === '.') {
      e.preventDefault();
      dot();
    }
  };

  const key =
    'border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-black font-bold py-2 text-sm active:border-black active:border-b-white active:border-r-white cursor-pointer';

  return (
    <div className="flex h-full flex-col bg-[#c0c0c0] p-2" onKeyDown={onKeyDown} tabIndex={0} role="group" aria-label="Calculator — type digits and operators">
      <output
        aria-label="Calculator display"
        className="mb-2 border-2 border-[#808080] bg-white px-2 py-1 text-right font-mono text-lg text-black"
      >
        {display}
      </output>
      <div className="grid flex-1 grid-cols-4 gap-1">
        <button type="button" onClick={clear} className={key}>
          C
        </button>
        <button type="button" onClick={backspace} className={key} aria-label="Backspace">
          <span aria-hidden="true">⌫</span>
        </button>
        <button type="button" onClick={() => applyOperator('/')} className={key} aria-label="Divide">
          <span aria-hidden="true">÷</span>
        </button>
        <button type="button" onClick={() => applyOperator('*')} className={key} aria-label="Multiply">
          <span aria-hidden="true">×</span>
        </button>
        {['7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={key}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => applyOperator('-')} className={key} aria-label="Minus">
          <span aria-hidden="true">−</span>
        </button>
        {['4', '5', '6'].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={key}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => applyOperator('+')} className={key} aria-label="Plus">
          <span aria-hidden="true">+</span>
        </button>
        {['1', '2', '3'].map((d) => (
          <button key={d} type="button" onClick={() => inputDigit(d)} className={key}>
            {d}
          </button>
        ))}
        <button type="button" onClick={equals} className={key} aria-label="Equals">
          <span aria-hidden="true">=</span>
        </button>
        <button type="button" onClick={() => inputDigit('0')} className={`${key} col-span-3`}>
          0
        </button>
        <button type="button" onClick={dot} className={key} aria-label="Decimal point">
          <span aria-hidden="true">.</span>
        </button>
      </div>
    </div>
  );
}
