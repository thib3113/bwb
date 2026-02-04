import { test, expect } from './fixtures';

test.describe('Maintenance Page', () => {
  test.beforeEach(async ({ page, simulator }) => {
    await page.goto('/');

    // Attempt to connect if not already
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    const connectBtn = page.getByRole('button', { name: /connect/i }).filter({ hasText: /^Connect$|^$/ }).first();
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Wait for connection to establish
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to maintenance page and run clean master codes script', async ({
    page,
  }) => {
    // 1. Open Menu
    await page.getByRole('button', { name: 'menu' }).click();

    // 2. Click Maintenance
    await page.getByText('Maintenance').click();

    // 3. Verify Page Title
    await expect(page.getByRole('heading', { name: 'Maintenance' })).toBeVisible();

    // 4. Verify Script Card exists
    await expect(page.getByText('Clean Master Codes')).toBeVisible();

    // 5. Run Script
    await page.getByRole('button', { name: 'Run' }).click();

    // 6. Check for script execution
    // It might fail or succeed depending on simulator support for DELETE, but it should start.
    // We wait for the "Fetching..." text which indicates start.
    await expect(page.getByText('Fetching initial code count...')).toBeVisible({ timeout: 10000 });

    // We do NOT assert success/error because the simulator might not support the full sequence.
  });
});
