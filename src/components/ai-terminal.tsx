'use client';

import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

import { socialLinks } from '@/data/social-links';
import { profile } from '@/data/profile';

const RESPONSES: Record<string, string> = {
  'whoami': "I am Deo Subarno (Kochan). I write code, I make games, and I exist on the internet.",
  'skills': "TypeScript, C#, HTML/CSS, Deno, React, Unity. (Frontend, Backend, Game Dev & Tools)",
  'contact': "Reach out to me on LinkedIn or GitHub (links are on the profile above!).",
  'sudo': "Nice try. This incident will be reported.",
  'ls': "To see all links, type 'ls'. To open one, type 'open <name>'.",
  'clear': "",
  'help': "Available commands: whoami, skills, contact, clear, sudo, win95, doom, ls, open",
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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } else if (cmd === 'ls') {
      response = socialLinks.map(l => `- ${l.name.toLowerCase()} (url)`).join('\n');
    } else if (cmd.startsWith('open ')) {
      const target = cmd.replace('open ', '').trim();
      const link = socialLinks.find(l => l.name.toLowerCase() === target);
      if (link) {
        response = `Opening ${link.name}...`;
        window.open(link.url, '_blank');
      } else {
        response = `Error: Link '${target}' not found.`;
      }
    } else if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    } 

    setHistory((prev) => [...prev, { type: 'user', text: `> ${input}` }]);
    setInput('');

    if (response) {
      setTimeout(() => {
        setHistory((prev) => [...prev, { type: 'bot', text: response }]);
      }, 400);
    } else {
      // Call Gemini AI
      setHistory((prev) => [...prev, { type: 'bot', text: 'Processing...' }]);
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: input }),
        });
        const data = await res.json();
        
        setHistory((prev) => {
          const newHist = [...prev];
          newHist[newHist.length - 1] = { type: 'bot', text: data.reply };
          return newHist;
        });
      } catch (err) {
        setHistory((prev) => {
          const newHist = [...prev];
          newHist[newHist.length - 1] = { type: 'bot', text: 'Error connecting to neural net.' };
          return newHist;
        });
      }
    }
  };

  return (
    <>
      {/* Dock Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-center ${isOpen ? 'bg-accent text-accent-foreground shadow-inner shadow-black/50' : 'bg-transparent text-foreground hover:bg-white/10 hover:text-accent'}`}
        aria-label="Open AI Terminal"
      >
        {isOpen ? <X className="w-6 h-6" /> : <TerminalIcon className="w-6 h-6" />}
      </button>

      {/* Terminal Window */}
      {isOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[95vw] max-w-lg z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
          <Card className="bg-[#0a0a0a]/95 backdrop-blur-2xl border border-accent/40 text-green-400 font-mono text-sm shadow-[0_0_40px_rgba(255,106,51,0.15)] overflow-hidden rounded-2xl">
            {/* Window Controls Header */}
            <div className="bg-muted/30 px-4 py-3 flex items-center gap-2 border-b border-accent/20 cursor-move">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500" onClick={() => setIsOpen(false)} />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-white/50 text-[10px] font-sans mx-auto -ml-8 flex-1 text-center font-medium tracking-wider uppercase">root@kochan:~</span>
            </div>
            
            <div className="h-64 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-accent/30 hover:scrollbar-thumb-accent/60">
              {history.map((line, i) => (
                <div key={i} className={line.type === 'user' ? 'text-blue-300 font-semibold drop-shadow-sm' : 'text-green-400 drop-shadow-sm'}>
                  {line.text}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-accent/20 flex gap-3 bg-black/40 items-center">
              <span className="text-accent font-bold">~%</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white focus:ring-0 p-0 placeholder:text-muted-foreground/30 font-medium cursor-text"
                placeholder="Ask me anything..."
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
