import { test, expect } from '../fixtures';

test.describe('Compatibility Checks', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris'
  });

  test('should show blocking message and Bluefy link on iOS without WebBluetooth', async ({ page }) => {
    // 1. Disable Simulator explicitly to ensure isWebBleSupported() relies on navigator.bluetooth
    await page.addInitScript(() => {
      // Mock navigator.bluetooth to be undefined
      Object.defineProperty(navigator, 'bluetooth', {
        get: () => undefined,
        configurable: true
      });

      // Clear Simulator flag
      localStorage.removeItem('BOKS_SIMULATOR_ENABLED');
      delete (window as any).BOKS_SIMULATOR_ENABLED;
    });

    await page.goto('/');

    // 2. Expect the blocking message specific to iOS
    const blockingMessage = page.getByText('Sur iOS, les navigateurs standards (Safari, Chrome) ne supportent pas le Bluetooth Web');
    await expect(blockingMessage).toBeVisible({ timeout: 10000 });

    // 3. Expect Bluefy Link Button
    const bluefyButton = page.getByRole('link', { name: 'Télécharger Bluefy' });
    await expect(bluefyButton).toBeVisible();
    await expect(bluefyButton).toHaveAttribute('href', 'https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055');

    // 4. Take Screenshot
    await page.screenshot({ path: 'compatibility-ios-error.png', fullPage: true });
  });
});
