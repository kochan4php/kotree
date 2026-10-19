import { test, expect, type Page } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// K47: the real service worker, no stubs. Two promises it makes:
//   1. the cached shell still opens with the network down,
//   2. a newly deployed worker waits for the user instead of hijacking the tab.
test.describe.configure({ mode: 'serial' });

// G9: the parts of the worker the notification test reaches into.
type SwScope = {
  announceDelivery: (delivered: number) => Promise<void>;
  registration: ServiceWorkerRegistration;
  announced: string[];
};

async function waitForActiveWorker(page: Page) {
  await page.waitForFunction(
    async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return Boolean(
        registration?.active &&
          registration.active.state === 'activated' &&
          navigator.serviceWorker.controller
      );
    },
    null,
    { timeout: 15000 }
  );
  // let the install step finish precaching the shell
  await page.waitForTimeout(1200);
}

test('the app keeps working when the network drops', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await waitForActiveWorker(page);
  // Install-time precaching is deliberately failure-tolerant, so make sure the
  // shell is really in the cache: one more online navigation through the
  // worker (network-first + cache.put) before pulling the plug.
  await page.reload({ waitUntil: 'networkidle' });

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: 'Open AI Terminal' })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('a new build parks in the waiting worker and the toast offers Refresh', async ({ page }) => {
  // A deploy changes sw.js; the only honest way to simulate that locally is to
  // change the file the dev server reads, then restore it.
  const workerFile = resolve(process.cwd(), 'public/sw.js');
  const original = readFileSync(workerFile);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await waitForActiveWorker(page);

  try {
    writeFileSync(workerFile, Buffer.concat([original, Buffer.from('\n// e2e update probe\n')]));
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r?.update()));

    await expect(page.getByText('A new version is ready')).toBeVisible({ timeout: 20000 });
    await expect
      .poll(
        () =>
          page.evaluate(async () =>
            Boolean((await navigator.serviceWorker.getRegistration())?.waiting)
          ),
        { timeout: 10000 }
      )
      .toBe(true);

    // Refresh tells the waiting worker to take over; the page reloads once
    const loaded = page.waitForEvent('load', { timeout: 20000 });
    await page.getByRole('button', { name: 'Refresh' }).click();
    await loaded;

    await expect
      .poll(() =>
        page.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting)
        )
      )
      .toBe(false);
  } finally {
    writeFileSync(workerFile, original);
  }
});

// G9: a message the worker delivers while the tab is closed may raise one
// notification — but only when the dock's switch is on, which the worker reads
// from the same store it opens for the CSRF token.
test('a background delivery announces itself only while the switch is on', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await waitForActiveWorker(page);

  const worker = context.serviceWorkers()[0];
  expect(worker).toBeTruthy();

  // Headless Chromium reports Notification.permission as denied even for a
  // context that was granted it, so the browser's own call is recorded rather
  // than displayed. What this test owns is the gate and the wording.
  await worker.evaluate(() => {
    const scope = self as unknown as SwScope;
    scope.announced = [];
    scope.registration.showNotification = async (title: string) => {
      scope.announced.push(String(title));
    };
  });

  const announce = (count: number) =>
    worker.evaluate(async (delivered) => {
      const scope = self as unknown as SwScope;
      scope.announced.length = 0;
      await scope.announceDelivery(delivered);
      return scope.announced;
    }, count);

  // The switch starts off: nothing is announced
  expect(await announce(2)).toEqual([]);

  await page.getByRole('button', { name: 'Preferences' }).click();
  const toggle = page.getByRole('switch', { name: 'Delivery notifications' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  expect(await announce(1)).toEqual(['Your secret made it']);
  expect(await announce(2)).toEqual(['2 secrets made it']);
});
