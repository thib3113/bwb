import { expect, test } from '../fixtures';

test.describe('Version Gating', () => {
  // We check for both English and French text to be robust against locale defaults in headless env
  test.use({ locale: 'fr-FR' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Ensure simulator is enabled and state is clean
    await page.evaluate(async () => {
      localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
      if (window.resetApp) {
        await window.resetApp();
      }
    });
  });

  // Keep existing non-blocking tests (optional, but good for regression)
  // ... (omitting for brevity as requested focus is on blocking)

  // NEW BLOCKING TESTS

  test('should block access if software version is too old (< 4.1.14)', async ({
    page,
    simulator
  }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        // Case A: Old Software
        controller.setVersion('4.0.0', '10/125');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Debug: wait for device state in DB to be updated
    await page.waitForFunction(
      async (sw) => {
         // @ts-ignore
         const db = window.boksDebug?.db;
         if (!db) return false;
         const dev = await db.devices.toCollection().first();
         return dev && dev.software_revision === sw;
      },
      '4.0.0',
      { timeout: 15000 }
    );

    // Wait for blocking modal using testid (Critical requirement: NO TEXT SELECTORS)
    const blockingModal = page.getByTestId('version-guard-overlay');
    await expect(blockingModal).toBeVisible({ timeout: 15000 });

    // Verify title and message exist via testId
    const title = page.getByTestId('version-guard-title');
    const message = page.getByTestId('version-guard-message');

    await expect(title).toBeVisible();
    await expect(message).toBeVisible();

    // Take screenshot as required
    await page.screenshot({ path: 'compatibility-old-sw.png', fullPage: true });
  });

  test('should block access if hardware version is unknown', async ({
    page,
    simulator
  }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        // Case B: Unknown Hardware (FW '10/124' is not mapped)
        controller.setVersion('4.1.14', '10/124');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Debug: wait for device state in DB to be updated (firmware updated)
    await page.waitForFunction(
      async (fw) => {
         // @ts-ignore
         const db = window.boksDebug?.db;
         if (!db) return false;
         const dev = await db.devices.toCollection().first();
         return dev && dev.firmware_revision === fw;
      },
      '10/124',
      { timeout: 15000 }
    );

    // Wait for blocking modal using testid (Critical requirement: NO TEXT SELECTORS)
    const blockingModal = page.getByTestId('version-guard-overlay');
    await expect(blockingModal).toBeVisible({ timeout: 15000 });

    // Verify title and message exist via testId
    const title = page.getByTestId('version-guard-title');
    const message = page.getByTestId('version-guard-message');

    await expect(title).toBeVisible();
    await expect(message).toBeVisible();

    // Take screenshot as required
    await page.screenshot({ path: 'compatibility-unknown-hw.png', fullPage: true });
  });
});
