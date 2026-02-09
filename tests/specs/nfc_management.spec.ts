import { BLEOpcode, expect, test } from '../fixtures';

test.describe('NFC Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should add and delete NFC tag with simulator verification', async ({ page, simulator }) => {
    // 0. Setup Compatible Firmware/Hardware for NFC
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const controller = window.boksSimulator;
      if (controller) {
        controller.setVersion('4.3.3', '10/125');
      }
    });

    // 1. Connect and stay on the redirect page (which is /my-boks for new devices)
    await simulator.connect({ skipReturnToHome: true });

    // 1.5 Ensure Secrets Exist
    await page.evaluate(async () => {
       const db = window.boksDebug?.db;
       if (db) {
         await db.device_secrets.put({
            device_id: 'SIMULATOR-001',
            configuration_key: 'AABBCCDD', // Default simulator key
            door_pin_code: '123456'
         });
       }
    });

    // 2. Ensure we are on My Boks page via UI navigation if not already there
    const url = page.url();
    if (!url.includes('/my-boks')) {
      const menuBtn = page.getByLabel('menu');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();
      await page.getByTestId('nav-my-boks').click();
    }

    // 3. Open NFC Tab
    const nfcTab = page.getByTestId('tab-nfc');
    await expect(nfcTab).toBeVisible({ timeout: 10000 });
    // Verify enabled
    await expect(nfcTab).toHaveCSS('opacity', '1');
    await nfcTab.click();

    // 4. Start Scan (Add Tag)
    const addBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="AddIcon"]') });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    const startScanBtn = page.getByRole('button', { name: /Start/i });
    await expect(startScanBtn).toBeVisible();

    // Ensure connection is stable before clicking start
    await expect(page.getByTestId('status-icon-connected')).toBeVisible({ timeout: 10000 });

    await startScanBtn.click();

    // 4.5 Wait for REGISTER_NFC_TAG_SCAN_START (0x17)
    await simulator.waitForTxOpcode(BLEOpcode.REGISTER_NFC_TAG_SCAN_START);

    await page.waitForTimeout(1000);

    // 5. Trigger simulated tag scan
    await page.evaluate(() => {
       const sim = window.boksSimulator;
       if (sim) {
         sim.triggerNfcScan('04:A1:B2:C3:D4:E5:F6');
       }
    });

    // 6. Register Tag
    const alert = page.getByRole('alert');
    try {
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).toContainText(/04|A1/);
    } catch (e) {
      await page.screenshot({ path: 'test-results/nfc-scan-error.png' });
      throw e;
    }

    const input = page.locator('.MuiDialog-root input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill('Test Badge');

    const dialogAddBtn = page.getByRole('dialog').getByRole('button').filter({ hasText: /Add/i });
    await dialogAddBtn.click();

    // 7. Verify ADD_NFC_TAG Opcode (0x18)
    await simulator.waitForTxOpcode(BLEOpcode.REGISTER_NFC_TAG);
    const txEvents = await simulator.getTxEvents();
    const addEvent = txEvents.find((e: any) => e.opcode === BLEOpcode.REGISTER_NFC_TAG);
    expect(addEvent).toBeDefined();

    // 8. Verify List Update
    await expect(page.getByText('Test Badge')).toBeVisible();

    // 9. Delete Tag
    const listItem = page.locator('li').filter({ hasText: 'Test Badge' });
    const deleteBtn = listItem.getByRole('button').filter({ has: page.locator('svg[data-testid="DeleteIcon"]') });

    page.on('dialog', dialog => dialog.accept());

    await deleteBtn.click();

    // 10. Verify UNREGISTER_NFC_TAG Opcode (0x19)
    await simulator.waitForTxOpcode(BLEOpcode.UNREGISTER_NFC_TAG);

    const allEvents = await simulator.getTxEvents();
    const delEvent = allEvents.find((e: any) => e.opcode === BLEOpcode.UNREGISTER_NFC_TAG);
    expect(delEvent).toBeDefined();

    // 11. Verify List Update
    await expect(page.getByText('Test Badge')).not.toBeVisible();
  });
});
