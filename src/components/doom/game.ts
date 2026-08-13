import { createEngine } from './engine';
import { createLoop } from './loop';
import { createTargets } from './targets';

// Wire everything together; returns a cleanup function for the effect
export function createDoomGame(container: HTMLDivElement, crosshairEl: HTMLElement | null) {
  const engine = createEngine(container);
  const targets = createTargets(engine.scene);
  const stopLoop = createLoop(engine, targets, crosshairEl);

  return () => {
    stopLoop();
    engine.dispose();
  };
}
