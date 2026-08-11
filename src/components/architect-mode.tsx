'use client';

import { useEffect, useState } from 'react';
import { socialLinks } from '@/data/social-links';
import { profile } from '@/data/profile';

export default function ArchitectMode() {
  const [isActive, setIsActive] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([
    'Welcome to The Architect.',
    'GUI permanently disabled.',
    'Type "help" for a list of available commands.'
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsActive(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input.trim().toLowerCase();
      setInput('');
      
      const newHistory = [...history, `root@kotree:~$ ${cmd}`];
      
      if (cmd === 'help') {
        newHistory.push('Commands: ls (list links), open <name> (open link), whoami, exit');
      } else if (cmd === 'ls') {
        socialLinks.forEach(link => {
          newHistory.push(`- ${link.name.toLowerCase()} (url)`);
        });
      } else if (cmd.startsWith('open ')) {
        const target = cmd.replace('open ', '').trim();
        const link = socialLinks.find(l => l.name.toLowerCase() === target);
        if (link) {
          newHistory.push(`Opening ${link.name}...`);
          window.open(link.url, '_blank');
        } else {
          newHistory.push(`Error: Link '${target}' not found.`);
        }
      } else if (cmd === 'whoami') {
        newHistory.push(`Name: ${profile.name}`);
        newHistory.push(`Bio: ${profile.bio}`);
      } else if (cmd === 'exit') {
        setIsActive(false);
        return;
      } else if (cmd !== '') {
        newHistory.push(`bash: ${cmd}: command not found`);
      }
      
      setHistory(newHistory);
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black text-[#00ff00] font-mono p-4 overflow-y-auto selection:bg-[#00ff00] selection:text-black">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-50 opacity-20 pointer-events-none" />
      <div className="max-w-3xl mx-auto flex flex-col gap-1 w-full relative z-10 text-sm md:text-base shadow-[0_0_10px_#00ff00_inset] p-4 min-h-[90vh] border border-[#00ff00]/30">
        {history.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap">{line}</div>
        ))}
        <div className="flex gap-2 items-center mt-2">
          <span className="shrink-0 text-white">root@kotree:~$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleCommand}
            className="bg-transparent border-none outline-none flex-1 text-[#00ff00] caret-[#00ff00] font-mono"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
