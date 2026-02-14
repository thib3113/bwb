import { expect, test } from '../fixtures';

test.describe('Simulator Workflow', () => {
  test('should redirect to settings when enabling simulator DYNAMICALLY and connecting, avoiding duplicates', async ({
    page
  }) => {
    // 1. Smart Init Script: Force Simulator OFF only on first load
    await page.addInitScript(() => {
      // Use sessionStorage to detect if this is the first load of the test session
      if (!sessionStorage.getItem('TEST_INITIALIZED')) {
          console.log('[Test Init] First load: Forcing Simulator OFF');
          localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'false');
          // @ts-ignore
          window.BOKS_SIMULATOR_ENABLED = false;
          sessionStorage.setItem('TEST_INITIALIZED', 'true');
      } else {
          console.log('[Test Init] Subsequent load: Preserving Simulator State');
      }

      // Mock navigator.bluetooth minimal (always apply)
      // @ts-ignore
      if (!navigator.bluetooth) {
        // @ts-ignore
        navigator.bluetooth = {
          getAvailability: () => Promise.resolve(true),
          requestDevice: () => Promise.reject(new Error('Mock: User cancelled'))
        };
      }
    });

    await page.goto('/');

    // 2. Clear DB to ensure "New Device" logic triggers
    await page.evaluate(async () => {
      // @ts-ignore
      const db = window.boksDebug?.db;
      if (db) {
        await db.devices.clear();
        await db.device_secrets.clear();
      }
    });

    // Reset session storage flag to ensure we really start fresh for this run
    await page.evaluate(() => sessionStorage.removeItem('TEST_INITIALIZED'));

    await page.reload(); // This triggers init script (sets OFF)

    // Verify Simulator is OFF
    const isSimEnabled = await page.evaluate(() => {
      // @ts-ignore
      return window.BOKS_SIMULATOR_ENABLED;
    });
    expect(isSimEnabled).toBe(false);

    // 3. Navigate to Developer Page
    console.log('[Test] Navigating to /developer...');
    await page.goto('/developer');

    // 4. Enable Simulator via UI (Simulating button click)
    // Wait for function to be available
    await page.waitForFunction(() => (window as any).toggleSimulator !== undefined, { timeout: 10000 });

    await page.evaluate(() => {
        // @ts-ignore
        if (window.toggleSimulator) {
            // @ts-ignore
            window.toggleSimulator(true);
        } else {
            throw new Error('toggleSimulator not found');
        }
    });

    // 5. Connect via Header (First Time)
    console.log('[Test] Clicking Header Connect Button (1st time)...');
    const headerConnectBtn = page.getByTestId('connection-button');
    await expect(headerConnectBtn).toBeVisible();
    await headerConnectBtn.click();

    // 6. Expect Redirect (New Device)
    console.log('[Test] Waiting for redirect (New Device)...');
    await expect(page).toHaveURL(/.*\/my-boks\?tab=settings/, { timeout: 15000 });

    // 7. Verify Device Registration (1 Device)
    let deviceCount = await page.evaluate(async () => {
      // @ts-ignore
      const db = window.boksDebug?.db;
      return await db.devices.count();
    });
    expect(deviceCount).toBe(1);

    // 8. Disconnect
    console.log('[Test] Disconnecting...');
    await expect(page.getByTestId('status-icon-connected')).toBeVisible();
    await headerConnectBtn.click();

    // Wait for disconnect state
    await expect(page.getByTestId('status-icon-disconnected')).toBeVisible({ timeout: 5000 });

    // 9. Navigate back to Home/Codes
    console.log('[Test] Navigating to /codes...');
    await page.goto('/codes');

    // Verify Simulator is STILL ON (preserved by sessionStorage logic)
    const isSimEnabled2 = await page.evaluate(() => {
       return localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true';
    });
    expect(isSimEnabled2).toBe(true);

    // 10. Connect Again (Existing Device)
    console.log('[Test] Connecting again (Existing Device)...');
    await expect(headerConnectBtn).toBeVisible();
    await headerConnectBtn.click();

    // Wait for connected state
    await expect(page.getByTestId('status-icon-connected')).toBeVisible({ timeout: 10000 });

    // 11. Verify NO Redirect (Should stay on /codes)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log(`[Test] Current URL after reconnect: ${currentUrl}`);
    expect(currentUrl).toContain('/codes');
    expect(currentUrl).not.toContain('/my-boks?tab=settings');

    // 12. Verify Device Registration (Still 1 Device - No Duplicate)
    deviceCount = await page.evaluate(async () => {
      // @ts-ignore
      const db = window.boksDebug?.db;
      return await db.devices.count();
    });
    expect(deviceCount).toBe(1);
  });
});
