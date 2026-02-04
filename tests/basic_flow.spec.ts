import {expect, test} from '@playwright/test';

test.describe('Boks Basic Flow (Simulator)', () => {
  test.beforeEach(async ({ page }) => {
    // Force enable simulator BEFORE app loads and set language to English
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en');
      // @ts-expect-error - Custom global flag
      window.BOKS_SIMULATOR_ENABLED = true;
    });
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByText('Boks BLE Control Panel', { exact: true })).toBeVisible();
  });

  test('should connect using the simulator', async ({ page }) => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    await expect(page.locator('svg[data-testid="BluetoothDisabledIcon"]')).toBeVisible();

    // Click the connect button in the header
    // Use aria-label exact match to avoid matching other "Connect" texts
    await page.getByRole('button', { name: 'connect', exact: true }).first().click();

    // Wait for connection (BluetoothConnectedIcon should appear)
    // Increased timeout to 20s to account for simulated delay and initial sync
    await expect(page.locator('svg[data-testid="BluetoothConnectedIcon"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('svg[data-testid="BluetoothDisabledIcon"]')).not.toBeVisible();

    // Optional: Check if we received data (e.g., Codes count)
    await expect(page.getByText(/Codes \(Total:/)).toBeVisible({ timeout: 10000 });
  });

  test('should open the door via simulator', async ({ page }) => {
    // 1. Connect
    await page.getByRole('button', { name: 'connect', exact: true }).first().click();
    // Increased timeout to 20s
    await expect(page.locator('svg[data-testid="BluetoothConnectedIcon"]')).toBeVisible({ timeout: 20000 });

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);

    // 2. Fill PIN and Click Open Door
    await page.fill('#openCode', '123456');
    await page.getByRole('button', { name: /open door/i }).click({ force: true });

    // 3. Verify Feedback
    // Using regex for flexibility
    await expect(page.getByText(/Opening door|Success|Opening.../i)).toBeVisible({ timeout: 10000 });

    // 4. Wait for close
    await expect(page.getByText(/Opening door|Success|Opening.../i)).not.toBeVisible({ timeout: 15000 });
  });
});
