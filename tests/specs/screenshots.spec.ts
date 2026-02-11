import { expect, test } from '../fixtures';

test.describe('Screenshots', () => {
  test('Capture Codes Screen (Offline)', async ({ page }) => {
    // 1. Initial Setup
    await page.goto('/');

    // Wait for simulator controller (ensure app loaded)
    await page.waitForFunction(() => (window as any).boksSimulator, null, {
      timeout: 30000
    });

    // 2. Inject Mock Data (Offline Device + Codes)
    await page.evaluate(async () => {
      const boksDebug = (window as any).boksDebug;
      const StorageService = boksDebug.StorageService;
      const db = boksDebug.db;

      // Ensure a device exists (Offline)
      let deviceId = 'OFFLINE-DEVICE-001';
      await db.devices.put({
        id: deviceId,
        ble_name: 'Boks Offline',
        friendly_name: 'Ma Boks (Hors Ligne)',
        role: 'owner',
        sync_status: 'synced',
        updated_at: Date.now() - 86400000 // 1 day ago
      });

      // Clear existing codes for this device
      await db.codes.where('device_id').equals(deviceId).delete();

      // Create Codes with diverse statuses
      const codes = [
        {
          id: 'master-1',
          device_id: deviceId,
          code: '123456',
          type: 'master',
          index: 0,
          status: 'on_device',
          name: 'Code Maître',
          created_at: new Date().toISOString(),
          sync_status: 'synced'
        },
        {
          id: 'single-pending',
          device_id: deviceId,
          code: '987654',
          type: 'single',
          status: 'pending_add',
          name: 'Livreur (En attente)',
          created_at: new Date().toISOString(),
          sync_status: 'created'
        },
        {
          id: 'multi-delete',
          device_id: deviceId,
          code: '555555',
          type: 'multi',
          status: 'pending_delete',
          name: 'Femme de ménage (Suppression)',
          uses: 3,
          maxUses: 10,
          created_at: new Date().toISOString(),
          sync_status: 'updated'
        },
        {
          id: 'single-used',
          device_id: deviceId,
          code: '111111',
          type: 'single',
          status: 'on_device', // Should appear used if usedAt is set? Check logic.
          usedAt: new Date(Date.now() - 3600000).toISOString(),
          name: 'Livreur (Utilisé)',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          sync_status: 'synced'
        }
      ];

      await StorageService.saveCodes(deviceId, codes);
      console.log('Mock codes injected for offline device ' + deviceId);

      // Force active device selection
      localStorage.setItem('lastActiveDeviceId', deviceId);
    });

    // Reload to pick up the new active device if needed, or navigate
    await page.reload();
    await page.waitForFunction(() => (window as any).boksSimulator, null, { timeout: 30000 });

    // 3. Go to Codes Tab
    // Wait for nav to be visible first
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const codesTab = page.getByTestId('nav-codes');
    await expect(codesTab).toBeVisible();
    await codesTab.click();

    // 4. Verify Content
    // Wait for codes to load
    await page.waitForFunction(async () => {
         const listItems = document.querySelectorAll('.MuiListItem-root'); // Adjust selector as needed
         return listItems.length > 0;
    }, null, { timeout: 15000 }).catch(() => console.log('Timeout waiting for codes list items'));

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
      const logs = [
        {
          id: 'log-1',
          device_id: deviceId,
          timestamp: now,
          event: 'logs:events.ble_valid',
          type: 'info',
          opcode: 0x86, // LOG_CODE_BLE_VALID_HISTORY
          payload: new Uint8Array([0, 0, 0]), // Dummy payload, parser handles it
          synced: false,
          details: { code: '123456', macAddress: 'AA:BB:CC:DD:EE:FF' }
        },
        {
          id: 'log-2',
          device_id: deviceId,
          timestamp: now - 60000, // 1 min ago
          event: 'logs:events.key_valid',
          type: 'info',
          opcode: 0x87, // LOG_CODE_KEY_VALID_HISTORY
          payload: new Uint8Array([0, 0, 60]),
          synced: true,
          details: { code: '987654' }
        },
        {
          id: 'log-3',
          device_id: deviceId,
          timestamp: now - 120000, // 2 mins ago
          event: 'logs:events.door_open',
          type: 'info',
          opcode: 0x91, // LOG_DOOR_OPEN_HISTORY
          payload: new Uint8Array([0, 0, 120]),
          synced: true,
          details: {}
        },
        {
          id: 'log-4',
          device_id: deviceId,
          timestamp: now - 300000, // 5 mins ago
          event: 'logs:events.ble_invalid',
          type: 'warning',
          opcode: 0x88, // LOG_CODE_BLE_INVALID_HISTORY
          payload: new Uint8Array([0, 1, 44]),
          synced: false,
          details: { code: '000000' }
        },
        {
           id: 'log-5',
           device_id: deviceId,
           timestamp: now - 600000, // 10 mins ago
           event: 'logs:events.nfc_opening',
           type: 'info',
           opcode: 0xA1, // LOG_EVENT_NFC_OPENING
           payload: new Uint8Array([0, 2, 88]),
           synced: true,
           details: { tag_uid: 'ABCDEF123456' }
        }
      ];

      // Add logs directly to DB
      await db.logs.bulkAdd(logs);
      console.log('Mock logs injected.');
    });

    // 4. Go to Logs Tab
    // Wait for nav to be visible first
    const nav = page.getByTestId('main-nav');
    await expect(nav).toBeVisible({ timeout: 10000 });

    // Check if nav-logs is visible directly (mobile view might have it in bottom nav or menu)
    const logsTab = page.getByTestId('nav-logs');
    if (await logsTab.isVisible()) {
        await logsTab.click();
    } else {
        // Try menu
        await page.getByLabel('menu').click();
        await page.getByTestId('nav-logs').click();
    }

    // 5. Verify Content
    // Wait for at least one log entry
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

    // 6. Screenshot
    await page.screenshot({ path: 'test-results/screenshots/logs-online.png', fullPage: true });
  });
});
