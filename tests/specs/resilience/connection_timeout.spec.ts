import { expect, test } from '../../fixtures';

test.describe('Resilience: Connection Timeout', () => {
  test('should handle bluetooth connection timeout or error', async ({ page, simulator }) => {
    await page.goto('/');

    // 1. Tell simulator to fail NEXT connection with 'NetworkError'
    await page.evaluate(() => {
      if (window.boksSimulator) {
        window.boksSimulator.failNextConnection('NetworkError', 'Connection failed for unknown reason.');
      }
    });

    // 2. Click connect
    await page.getByTestId('connection-button').click();

    // 3. Verify error feedback
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();

    // 4. Ensure we can still try again
    await expect(page.getByTestId('connection-button')).toBeEnabled();
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible();
  });
});
