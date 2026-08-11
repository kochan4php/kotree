'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 
  'ArrowDown', 'ArrowDown', 
  'ArrowLeft', 'ArrowRight', 
  'ArrowLeft', 'ArrowRight', 
  'b', 'a'
];

export default function KonamiCode() {
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    let inputSequence: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't listen if already activated
      if (activated) return;

      inputSequence.push(e.key);
      
      // Keep sequence length same as Konami Code
      if (inputSequence.length > KONAMI_CODE.length) {
        inputSequence.shift();
      }

      // Check if sequence matches
      const isMatch = inputSequence.every((key, index) => key === KONAMI_CODE[index]);
      
      if (isMatch && inputSequence.length === KONAMI_CODE.length) {
        setActivated(true);
        toast.success("🎮 GOD MODE ACTIVATED 🎮", {
          description: "Welcome, developer.",
          duration: 5000,
        });
        
        // Trigger a funky visual effect on the body
        document.documentElement.style.setProperty('filter', 'hue-rotate(90deg) contrast(1.2)');
        
        // Play an aggressive old-school beep
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          oscillator.type = 'square';
          oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.3);
          oscillator.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.3);
        } catch(err) {}

        // Reset after 10 seconds
        setTimeout(() => {
          document.documentElement.style.removeProperty('filter');
          setActivated(false);
          inputSequence = [];
        }, 10000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activated]);

  return null; // This component is purely logical and visual side-effects
}
