import * as THREE from 'three';
import { socialLinks } from '@/data/social-links';

export interface TargetSetup {
  targets: THREE.Mesh[];
  linkUrls: Record<string, string>;
}

// Build the shootable link cubes (name drawn on a canvas texture)
export function createTargets(scene: THREE.Scene): TargetSetup {
  const targets: THREE.Mesh[] = [];
  const linkUrls: Record<string, string> = {};

  socialLinks.forEach(link => {
    const geometry = new THREE.BoxGeometry(20, 20, 20);

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
      ctx.fillText('SHOOT ME', 128, 160);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const cube = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture }));

    cube.position.x = (Math.random() - 0.5) * 400;
    cube.position.y = 10;
    cube.position.z = -(Math.random() * 400 + 100);

    scene.add(cube);
    targets.push(cube);
    linkUrls[cube.uuid] = link.url;
  });

  return { targets, linkUrls };
}
