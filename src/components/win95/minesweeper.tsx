'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// K28: Minesweeper for the Win95 shell. Pure DOM + CSS (no canvas, no deps).
// Mouse and keyboard are equal citizens: arrows move, Enter digs, F flags.
// Mines are planted after the first dig, so the first click is never fatal.

type Level = 'beginner' | 'intermediate' | 'expert';
type Status = 'idle' | 'playing' | 'won' | 'lost';

const LEVELS: Record<Level, { label: string; cols: number; rows: number; mines: number }> = {
  beginner: { label: 'Beginner', cols: 9, rows: 9, mines: 10 },
  intermediate: { label: 'Intermediate', cols: 16, rows: 16, mines: 40 },
  expert: { label: 'Expert', cols: 30, rows: 16, mines: 99 },
};

interface Cell {
  mine: boolean;
  adj: number;
  revealed: boolean;
  flagged: boolean;
}

const BEST_KEY = 'kotree-minesweeper-best-v1';
const NUMBER_COLORS = [
  '',
  'text-[#0000ff]',
  'text-[#008000]',
  'text-[#ff0000]',
  'text-[#000080]',
  'text-[#800000]',
  'text-[#008080]',
  'text-[#000000]',
  'text-[#808080]',
];

function emptyBoard(level: Level): Cell[] {
  const { cols, rows } = LEVELS[level];
  return Array.from({ length: cols * rows }, () => ({ mine: false, adj: 0, revealed: false, flagged: false }));
}

function neighbors(index: number, cols: number, rows: number): number[] {
  const x = index % cols;
  const y = Math.floor(index / cols);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) out.push(ny * cols + nx);
    }
  }
  return out;
}

// First-click-safe mine placement: the clicked cell and its neighbours stay
// clear, so opening on an empty square is guaranteed.
function plantMines(board: Cell[], safeIndex: number, level: Level): void {
  const { cols, rows, mines } = LEVELS[level];
  const safe = new Set([safeIndex, ...neighbors(safeIndex, cols, rows)]);
  const candidates = board.map((_, i) => i).filter((i) => !safe.has(i));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const index of candidates.slice(0, mines)) board[index].mine = true;
  for (let i = 0; i < board.length; i++) {
    board[i].adj = neighbors(i, cols, rows).filter((n) => board[n].mine).length;
  }
}

function readBests(): Partial<Record<Level, number>> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function cellLabel(cell: Cell, index: number, cols: number): string {
  const row = Math.floor(index / cols) + 1;
  const column = (index % cols) + 1;
  const what = cell.revealed ? (cell.mine ? 'Mine' : cell.adj > 0 ? String(cell.adj) : 'Empty') : cell.flagged ? 'Flagged' : 'Hidden';
  return `${what}, row ${row} column ${column}`;
}

