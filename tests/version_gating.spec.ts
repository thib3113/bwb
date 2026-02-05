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
    await page.evaluate(async () => {
      if ((window as any).resetApp) {
        await (window as any).resetApp();
      }
    });

    // Reload to reflect empty DB (Onboarding View)
    await page.reload();

    // Now we must be in Onboarding view
    await expect(onboarding).toBeVisible({ timeout: 30000 });
  });

  test('should soft-disable NFC tab and show toast for older firmware', async ({ page, simulator }) => {
    // 1. Force Simulator ON (handled by connect helper, but ensure we set version first?)
    // Actually, we must enable simulator to access the controller to set version.
    // connect() does enable it.

    // We need to set version BEFORE connecting, otherwise the connection might fetch default version.
    // So we force enable first manually or via helper, set version, THEN connect.

    // Force enable to get controller
    await page.evaluate(() => {
      if ((window as any).toggleSimulator) (window as any).toggleSimulator(true);
    });

    // Wait for controller
    await page.waitForFunction(() => (window as any).boksSimulatorController, null, { timeout: 60000 });

    // Set Version
    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.2.0', '4.0');
    });

    // Connect using helper
    await simulator.connect();

    // Navigate to My Boks
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

  test('should soft-disable La Poste and show toast for very old firmware', async ({ page, simulator }) => {
    await page.evaluate(() => {
      if ((window as any).toggleSimulator) (window as any).toggleSimulator(true);
    });

    await page.waitForFunction(() => (window as any).boksSimulatorController, null, { timeout: 60000 });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.1.0', '4.0');
    });

    await simulator.connect();

    await page.goto('/my-boks');

    // Check La Poste Switch
    const laPosteSwitch = page.getByRole('checkbox', { name: /la poste/i });
    await expect(laPosteSwitch).toBeVisible();

    // Click it
    await laPosteSwitch.click({ force: true });

    await expect(page.getByText(/version firmware 4.2.0 required/i)).toBeVisible();
  });

  test('should handle hardware version mapping', async ({ page, simulator }) => {
    await page.evaluate(() => {
      if ((window as any).toggleSimulator) (window as any).toggleSimulator(true);
    });

    await page.waitForFunction(() => (window as any).boksSimulatorController, null, { timeout: 60000 });

    await page.evaluate(() => {
      (window as any).boksSimulatorController.setVersion('4.5.0', '10/cd');
    });

    await simulator.connect();

    await page.goto('/my-boks');

    // Check NFC Tab (Requires HW 4.0)
    const nfcTab = page.getByRole('button', { name: /tags nfc/i });
    await expect(nfcTab).toHaveCSS('opacity', '0.5');
    await nfcTab.click();
    // Message should mention hardware version
    await expect(page.getByText(/version hardware 4.0 required/i)).toBeVisible();
  });
});
