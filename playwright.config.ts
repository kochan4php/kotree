import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry: a busy machine can time out a navigation or a browser
  // context teardown, which is noise, not a regression. Playwright still
  // reports the test as flaky, so a real problem cannot hide behind it.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  expect: {
    // The changelog is a very tall page, so a full-page shot can take longer
    // than the 5s default on a loaded machine — that surfaced as a failure
    // with identical pictures. This raises the ceiling, not the tolerance.
    timeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // M1: the perf budget has its own single-worker config (playwright.perf.config.ts)
      testIgnore: /perf\.spec\.ts/,
    },
    // K44: the core smoke on the other engines — only tests tagged @crossbrowser
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: /@crossbrowser/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: /@crossbrowser/,
    },
    // K45: real phone viewports — only tests tagged @mobile
    {
      name: 'mobile-pixel',
      use: { ...devices['Pixel 7'] },
      grep: /@mobile/,
    },
    {
      name: 'mobile-iphone',
      use: { ...devices['iPhone 13'] },
      grep: /@mobile/,
    },
  ],
  webServer: {
    // CI builds in a previous step, so only start; locally build first
    command: process.env.CI ? 'npm start' : 'npm run build && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Token the admin e2e tests authenticate with (server sees the same value)
    env: {
      ADMIN_TOKEN: 'e2e-admin-token',
      // M60: the e2e server enforces the second factor, and the tests compute
      // matching codes from this shared base32 secret (RFC 6238 test vector).
      ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
      // H8: the failed-sign-in alert fires after one wrong token in tests,
      // instead of five, so a single deliberate failure can prove it works.
      LOGIN_ALERT_THRESHOLD: '1',
    },
  },
});
