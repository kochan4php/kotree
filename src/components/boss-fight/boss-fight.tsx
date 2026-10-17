'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { profile } from '@/data/profile';
import { clientToken } from '@/lib/csrf-client';
import { createGameState, updateGame } from './game';
import { drawGame } from './render';

interface ScoreRow {
  name: string;
  score: number;
}

type Result = { outcome: 'player-dead' | 'boss-defeated'; score: number; wave: number };

export default function BossFight() {
  const [isActive, setIsActive] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handleActivate = () => {
      setResult(null);
      setIsActive(true);
    };
    window.addEventListener('ACTIVATE_BOSS_FIGHT', handleActivate);
    return () => window.removeEventListener('ACTIVATE_BOSS_FIGHT', handleActivate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isActive || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const state = createGameState(canvas.width, canvas.height);
    const bossImage = new Image();
    bossImage.src = profile.avatarUrl;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setIsActive(false); // never trap the user — Esc always exits
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Space') e.preventDefault();
      if (e.code === 'ArrowLeft') state.keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') state.keys.ArrowRight = true;
      if (e.code === 'Space') state.keys.Space = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') state.keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') state.keys.ArrowRight = false;
      if (e.code === 'Space') state.keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let animationId: number;
    const loop = () => {
      const outcome = updateGame(state, canvas.width, canvas.height);
      if (outcome !== 'playing') {
        // K27: end on a score screen (initials + leaderboard), not a bare toast
        setResult({ outcome, score: state.score, wave: state.wave });
        setIsActive(false);
        return;
      }
      drawGame(ctx, state, canvas.width, canvas.height, bossImage);
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive]);

  const exit = useCallback(() => {
    setResult(null);
    setIsActive(false);
  }, []);

  // Esc closes the score screen too
  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, exit]);

  if (!isActive && !result) return null;

  return (
    <div className="fixed inset-0 z-99999 pointer-events-auto cursor-crosshair">
      <button
        onClick={exit}
        className="absolute top-4 right-4 z-30 bg-destructive text-[#14110f] font-display px-4 py-2 border-[3px] border-white shadow-[4px_4px_0_0_rgba(255,255,255,0.85)] hover:-translate-y-0.5 transition-all pointer-events-auto"
      >
        EXIT BOSS FIGHT
      </button>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {result && (
        <ScoreScreen
          result={result}
          onRestart={() => {
            setResult(null);
            setIsActive(true);
          }}
        />
      )}
    </div>
  );
}

function ScoreScreen({ result, onRestart }: { result: Result; onRestart: () => void }) {
  const [scores, setScores] = useState<ScoreRow[] | null>(null);
  const [initials, setInitials] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'saved' | 'error'>('idle');
  const won = result.outcome === 'boss-defeated';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/boss-scores');
        const data = await res.json();
        if (!cancelled) setScores(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setScores([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    const name = initials.trim().toUpperCase().slice(0, 3);
    if (!name) return;
    setSubmitState('sending');
    try {
      const res = await fetch('/api/boss-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: result.score, _token: clientToken() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setScores(Array.isArray(data) ? data : []);
      setSubmitState('saved');
    } catch {
      setSubmitState('error');
    }
  };

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm border-[3px] border-white bg-[#14110f] p-5 text-white shadow-[6px_6px_0_0_rgba(255,255,255,0.85)]">
        <h2
          className="font-display text-2xl font-black tracking-tight"
          style={{ color: won ? '#7CFFB2' : '#ff6b6b' }}
        >
          {won ? 'BOSS DEFEATED' : 'YOU DIED'}
        </h2>
        <p className="mt-1 font-mono text-sm text-white/80">
          {won ? 'You are worthy.' : 'The boss remembers everything.'}
        </p>
        <p className="mt-3 font-mono text-sm">
          SCORE <span className="text-[#ffe066]">{result.score}</span> · WAVE {result.wave}
        </p>

        {won && submitState !== 'saved' && (
          <div className="mt-4">
            <label htmlFor="boss-initials" className="block font-mono text-xs uppercase tracking-wider text-white/70">
              Arcade initials (3)
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="boss-initials"
                value={initials}
                onChange={(e) =>
                  setInitials(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3))
                }
                maxLength={3}
                autoComplete="off"
                className="w-20 border-2 border-white bg-black px-2 py-1 font-mono text-lg uppercase tracking-widest text-white"
              />
              <button
                onClick={submit}
                disabled={submitState === 'sending' || initials.trim().length === 0}
                className="border-2 border-white bg-[#7CFFB2] px-3 py-1 font-bold text-[#14110f] transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {submitState === 'sending' ? 'Saving…' : 'Save'}
              </button>
            </div>
            {submitState === 'error' && (
              <p className="mt-1 font-mono text-xs text-[#ff6b6b]">Could not save — try again.</p>
            )}
          </div>
        )}
        {won && submitState === 'saved' && (
          <p className="mt-3 font-mono text-xs text-[#7CFFB2]">Saved to the wall of fame.</p>
        )}

        <div className="mt-4 border-t-2 border-white/30 pt-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-white/70">Top 5</h3>
          {scores === null ? (
            <p className="mt-1 font-mono text-xs text-white/60">Loading…</p>
          ) : scores.length === 0 ? (
            <p className="mt-1 font-mono text-xs text-white/60">No scores yet — be the first legend.</p>
          ) : (
            <ol className="mt-1 space-y-0.5 font-mono text-sm">
              {scores.map((row, index) => (
                <li key={`${row.name}-${row.score}-${index}`} className="flex justify-between">
                  <span className="text-white/80">
                    {index + 1}. {row.name}
                  </span>
                  <span className="text-[#ffe066]">{row.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="mt-4">
          <button
            onClick={onRestart}
            className="border-2 border-white px-3 py-1 font-bold transition-colors hover:bg-white hover:text-[#14110f]"
          >
            Play again
          </button>
        </div>
      </div>
    </div>
  );
}
