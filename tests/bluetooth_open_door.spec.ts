import {expect, test} from '@playwright/test';

// Local constants to match src/utils/bleConstants.ts
const BLEOpcode = {
  OPEN_DOOR: 0x01,
  NOTIFY_DOOR_STATUS: 0x84,
};

test.describe('Bluetooth Open Door Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Enable simulator and force English
    await page.addInitScript(() => {
      localStorage.setItem('i18nextLng', 'en');
      // @ts-expect-error - Custom global flag
      window.BOKS_SIMULATOR_ENABLED = true;
      // Setup event capture
      // @ts-expect-error - Custom global storage
      window.txEvents = [];
      window.addEventListener('boks-tx', (e: any) => {
        // @ts-expect-error - Custom global storage
        window.txEvents.push(e.detail);
      });
    });
    await page.goto('/');
  });

  test('should send correct OPEN_DOOR packet with PIN code', async ({ page }) => {
    // 1. Connect
    // Use regex for more flexible matching
    await page.getByRole('button', { name: /connect/i, exact: true }).first().click();
    await expect(page.locator('svg[data-testid="BluetoothConnectedIcon"]')).toBeVisible({ timeout: 10000 });

    // 2. Fill PIN and Click Open Door
    await page.fill('#openCode', '123456');
    await page.getByRole('button', { name: /open door/i }).click();

    // 3. Verify TX Event
    // Wait for the packet to be sent
    await page.waitForFunction((opcode) => {
      // @ts-expect-error - Custom global storage
      return window.txEvents.some((e: any) => e.opcode === opcode);
    }, BLEOpcode.OPEN_DOOR);

    // Retrieve the events
    const events = await page.evaluate(() => {
      // @ts-expect-error - Custom global storage
      return window.txEvents;
    });

    const openDoorEvent = events.find((e: any) => e.opcode === BLEOpcode.OPEN_DOOR);
    expect(openDoorEvent).toBeDefined();

    // Verify Payload: '123456' -> [49, 50, 51, 52, 53, 54]
    // The simulator logic confirms simple string conversion
    const expectedPayload = [49, 50, 51, 52, 53, 54];
    expect(openDoorEvent.payload).toEqual(expectedPayload);

    // Optional: Verify UI feedback (Simulator sends Rx back)
    await expect(page.getByText(/Opening door|Success/i)).toBeVisible();
  });
});
