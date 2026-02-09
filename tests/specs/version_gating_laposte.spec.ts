import { expect, test } from '../fixtures';

test.describe('Version Gating - La Poste', () => {
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

  test('should allow toggling La Poste on supported firmware', async ({ page, simulator }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller) {
        controller.setVersion('4.3.0', '10/125');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Already on My Boks page due to new device redirect

    // Wait for DB sync
    await page.waitForFunction(
      async ({ sw, hw }) => {
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
});
