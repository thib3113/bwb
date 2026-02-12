import { expect, test } from '../fixtures';

test.describe('Screenshots', () => {
  test('Capture Codes Screen (Offline)', async ({ page, simulator }) => {
    // 1. Initial Setup & Connect
    await page.goto('/');

    // Wait for simulator to be ready
    await page.waitForFunction(() => (window as any).boksSimulator, null, { timeout: 30000 });

    // Connect to Simulator (Online)
    await simulator.connect();

    // 2. Navigate to Codes
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible({ timeout: 15000 });

    const codesTab = page.getByTestId('nav-codes');
    await expect(codesTab).toBeVisible();
    await codesTab.click();

    // 3. Create "Synced" Codes (Online)

    // Helper to create a code
    const createCode = async (type: 'master' | 'single', code: string, name: string) => {
        // Open Add Dialog
        const addBtn = page.getByTestId('add-code-button');
        await addBtn.click();

        // Select type
        const typeSelect = page.getByTestId('code-type-select');
        await typeSelect.click();

        if (type === 'master') {
            await page.getByTestId('option-master').click();
        } else {
            await page.getByTestId('option-single').click();
        }

        // Fill form
        await page.getByTestId('code-name-input').fill(name);
        await page.getByTestId('code-pin-input').fill(code);

        // Save
        await page.getByTestId('save-code-button').click();

        // Wait for it to appear
        await expect(page.getByTestId(`code-item-${code}`)).toBeVisible();
    };

    // Create Master Code (Pending Delete later)
    await createCode('master', '123456', 'Code Maître (À supprimer)');

    // Create Master Code (Synced) - Requested Addition
    await createCode('master', '789012', 'Code Maître (Synchronisé)');

    // Create Single Code (will stay synced)
    await createCode('single', '998877', 'Livreur (Synchronisé)');

    // Force Sync Status in DB to ensure screenshot is correct (Bypass Simulator/App sync race conditions)
    await page.evaluate(async () => {
        const db = (window as any).boksDebug.db;
        const codesToSync = ['789012', '998877']; // 123456 is for delete, we leave it or sync it? Let's sync it too for the delete test.
        // Actually 123456 is meant to be deleted later.

        // Let's sync all currently visible codes
        const codes = await db.codes.toArray();
        for (const c of codes) {
            if (['123456', '789012', '998877'].includes(c.code)) {
                await db.codes.update(c.id, { status: 'on_device', synced: true });
            }
        }
    });

    // Verify they appear as synced
    await expect(page.locator('[data-testid="code-item-789012"]')).toHaveAttribute('data-status', 'on_device', { timeout: 5000 });
    await expect(page.locator('[data-testid="code-item-998877"]')).toHaveAttribute('data-status', 'on_device', { timeout: 5000 });

    // 4. Go Offline
    // Click header connection button to disconnect
    await page.getByTestId('connection-button').click();

    // Wait for "Disconnected" state
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible({ timeout: 5000 });

    // 5. Create "Pending" Codes (Offline)

    // Create Single Code (Pending Add)
    await createCode('single', '112233', 'Invité (En attente)');

    // Create Master Code (Pending Add) - Requested Addition
    await createCode('master', '654321', 'Maître (En attente)');

    // Delete Master Code (Pending Delete)
    const deleteBtn = page.getByTestId('delete-code-123456');
    await deleteBtn.click();

    // Confirm delete dialog
    const deleteDialog = page.getByRole('dialog');
    if (await deleteDialog.isVisible()) {
        await deleteDialog.getByRole('button').last().click();
    }

    // 6. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/codes-offline.png', fullPage: true });
  });

  test('Capture Logs Screen (Online)', async ({ page, simulator }) => {
    // 1. Initial Setup
    await page.goto('/');

    // Wait for simulator
    await page.waitForFunction(() => (window as any).boksSimulator, null, { timeout: 30000 });

    // 2. Connect
    await simulator.connect();

    // Wait for nav
    await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 15000 });

    // 3. Inject Mock Data (Online Device + Logs)
    await page.evaluate(async () => {
      const boksDebug = (window as any).boksDebug;
      const db = boksDebug.db;

      // Find the connected simulator device
      const devices = await db.devices.toArray();
      const device = devices.sort((a: any, b: any) => b.updated_at - a.updated_at)[0];
      const deviceId = device ? device.id : 'SIMULATOR-001';

      console.log('Injecting logs for online device:', deviceId);

      // Clear existing logs
      await db.logs.where('device_id').equals(deviceId).delete();

      // Helpers for constructing payloads
      const createCodePayload = (code: string) => {
          // Age(3) + Code(6)
          const payload = new Uint8Array(9);
          // Set Age to 0 (bytes 0-2 are 0)
          // Set Code
          const codeBytes = new TextEncoder().encode(code.padEnd(6, '\0').substring(0, 6));
          payload.set(codeBytes, 3);
          return payload;
      };

      const createNfcPayload = (uidHex: string) => {
          // Age(3) + TagType(1) + UidLen(1) + Uid(N)
          // uidHex format: "AA:BB:CC..."
          const uidBytes = uidHex.split(':').map(b => parseInt(b, 16));
          const len = 3 + 1 + 1 + uidBytes.length;
          const payload = new Uint8Array(len);
          // Age = 0
          payload[3] = 0x04; // Tag Type (e.g. 4=Mifare)
          payload[4] = uidBytes.length;
          payload.set(uidBytes, 5);
          return payload;
      };

      const createSimplePayload = () => {
          // Age(3)
          return new Uint8Array([0, 0, 0]);
      };

      const now = new Date();

      const logs = [
        {
          id: 'log-1',
          device_id: deviceId,
          timestamp: now.toISOString(),
          event: 'logs:events.ble_valid',
          type: 'info',
          opcode: 0x86, // LOG_CODE_BLE_VALID_HISTORY
          payload: createCodePayload('123456'),
          synced: false,
          details: { code: '123456' } // Explicit details in case parsing fails, but payload should work
        },
        {
          id: 'log-2',
          device_id: deviceId,
          timestamp: new Date(now.getTime() - 60000).toISOString(),
          event: 'logs:events.key_valid',
          type: 'info',
          opcode: 0x87, // LOG_CODE_KEY_VALID_HISTORY
          payload: createCodePayload('987654'),
          synced: true,
          details: { code: '987654' }
        },
        {
          id: 'log-3',
          device_id: deviceId,
          timestamp: new Date(now.getTime() - 120000).toISOString(),
          event: 'logs:events.door_open',
          type: 'info',
          opcode: 0x91, // LOG_DOOR_OPEN_HISTORY
          payload: createSimplePayload(),
          synced: true,
          details: {}
        },
        {
          id: 'log-4',
          device_id: deviceId,
          timestamp: new Date(now.getTime() - 300000).toISOString(),
          event: 'logs:events.ble_invalid',
          type: 'warning',
          opcode: 0x88, // LOG_CODE_BLE_INVALID_HISTORY
          payload: createCodePayload('000000'),
          synced: false,
          details: { code: '000000' }
        },
        {
           id: 'log-5',
           device_id: deviceId,
           timestamp: new Date(now.getTime() - 600000).toISOString(),
           event: 'logs:events.nfc_opening',
           type: 'info',
           opcode: 0xA1, // LOG_EVENT_NFC_OPENING
           payload: createNfcPayload('AB:CD:EF:12:34:56'),
           synced: true,
           details: { tag_uid: 'AB:CD:EF:12:34:56' }
        },
        {
           id: 'log-6',
           device_id: deviceId,
           timestamp: new Date(now.getTime() - 1200000).toISOString(),
           event: 'logs:events.door_open',
           type: 'info',
           opcode: 0x91,
           payload: createSimplePayload(),
           synced: true,
           details: {}
        },
        {
           id: 'log-7',
           device_id: deviceId,
           timestamp: new Date(now.getTime() - 86400000).toISOString(),
           event: 'logs:events.ble_valid',
           type: 'info',
           opcode: 0x86,
           payload: createCodePayload('112233'),
           synced: true,
           details: { code: '112233' }
        }
      ];

      await db.logs.bulkAdd(logs);
      console.log('Mock logs injected.');
    });

    // 4. Navigate to Logs
    const logsTab = page.getByTestId('nav-logs');
    if (await logsTab.isVisible()) {
        await logsTab.click();
    } else {
        await page.getByLabel('menu').click();
        await page.getByTestId('nav-logs').click();
    }

    // 5. Verify & Expand
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    const firstRow = rows.first();
    const expandBtn = firstRow.locator('button').last();

    if (await expandBtn.isVisible()) {
        await expandBtn.click();
        // Increased wait time for animation
        await page.waitForTimeout(1000);
    }

    // 6. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/logs-online.png', fullPage: true });
  });
});
