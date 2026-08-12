'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
// @ts-ignore
import * as random from 'maath/random/dist/maath-random.esm';

function Stars({ size = 0.005, count = 5000, speed = 1, ...props }: any) {
  const ref = useRef<any>(null);
  // Create a sphere of random particles, fallback to zeros if maath fails
  const [sphere] = useState(() => {
    try {
      const positions = new Float32Array(count * 3);
      random.inSphere(positions, { radius: 1.5 });
      // Sanity check for NaN
      for (let i = 0; i < positions.length; i++) {
        if (isNaN(positions[i])) positions[i] = 0;
      }
      return positions;
    } catch {
      return new Float32Array(count * 3).fill(0);
    }
  });

  useFrame((state, delta) => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ref.current && !prefersReducedMotion) {
      ref.current.rotation.x -= (delta / 10) * speed;
      ref.current.rotation.y -= (delta / 15) * speed;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#ff6a33"
          size={size}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

export default function Background() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]" aria-hidden="true">
      {/* Existing Fallback blur blobs just in case WebGL fails to load */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-accent/20 rounded-full blur-3xl opacity-30"></div>
      
      {/* 3D WebGL Canvas */}
      <Canvas camera={{ position: [0, 0, 1] }}>
        {/* Distant small stars */}
        <Stars size={0.005} count={4000} speed={0.8} />
        
        {/* Closer, larger stars */}
        <Stars size={0.015} count={1000} speed={1.5} />
      </Canvas>
    </div>
  );
}
