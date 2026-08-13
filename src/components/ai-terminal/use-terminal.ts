'use client';

import { useEffect, useRef, useState } from 'react';
import { socialLinks } from '@/data/social-links';
import { runCommand, INITIAL_HISTORY } from './commands';

// All AI-terminal state, effects and the command/AI submit flow
export function useTerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [history, setHistory] = useState(INITIAL_HISTORY);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const openTerminal = () => {
    setIsOpen(true);
    setIsRendered(true);
  };

  const closeTerminal = () => {
    setIsOpen(false);
    setTimeout(() => setIsRendered(false), 300); // keep mounted for the exit animation
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
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

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

  return { isOpen, isRendered, history, input, bottomRef, setInput, openTerminal, closeTerminal, handleSubmit };
}
