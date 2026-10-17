'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { VETERAN_KEY, discoverSecret } from '@/lib/secrets';

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
    let typed = ''; // K33: rolling letters for the site-name spell

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Don't listen if already activated
      if (activated) return;

      // K33: type the site's name anywhere (outside inputs) to find a secret
      if (e.key.length === 1) {
        typed = /[a-z]/i.test(e.key) ? (typed + e.key.toLowerCase()).slice(-6) : '';
        if (typed === 'kotree') {
          discoverSecret('spell');
          typed = '';
        }
      } else {
        typed = '';
      }

      inputSequence.push(e.key);
      
      // Keep sequence length same as Konami Code
      if (inputSequence.length > KONAMI_CODE.length) {
        inputSequence.shift();
      }

      // Check if sequence matches
      const isMatch = inputSequence.every((key, index) => key === KONAMI_CODE[index]);
      
      if (isMatch && inputSequence.length === KONAMI_CODE.length) {
        setActivated(true);
        discoverSecret('konami');
        toast.success("⚠️ WARNING: BOSS FIGHT INITIATED ⚠️");

        // K35: the first Konami of each visitor earns the veteran badge —
        // confetti first, then the fight (once per visitor, deduped locally)
        let firstTime = false;
        try {
          firstTime = !localStorage.getItem(VETERAN_KEY);
          if (firstTime) localStorage.setItem(VETERAN_KEY, new Date().toISOString());
        } catch {
          // private mode — the badge just won't persist
        }
        if (firstTime) {
          toast('🎖️ Veteran badge earned — it is recorded on /secrets.');
          import('@/components/effects/confetti').then((m) => m.fireConfetti());
          setTimeout(() => window.dispatchEvent(new CustomEvent('ACTIVATE_BOSS_FIGHT')), 1400);
        } else {
          window.dispatchEvent(new CustomEvent('ACTIVATE_BOSS_FIGHT'));
        }
        
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
