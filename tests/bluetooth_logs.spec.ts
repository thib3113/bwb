import { test, expect } from '@playwright/test';

const BLEOpcode = {
  REQUEST_LOGS: 0x03,
  GET_LOGS_COUNT: 0x07,
};

test.describe('Bluetooth Logs Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Enable simulator
    await page.addInitScript(() => {
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

  test('should send GET_LOGS_COUNT and REQUEST_LOGS when refreshing logs', async ({ page }) => {
    // 1. Connect
    await page.getByRole('button', { name: 'connect', exact: true }).click();
    await expect(page.locator('svg[data-testid="BluetoothIcon"]')).toBeVisible({ timeout: 10000 });

    // 2. Click Refresh Logs
    // The button appears in the header only when connected.
    // Targeting by the Refresh icon inside the button
    const refreshBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="RefreshIcon"]') });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();

    // 3. Verify TX Events
    // We expect GET_LOGS_COUNT (0x07) first
    await page.waitForFunction((opcode) => {
      // @ts-expect-error - Custom global storage
      return window.txEvents.some((e: any) => e.opcode === opcode);
    }, BLEOpcode.GET_LOGS_COUNT);

    // Then REQUEST_LOGS (0x03) should follow (once the simulator responds with count)
    await page.waitForFunction((opcode) => {
      // @ts-expect-error - Custom global storage
      return window.txEvents.some((e: any) => e.opcode === opcode);
    }, BLEOpcode.REQUEST_LOGS);

    // Retrieve events
    const events = await page.evaluate(() => {
      // @ts-expect-error - Custom global storage
      return window.txEvents;
    });

    const getCount = events.find((e: any) => e.opcode === BLEOpcode.GET_LOGS_COUNT);
    const reqLogs = events.find((e: any) => e.opcode === BLEOpcode.REQUEST_LOGS);

    expect(getCount).toBeDefined();
    expect(reqLogs).toBeDefined();

    // Order check: count before req
    const countIndex = events.indexOf(getCount);
    const reqIndex = events.indexOf(reqLogs);
    expect(countIndex).toBeLessThan(reqIndex);
  });
});
