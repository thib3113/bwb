import { test, expect, BLEOpcode } from './fixtures';

test.describe('Bluetooth PIN Management', () => {
  test.beforeEach(async ({ page, simulator }) => {
    await page.goto('/');
  });

  test('should send CREATE_MASTER_CODE event', async ({ page, simulator }) => {
    // 1. Connect
    const disabledIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
    await page
      .getByRole('button', { name: /connect/i })
      .filter({ hasText: /^Connect$|^$/ })
      .first()
      .click();
    await expect(disabledIcon).not.toBeVisible({ timeout: 15000 });

    // 2. Add Code
    const addBtn = page
      .locator('button')
      .filter({ has: page.locator('svg[data-testid="AddIcon"]') });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    await expect(page.getByRole('dialog')).toBeVisible();

    const pinInput = page.getByLabel(/PIN/i).first();
    await pinInput.fill('121212');

    const nameInput = page.getByLabel(/Description|Name/i).first();
    await nameInput.fill('TestCode');

    const saveBtn = page
      .locator('.MuiDialogActions-root button')
      .filter({ hasText: /Generate|Save/i });
    await saveBtn.click();

    // 3. Verify CREATE_MASTER_CODE (0x11)
    await simulator.waitForTxOpcode(BLEOpcode.CREATE_MASTER_CODE);

    const events = await simulator.getTxEvents();
    const createEvent = events.find((e: any) => e.opcode === BLEOpcode.CREATE_MASTER_CODE);
    expect(createEvent).toBeDefined();
  });
});
