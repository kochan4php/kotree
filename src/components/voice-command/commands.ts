import { toast } from 'sonner';
import { socialLinks } from '@/data/social-links';

// Match a spoken (or typed) transcript to a link / easter egg
export function processCommand(transcript: string) {
  const text = transcript.toLowerCase();
  toast.success(`Thought detected: "${text}"`);

  let found = false;
  socialLinks.forEach(link => {
    if (text.includes(link.name.toLowerCase())) {
      window.open(link.url, '_blank', 'noopener');
      found = true;
    }
  });

  if (found) return;

  if (text.includes('doom')) {
    window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
  } else if (text.includes('windows') || text.includes('win95')) {
    window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
  } else if (text.includes('kaca') || text.includes('mirror')) {
    window.dispatchEvent(new CustomEvent('ACTIVATE_MIRROR'));
  } else {
    toast.error('Thought not recognized.');
  }
}
