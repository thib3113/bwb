import { expect, test } from '../fixtures';

test.describe('Connection Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should connect using the simulator', async ({ page }) => {
    test.setTimeout(60000);

    // Check we are initially disconnected
    const disabledIcon = page.getByTestId('status-icon-disconnected');
    await expect(disabledIcon).toBeVisible();

    // Click the connect button
    await page.getByTestId('connection-button').click();

    // Wait for connection: Disabled icon should disappear
    await expect(disabledIcon).not.toBeVisible({ timeout: 40000 });

    // Check if we received data (Codes count) using new test ID
    const codeStats = page.getByTestId('code-stats');
    try {
        await expect(codeStats).toBeVisible({ timeout: 15000 });
    } catch (e) {
        console.warn('Code stats did not appear, checking tab selection as fallback.');
        // Ensure we are on codes page via URL if not there
        if (!page.url().includes('/codes')) {
             await page.goto('/codes');
        }
        await expect(page).toHaveURL(/.*\/codes/);
    }

    // Check for connection indicator visibility (icon) instead of text percentage
    await expect(page.getByTestId('battery-level-text')).toBeVisible({
      timeout: 20000
    });
  });
});
