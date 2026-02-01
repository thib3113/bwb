import { test, expect } from '@playwright/test';

test.describe('Maintenance Page', () => {
  test.beforeEach(async ({ page }) => {
    // Enable simulator mode
    await page.addInitScript(() => {
      // @ts-expect-error - Custom global flag
      window.BOKS_SIMULATOR_ENABLED = true;
    });

    await page.goto('/');

    // Attempt to connect if not already
    const connectBtn = page.getByRole('button', { name: 'connect', exact: true });
    // It should be visible on load
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Wait for connection to establish
    await expect(page.locator('svg[data-testid="BluetoothIcon"]')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to maintenance page and run clean master codes script', async ({ page }) => {
    // 1. Open Menu
    // Assuming the menu button has aria-label="menu" (standard MUI)
    // Using loose match or check strictness if needed.
    // In basic_flow we didn't use menu, but let's assume it's there.
    // basic_flow used 'connect' and 'open door'.
    // Cypress used cy.get('button[aria-label="menu"]').
    await page.getByRole('button', { name: 'menu' }).click();

    // 2. Click Maintenance
    // Might be in a drawer.
    await page.getByText('Maintenance').click();

    // 3. Verify Page Title
    // h4 containing Maintenance
    await expect(page.getByRole('heading', { name: 'Maintenance' })).toBeVisible();

    // 4. Verify Script Card exists
    await expect(page.getByText('Clean Master Codes')).toBeVisible();

    // 5. Run Script
    await page.getByRole('button', { name: 'Run' }).click();

    // 6. Check for immediate error
    await expect(page.locator('.MuiAlert-standardError')).not.toBeVisible();

    // 7. Verify Logs appear (Fetching count is the first step)
    await expect(page.getByText('Fetching initial code count...')).toBeVisible({ timeout: 10000 });

    // 8. Wait for ANY finish state
    await expect(page.getByText(/Finished|Script finished/)).toBeVisible({ timeout: 60000 });

    // Verify Progress 100%
    await expect(page.getByText('100%')).toBeVisible({ timeout: 10000 });
  });
});
