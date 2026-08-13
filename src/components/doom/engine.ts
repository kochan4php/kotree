import * as THREE from 'three';

export interface DoomEngine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  raycaster: THREE.Raycaster;
  center: THREE.Vector2;
  euler: THREE.Euler;
  dispose: () => void;
}

// Scene, camera, renderer, floor and shared maths helpers
export function createEngine(container: HTMLDivElement): DoomEngine {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // Sky blue
  scene.fog = new THREE.Fog(0x87ceeb, 0, 750);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = 10;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x336633, side: THREE.DoubleSide, wireframe: true })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const raycaster = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  const dispose = () => {
    renderer.dispose();
    container.innerHTML = '';
  };

  return { scene, camera, renderer, raycaster, center, euler, dispose };
}
