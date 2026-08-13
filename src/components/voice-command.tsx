'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { socialLinks } from '@/data/social-links';

// Minimal Web Speech API types (not in TS's DOM lib)
type SpeechRecognitionEventLike = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [isTelepathy, setIsTelepathy] = useState(false);
  const [isTelepathyRendered, setIsTelepathyRendered] = useState(false);
  const [telepathyInput, setTelepathyInput] = useState('');

  const openTelepathy = () => {
    setIsTelepathy(true);
    setIsTelepathyRendered(true);
  };

  const closeTelepathy = () => {
    setIsTelepathy(false);
    // Keep it mounted briefly so the exit animation plays
    setTimeout(() => setIsTelepathyRendered(false), 200);
  };

  useEffect(() => {
    if (!isTelepathy) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTelepathy();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isTelepathy]);

  const processCommand = (transcript: string) => {
    const text = transcript.toLowerCase();
    toast.success(`Thought detected: "${text}"`);
    
    let found = false;
    socialLinks.forEach(link => {
      if (text.includes(link.name.toLowerCase())) {
        window.open(link.url, '_blank');
        found = true;
      }
    });

    if (!found) {
      if (text.includes('doom')) {
        window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
      } else if (text.includes('windows') || text.includes('win95')) {
        window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
      } else if (text.includes('kaca') || text.includes('mirror')) {
        window.dispatchEvent(new CustomEvent('ACTIVATE_MIRROR'));
      } else {
        toast.error("Thought not recognized.");
      }
    }
  };

  const handleTelepathyFallback = () => {
    setIsListening(false);
    openTelepathy();
  };

  const submitTelepathy = (e: React.FormEvent) => {
    e.preventDefault();
    if (telepathyInput.trim()) {
      processCommand(telepathyInput);
    }
    closeTelepathy();
    setTelepathyInput('');
  };

  const handleListen = async () => {
    const supported =
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

    if (!supported) {
      handleTelepathyFallback();
      return;
    }

    if (isListening) return;

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      toast.error(`Microphone permission failed: ${(err as Error).message}`);
      handleTelepathyFallback();
      return;
    }

    try {
      const w = window as unknown as {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      };
      const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRecognitionCtor) {
        handleTelepathyFallback();
        return;
      }
      const recognition = new SpeechRecognitionCtor();
      
      recognition.lang = 'id-ID'; 
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Say a link name (e.g. 'GitHub')");
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = event.results[0][0].transcript;
        processCommand(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false);
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'network') {
          toast.error("Browser blocked the voice API.");
          handleTelepathyFallback();
        } else if (event.error === 'no-speech') {
          toast.error("No speech detected. Try again.");
        } else {
          toast.error(`Voice error: ${event.error}`);
          handleTelepathyFallback();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch {
        setIsListening(false);
        handleTelepathyFallback();
      }
    } catch {
      setIsListening(false);
      handleTelepathyFallback();
    }
  };

  return (
    <>
      <button 
        onClick={handleListen}
        disabled={isListening}
        className={`w-11 h-11 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-transparent text-foreground hover:bg-accent/20'}`}
        aria-label="Voice Command"
      >
        {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-rose-500" />}
      </button>

      {isTelepathyRendered && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 bg-black/40 ${isTelepathy ? 'animate-modal-backdrop' : 'animate-modal-backdrop-out'}`} 
            onClick={closeTelepathy} 
          />
          <form 
            onSubmit={submitTelepathy} 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Telepathy Mode"
            className={`relative fluid-glass p-8 rounded-lg max-w-md w-full will-change-transform ${isTelepathy ? 'animate-modal-content' : 'animate-modal-content-out'}`}
          >
            <div className="relative z-10">
              <h3 className="text-2xl font-black tracking-tight text-foreground mb-3 flex items-center gap-2">
                <span>🧠</span> Telepathy Mode
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Microphone access is unavailable. Please type your thoughts directly into the neural net (e.g. github, win95, doom).
              </p>
              <input 
                type="text" 
                autoFocus
                value={telepathyInput}
                onChange={(e) => setTelepathyInput(e.target.value)}
                placeholder="Focus your thoughts here..." 
                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-6"
              />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={closeTelepathy} className="px-6 py-2.5 text-sm font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all">Transmit</button>
              </div>
            </div>
          </form>
        </div>,
        document.body
      )}
    </>
  );
}
