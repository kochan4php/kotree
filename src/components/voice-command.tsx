'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { socialLinks } from '@/data/social-links';

export default function VoiceCommand() {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
    }
  }, []);

  const [isTelepathy, setIsTelepathy] = useState(false);
  const [telepathyInput, setTelepathyInput] = useState('');

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
        className={`p-2 rounded-full transition-all cursor-pointer flex items-center justify-center ${isListening ? 'bg-red-500 animate-pulse text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-transparent text-foreground hover:bg-white/10 hover:text-accent active:scale-95'}`}
        aria-label="Voice Command"
      >
        {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
      </button>

      {isTelepathy && (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitTelepathy} className="bg-card p-6 rounded-xl border border-accent shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-accent mb-2">🧠 Mode Telepati</h3>
            <p className="text-sm text-muted-foreground mb-4">Mikrofon diblokir atau error. Ketikkan saja apa yang ada di pikiranmu (misal: github, doom, win95).</p>
            <input 
              type="text" 
              autoFocus
              value={telepathyInput}
              onChange={(e) => setTelepathyInput(e.target.value)}
              placeholder="Fokuskan pikiranmu..." 
              className="w-full bg-background border border-border rounded p-2 text-foreground focus:outline-none focus:border-accent mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setIsTelepathy(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Batal</button>
              <button type="submit" className="px-4 py-2 bg-accent text-accent-foreground font-bold rounded hover:opacity-90">Kirim Pikiran</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
