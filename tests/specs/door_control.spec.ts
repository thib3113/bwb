import { expect, test } from '../fixtures';

test.describe('Door Control Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open the door via simulator', async ({ page }) => {
    // 1. Connect
    const disabledIcon = page.getByTestId('status-icon-disconnected');
    await page.getByTestId('connection-button').click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 40000 });

    // Check for battery percentage as confirmation of connection
    await expect(page.getByTestId('connection-status-indicator').getByText('%')).toBeVisible({
      timeout: 20000
    });

    // Wait for potential redirect logic to trigger (it has 1.5s delay)
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      await page.getByText('Home').click();
      // Wait for navigation
      await page.waitForURL(/.*\/codes/);
    }

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);

    // 2. Click Open Door (Header Button) using new Test ID
    await page.getByTestId('open-door-button').click();

    // 3. Verify Feedback - Using Role 'alert' instead of specific text
    // Assuming the notification renders as an alert role (Snackbar usually does if configured, or just text)
    // MUI Snackbar Content often has role="alert" or "status".
    // Let's check for any element with role alert or status appearing.
    // If exact role is missing, we might need to fallback to a locator that targets the snackbar container.
    // MUI Snackbar usually has a child with class .MuiAlert-message

    // We will try looking for the alert role.
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 10000 });

    // 4. Wait for close
    await expect(alert).not.toBeVisible({ timeout: 15000 });
  });
});
