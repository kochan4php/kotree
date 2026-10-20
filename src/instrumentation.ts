import { validateEnv } from '@/lib/env';

// Runs once per server process. Builds do not need deployment secrets, so the
// checks only fail when a value is present but malformed.
export function register(): void {
  validateEnv();
}
