import { expect, test } from './fixtures';

test.describe('Version Gating', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Ensure simulator is enabled and state is clean
    await page.evaluate(async () => {
      localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
      if ((window as any).resetApp) {
        await (window as any).resetApp();
      }
    });
  });

  test('should soft-disable NFC tab and show toast for older firmware', async ({
    page,
    simulator,
  }) => {
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 30000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.2.0', '10/125');
    });

    await simulator.connect();

    // Navigate via UI to avoid reload
    await page.getByLabel('menu').click();
    await page.getByText(/my boks/i).click();

    // Wait for DB stabilization
    await page.waitForFunction(
      async ({ sw, hw }) => {
        // @ts-ignore
        const db = window.boksDebug?.db;
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
    await expect(page.getByText(/version firmware 4.3.3 required/i)).toBeVisible();
  });

  test('should allow toggling La Poste on supported firmware', async ({ page, simulator }) => {
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 30000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.3.0', '10/125');
    });

    await simulator.connect();

    // Navigate via UI to avoid reload
    await page.getByLabel('menu').click();
    await page.getByText(/my boks/i).click();

    // Wait for DB sync
    await page.waitForFunction(
      async ({ sw, hw }) => {
        // @ts-ignore
        const db = window.boksDebug?.db;
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
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 30000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.5.0', '10/cd');
    });

    await simulator.connect();

    // Navigate via UI to avoid reload
    await page.getByLabel('menu').click();
    await page.getByText(/my boks/i).click();

    // Wait for DB sync
    await page.waitForFunction(
      async ({ sw, hw }) => {
        // @ts-ignore
        const db = window.boksDebug?.db;
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
    await expect(page.getByText(/hardware 4/i)).toBeVisible();
  });
});
