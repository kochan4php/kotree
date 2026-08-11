'use client';

import { useEffect, useState } from 'react';
import { MousePointer2 } from 'lucide-react';

export default function GhostCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [clicking, setClicking] = useState(false);
  const [name] = useState('Guest_1409 (Tokyo)');
  const [color] = useState(`hsl(${Math.random() * 360}, 80%, 50%)`);

  useEffect(() => {
    // Only run on desktop/larger screens to avoid mobile mess
    if (window.innerWidth < 768) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = window.innerWidth / 2;
    let currentY = window.innerHeight / 2;

    const updateTarget = () => {
      // Pick a random interactive element to move towards
      const elements = Array.from(document.querySelectorAll('a, button, .solid-card'));
      if (elements.length > 0 && Math.random() > 0.3) {
        const randomEl = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;
        const rect = randomEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2 + (Math.random() * 20 - 10);
        targetY = rect.top + rect.height / 2 + (Math.random() * 20 - 10);
        
        // Randomly simulate a click when reaching the target
        setTimeout(() => {
          setClicking(true);
          setTimeout(() => setClicking(false), 200);
        }, Math.random() * 1000 + 500);
      } else {
        targetX = Math.random() * window.innerWidth;
        targetY = Math.random() * window.innerHeight;
      }
    };

    const interval = setInterval(updateTarget, 2500);

    let animationFrameId: number;
    const animate = () => {
      // Smooth interpolation
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      
      setPosition({ x: currentX, y: currentY });
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (position.x === -100) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[100] flex flex-col items-center transition-transform duration-75"
      style={{ 
        transform: `translate(${position.x}px, ${position.y}px) scale(${clicking ? 0.9 : 1})`,
        left: 0, 
        top: 0 
      }}
    >
      <MousePointer2 
        className="w-5 h-5 -ml-2 -mt-2 drop-shadow-md" 
        style={{ fill: color, color: color }} 
      />
      <div 
        className="mt-2 px-2 py-1 bg-black/80 backdrop-blur-sm text-white text-[10px] rounded-full whitespace-nowrap shadow-lg font-mono opacity-80"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
}
