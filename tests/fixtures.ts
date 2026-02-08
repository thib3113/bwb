/* eslint-disable react-hooks/rules-of-hooks */
import { expect, test as base } from '@playwright/test';

// Re-export constants for easy access in tests
export { BLEOpcode } from '../src/utils/bleConstants';
export { expect } from '@playwright/test';

export interface Simulator {
  waitForTxOpcode(opcode: number, timeout?: number): Promise<void>;
  getTxEvents(): Promise<any[]>;
  clearTxEvents(): Promise<void>;
  connect(options?: { skipReturnToHome?: boolean }): Promise<void>;
}

export const test = base.extend<{ simulator: Simulator }>({
  simulator: async ({ page }, use) => {
    // Enable console logging from browser to node console
    page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // 1. Setup global variables and listeners before page load
    await page.addInitScript(() => {
      // Capture early errors
      window.onerror = (message, source, lineno, colno, error) => {
        console.error('[Browser Error]', { message, source, lineno, colno, error: error?.stack });
      };
      window.onunhandledrejection = (event) => {
        console.error('[Browser Unhandled Rejection]', event.reason);
      };

      // Mock navigator.bluetooth if it exists or define it
      if (typeof navigator !== 'undefined') {
        // @ts-ignore
        navigator.bluetooth = navigator.bluetooth || {};
        // @ts-ignore
        navigator.bluetooth.requestDevice = async () => {
          console.warn('[Test Mock] navigator.bluetooth.requestDevice called but we are using simulator!');
          // Return a dummy device if something calls it, but we expect toggleSimulator to prevent this
          return {
            id: 'mock-device',
            name: 'Mock Boks',
            gatt: {
              connect: async () => ({
                connected: true,
                getPrimaryService: async () => ({
                  getCharacteristic: async () => ({
                    writeValue: async () => {},
                    readValue: async () => new DataView(new ArrayBuffer(1)),
                    startNotifications: async () => {},
                    addEventListener: () => {},
                  }),
                }),
              }),
            },
          };
        };
      }

      // Disable Google Translate dynamically
      const meta = document.createElement('meta');
      meta.name = 'google';
      meta.content = 'notranslate';
      document.getElementsByTagName('head')[0]?.appendChild(meta);

      localStorage.setItem('i18nextLng', 'en');
      // Ensure persistence across reloads
      localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');

      // @ts-expect-error - Custom global flag
      window.BOKS_SIMULATOR_ENABLED = true;

      // Initialize txEvents from buffer or as empty array
      // @ts-expect-error - Custom global storage
      window.txEvents = (window as any)._boks_tx_buffer || [];

      window.addEventListener('boks-tx', (e: any) => {
        // @ts-expect-error - Custom global storage
        window.txEvents.push(e.detail);
        console.log(`[Simulator Fixture] Captured TX: ${e.detail.opcode}`);
      });

      // Helper to reset app state (Clear DB + Disconnect)
      // @ts-expect-error - Custom global helper
      window.resetApp = async () => {
        console.log('[Test] Resetting App State...');

        // 1. Clear DB
        // @ts-ignore
        const db = window.boksDebug?.db;
        if (db) {
          await db.devices.clear();
          await db.device_secrets.clear();
          await db.settings.clear();
          await db.codes.clear();
          await db.logs.clear();
          console.log('[Test] DB Cleared');
        }

        // 2. Clear LocalStorage (preserve simulator flag)
        localStorage.clear();
        localStorage.setItem('BOKS_SIMULATOR_ENABLED', 'true');
        localStorage.setItem('i18nextLng', 'en');

        console.log('[Test] App State Reset Complete');
      };
    });

    const simulator: Simulator = {
      waitForTxOpcode: async (opcode, timeout = 30000) => {
        try {
          await page.waitForFunction(
            ({ op }) => {
              const win = window as any;
              const events = win.txEvents || [];
              const buffer = win._boks_tx_buffer || [];
              return events.some((e: any) => e.opcode === op) || 
                     buffer.some((e: any) => e.opcode === op);
            },
            { op: opcode },
            { timeout }
          );
        } catch (e) {
          // Debugging info
          const state = await page.evaluate(() => {
            const win = window as any;
            return {
              hasTxEvents: !!win.txEvents,
              txEventsLength: win.txEvents?.length,
              txEvents: win.txEvents,
              hasBuffer: !!win._boks_tx_buffer,
              bufferLength: win._boks_tx_buffer?.length,
              simulatorEnabled: win.BOKS_SIMULATOR_ENABLED,
              localStorageSimulator: localStorage.getItem('BOKS_SIMULATOR_ENABLED')
            };
          });
          console.error(
            `[Simulator Fixture] waitForTxOpcode(${opcode}) failed. Window State:`,
            JSON.stringify(state, null, 2)
          );
          throw e;
        }
      },
      getTxEvents: async () => {
        return await page.evaluate(() => {
          const win = window as any;
          const events = win.txEvents || [];
          const buffer = win._boks_tx_buffer || [];
          // Merge and de-duplicate by JSON representation
          const all = [...events];
          buffer.forEach((be: any) => {
            if (!all.some((e: any) => e.opcode === be.opcode && JSON.stringify(e.payload) === JSON.stringify(be.payload))) {
              all.push(be);
            }
          });
          return all;
        });
      },
      clearTxEvents: async () => {
        await page.evaluate(() => {
          // @ts-expect-error - Custom global storage
          window.txEvents = [];
        });
      },
      connect: async (options = {}) => {
        console.log('[Simulator Fixture] Connecting...');
        // Use a more relaxed waiting strategy
        await page.waitForFunction(
          () => {
            const el = document.querySelector(
              '[data-testid="onboarding-view"], [data-testid="main-nav"]'
            );
            return !!el && (el as HTMLElement).offsetParent !== null;
          },
          { timeout: 30000 }
        );

        const onboarding = page.getByTestId('onboarding-view').first();

        // Force enable simulator
        await page.evaluate(async () => {
          if ((window as any).toggleSimulator) {
            (window as any).toggleSimulator(true);
            await new Promise((r) => setTimeout(r, 200));
          } else {
            throw new Error('toggleSimulator not found');
          }
        });

        // Click Connect if in Onboarding
        const isOnboarding = await onboarding.isVisible();
        console.log('[Simulator Fixture] Onboarding visible:', isOnboarding);
        if (isOnboarding) {
          await onboarding.getByRole('button', { name: /connect/i }).click();
          await page.waitForTimeout(4000);

          // Handle potential redirect for new devices
          await page.waitForTimeout(3000); // Wait for potential redirect logic (1.5s delay)
          console.log('[Simulator Fixture] Checking URL for redirect:', page.url());

          if (page.url().includes('my-boks')) {
            if (options.skipReturnToHome) {
              console.log('[Simulator Fixture] Redirected to My Boks. Staying there as requested.');
            } else {
              console.log('[Simulator Fixture] Redirected to My Boks. Navigating back via Menu...');
              // Ensure drawer is openable
              const menuBtn = page.getByLabel('menu');
              await expect(menuBtn).toBeVisible();
              await menuBtn.click();

              // Click Home
              const homeLink = page.getByText('Home');
              await expect(homeLink).toBeVisible();
              await homeLink.click();

              // Wait for navigation
              await page.waitForURL(/.*\/codes/);

              // Ensure dashboard is ready
              await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });
            }
          }
        } else {
          // Onboarding not visible. We are on Dashboard.
          // Try to ensure connection.
          console.log('[Simulator Fixture] Onboarding not visible. checking connection status...');

          // Wait for either connected or disconnected icon
          try {
            await page.waitForSelector(
              'svg[data-testid="BluetoothDisabledIcon"], svg[data-testid="BluetoothConnectedIcon"]',
              { timeout: 5000 }
            );
          } catch {
            console.log(
              '[Simulator Fixture] Could not find any bluetooth icon. Are we on the right page?'
            );
          }

          const disconnectedIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
          const count = await disconnectedIcon.count();
          const visible = count > 0 && (await disconnectedIcon.first().isVisible());
          console.log('[Simulator Fixture] Checking status...');
          if (visible) {
            console.log('[Simulator Fixture] Disconnected. Connecting via Header...');
            await page
              .getByRole('button', { name: /connect/i })
              .first()
              .click();
            await page.waitForTimeout(4000);
          } else {
            console.log('[Simulator Fixture] Already connected (or icon not found).');
          }
        }
      },
    };

    // 3. Use the fixture
    await use(simulator);
  },
});
