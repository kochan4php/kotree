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

  const processCommand = (transcript: string) => {
    const text = transcript.toLowerCase();
    toast.success(`Kamu bilang/mikir: "${text}"`);
    
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
        toast.error("Perintah tidak dikenali.");
      }
    }
  };

  const handleTelepathyFallback = () => {
    setIsListening(false);
    setTimeout(() => {
      const command = window.prompt("Mikrofon diblokir/rusak! Gunakan mode Telepati 🧠\nKetik perintahmu di sini (misal: github, doom, win95):");
      if (command) {
        processCommand(command);
      }
    }, 500);
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

  if (!supported) {
    // We still render the button so they can use Telepathy mode
  }

  return (
    <button 
      onClick={handleListen}
      disabled={isListening}
      className={`fixed bottom-20 right-6 z-50 p-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-accent text-accent-foreground hover:scale-110 active:scale-95'}`}
      aria-label="Voice Command"
    >
      {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
    </button>
  );
}
