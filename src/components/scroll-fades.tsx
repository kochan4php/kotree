'use client';

import { useEffect, useState } from 'react';

export default function ScrollFades() {
  const [topOpacity, setTopOpacity] = useState(0);
  const [bottomOpacity, setBottomOpacity] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Top opacity: 0 at very top, 1 at 50px scrolled
      const newTopOpacity = Math.min(1, Math.max(0, scrollTop / 50));
      setTopOpacity(newTopOpacity);

      // Bottom opacity: 0 at very bottom, 1 at 50px from bottom
      const distanceToBottom = documentHeight - (scrollTop + windowHeight);
      const newBottomOpacity = Math.min(1, Math.max(0, distanceToBottom / 50));
      setBottomOpacity(newBottomOpacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    // Check again after a small delay in case of dynamic content loading
    setTimeout(handleScroll, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between h-screen">
      {/* Top Edge */}
      <div 
        className="relative h-16 w-full mask-gradient-top"
        style={{ opacity: topOpacity }}
      >
        <div className="absolute inset-0 backdrop-blur-md bg-black/[0.01]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#201613] to-transparent"></div>
      </div>
      
      {/* Bottom Edge */}
      <div 
        className="relative h-20 w-full mask-gradient-bottom"
        style={{ opacity: bottomOpacity }}
      >
        <div className="absolute inset-0 backdrop-blur-md bg-black/[0.01]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#201613] to-transparent"></div>
      </div>
    </div>
  );
}
