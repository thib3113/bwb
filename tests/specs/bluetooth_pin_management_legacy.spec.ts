import { test, expect, BLEOpcode } from '../fixtures';

test.describe('Bluetooth PIN Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should send CREATE_MASTER_CODE event', async ({ page, simulator }) => {
    // 1. Connect
    // 1. Connect
    await simulator.connect();

    // 2. Add Code
    await page.getByTestId('add-code-button').click();
    await page.getByTestId('code-type-select').click();
    await page.getByTestId('option-master').click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const pinInput = page.getByLabel(/PIN/i).first();
    await pinInput.fill('121212');

    const nameInput = page.getByLabel(/Description|Name/i).first();
    await nameInput.fill('TestCode');

    const saveBtn = page.getByTestId('save-code-button');
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // 3. Verify CREATE_MASTER_CODE (0x11)
    // We increase timeout as there might be a DELETE task first (Opcode 0x0C)
    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE, 40000);

    const events = await simulator.getTxEvents();
    const createEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE);
    expect(createEvent).toBeDefined();
  });
});
