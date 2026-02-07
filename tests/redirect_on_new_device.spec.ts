import { expect, test } from './fixtures';

test.describe('New Device Redirect', () => {
  test('should redirect to settings tab when adding a new device', async ({ page }) => {
    // 1. Load page
    await page.goto('/');

    // 2. Reset App State (Clear DB) to simulate new device
    await page.evaluate(async () => {
      // @ts-ignore
      if (window.resetApp) {
        // @ts-ignore
        await window.resetApp();
      } else {
        // Fallback if resetApp not available (e.g. if not injected properly, but fixture handles it)
        console.warn('resetApp not found');
        const db = (window as any).boksDebug?.db;
        if (db) {
          await db.devices.clear();
          await db.device_secrets.clear();
        }
        localStorage.clear();
        localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
      }
    });

    // 3. Reload to pick up clean state
    await page.reload();

    // 4. Expect Onboarding View
    const onboarding = page.getByTestId('onboarding-view').first();
    await expect(onboarding).toBeVisible();

    // 5. Connect
    // Ensure simulator is enabled
    await page.evaluate(() => {
        localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
    });

    await onboarding.getByRole('button', { name: /connect/i }).click();

    // 6. Wait for redirect
    // The redirect happens after connection (approx 1.5s delay in registerDevice + connection time)
    await expect(page).toHaveURL(/.*\/my-boks\?tab=settings/, { timeout: 10000 });

    // Check if settings tab is active
    await expect(page.getByTestId('tab-settings')).toHaveAttribute('aria-selected', 'true');
  });
});
