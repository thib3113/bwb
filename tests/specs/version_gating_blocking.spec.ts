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

  test('should soft-disable NFC tab and show toast for older firmware', async ({
    page,
    simulator
  }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        // SW: 4.2.0, FW: 10/125, HW: 4.0 (default)
        controller.setVersion('4.2.0', '10/125');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Already on My Boks page due to new device redirect

    // Wait for DB stabilization
    await page.waitForFunction(
      async ({ sw, hw }) => {
        const db = window.boksDebug?.db as any;
        if (!db) return false;
        const device = await db.devices.toCollection().first();
        return device && device.software_revision === sw && device.hardware_version === hw;
      },
      { sw: '4.2.0', hw: '4.0' },
      { timeout: 15000 }
    );

    const nfcTab = page.getByTestId('tab-nfc');
    await expect(nfcTab).toBeVisible({ timeout: 10000 });
    await expect(nfcTab).toHaveCSS('opacity', '0.5');
    await nfcTab.click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('should allow toggling La Poste on supported firmware', async ({ page, simulator }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        controller.setVersion('4.3.0', '10/125');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Already on My Boks page due to new device redirect

    // Wait for DB sync
    await page.waitForFunction(
      async ({ sw, hw }) => {
        const db = window.boksDebug?.db as any;
        if (!db) return false;
        const device = await db.devices.toCollection().first();
        return device && device.software_revision === sw && device.hardware_version === hw;
      },
      { sw: '4.3.0', hw: '4.0' },
      { timeout: 15000 }
    );

    const laPosteSwitch = page.getByTestId('la-poste-switch');
    await expect(laPosteSwitch).toBeVisible({ timeout: 10000 });

    // Initial state should be unchecked
    await expect(laPosteSwitch).not.toBeChecked();

    // Click it
    await laPosteSwitch.click({ force: true });

    // Expect it to be checked eventually (after BLE roundtrip)
    await expect(laPosteSwitch).toBeChecked({ timeout: 10000 });
  });

  test('should handle hardware version mapping', async ({ page, simulator }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.setVersion === 'function') {
        // SW: 4.5.0, FW: 10/cd (maps to HW 3.0)
        controller.setVersion('4.5.0', '10/cd');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Already on My Boks page due to new device redirect

    // Wait for DB sync
    await page.waitForFunction(
      async ({ sw, hw }) => {
        const db = window.boksDebug?.db as any;
        if (!db) return false;
        const device = await db.devices.toCollection().first();
        return device && device.software_revision === sw && device.hardware_version === hw;
      },
      { sw: '4.5.0', hw: '3.0' },
      { timeout: 15000 }
    );

    const nfcTab = page.getByTestId('tab-nfc');
    await expect(nfcTab).toBeVisible({ timeout: 10000 });
    await expect(nfcTab).toHaveCSS('opacity', '0.5');
    await nfcTab.click();
    await expect(page.getByRole('alert')).toBeVisible();
  });

  // NEW TESTS START HERE

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
         const db = window.boksDebug?.db;
         if (!db) return false;
         const dev = await db.devices.toCollection().first();
         return dev && dev.software_revision === sw;
      },
      '4.0.0',
      { timeout: 15000 }
    );

    // Wait for blocking modal using testid
    const blockingModal = page.getByTestId('version-guard-overlay');
    await expect(blockingModal).toBeVisible({ timeout: 15000 });

    // Check text (English default fallback or French)
    await expect(blockingModal).toContainText(/Update Required|Mise à jour nécessaire/);

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
         const db = window.boksDebug?.db;
         if (!db) return false;
         const dev = await db.devices.toCollection().first();
         return dev && dev.firmware_revision === fw;
      },
      '10/124',
      { timeout: 15000 }
    );

    // Wait for blocking modal using testid
    const blockingModal = page.getByTestId('version-guard-overlay');
    await expect(blockingModal).toBeVisible({ timeout: 15000 });

    // Check text (English default fallback or French)
    await expect(blockingModal).toContainText(/Incompatible Hardware|Matériel incompatible/);

    await page.screenshot({ path: 'compatibility-unknown-hw.png', fullPage: true });
  });
});
