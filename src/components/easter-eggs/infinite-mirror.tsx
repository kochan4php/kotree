'use client';

import { useState, useEffect, useRef } from 'react';

export default function InfiniteMirror() {
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleActivate = async () => {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        
        setIsActive(true);
        
        // Wait for render
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }, 100);

        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            setIsActive(false);
          };
        }
      } catch (err) {
        console.error("Mirror effect cancelled or failed", err);
      }
    };

    window.addEventListener('ACTIVATE_MIRROR', handleActivate);
    return () => window.removeEventListener('ACTIVATE_MIRROR', handleActivate);
  }, []);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black">
      <video 
        ref={videoRef} 
        className="w-full h-full object-cover opacity-50 sepia-[0.3] hue-rotate-180 scale-105 pointer-events-none"
        playsInline 
        muted
      />
    </div>
  );
}
