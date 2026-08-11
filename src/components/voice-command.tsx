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

  const handleListen = async () => {
    if (!supported) {
      toast.error("Browser doesn't support Web Speech API");
      return;
    }

    try {
      // Memaksa browser untuk meminta izin mikrofon terlebih dahulu
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      toast.error("Izin mikrofon ditolak atau diblokir browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'id-ID'; // Supports Indonesian too
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("AI Mendengarkan... Sebutkan nama link (misal: 'Github' atau 'LinkedIn')");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      toast.success(`Kamu bilang: "${transcript}"`);
      
      let found = false;
      socialLinks.forEach(link => {
        if (transcript.includes(link.name.toLowerCase())) {
          window.open(link.url, '_blank');
          found = true;
        }
      });

      if (!found) {
        if (transcript.includes('doom')) {
          window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
        } else if (transcript.includes('windows') || transcript.includes('win95')) {
          window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
        } else if (transcript.includes('kaca') || transcript.includes('mirror')) {
          window.dispatchEvent(new CustomEvent('ACTIVATE_MIRROR'));
        } else {
          toast.error("Perintah tidak dikenali.");
        }
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error("Akses mikrofon ditolak! Izinkan di pengaturan browser.");
      } else if (event.error === 'network') {
        toast.error("Gagal terhubung ke server pengenalan suara (Browser tidak mendukung atau offline).");
      } else {
        toast.error(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (!supported) return null;

  return (
    <button 
      onClick={handleListen}
      className={`fixed bottom-20 right-6 z-50 p-3 rounded-full shadow-lg transition-all ${isListening ? 'bg-red-500 animate-pulse text-white' : 'bg-accent text-accent-foreground hover:scale-110'}`}
      aria-label="Voice Command"
    >
      {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
    </button>
  );
}
