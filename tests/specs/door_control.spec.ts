import { BLEOpcode, expect, test } from '../fixtures';

test.describe('Door Control Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open the door via simulator', async ({ page, simulator }) => {
    // 1. Connect
    const disabledIcon = page.getByTestId('status-icon-disconnected');
    await page.getByTestId('connection-button').click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 40000 });

    // Wait for potential redirect logic
    await page.waitForTimeout(2000);

    // Handle potential redirect
    if (page.url().includes('my-boks')) {
      console.log('Redirected to My Boks. Navigating back via Menu...');
      await page.getByLabel('menu').click();
      // Use Test ID for home navigation
      await page.getByTestId('nav-home').click();
      await page.waitForURL(/.*\/codes/);
    }

    // Wait a bit for device context to settle
    await page.waitForTimeout(500);

    // 2. Click Open Door (Header Button) using new Test ID
    await page.getByTestId('open-door-button').click();

    // 3. Verify Feedback using Simulator Events
    // Wait for OPEN_DOOR opcode (0x01)
    await simulator.waitForTxOpcode(BLEOpcode.OPEN_DOOR);

    const events = await simulator.getTxEvents();
    const openDoorEvent = events.find((e: any) => e.opcode === BLEOpcode.OPEN_DOOR);

    expect(openDoorEvent).toBeDefined();
    // Default PIN is '123456' -> [49, 50, 51, 52, 53, 54]
    expect(openDoorEvent.payload).toEqual([49, 50, 51, 52, 53, 54]);

    // Also verify UI feedback (Role Alert)
    const alert = page.getByRole('alert').first();
    await expect(alert).toBeVisible({ timeout: 10000 });

    // 4. Wait for close
    await expect(alert).not.toBeVisible({ timeout: 15000 });
  });
});
