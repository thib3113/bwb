import { test, expect } from '@playwright/test';

test.describe('Boks Basic Flow (Simulator)', () => {
  test.beforeEach(async ({ page }) => {
    // Force enable simulator BEFORE app loads
    await page.addInitScript(() => {
      // @ts-expect-error - Custom global flag
      window.BOKS_SIMULATOR_ENABLED = true;
    });
    await page.goto('/');
  });

  test('should load the dashboard', async ({ page }) => {
    await expect(page.getByText('Boks BLE', { exact: true })).toBeVisible();
  });

  test('should connect using the simulator', async ({ page }) => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    await expect(page.locator('svg[data-testid="BluetoothDisabledIcon"]')).toBeVisible();

    // Click the connect button
    await page.getByRole('button', { name: 'connect', exact: true }).click();

    // Wait for connection (BluetoothIcon should appear)
    await expect(page.locator('svg[data-testid="BluetoothIcon"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('svg[data-testid="BluetoothDisabledIcon"]')).not.toBeVisible();

    // Optional: Check if we received data (e.g., Codes count)
    // The simulator sends 0xC3 with counts. The dashboard updates "Codes (Total: ...)"
    // Using regex to match partial text
    await expect(page.getByText(/Codes \(Total:/)).toBeVisible({ timeout: 10000 });
  });

  test('should open the door via simulator (Auto-Provisioned)', async ({ page }) => {
    // 1. Connect
    await page.getByRole('button', { name: 'connect', exact: true }).click();
    await expect(page.locator('svg[data-testid="BluetoothIcon"]')).toBeVisible({ timeout: 10000 });

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);

    // 2. Click Open Door
    // Force click in case the tooltip or something interferes
    await page.getByRole('button', { name: 'open door' }).click({ force: true });

    // 3. Verify Feedback
    // Since we auto-provisioned the PIN code, the door should open successfully
    // Look for "Opening..." or "Door closed"
    // Using regex for flexibility
    await expect(page.getByText(/Opening door|Success/i)).toBeVisible({ timeout: 10000 });

    // 4. Wait for close (UI might just remove "Opening..." or show "Door Open" then "Door Closed")
    // Let's just check that the message eventually disappears
    await expect(page.getByText(/Opening door|Success/i)).not.toBeVisible({ timeout: 15000 });
  });
});
