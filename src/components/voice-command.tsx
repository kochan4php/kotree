'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { socialLinks } from '@/data/social-links';

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
    }
  }, []);

  const [isTelepathy, setIsTelepathy] = useState(false);
  const [isTelepathyRendered, setIsTelepathyRendered] = useState(false);
  const [isTelepathyVisible, setIsTelepathyVisible] = useState(false);
  const [telepathyInput, setTelepathyInput] = useState('');

  useEffect(() => {
    if (isTelepathy) {
      setIsTelepathyRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsTelepathyVisible(true));
      });
    } else {
      setIsTelepathyVisible(false);
      const timer = setTimeout(() => setIsTelepathyRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isTelepathy]);

  const processCommand = (transcript: string) => {
    const text = transcript.toLowerCase();
    toast.success(`Mendeteksi pikiran: "${text}"`);
    
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
        toast.error("Pikiran tidak dikenali.");
      }
    }
  };

  const handleTelepathyFallback = () => {
    setIsListening(false);
    setIsTelepathy(true);
  };

  const submitTelepathy = (e: React.FormEvent) => {
    e.preventDefault();
    if (telepathyInput.trim()) {
      processCommand(telepathyInput);
    }
    setIsTelepathy(false);
    setTelepathyInput('');
  };

  const handleListen = async () => {
    if (!supported) {
      handleTelepathyFallback();
      return;
    }

    if (isListening) return;

    try {
      // Meminta izin mikrofon
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      toast.error(`Izin mikrofon gagal: ${err.message}`);
      handleTelepathyFallback();
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'id-ID'; 
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("AI Mendengarkan... Sebutkan nama link (misal: 'Github')");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        processCommand(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        console.error('Speech recognition error', event.error);
        if (event.error === 'not-allowed' || event.error === 'network') {
          toast.error("Browser memblokir API Suara.");
          handleTelepathyFallback();
        } else if (event.error === 'no-speech') {
          toast.error("Tidak ada suara yang terdengar. Coba lagi.");
        } else {
          toast.error(`Error suara: ${event.error}`);
          handleTelepathyFallback();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (err: any) {
        setIsListening(false);
        handleTelepathyFallback();
      }
    } catch (err: any) {
      setIsListening(false);
      handleTelepathyFallback();
    }
  };

  return (
    <>
      <button 
        onClick={handleListen}
        disabled={isListening}
        className={`w-10 h-10 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-transparent text-foreground hover:bg-accent/20'}`}
        aria-label="Voice Command"
      >
        {isListening ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-rose-500" />}
      </button>

      {isTelepathyRendered && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className={`absolute inset-0 transition-opacity duration-200 ${isTelepathyVisible ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'opacity-0'}`} 
            onClick={() => setIsTelepathy(false)} 
          />
          <form 
            onSubmit={submitTelepathy} 
            onClick={(e) => e.stopPropagation()}
            className={`relative fluid-glass p-8 rounded-lg max-w-md w-full transition-all duration-200 ease-out will-change-transform ${isTelepathyVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
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
                <button type="button" onClick={() => setIsTelepathy(false)} className="px-6 py-2.5 text-sm font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Cancel</button>
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
