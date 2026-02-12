import { expect, test } from '../fixtures';

test.describe('Version Gating - NFC', () => {
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

  test('should show NFC tab but disable features for older firmware', async ({
    page,
    simulator
  }) => {
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(async () => {
      const controller = window.boksSimulator;
      if (controller) {
        controller.setVersion('4.2.0', '10/125'); // HW 4.0, SW 4.2.0
      }
    });

    await simulator.connect({ skipReturnToHome: true });

    // Wait for DB sync
    await page.waitForFunction(
      async () => {
        const db = (window as any).boksDebug?.db;
        if (!db) return false;
        const device = await db.devices.toArray().then((d: any[]) => d[0]);
        // HW 4.0 (10/125), SW 4.2.0
        return device && device.software_revision === '4.2.0' && device.hardware_version === '4.0';
      },
      null,
      { timeout: 15000 }
    );

    const nfcTab = page.getByTestId('tab-nfc');

    // Tab visible and opaque (HW 4.0 OK)
    await expect(nfcTab).toBeVisible({ timeout: 10000 });
    // Opacity is 1 by default, MUI handles selected state opacity
    // We check it's NOT 0.5 (disabled look)
    const opacity = await nfcTab.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.5);

    await nfcTab.click();

    // Check for warning about FW version inside
    await expect(page.getByText('4.3.3')).toBeVisible();

    // Check Add Button is disabled
    const addBtn = page.getByRole('button', { name: /Tag/i });
    await expect(addBtn).toBeDisabled();
  });
});
