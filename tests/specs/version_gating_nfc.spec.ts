import { expect, test } from '../fixtures';

test.describe('Version Gating - NFC', () => {
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
    simulator
  }) => {
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.2.0', '10/125');
    });

    await simulator.connect({ skipReturnToHome: true });

    // Already on My Boks page due to new device redirect

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
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
