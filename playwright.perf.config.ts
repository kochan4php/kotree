import { defineConfig, devices } from '@playwright/test';

// M1: the perf budget runs on its own — one worker, no other tests competing
// for the CPU — so the numbers can gate CI honestly.
// Locally: pnpm test:perf. In CI it runs as its own step after the build.
export default defineConfig({
  testDir: './e2e',
  testMatch: /perf\.spec\.ts/,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000' },
  projects: [{ name: 'perf', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: { ADMIN_TOKEN: 'e2e-admin-token' },
  },
});
