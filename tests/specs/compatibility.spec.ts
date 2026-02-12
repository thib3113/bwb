import { expect, test } from '../fixtures';

test.describe('Compatibility Checks', () => {
  test('should show blocking message and Bluefy link on iOS without WebBluetooth', async ({ page }) => {
    // 1. Setup environment: Mock iOS user agent and ABSENCE of navigator.bluetooth
    await page.addInitScript(() => {
      // Mock iOS User Agent
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      });
      // Ensure bluetooth is undefined
      Object.defineProperty(navigator, 'bluetooth', {
        get: () => undefined
      });
      // Disable simulator via priority flag
      // @ts-ignore
      window.BOKS_SIMULATOR_DISABLED = true;
    });

    await page.goto('/');

    // 2. Expect the blocking message to be visible
    const blockingMessage = page.getByTestId('ios-compatibility-message');
    await expect(blockingMessage).toBeVisible({ timeout: 10000 });

    // 3. Expect Bluefy Link Button
    const bluefyButton = page.getByTestId('bluefy-download-button');
    await expect(bluefyButton).toBeVisible();
    await expect(bluefyButton).toHaveAttribute('href', /apps\.apple\.com/);
  });
});
