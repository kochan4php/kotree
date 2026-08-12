'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function AvatarShape() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotate slowly using delta
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.3;
      
      // Look at cursor (gentle lerp)
      const targetX = (state.pointer.x * Math.PI) / 4;
      const targetY = (state.pointer.y * Math.PI) / 4;
      meshRef.current.rotation.x += (targetY - meshRef.current.rotation.x) * 0.1;
      meshRef.current.rotation.y += (targetX - meshRef.current.rotation.y) * 0.1;
      
      // Hover scale
      const targetScale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <icosahedronGeometry args={[1.5, 0]} />
        <MeshDistortMaterial 
          color={hovered ? '#ff8a53' : '#ff6a33'} 
          wireframe={!hovered}
          distort={hovered ? 0.4 : 0.2}
          speed={3}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}

export default function Avatar3D() {
  return (
    <div className="w-24 h-24 rounded-full bg-accent/5 shadow-lg shadow-accent/20 cursor-pointer overflow-hidden border-2 border-accent/30 relative">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={1} />
        <directionalLight position={[2, 2, 2]} intensity={2} />
        <AvatarShape />
      </Canvas>
    </div>
  );
}
