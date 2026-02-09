import { BLEOpcode, expect, test } from '../fixtures';

test.describe('Door Control Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open the door via simulator and verify state change', async ({ page, simulator }) => {
    // 1. Connect
    await page.getByTestId('connection-button').click();
    await expect(page.getByTestId('status-icon-connected')).toBeVisible({ timeout: 40000 });

    const openBtn = page.getByTestId('open-door-button');
    await expect(openBtn).toBeEnabled();

    // Verify initial state (Closed)
    // We check that it is NOT 'open'
    await expect(openBtn).not.toHaveAttribute('data-door-status', 'open');

    // 2. Click Open Door
    await openBtn.click();

    // 3. Verify Simulator received the command
    await simulator.waitForTxOpcode(BLEOpcode.OPEN_DOOR, 10000);
    const events = await simulator.getTxEvents();
    const openDoorEvent = events.find((e: any) => e.opcode === BLEOpcode.OPEN_DOOR);
    expect(openDoorEvent).toBeDefined();
    // Default PIN is '123456' -> [49, 50, 51, 52, 53, 54]
    expect(openDoorEvent.payload).toEqual([49, 50, 51, 52, 53, 54]);

    // 4. Verify UI state change to OPEN
    // Wait for the attribute to update.
    await expect(openBtn).toHaveAttribute('data-door-status', 'open', { timeout: 10000 });

    // 5. Force Close via Simulator
    // We access the exposed boksSimulator instance on the page
    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller && typeof controller.triggerDoorClose === 'function') {
        controller.triggerDoorClose();
      } else {
        console.warn('boksSimulator or triggerDoorClose not found on window');
      }
    });

    // 6. Verify UI state change to CLOSED
    await expect(openBtn).not.toHaveAttribute('data-door-status', 'open', { timeout: 5000 });
  });
});
