import { test, expect } from '../fixtures';

test.describe('Compatibility Checks', () => {
  test.use({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris'
  });

  test('should show blocking message on iOS without WebBluetooth', async ({ page }) => {
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

    // 2. Expect the blocking message (English or French)
    const blockingMessage = page.getByText(/Sur iOS, vous devez utiliser un navigateur compatible Web Bluetooth comme Bluefy|On iOS, you must use a Web Bluetooth capable browser like Bluefy/);
    await expect(blockingMessage).toBeVisible({ timeout: 10000 });

    // 3. Take Screenshot
    await page.screenshot({ path: 'compatibility-ios-error.png', fullPage: true });
  });
});
