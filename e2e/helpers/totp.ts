import { TOTP_STEP_SEC, base32Decode, totpCode } from '../../src/lib/totp';

// Same secret as playwright.config.ts hands the webServer.
export const E2E_TOTP_SECRET = 'JBSWY3DPEHPK3PXP';

// Compute a code the server will accept. If the current step is about to roll
// over, wait it out first — a code that expires mid-request is a flake.
export async function currentTotpCode(): Promise<string> {
  const stepMs = TOTP_STEP_SEC * 1000;
  const into = Date.now() % stepMs;
  if (into > stepMs - 3000) await new Promise((resolve) => setTimeout(resolve, stepMs - into + 300));
  const secret = base32Decode(E2E_TOTP_SECRET);
  if (!secret) throw new Error('Invalid e2e TOTP secret');
  return totpCode(secret, Date.now());
}
