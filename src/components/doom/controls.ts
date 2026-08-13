// Keyboard movement state + listeners (doom-mode)
export interface DoomKeys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  canJump: boolean;
}

export function createControls() {
  const keys: DoomKeys = { forward: false, backward: false, left: false, right: false, jump: false, canJump: false };

  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': keys.forward = true; break;
      case 'ArrowLeft':
      case 'KeyA': keys.left = true; break;
      case 'ArrowDown':
      case 'KeyS': keys.backward = true; break;
      case 'ArrowRight':
      case 'KeyD': keys.right = true; break;
      case 'Space': keys.jump = true; break;
    }
  };

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW': keys.forward = false; break;
      case 'ArrowLeft':
      case 'KeyA': keys.left = false; break;
      case 'ArrowDown':
      case 'KeyS': keys.backward = false; break;
      case 'ArrowRight':
      case 'KeyD': keys.right = false; break;
    }
  };

  return { keys, onKeyDown, onKeyUp };
}
