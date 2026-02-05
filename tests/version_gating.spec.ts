import { test, expect } from './fixtures';

test.describe('Version Gating', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });
  });

  test('should soft-disable NFC tab and show toast for older firmware', async ({
    page,
    simulator,
  }) => {
    // 1. Set Version to 4.2.0 (Too old for NFC, Good for La Poste)
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.2.0', '4.0');
    });

    // Check if we need to connect
    const connectButton = page.getByRole('button', { name: /connect/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
    }

    // Wait for App to load (Codes tab is default)
    // Adjust locator to match one of the bottom navigation tabs
    await expect(page.getByRole('button', { name: /codes/i })).toBeVisible({ timeout: 15000 });

    // Navigate to My Boks directly (as UI link might be in a hidden menu)
    await page.goto('/my-boks');

    // Check NFC Tab
    const nfcTab = page.getByRole('button', { name: /tags nfc/i });
    await expect(nfcTab).toBeVisible();
    await expect(nfcTab).toHaveCSS('opacity', '0.5');

    // Click it
    await nfcTab.click();

    // Expect Toast
    await expect(page.getByText(/version firmware 4.3.3 required/i)).toBeVisible();
  });

  test('should soft-disable La Poste and show toast for very old firmware', async ({
    page,
    simulator,
  }) => {
    // 1. Set Version to 4.1.0 (Too old for La Poste)
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.1.0', '4.0');
    });

    const connectButton = page.getByRole('button', { name: /connect/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
    }

    await expect(page.getByRole('button', { name: /codes/i })).toBeVisible({ timeout: 15000 });
    await page.goto('/my-boks');

    // Check La Poste Switch
    // It is inside the DeviceSettings component, which is the default tab of MyBoksPage
    const laPosteSwitch = page.getByRole('checkbox', { name: /la poste/i });

    // Click it
    await laPosteSwitch.click({ force: true });

    await expect(page.getByText(/version firmware 4.2.0 required/i)).toBeVisible();
  });

  test('should handle hardware version mapping', async ({ page, simulator }) => {
    // 1. Set Version with Raw HW "10/cd" which maps to "3.0"
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.5.0', '10/cd');
    });

    const connectButton = page.getByRole('button', { name: /connect/i });
    if (await connectButton.isVisible()) {
      await connectButton.click();
    }

    await expect(page.getByRole('button', { name: /codes/i })).toBeVisible({ timeout: 15000 });
    await page.goto('/my-boks');

    // Check NFC Tab (Requires HW 4.0)
    const nfcTab = page.getByRole('button', { name: /tags nfc/i });
    await expect(nfcTab).toHaveCSS('opacity', '0.5');
    await nfcTab.click();
    // Message should mention hardware version
    await expect(page.getByText(/version hardware 4.0 required/i)).toBeVisible();
  });
});
