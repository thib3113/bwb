import { expect, test } from '../fixtures';

test.describe('Screenshots', () => {
  test('Capture Codes Screen (Offline)', async ({ page }) => {
    // 1. Initial Setup
    await page.goto('/');

    // Wait for simulator controller (ensure app loaded)
    await page.waitForFunction(() => (window as any).boksSimulator, null, {
      timeout: 30000
    });

    // 2. Navigate to Codes FIRST
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const codesTab = page.getByTestId('nav-codes');
    await expect(codesTab).toBeVisible();
    await codesTab.click();

    // Ensure we are on the page
    await expect(page.locator('.MuiList-root').first()).toBeVisible();

    // 3. Inject Mock Data (Offline Device + Codes) - Injecting while on page triggers reactivity
    await page.evaluate(async () => {
      const boksDebug = (window as any).boksDebug;
      const StorageService = boksDebug.StorageService;
      const db = boksDebug.db;

      // Dynamic Device Fetching
      const devices = await db.devices.toArray();
      const device = devices.sort((a: any, b: any) => b.updated_at - a.updated_at)[0];

      let deviceId = device ? device.id : 'OFFLINE-DEVICE-001';

      if (!device) {
          await db.devices.put({
            id: deviceId,
            ble_name: 'Boks Offline',
            friendly_name: 'Ma Boks (Hors Ligne)',
            role: 'owner',
            sync_status: 'synced',
            updated_at: Date.now() - 86400000 // 1 day ago
          });
      } else {
          console.log('Using existing device:', deviceId);
      }

      // Force active device selection just in case
      localStorage.setItem('lastActiveDeviceId', deviceId);

      // Clear existing codes for this device
      await db.codes.where('device_id').equals(deviceId).delete();

      // Create Codes with diverse statuses
      const codes = [
        // Master Codes
        {
          id: 'master-active',
          device_id: deviceId,
          code: '123456',
          type: 'master',
          index: 0,
          status: 'on_device',
          name: 'Code Maître (Actif)',
          created_at: new Date().toISOString(),
          sync_status: 'synced'
        },
        {
          id: 'master-pending-add',
          device_id: deviceId,
          code: '112233',
          type: 'master',
          index: 1,
          status: 'pending_add',
          name: 'Code Maître (Ajout en attente)',
          created_at: new Date().toISOString(),
          sync_status: 'created'
        },
        {
          id: 'master-pending-delete',
          device_id: deviceId,
          code: '445566',
          type: 'master',
          index: 2,
          status: 'pending_delete',
          name: 'Code Maître (Suppression en attente)',
          created_at: new Date().toISOString(),
          sync_status: 'updated'
        },

        // Single Codes
        {
          id: 'single-active',
          device_id: deviceId,
          code: '998877',
          type: 'single',
          status: 'on_device',
          name: 'Livreur (Actif)',
          created_at: new Date().toISOString(),
          sync_status: 'synced'
        },
        {
          id: 'single-pending-add',
          device_id: deviceId,
          code: '987654',
          type: 'single',
          status: 'pending_add',
          name: 'Livreur (Ajout en attente)',
          created_at: new Date().toISOString(),
          sync_status: 'created'
        },
        {
          id: 'single-pending-delete',
          device_id: deviceId,
          code: '111222',
          type: 'single',
          status: 'pending_delete',
          name: 'Livreur (Suppression en attente)',
          created_at: new Date().toISOString(),
          sync_status: 'updated'
        },
        {
          id: 'single-used',
          device_id: deviceId,
          code: '333444',
          type: 'single',
          status: 'on_device',
          usedAt: new Date(Date.now() - 3600000).toISOString(),
          name: 'Livreur (Utilisé)',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          sync_status: 'synced'
        },

        // Multi Codes
        {
          id: 'multi-active',
          device_id: deviceId,
          code: '555111',
          type: 'multi',
          status: 'on_device',
          name: 'Femme de ménage (Actif)',
          uses: 2,
          maxUses: 10,
          created_at: new Date().toISOString(),
          sync_status: 'synced'
        },
        {
          id: 'multi-pending-add',
          device_id: deviceId,
          code: '555222',
          type: 'multi',
          status: 'pending_add',
          name: 'Jardinier (Ajout en attente)',
          maxUses: 5,
          created_at: new Date().toISOString(),
          sync_status: 'created'
        },
        {
          id: 'multi-pending-delete',
          device_id: deviceId,
          code: '555333',
          type: 'multi',
          status: 'pending_delete',
          name: 'Nounou (Suppression en attente)',
          uses: 9,
          maxUses: 10,
          created_at: new Date().toISOString(),
          sync_status: 'updated'
        }
      ];

      await StorageService.saveCodes(deviceId, codes);
      console.log('Mock codes injected for device ' + deviceId);
    });

    // 4. Verify Content using Data Test IDs
    // Since we injected data while the component was mounted, useLiveQuery should update immediately.
    await expect(page.getByTestId('code-item-123456')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('code-item-987654')).toBeVisible();
    await expect(page.getByTestId('code-item-555333')).toBeVisible();

    // 5. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/codes-offline.png', fullPage: true });
  });

  test('Capture Logs Screen (Online)', async ({ page, simulator }) => {
    // 1. Initial Setup
    await page.goto('/');

    // Wait for simulator controller
    await page.waitForFunction(() => (window as any).boksSimulator, null, {
      timeout: 30000
    });

    // 2. Connect (Online)
    await simulator.connect();

    // Wait for DB persistence
    await page.waitForTimeout(2000);

    // 3. Inject Mock Data (Online Device + Logs)
    await page.evaluate(async () => {
      const boksDebug = (window as any).boksDebug;
      const db = boksDebug.db;

      // Find the connected simulator device
      const devices = await db.devices.toArray();
      // Sort by updated_at descending to find the active one
      const device = devices.sort((a: any, b: any) => b.updated_at - a.updated_at)[0];
      const deviceId = device ? device.id : 'SIMULATOR-001';

      console.log('Injecting logs for online device:', deviceId);

      // Clear existing logs
      await db.logs.where('device_id').equals(deviceId).delete();

      const now = Date.now();
      // Ensure timestamps are numbers, not strings, to avoid "Invalid Date"
      const logs = [
        {
          id: 'log-1',
          device_id: deviceId,
          timestamp: now,
          event: 'logs:events.ble_valid',
          type: 'info',
          opcode: 0x86, // LOG_CODE_BLE_VALID_HISTORY
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
           timestamp: now - 1200000, // 20 mins ago
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
           timestamp: now - 86400000, // 1 day ago
           event: 'logs:events.ble_valid',
           type: 'info',
           opcode: 0x86,
           payload: new Uint8Array([0, 0, 0]),
           synced: true,
           details: { code: '112233', macAddress: '11:22:33:44:55:66' }
        }
      ];

      // Add logs directly to DB
      await db.logs.bulkAdd(logs);
      console.log('Mock logs injected.');
    });

    // 4. Go to Logs Tab
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const logsTab = page.getByTestId('nav-logs');
    if (await logsTab.isVisible()) {
        await logsTab.click();
    } else {
        await page.getByLabel('menu').click();
        await page.getByTestId('nav-logs').click();
    }

    // 5. Verify Content & Interact
    // Wait for at least one log entry
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });

    // Expand the first log (it has details)
    const firstRow = rows.first();
    const expandBtn = firstRow.locator('button').last();

    if (await expandBtn.isVisible()) {
        await expandBtn.click();

        // Wait for details to expand
        // Use animation wait instead of element check to be safe
        await page.waitForTimeout(500);
    }

    // 6. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/logs-online.png', fullPage: true });
  });
});
