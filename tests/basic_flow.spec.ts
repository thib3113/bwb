import { expect, test } from './fixtures';

test.describe('Boks Basic Flow (Simulator)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByTestId('app-header-title')).toBeVisible();
    await expect(page.getByTestId('app-header-title')).toContainText('Boks BLE');
  });

  test('should connect using the simulator', async ({ page }) => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    const disabledIcon = page.getByTestId('status-icon-disconnected');
    await expect(disabledIcon).toBeVisible();

    // Click the connect button
    await page.getByTestId('connection-button').click();

    // Wait for connection: Disabled icon should disappear
    await expect(disabledIcon).not.toBeVisible({ timeout: 40000 });

    // Wait for potential redirect logic to trigger (it has 1.5s delay)
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      // Open Menu
      await page.getByLabel('menu').click();
      // Click Home via Test ID if available, else text is acceptable for menu items or specific role
      // Assuming 'Home' text is i18n dependent, but for now we keep it or use nav-codes if available
      // Ideally we should add test-id to menu items too, but let's stick to what we refactored.
      // We added test-ids to bottom nav in HomePage.tsx: nav-codes, nav-logs, etc.

      // If we are on mobile view (likely for basic flow), we have bottom nav.
      // But redirect logic often happens on desktop too.
      // Let's use getByText for menu item for now as it wasn't in the plan to refactor everything.
      await page.getByText('Home').click();

      // Wait for navigation
      await page.waitForURL(/.*\/codes/);
    }

    // Check for battery percentage as confirmation of connection
    await expect(page.getByTestId('connection-status-indicator').getByText('%')).toBeVisible({
      timeout: 20000
    });

    // Check if we received data (Codes count) using new test ID
    await expect(page.getByTestId('code-stats')).toBeVisible({ timeout: 10000 });
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
