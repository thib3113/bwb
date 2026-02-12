import { expect, test } from '../fixtures';

test.describe('Boks Basic Flow (Simulator)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByTestId('app-header-title')).toBeVisible();
    await expect(page.getByTestId('app-header-title')).toContainText('Boks BLE');
  });

  test('should connect using the simulator', async ({ page, simulator }) => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    const disabledIcon = page.getByTestId('status-icon-disconnected');
    await expect(disabledIcon).toBeVisible();

    // Use robust connect from fixture
    await simulator.connect();

    // After connect, we should be on /codes (handled by fixture)
    await expect(page).toHaveURL(/.*\/codes/);

    // Check for battery percentage as confirmation of connection
    await expect(page.getByTestId('connection-status-indicator').getByText('%')).toBeVisible({
      timeout: 20000
    });

    // Wait for the main UI to be ready
    await expect(page.getByTestId('add-code-button')).toBeVisible({ timeout: 20000 });

    // Check if we received data (Codes count) using new test ID
    await expect(page.getByTestId('code-stats')).toBeVisible({ timeout: 20000 });
  });

  test('should open the door via simulator', async ({ page, simulator }) => {
    // 1. Connect and navigate to Home
    await simulator.connect();
    
    // Ensure we are on home/codes
    if (!page.url().includes('codes')) {
       await page.goto('/codes');
    }

    // Wait for the main UI to be ready
    await expect(page.getByTestId('add-code-button')).toBeVisible({ timeout: 20000 });

    // Wait for the connection to be fully recognized by the Header
    await expect(page.getByTestId('connection-status-indicator').getByText('%')).toBeVisible({
      timeout: 20000
    });

    // 2. Click Open Door (Header Button)
    const openBtn = page.getByTestId('open-door-button');
    // It might take a moment to be enabled after connection sync
    await expect(openBtn).toBeEnabled({ timeout: 15000 });
    await openBtn.click();

    // 3. Verify Feedback - MUI Snackbar usually has role 'alert'
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 10000 });

    // 4. Wait for alert to disappear (auto-close)
    await expect(alert).not.toBeVisible({ timeout: 15000 });
  });
});
