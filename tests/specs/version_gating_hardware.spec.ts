import { expect, test } from '../fixtures';

test.describe('Version Gating - Hardware Mapping', () => {
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

  test('should hide NFC tab for incompatible hardware', async ({ page, simulator }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(async () => {
      const controller = window.boksSimulator;
      if (controller) {
        // SW 4.5.0, FW 10/cd -> HW 3.0
        controller.setVersion('4.5.0', '10/cd');
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Wait for DB sync
    await page.waitForFunction(
      async () => {
        const db = (window as any).boksDebug?.db;
        if (!db) return false;
        const device = await db.devices.toArray().then((d: any[]) => d[0]);
        // HW 3.0 < 4.0
        return device && device.hardware_version === '3.0';
      },
      null,
      { timeout: 15000 }
    );

    const nfcTab = page.getByTestId('tab-nfc');

    // Should be completely hidden for HW < 4.0
    await expect(nfcTab).toBeHidden();
  });
});
