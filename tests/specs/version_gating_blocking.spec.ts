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

  test('should show restricted banner and block features if software version is too old (< 4.1.14)', async ({
    page,
    simulator
  }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    // Reset app logic clears localStorage, so we must set version AFTER it.
    // Also, BoksSimulator constructor loads from localStorage.
    // So if resetApp() was called, it wiped the state.
    // We need to set the version on the running instance.
    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        // Case A: Old Software
        controller.setVersion('4.0.0', '10/125');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Debug: wait for device state in DB to be updated
    // Increase timeout just in case
    await page.waitForFunction(
      async (sw) => {
         // @ts-ignore
         const db = window.boksDebug?.db;
         if (!db) return false;
         const dev = await db.devices.toCollection().first();
         return dev && dev.software_revision === sw;
      },
      '4.0.0',
      { timeout: 20000 }
    );

    // Explicitly go to codes page to ensure UI is mounted
    await page.goto('/codes');

    // 1. Verify Banner is visible (NOT blocking overlay)
    const banner = page.getByTestId('version-guard-banner');
    await expect(banner).toBeVisible({ timeout: 20000 });

    // Verify title and message exist
    const title = page.getByTestId('version-guard-title');
    const message = page.getByTestId('version-guard-message');
    await expect(title).toBeVisible();
    await expect(message).toBeVisible();

    // 2. Verify Navigation is still possible (Header accessible)
    // Check main nav exists first
    const mainNav = page.getByTestId('main-nav');
    await expect(mainNav).toBeVisible();

    const settingsButton = page.getByTestId('nav-logs'); // Logs tab
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // 3. Verify Logs Page is blocked
    await expect(page).toHaveURL(/\/logs/);
    await expect(page.getByText(/Fonctionnalité désactivée|Feature disabled/)).toBeVisible();

    // 4. Go to Codes Page
    await page.getByTestId('nav-codes').click();

    // 5. Verify Codes Page is blocked (Add button should NOT be there or feature blocked message)
    await expect(page.getByText(/Fonctionnalité désactivée|Feature disabled/)).toBeVisible();
    await expect(page.getByTestId('add-code-button')).not.toBeVisible();
  });

  test('should show restricted banner and block features if hardware version is unknown', async ({
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
      { timeout: 20000 }
    );

    // Explicitly go to codes page
    await page.goto('/codes');

    // 1. Verify Banner is visible
    const banner = page.getByTestId('version-guard-banner');
    await expect(banner).toBeVisible({ timeout: 20000 });

    // 2. Verify Navigation is possible
    const mainNav = page.getByTestId('main-nav');
    await expect(mainNav).toBeVisible();

    const settingsNav = page.getByTestId('nav-logs');
    await expect(settingsNav).toBeVisible();

    // 3. Check Features blocked
    await settingsNav.click();
    await expect(page.getByText(/Fonctionnalité désactivée|Feature disabled/)).toBeVisible();
  });
});
