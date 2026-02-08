import { expect, test } from './fixtures';

test.describe('Boks Basic Flow (Simulator)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByText('Boks BLE Control Panel', { exact: true })).toBeVisible();
  });

  test('should connect using the simulator', async ({ page }) => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await expect(disabledIcon).toBeVisible();

    // Click the connect button
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();

    // Wait for connection: Disabled icon should disappear
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });

    // Wait for potential redirect logic to trigger (it has 1.5s delay)
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      // Click Home (which redirects to /codes)
      await page.getByText('Home').click();
      // Wait for navigation
      await page.waitForURL(/.*\/codes/);
    }

    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // Optional: Check if we received data (e.g., Codes count)
    await expect(page.getByText(/Codes \(Total:/)).toBeVisible({ timeout: 10000 });
  });

  test('should open the door via simulator', async ({ page }) => {
    // 1. Connect
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });

    // Check for battery percentage as confirmation of connection
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // Wait for potential redirect logic to trigger (it has 1.5s delay)
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      // Click Home (which redirects to /codes)
      await page.getByText('Home').click();
      // Wait for navigation
      await page.waitForURL(/.*\/codes/);
    }

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);

    // 2. Click Open Door (Header Button)
    // Note: Manual PIN entry (#openCode) is not available in the current UI layout.
    // The header button uses the stored device PIN.
    await page.getByRole('button', { name: /open door/i }).click();

    // 3. Verify Feedback
    // Using regex for flexibility
    await expect(page.getByText(/Opening door|Success|Opening.../i)).toBeVisible({
      timeout: 10000,
    });

    // 4. Wait for close
    await expect(page.getByText(/Opening door|Success|Opening.../i)).not.toBeVisible({
      timeout: 15000,
    });
  });
});
