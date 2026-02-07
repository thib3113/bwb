import { test, expect } from './fixtures';

test('Generate screenshot of codes view with mixed statuses', async ({ page, simulator }) => {
  // 1. Initial Setup
  await page.goto('/');

  // Wait for simulator controller
  await page.waitForFunction(() => (window as any).boksSimulatorController, null, { timeout: 30000 });

  // 2. Connect
  await simulator.connect();

  // Wait for React effects to persist device to DB
  await page.waitForTimeout(3000);

  // 3. Inject Mock Data
  await page.evaluate(async () => {
    const boksDebug = (window as any).boksDebug;
    const StorageService = boksDebug.StorageService;
    const db = boksDebug.db;

    // Find the connected device ID
    let deviceId = 'SIMULATOR-001';

    // Try to find the device, retrying a few times if needed (though waitForTimeout should be enough)
    const devices = await db.devices.toArray();
    console.log('All devices in DB:', JSON.stringify(devices));

    const device = devices.sort((a: any, b: any) => b.updated_at - a.updated_at)[0];

    if (device) {
        deviceId = device.id;
        console.log('Found real device ID:', deviceId);
    } else {
        console.warn('Still no device found in DB! Using default, which might fail.');
    }

    // Clear codes for this device
    await db.codes.where('device_id').equals(deviceId).delete();

    // Create Codes with CORRECT deviceId
    const codes = [
      {
        id: 'master-1',
        device_id: deviceId,
        code: '123456',
        type: 'master',
        index: 0,
        status: 'on_device',
        name: 'Master Principal',
        created_at: new Date().toISOString(),
        sync_status: 'synced'
      },
      {
        id: 'single-active',
        device_id: deviceId,
        code: '111111',
        type: 'single',
        status: 'on_device',
        name: 'Livreur Demain',
        created_at: new Date().toISOString(),
        sync_status: 'synced'
      },
      {
        id: 'single-used',
        device_id: deviceId,
        code: '222222',
        type: 'single',
        status: 'on_device',
        usedAt: new Date(Date.now() - 3600000).toISOString(),
        name: 'Livreur Passé (Utilisé)',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        sync_status: 'synced'
      },
      {
        id: 'multi-active',
        device_id: deviceId,
        code: '333333',
        type: 'multi',
        status: 'on_device',
        name: 'Femme de ménage',
        uses: 5,
        maxUses: 10,
        created_at: new Date().toISOString(),
        sync_status: 'synced'
      }
    ];

    await StorageService.saveCodes(deviceId, codes);
    console.log('Mock codes injected for device ' + deviceId);
  });

  // 4. Go to Codes Tab
  const codesTab = page.getByTestId('nav-codes');
  await expect(codesTab).toBeVisible();
  await codesTab.click();

  // 5. Check Content
  await expect(page.getByText('Master Principal')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Livreur Demain')).toBeVisible();
  const usedCode = page.getByText('Livreur Passé (Utilisé)');
  await expect(usedCode).toBeVisible();

  // 6. Screenshot
  await page.screenshot({ path: 'codes_view_demo.png', fullPage: true });
});
