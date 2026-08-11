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
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
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
        toast.success("⚠️ WARNING: BOSS FIGHT INITIATED ⚠️");
        
        window.dispatchEvent(new CustomEvent('ACTIVATE_BOSS_FIGHT'));
        
        setTimeout(() => {
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
