import { BLEOpcode, expect, test } from '../fixtures';

test.describe('Bluetooth Logs Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should send GET_LOGS_COUNT when refreshing logs', async ({ page, simulator }) => {
    // 1. Connect
    await simulator.connect();

    // 2. Wait for GET_LOGS_COUNT (0x07)
    // The app is configured to auto-sync logs on connection.
    // So we just need to verify that this command is sent.
    await simulator.waitForTxOpcode(BLEOpcode.GET_LOGS_COUNT);

    // 3. Verify TX Events
    const events = await simulator.getTxEvents();
    expect(events).toBeDefined();
    expect(Array.isArray(events)).toBe(true);
    const getCount = (events || []).find((e: any) => e.opcode === BLEOpcode.GET_LOGS_COUNT);
    expect(getCount).toBeDefined();
  });
});
