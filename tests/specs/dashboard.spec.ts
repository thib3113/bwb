import { expect, test } from '../fixtures';

test.describe('Dashboard Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    // Check for visibility only, no text content assertion
    await expect(page.getByTestId('app-header-title')).toBeVisible();
  });
});
