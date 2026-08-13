import * as THREE from 'three';
import { createControls } from './controls';
import type { DoomEngine } from './engine';
import type { TargetSetup } from './targets';

const PI_2 = Math.PI / 2;
const MOVE_SPEED = 400;
const JUMP_SPEED = 350;
const GRAVITY = 9.8 * 100;
const FLOOR_Y = 10;

// Pointer-lock controls + game loop. Returns a cleanup function.
export function createLoop(engine: DoomEngine, { targets, linkUrls }: TargetSetup, crosshairEl: HTMLElement | null) {
  const { scene, camera, renderer, raycaster, center, euler } = engine;
  const { keys, onKeyDown, onKeyUp } = createControls();

  const onCanvasClick = () => renderer.domElement.requestPointerLock();
  renderer.domElement.addEventListener('click', onCanvasClick);

  const onMouseMove = (event: MouseEvent) => {
    if (document.pointerLockElement !== renderer.domElement) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= (event.movementX || 0) * 0.002;
    euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x - (event.movementY || 0) * 0.002));
    camera.quaternion.setFromEuler(euler);
  };

  const onMouseDown = () => {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (crosshairEl) {
      crosshairEl.style.transform = 'scale(1.5)';
      setTimeout(() => { if (crosshairEl) crosshairEl.style.transform = 'scale(1)'; }, 100);
    }
    raycaster.setFromCamera(center, camera);
    const intersects = raycaster.intersectObjects(targets);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      hit.position.y += 1000; // make it disappear
      const url = linkUrls[hit.uuid];
      if (url) window.open(url, '_blank');
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', onMouseDown);

  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let prevTime = performance.now();
  let animationId = 0;

  const step = (delta: number) => {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    velocity.y -= GRAVITY * delta;
    direction.z = Number(keys.forward) - Number(keys.backward);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();

    // direction is 0 when idle, so these only act while moving
    velocity.z -= direction.z * MOVE_SPEED * delta;
    velocity.x -= direction.x * MOVE_SPEED * delta;
    if (keys.jump) { if (keys.canJump) velocity.y += JUMP_SPEED; keys.canJump = false; keys.jump = false; }

    camera.translateX(velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    camera.position.y += velocity.y * delta;

    if (camera.position.y < FLOOR_Y) {
      velocity.y = 0;
      camera.position.y = FLOOR_Y;
      keys.canJump = true;
    }

    targets.forEach(t => { t.rotation.y += 0.01; });
  };

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const time = performance.now();
    if (document.pointerLockElement === renderer.domElement) {
      step((time - prevTime) / 1000);
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
  };
}
