'use client';

import { useEffect, useState } from 'react';

interface Cursor {
  id: string;
  x: number;
  y: number;
  color: string;
  targetX: number;
  targetY: number;
  name: string;
}

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff'];
const NAMES = ['guest_992', 'hacker_man', 'recruiter_x', 'frontend_dev', 'anonymous', 'ceo_of_based'];

export default function MultiplayerCursors() {
  const [cursors, setCursors] = useState<Cursor[]>([]);

  useEffect(() => {
    // Generate 3-5 fake users
    const numUsers = Math.floor(Math.random() * 3) + 3;
    const initialCursors: Cursor[] = [];
    
    for (let i = 0; i < numUsers; i++) {
      initialCursors.push({
        id: `user_${i}`,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        targetX: Math.random() * window.innerWidth,
        targetY: Math.random() * window.innerHeight,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        name: NAMES[Math.floor(Math.random() * NAMES.length)]
      });
    }
    
    setCursors(initialCursors);

    // Animation Loop
    let animationId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      setCursors(prev => prev.map(c => {
        // Change target occasionally
        let { targetX, targetY } = c;
        if (Math.random() < 0.02) {
          targetX = Math.random() * window.innerWidth;
          targetY = Math.random() * window.innerHeight;
        }

        // Move towards target smoothly (lerp)
        const dx = targetX - c.x;
        const dy = targetY - c.y;
        
        // Very lazy follow
        const speed = 2; // px per frame roughly
        
        return {
          ...c,
          x: c.x + dx * speed * delta,
          y: c.y + dy * speed * delta,
          targetX,
          targetY
        };
      }));

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, []);

  return null;
  /*
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {cursors.map(c => (
        <div 
          key={c.id} 
          className="absolute transition-transform duration-75"
          style={{ transform: `translate(${c.x}px, ${c.y}px)` }}
        >
          <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: `drop-shadow(2px 2px 2px rgba(0,0,0,0.5))` }}>
            <path d="M5.65376 2.15376L22.2589 18.7589C22.6841 19.1841 22.3831 19.9116 21.7821 19.9116H13.5C13.2239 19.9116 13 20.1354 13 20.4116V33.153C13 33.7226 12.3377 34.0326 11.9079 33.6617L1.47273 24.6548C1.17392 24.3969 1 24.0191 1 23.6267V2.86082C1 2.22754 1.76569 1.91007 2.21323 2.35761L5.65376 2.15376Z" fill={c.color} stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <div 
            className="absolute left-6 top-6 px-2 py-1 text-xs font-mono font-bold text-white rounded opacity-80 whitespace-nowrap"
            style={{ backgroundColor: c.color }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
  */
}
