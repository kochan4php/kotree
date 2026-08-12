'use client';

import { useCallback, useRef } from 'react';

// Singleton AudioContext to prevent main thread freezing/flickering
let globalAudioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      globalAudioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended (browser policy)
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

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
    const audioCtx = getAudioContext();
    if (audioCtx) {
      try {
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

  const playHoverFeedback = useCallback(() => {
    const audioCtx = getAudioContext();
    if (audioCtx) {
      try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // A very subtle high pitch "tick"
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime); 
        
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime); // Very quiet
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      } catch (e) {
        // Ignore audio errors
      }
    }
  }, []);

  return { playFeedback, playHoverFeedback, triggerHaptic, triggerSound };
}
