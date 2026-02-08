import { expect, test } from '../fixtures';

test.describe('Dashboard Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByTestId('app-header-title')).toBeVisible();
    await expect(page.getByTestId('app-header-title')).toContainText('Boks BLE');
  });
});
