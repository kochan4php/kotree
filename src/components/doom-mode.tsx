'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { socialLinks } from '@/data/social-links';

export default function DoomMode() {
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleActivate = () => {
      setIsActive(true);
    };
    // Triggered by typing 'doom' in the AI Terminal
    window.addEventListener('ACTIVATE_DOOM', handleActivate);
    return () => window.removeEventListener('ACTIVATE_DOOM', handleActivate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!isActive || !container) return;

    // Setup Three.js Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 0, 750);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.y = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 10, 10);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x336633, side: THREE.DoubleSide, wireframe: true });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Targets (Links)
    const targets: THREE.Mesh[] = [];
    const linkUrls: { [uuid: string]: string } = {};

    socialLinks.forEach((link) => {
      const geometry = new THREE.BoxGeometry(20, 20, 20);
      
      // We create a canvas to draw the text texture
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256, 256);
        ctx.font = '30px Arial';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(link.name, 128, 128);
        ctx.fillText("SHOOT ME", 128, 160);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshBasicMaterial({ map: texture });
      const cube = new THREE.Mesh(geometry, material);
      
      cube.position.x = (Math.random() - 0.5) * 400;
      cube.position.y = 10;
      cube.position.z = - (Math.random() * 400 + 100);
      
      scene.add(cube);
      targets.push(cube);
      linkUrls[cube.uuid] = link.url;
    });

    // Controls
    let moveForward = false;
    let moveBackward = false;
    let moveLeft = false;
    let moveRight = false;
    let canJump = false;

    let prevTime = performance.now();
    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = true; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = true; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = true; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += 350; canJump = false; break;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW': moveForward = false; break;
        case 'ArrowLeft':
        case 'KeyA': moveLeft = false; break;
        case 'ArrowDown':
        case 'KeyS': moveBackward = false; break;
        case 'ArrowRight':
        case 'KeyD': moveRight = false; break;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Pointer Lock
    const onCanvasClick = () => {
      renderer.domElement.requestPointerLock();
    };
    renderer.domElement.addEventListener('click', onCanvasClick);

    // Mouse Look
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const PI_2 = Math.PI / 2;

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        euler.setFromQuaternion(camera.quaternion);
        euler.y -= movementX * 0.002;
        euler.x -= movementY * 0.002;
        euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
        camera.quaternion.setFromEuler(euler);
      }
    };
    document.addEventListener('mousemove', onMouseMove);

    // Shooting
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    const onMouseDown = () => {
      if (document.pointerLockElement !== renderer.domElement) return;

      if (crosshairRef.current) {
        crosshairRef.current.style.transform = 'scale(1.5)';
        setTimeout(() => {
          if (crosshairRef.current) crosshairRef.current.style.transform = 'scale(1)';
        }, 100);
      }

      raycaster.setFromCamera(center, camera);
      const intersects = raycaster.intersectObjects(targets);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        hit.position.y += 1000; // make it disappear
        const url = linkUrls[hit.uuid];
        if (url) {
          window.open(url, '_blank');
        }
      }
    };
    document.addEventListener('mousedown', onMouseDown);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const time = performance.now();
      if (document.pointerLockElement === renderer.domElement) {
        const delta = (time - prevTime) / 1000;

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize(); // this ensures consistent movements in all directions

        if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

        camera.translateX(velocity.x * delta);
        camera.translateZ(velocity.z * delta);
        camera.position.y += (velocity.y * delta); // new behavior

        if (camera.position.y < 10) {
          velocity.y = 0;
          camera.position.y = 10;
          canJump = true;
        }

        // Spin targets
        targets.forEach(t => t.rotation.y += 0.01);
      }

      prevTime = time;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      renderer.dispose();
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div ref={crosshairRef} className="w-4 h-4 border-2 border-[#00ff00] rounded-full flex items-center justify-center transition-transform">
          <div className="w-1 h-1 bg-[#00ff00] rounded-full" />
        </div>
      </div>

      <div className="absolute top-4 left-4 pointer-events-none text-[#00ff00] font-mono text-xl shadow-black drop-shadow-md">
        DOOM MODE ACTIVE
        <br />
        <span className="text-sm">Click to lock mouse. W,A,S,D to move. Left Click to SHOOT links!</span>
      </div>

      <button onClick={() => setIsActive(false)} className="absolute top-4 right-4 bg-red-600 text-white font-mono px-4 py-2 hover:bg-red-700 pointer-events-auto">
        EXIT DOOM
      </button>
    </div>
  );
}
