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
        await page.waitForTimeout(500);
    };

    // Create Master Code (will be deleted later)
    await createCode('master', '123456', 'Code Maître (À supprimer)');

    // Create Single Code (will stay synced)
    await createCode('single', '998877', 'Livreur (Synchronisé)');

    // 4. Go Offline
    // Click header connection button to disconnect.
    // Logic in Header.tsx: if (isConnected) disconnect();
    // It's a direct toggle, no dialog.
    await page.getByTestId('connection-button').click();

    // Wait for "Disconnected" state
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible({ timeout: 5000 });

    // 5. Create "Pending" Codes (Offline)

    // Create Single Code (Pending Add)
    await createCode('single', '112233', 'Invité (En attente)');

    // Delete Master Code (Pending Delete)
    const deleteBtn = page.getByTestId('delete-code-123456');
    await deleteBtn.click();

    // Confirm delete dialog - uses generic dialog structure
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

      const devices = await db.devices.toArray();
      const device = devices.sort((a: any, b: any) => b.updated_at - a.updated_at)[0];
      const deviceId = device ? device.id : 'SIMULATOR-001';

      console.log('Injecting logs for online device:', deviceId);

      await db.logs.where('device_id').equals(deviceId).delete();

      const now = Date.now();
      const logs = [
        {
          id: 'log-1',
          device_id: deviceId,
          timestamp: now,
          event: 'logs:events.ble_valid',
          type: 'info',
          opcode: 0x86,
          payload: new Uint8Array([0, 0, 0]),
          synced: false,
          details: { code: '123456', macAddress: 'AA:BB:CC:DD:EE:FF' }
        },
        {
          id: 'log-2',
          device_id: deviceId,
          timestamp: now - 60000,
          event: 'logs:events.key_valid',
          type: 'info',
          opcode: 0x87,
          payload: new Uint8Array([0, 0, 60]),
          synced: true,
          details: { code: '987654' }
        },
        {
          id: 'log-3',
          device_id: deviceId,
          timestamp: now - 120000,
          event: 'logs:events.door_open',
          type: 'info',
          opcode: 0x91,
          payload: new Uint8Array([0, 0, 120]),
          synced: true,
          details: {}
        },
        {
          id: 'log-4',
          device_id: deviceId,
          timestamp: now - 300000,
          event: 'logs:events.ble_invalid',
          type: 'warning',
          opcode: 0x88,
          payload: new Uint8Array([0, 1, 44]),
          synced: false,
          details: { code: '000000' }
        },
        {
           id: 'log-5',
           device_id: deviceId,
           timestamp: now - 600000,
           event: 'logs:events.nfc_opening',
           type: 'info',
           opcode: 0xA1,
           payload: new Uint8Array([0, 2, 88]),
           synced: true,
           details: { tag_uid: 'ABCDEF123456' }
        },
        {
           id: 'log-6',
           device_id: deviceId,
           timestamp: now - 1200000,
           event: 'logs:events.door_open',
           type: 'info',
           opcode: 0x91,
           payload: new Uint8Array([0, 0, 120]),
           synced: true,
           details: {}
        },
        {
           id: 'log-7',
           device_id: deviceId,
           timestamp: now - 86400000,
           event: 'logs:events.ble_valid',
           type: 'info',
           opcode: 0x86,
           payload: new Uint8Array([0, 0, 0]),
           synced: true,
           details: { code: '112233', macAddress: '11:22:33:44:55:66' }
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
        await page.waitForTimeout(500);
    }

    // 6. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/logs-online.png', fullPage: true });
  });
});
