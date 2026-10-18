'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { socialLinks } from '@/data/social-links';
import { runCommand, INITIAL_HISTORY } from './commands';
import { completeCommand } from './complete';
import { discoverSecret } from '@/lib/secrets';

// M49: command history survives reloads (capped, best-effort in private mode)
const HISTORY_KEY = 'kotree-term-history';

function readHistory(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string').slice(-50) : [];
  } catch {
    return [];
  }
}

interface PollPayload {
  active: { question: string; options: { label: string; count: number }[]; total: number } | null;
}

// M49: `poll` prints the live question of the day
async function fetchPollReply(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('poll unavailable');
    const data = (await res.json()) as PollPayload;
    if (!data.active) return 'No question right now — check back later.';
    const lines = data.active.options.map((option) => `- ${option.label} (${option.count})`);
    return [`Question: ${data.active.question}`, ...lines, `${data.active.total} vote(s) so far.`].join('\n');
  } catch {
    return 'Could not reach the poll — the wire is asleep.';
  }
}

// All AI-terminal state, effects and the command/AI submit flow
export function useTerminal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [input, setInput] = useState('');
  // K32 + M49: ↑/↓ walk back through what was typed before, across reloads
  const [cmdHistory, setCmdHistory] = useState<string[]>(() =>
    typeof window === 'undefined' ? [] : readHistory(),
  );
  const [historyIndex, setHistoryIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WCAG 2.4.3: return focus to the trigger once the dialog is really gone.
  // Doing it inside closeTerminal races the dialog's own autoFocus when the
  // main thread is busy — the input wins and focus lands on <body> at unmount.
  useEffect(() => {
    if (!isRendered) prevFocusRef.current?.focus?.();
  }, [isRendered]);

  const openTerminal = () => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    discoverSecret('terminal');
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setIsOpen(true);
    setIsRendered(true);
  };

  const closeTerminal = () => {
    setIsOpen(false);
    exitTimerRef.current = setTimeout(() => setIsRendered(false), 300); // keep mounted for the exit animation
  };

  // Keyboard shortcuts: ` / ~ toggles, Escape closes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTerminal();
        return;
      }
      // Ignore the toggle key while typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        if (isOpen) closeTerminal();
        else openTerminal();
      }
    };
    // Opened from the command palette
    const onRequest = () => openTerminal();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('kotree:terminal', onRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('kotree:terminal', onRequest);
    };
  }, [isOpen]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    const cmd = raw.toLowerCase();
    if (!cmd) return;

    // K32: keep the raw text for ↑/↓ recall — and persist it (M49)
    setCmdHistory((prev) => {
      const next = (prev[prev.length - 1] === raw ? prev : [...prev, raw]).slice(-50);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        // private mode — history just doesn't persist
      }
      return next;
    });
    setHistoryIndex(-1);

    const result = runCommand(cmd, socialLinks);

    if (result.clear) {
      setHistory([]);
      setInput('');
      return;
    }

    setHistory(prev => [...prev, { type: 'user', text: `> ${input}` }]);
    setInput('');

    if (result.reply !== undefined) {
      setTimeout(() => {
        setHistory(prev => [...prev, { type: 'bot', text: result.reply as string }]);
      }, 400);
      // M49: `poll` follows up with live data once the placeholder lands
      if (result.fetchReply) {
        const url = result.fetchReply;
        setTimeout(async () => {
          const text = await fetchPollReply(url);
          setHistory(prev => [...prev, { type: 'bot', text }]);
        }, 800);
      }
      // K32: leave a beat so the reply is readable, then close and navigate
      if (result.navigate) {
        const target = result.navigate;
        setTimeout(() => {
          closeTerminal();
          router.push(target);
        }, 1200);
      }
      return;
    }

    // Unknown command: call Gemini AI
    setHistory(prev => [...prev, { type: 'bot', text: 'Processing...' }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();

      setHistory(prev => {
        const newHist = [...prev];
        newHist[newHist.length - 1] = { type: 'bot', text: data.reply };
        return newHist;
      });
    } catch {
      setHistory(prev => {
        const newHist = [...prev];
        newHist[newHist.length - 1] = { type: 'bot', text: 'Error connecting to neural net.' };
        return newHist;
      });
    }
  };

  // K32: ↑/↓ history, Tab completion — falling through to the dialog's own
  // Tab trap whenever there is nothing to complete (never a keyboard trap)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = historyIndex === -1 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(cmdHistory[next]);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const next = historyIndex + 1;
      if (next >= cmdHistory.length) {
        setHistoryIndex(-1);
        setInput('');
      } else {
        setHistoryIndex(next);
        setInput(cmdHistory[next]);
      }
      return;
    }
    if (e.key === 'Tab') {
      const completed = completeCommand(input);
      if (completed && completed !== input) {
        e.preventDefault();
        e.stopPropagation(); // keep the dialog's Tab trap out of it while completing
        setInput(completed);
      }
      // otherwise: let Tab move focus as usual
    }
  };

  return { isOpen, isRendered, history, input, bottomRef, setInput, openTerminal, closeTerminal, handleSubmit, handleInputKeyDown };
}
