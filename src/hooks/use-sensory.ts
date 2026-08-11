'use client';

import { useCallback } from 'react';

export function useSensory() {
  const triggerHaptic = useCallback(() => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        // A subtle 15ms vibration
        window.navigator.vibrate(15);
      } catch (e) {
        // Ignore errors on unsupported devices
      }
    }
  }, []);

  const triggerSound = useCallback(() => {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Start frequency
        oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1); // End frequency (drop)

        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, []);

  const playFeedback = useCallback(() => {
    triggerHaptic();
    triggerSound();
  }, [triggerHaptic, triggerSound]);

  return { playFeedback, triggerHaptic, triggerSound };
}
