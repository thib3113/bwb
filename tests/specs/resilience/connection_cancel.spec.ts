import { expect, test } from '../../fixtures';

test.describe('Resilience: Connection Cancellation', () => {
  test('should handle user cancelling the device selection dialog', async ({ page, simulator }) => {
    await page.goto('/');

    // 1. Tell simulator to fail NEXT discovery with 'NotFoundError' (standard for cancel)
    await page.evaluate(() => {
      if (window.boksSimulator) {
        window.boksSimulator.failNextDiscovery('NotFoundError', 'User cancelled the requestDevice() chooser.');
      }
    });

    // 2. Click connect
    await page.getByTestId('connection-button').click();

    // 3. Verify notification/alert (MUI Snackbar)
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    
    // 4. Ensure status is still disconnected
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible();
  });
});
