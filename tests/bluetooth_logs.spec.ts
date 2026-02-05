import { BLEOpcode, expect, test } from './fixtures';

test.describe('Bluetooth Logs Feature', () => {
  test.beforeEach(async ({ page, simulator }) => {
    await page.goto('/');
  });

  test('should send GET_LOGS_COUNT when refreshing logs', async ({ page, simulator }) => {
    // 1. Connect
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });
    await expect(page.getByText('%')).toBeVisible({ timeout: 10000 });

    // 1.5. Navigate to Logs via Bottom Navigation
    await page.getByRole('button', { name: /Logs/i }).click();

    // 2. Click Refresh Logs
    const logsSection = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: /Logs/i }) });
    const refreshBtn = logsSection.getByRole('button', { name: /Refresh/i });
    await expect(refreshBtn).toBeVisible();
    await expect(refreshBtn).toBeEnabled({ timeout: 15000 });
    await refreshBtn.click();

    // 3. Verify TX Events
    // We expect GET_LOGS_COUNT (0x07) to be sent either during connection or refresh
    await simulator.waitForTxOpcode(BLEOpcode.GET_LOGS_COUNT);

    // Retrieve events
    const events = await simulator.getTxEvents();
    const getCount = events.find((e: any) => e.opcode === BLEOpcode.GET_LOGS_COUNT);
    expect(getCount).toBeDefined();

    // Note: We don't verify REQUEST_LOGS (0x03) because if count is 0, it won't be sent.
  });
});
