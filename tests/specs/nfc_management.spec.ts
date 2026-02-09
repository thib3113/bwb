import { BLEOpcode, expect, test } from '../fixtures';

test.describe('NFC Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.fixme('should add and delete NFC tag with simulator verification', async ({ page, simulator }) => {
    // 0. Setup Compatible Firmware/Hardware for NFC
    await page.waitForFunction(() => window.boksSimulator, null, {
      timeout: 30000
    });

    await page.evaluate(() => {
      const sim = window.boksSimulator;
      if (sim && typeof sim.setVersion === 'function') {
        sim.setVersion('10/125', '4.0', '4.3.3');
      }
    });

    // 1. Connect
    await simulator.connect();

    // 1.5 Ensure Secrets Exist (Workaround for potential onboarding issue in test environment)
    await page.evaluate(async () => {
       const db = window.boksDebug?.db as any;
       if (db) {
         await db.device_secrets.put({
            device_id: 'SIMULATOR-001',
            configuration_key: 'AABBCCDD', // Default simulator key
            door_pin_code: '123456'
         });
         console.log('Injected secrets for SIMULATOR-001');
       }
    });

    // 2. Navigate to My Boks Page
    await page.goto('/my-boks');

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
    await startScanBtn.click();

    await page.waitForTimeout(2000);

    // 5. Trigger simulated tag scan
    await page.evaluate(() => {
       const sim = window.boksSimulator;
       if (sim && typeof sim.triggerNfcScan === 'function') {
         sim.triggerNfcScan('04:A1:B2:C3:D4:E5:F6');
       }
    });

    // 6. Register Tag
    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 10000 });

    await expect(alert).toContainText(/04|A1/);

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
