import { test, expect } from './fixtures';

test.describe('Version Gating', () => {
  // Increase timeout for this suite as CI can be slow to load the app and simulator
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { timeout: 60000 });

    // Wait for the app to render (Onboarding OR Main Layout)
    const onboarding = page.getByText('Boks BLE Control Panel');
    const codesTab = page.getByRole('button', { name: /codes/i });
    await expect(onboarding.or(codesTab)).toBeVisible({ timeout: 30000 });

    // Reset App to ensure clean state (Onboarding)
    // This clears the DB and disconnects any lingering simulated connection
    await page.evaluate(async () => {
      if ((window as any).resetApp) {
        await (window as any).resetApp();
      }
    });

    // Reload to reflect empty DB (Onboarding View)
    await page.reload();

    // Now we must be in Onboarding view
    await expect(onboarding).toBeVisible({ timeout: 30000 });

    // Force enable simulator
    await page.evaluate(() => {
      if ((window as any).toggleSimulator) {
        (window as any).toggleSimulator(true);
      }
    });
  });

  test('should soft-disable NFC tab and show toast for older firmware', async ({ page }) => {
    // 1. Set Version to 4.2.0 (Too old for NFC, Good for La Poste)
    // Wait for the simulator controller to be available
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.2.0', '4.0');
    });

    // Connect (we are in Onboarding view now)
    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    // Wait for App to load (Codes tab is default)
    await expect(page.getByRole('button', { name: /codes/i })).toBeVisible({ timeout: 15000 });

    // Navigate to My Boks directly
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

  test('should soft-disable La Poste and show toast for very old firmware', async ({ page }) => {
    // 1. Set Version to 4.1.0 (Too old for La Poste)
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.1.0', '4.0');
    });

    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

    await expect(page.getByRole('button', { name: /codes/i })).toBeVisible({ timeout: 15000 });
    await page.goto('/my-boks');

    // Check La Poste Switch
    const laPosteSwitch = page.getByRole('checkbox', { name: /la poste/i });

    // Click it
    await laPosteSwitch.click({ force: true });

    await expect(page.getByText(/version firmware 4.2.0 required/i)).toBeVisible();
  });

  test('should handle hardware version mapping', async ({ page }) => {
    // 1. Set Version with Raw HW "10/cd" which maps to "3.0"
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, {
      timeout: 60000,
    });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.5.0', '10/cd');
    });

    const connectButton = page.getByRole('button', { name: /connect/i });
    await connectButton.click();

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
