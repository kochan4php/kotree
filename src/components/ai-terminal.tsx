'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

const RESPONSES: Record<string, string> = {
  'whoami': "I am Deo Subarno (Kochan). I write code, I make games, and I exist on the internet.",
  'skills': "TypeScript, C#, HTML/CSS, Deno, React, Unity. (Frontend, Backend, Game Dev & Tools)",
  'contact': "Reach out to me on LinkedIn or GitHub (links are on the profile above!).",
  'sudo': "Nice try. This incident will be reported.",
  'clear': "",
  'help': "Available commands: whoami, skills, contact, clear, sudo, win95, doom",
};

export default function AITerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<{ type: 'user' | 'bot'; text: string }[]>([
    { type: 'bot', text: 'Initializing Kochan AI Clone v1.0.0...' },
    { type: 'bot', text: "Type 'help' to see available commands." }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    let response = RESPONSES[cmd];

    if (cmd === 'win95') {
      window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
      response = "Booting Windows 95...";
    } else if (cmd === 'doom') {
      window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
      response = "IDDQD. Initializing DOOM Engine...";
    } else if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    } else if (!response) {
      response = `Command not found: ${cmd}. Type 'help' for available commands.`;
    }

    setHistory((prev) => [...prev, { type: 'user', text: `> ${input}` }]);
    
    // Simulate AI thinking delay
    setTimeout(() => {
      setHistory((prev) => [...prev, { type: 'bot', text: response }]);
    }, 400);

    setInput('');
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-3 bg-accent text-accent-foreground rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
        aria-label="Open AI Terminal"
      >
        {isOpen ? <X className="w-6 h-6" /> : <TerminalIcon className="w-6 h-6" />}
      </button>

      {/* Terminal Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <Card className="bg-black/90 border border-accent/40 backdrop-blur-md text-green-400 font-mono text-xs shadow-2xl shadow-accent/20 overflow-hidden">
            <div className="bg-muted/20 px-3 py-2 flex items-center justify-between border-b border-accent/20">
              <span className="text-white/70 font-sans text-xs">root@kochan:~</span>
            </div>
            
            <div className="h-64 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-accent/20">
              {history.map((line, i) => (
                <div key={i} className={line.type === 'user' ? 'text-white' : 'text-green-400'}>
                  {line.text}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-accent/20 flex gap-2">
              <span className="text-accent">~%</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0"
                autoFocus
                spellCheck={false}
              />
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