export default function Minesweeper() {
  const [level, setLevel] = useState<Level>('beginner');
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard('beginner'));
  const [status, setStatus] = useState<Status>('idle');
  const [seconds, setSeconds] = useState(0);
  const [focused, setFocused] = useState(0);
  const [bests, setBests] = useState<Partial<Record<Level, number>>>({});
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const { cols, rows, mines, label } = LEVELS[level];
  const flags = board.filter((cell) => cell.flagged).length;
  const remaining = mines - flags;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only, applied after mount by design
    setBests(readBests());
  }, []);

  useEffect(() => {
    if (status !== 'playing') return;
    const timer = setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const reset = useCallback((nextLevel: Level) => {
    setLevel(nextLevel);
    setBoard(emptyBoard(nextLevel));
    setStatus('idle');
    setSeconds(0);
    setFocused(0);
  }, []);

  const dig = useCallback(
    (index: number) => {
      if (status === 'won' || status === 'lost') return;
      const next = board.map((cell) => ({ ...cell }));
      const cell = next[index];
      if (cell.revealed || cell.flagged) return;

      const starting = status === 'idle';
      if (starting) plantMines(next, index, level);

      if (cell.mine) {
        for (const c of next) if (c.mine) c.revealed = true;
        setBoard(next);
        setStatus('lost');
        return;
      }

      // Flood-fill from the dug cell through zero-adjacency squares
      const queue = [index];
      while (queue.length > 0) {
        const i = queue.pop()!;
        const c = next[i];
        if (c.revealed || c.flagged) continue;
        c.revealed = true;
        if (c.adj === 0) for (const n of neighbors(i, cols, rows)) if (!next[n].revealed) queue.push(n);
      }

      setBoard(next);
      if (starting) setStatus('playing');

      if (!next.some((c) => !c.mine && !c.revealed)) {
        setStatus('won');
        const prevBest = bests[level];
        if (prevBest === undefined || seconds < prevBest) {
          const updated = { ...bests, [level]: seconds };
          setBests(updated);
          try {
            localStorage.setItem(BEST_KEY, JSON.stringify(updated));
          } catch {
            // private mode — best time just stays in memory for this session
          }
        }
      }
    },
    [board, status, level, cols, rows, bests, seconds]
  );

  const flag = useCallback(
    (index: number) => {
      if (status === 'won' || status === 'lost') return;
      setBoard((prev) =>
        prev.map((cell, i) => (i === index && !cell.revealed ? { ...cell, flagged: !cell.flagged } : cell))
      );
    },
    [status]
  );

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const x = focused % cols;
    const y = Math.floor(focused / cols);
    let nx = x;
    let ny = y;
    switch (event.key) {
      case 'ArrowLeft':
        nx = Math.max(0, x - 1);
        break;
      case 'ArrowRight':
        nx = Math.min(cols - 1, x + 1);
        break;
      case 'ArrowUp':
        ny = Math.max(0, y - 1);
        break;
      case 'ArrowDown':
        ny = Math.min(rows - 1, y + 1);
        break;
      case 'Home':
        nx = 0;
        break;
      case 'End':
        nx = cols - 1;
        break;
      case 'Enter':
      case ' ':
        // preventDefault stops the native button click so a key press digs once
        event.preventDefault();
        dig(focused);
        return;
      case 'f':
      case 'F':
        event.preventDefault();
        flag(focused);
        return;
      default:
        return;
    }
    event.preventDefault();
    const nextFocus = ny * cols + nx;
    setFocused(nextFocus);
    buttonsRef.current[nextFocus]?.focus();
  };

  const face = status === 'won' ? '😎' : status === 'lost' ? '😵' : '🙂';
  const statusText =
    status === 'won'
      ? `You won on ${label} in ${seconds} seconds.`
      : status === 'lost'
        ? 'Boom! You hit a mine. Press the face to try again.'
        : `Minesweeper, ${label}, ${remaining} mines remaining.`;

  return (
    <div className="flex flex-col gap-2 bg-[#c0c0c0] p-2 text-black" style={{ fontFamily: '"MS Sans Serif", Tahoma, sans-serif' }}>
      <p aria-live="polite" className="sr-only">
        {statusText}
      </p>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-2 border-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] p-2">
        <span className="border-2 border-[#808080] border-b-white border-r-white bg-black px-2 py-1 font-mono text-xl text-[#ff2d2d] tabular-nums">
          {String(Math.max(-99, remaining)).padStart(3, '0')}
        </span>
        <button
          onClick={() => reset(level)}
          aria-label="New game"
          className="h-10 w-10 border-2 border-white border-b-black border-r-black bg-[#c0c0c0] text-xl transition-transform active:scale-95"
        >
          {face}
        </button>
        <span className="border-2 border-[#808080] border-b-white border-r-white bg-black px-2 py-1 font-mono text-xl text-[#ff2d2d] tabular-nums">
          {String(seconds).padStart(3, '0')}
        </span>
      </div>

      {/* Difficulty */}
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(LEVELS) as Level[]).map((key) => (
          <button
            key={key}
            onClick={() => reset(key)}
            aria-pressed={level === key}
            className={`border-2 px-2 py-1 text-xs ${
              level === key
                ? 'border-[#808080] border-b-white border-r-white bg-[#a8a8a8]'
                : 'border-white border-b-black border-r-black bg-[#c0c0c0] active:border-[#808080]'
            }`}
          >
            {LEVELS[key].label}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs">
          Best: {bests[level] !== undefined ? `${bests[level]}s` : '—'}
        </span>
      </div>

      {/* Board */}
      <div className="overflow-auto border-2 border-[#808080] border-b-white border-r-white bg-[#c0c0c0] p-1">
        <div
          role="grid"
          aria-label="Minesweeper board"
          aria-rowcount={rows}
          aria-colcount={cols}
          onKeyDown={onGridKeyDown}
          className="inline-block"
        >
          {Array.from({ length: rows }, (_, y) => (
            <div key={y} role="row" className="flex">
              {Array.from({ length: cols }, (_, x) => {
                const index = y * cols + x;
                const cell = board[index];
                return (
                  <button
                    key={index}
                    ref={(el) => {
                      buttonsRef.current[index] = el;
                    }}
                    role="gridcell"
                    aria-label={cellLabel(cell, index, cols)}
                    tabIndex={index === focused ? 0 : -1}
                    onFocus={() => setFocused(index)}
                    onClick={() => dig(index)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      flag(index);
                    }}
                    className={`flex h-6 w-6 items-center justify-center border-2 text-[13px] font-bold leading-none select-none ${
                      cell.revealed
                        ? `border-[#bdbdbd] bg-[#c0c0c0] ${cell.mine ? '' : NUMBER_COLORS[cell.adj]}`
                        : 'border-white border-b-[#808080] border-r-[#808080] bg-[#c0c0c0] active:border-[#808080]'
                    } focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-dashed focus-visible:outline-black`}
                  >
                    {cell.revealed
                      ? cell.mine
                        ? '💣'
                        : cell.adj > 0
                          ? cell.adj
                          : ''
                      : cell.flagged
                        ? '🚩'
                        : ''}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs">Arrows move · Enter digs · F flags · Right-click flags</p>
    </div>
  );
}
