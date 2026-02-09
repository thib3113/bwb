import { test, expect } from '@playwright/test';

test.describe('Compatibility Checks', () => {
  // Simulate iPhone/Safari User Agent
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    // Ensure WebBluetooth is disabled to trigger the blocking screen
    permissions: [],
  });

  test('should show blocking message and Bluefy link on iOS without WebBluetooth', async ({ page }) => {
    // 1. Force WebBluetooth to be unsupported in the test environment
    await page.addInitScript(() => {
        // @ts-ignore
        delete navigator.bluetooth;
        // @ts-ignore
        window.BOKS_SIMULATOR_ENABLED = false;
        localStorage.removeItem('BOKS_SIMULATOR_ENABLED');
        // @ts-ignore
        delete window.BOKS_SIMULATOR_ENABLED;
    });

    await page.goto('/');

    // 2. Expect the blocking message specific to iOS
    // Using testId as requested for stability
    const blockingMessage = page.getByTestId('ios-compatibility-message');
    await expect(blockingMessage).toBeVisible({ timeout: 10000 });

    // 3. Expect Bluefy Link Button
    const bluefyButton = page.getByTestId('bluefy-download-button');
    await expect(bluefyButton).toBeVisible();
    await expect(bluefyButton).toHaveAttribute('href', 'https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055');

    // 4. Take Screenshot
    await page.screenshot({ path: 'compatibility-ios-error.png', fullPage: true });
  });
});
