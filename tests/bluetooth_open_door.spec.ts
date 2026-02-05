import { expect, test, BLEOpcode } from './fixtures';

test.describe('Bluetooth Open Door Feature', () => {
  test.beforeEach(async ({ page, simulator }) => {
    await page.goto('/');
  });

  test('should send correct OPEN_DOOR packet with PIN code', async ({ page, simulator }) => {
    // 1. Connect
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // 2. Click Open Door (Header Button)
    // Uses stored PIN '123456' from simulator device defaults
    await page.getByRole('button', { name: /open door/i }).click();

    // 3. Verify TX Event
    await simulator.waitForTxOpcode(BLEOpcode.OPEN_DOOR);

    const events = await simulator.getTxEvents();
    const openDoorEvent = events.find((e: any) => e.opcode === BLEOpcode.OPEN_DOOR);
    expect(openDoorEvent).toBeDefined();
    // Verify default simulator PIN '123456'
    expect(openDoorEvent.payload).toEqual([49, 50, 51, 52, 53, 54]);

    await expect(page.getByText(/Opening door|Success/i)).toBeVisible();
  });
});
