import { test as base, expect, Page } from '@playwright/test';
import { BLEOpcode } from '../src/utils/bleConstants';

// Re-export specific expectations and utilities
export { expect, BLEOpcode };

export interface Simulator {
  waitForTxOpcode(opcode: number, timeout?: number): Promise<void>;
  waitForTxOpcodes(opcodes: number[], timeout?: number): Promise<void>;
  getTxEvents(): Promise<any[]>;
  clearTxEvents(): Promise<void>;
  connect(options?: { skipReturnToHome?: boolean }): Promise<void>;
}

export const test = base.extend<{ simulator: Simulator }>({
  simulator: [async ({ page }, use) => {
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
          console.warn(
            '[Test Mock] navigator.bluetooth.requestDevice called but we are using simulator!'
          );
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
                    addEventListener: () => {}
                  })
                })
              })
            }
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

      window.BOKS_SIMULATOR_ENABLED = true;

      // Initialize txEvents from buffer or as empty array
      window.txEvents = window._boks_tx_buffer || [];

      window.addEventListener('boks-tx', (e: any) => {
        if (window.txEvents) {
          window.txEvents.push(e.detail);
        }
        console.log(`[Simulator Fixture] Captured TX: ${e.detail.opcode}`);
      });

      // Helper to reset app state (Clear DB + Disconnect)
      window.resetApp = async () => {
        console.log('[Test] Resetting App State...');

        // 1. Clear DB
        const db = window.boksDebug?.db as any;
        // @ts-ignore
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
              const events = window.txEvents || [];
              const buffer = window._boks_tx_buffer || [];
              return (
                events.some((e: any) => e.opcode === op) || buffer.some((e: any) => e.opcode === op)
              );
            },
            { op: opcode },
            { timeout }
          );
        } catch (e) {
          // Debugging info
          const state = await page.evaluate(() => {
            return {
              hasTxEvents: !!window.txEvents,
              txEventsLength: window.txEvents?.length,
              txEvents: window.txEvents,
              hasBuffer: !!window._boks_tx_buffer,
              bufferLength: window._boks_tx_buffer?.length,
              simulatorEnabled: window.BOKS_SIMULATOR_ENABLED,
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
      waitForTxOpcodes: async (opcodes, timeout = 30000) => {
        try {
          await page.waitForFunction(
            ({ ops }) => {
              const events = window.txEvents || [];
              const buffer = window._boks_tx_buffer || [];
              const allEvents = [...events];
              // Merge buffer if unique
              buffer.forEach((be: any) => {
                 if (!allEvents.some((e: any) => e.opcode === be.opcode && JSON.stringify(e.payload) === JSON.stringify(be.payload))) {
                    allEvents.push(be);
                 }
              });

              // Check if ALL opcodes are present
              return ops.every(op => allEvents.some((e: any) => e.opcode === op));
            },
            { ops: opcodes },
            { timeout }
          );
        } catch (e) {
           console.error(
            `[Simulator Fixture] waitForTxOpcodes(${JSON.stringify(opcodes)}) failed.`
          );
          throw e;
        }
      },
      getTxEvents: async () => {
        return await page.evaluate(() => {
          const events = window.txEvents || [];
          const buffer = window._boks_tx_buffer || [];
          // Merge and de-duplicate by JSON representation
          const all = [...events];
          buffer.forEach((be: any) => {
            if (
              !all.some(
                (e: any) =>
                  e.opcode === be.opcode && JSON.stringify(e.payload) === JSON.stringify(be.payload)
              )
            ) {
              all.push(be);
            }
          });
          return all;
        });
      },
      clearTxEvents: async () => {
        await page.evaluate(() => {
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
          if (window.toggleSimulator) {
            window.toggleSimulator(true);
            await new Promise((r) => setTimeout(r, 200));
          } else {
            throw new Error('toggleSimulator not found');
          }
        });

        // Click Connect if in Onboarding
        const isOnboarding = await onboarding.isVisible();
        console.log('[Simulator Fixture] Onboarding visible:', isOnboarding);
        if (isOnboarding) {
          await onboarding.getByTestId('connect-button').click();
          await page.waitForTimeout(4000);

          try {
             await page.waitForURL(/.*\/my-boks/, { timeout: 5000 });
             console.log('[Simulator Fixture] Redirected to My Boks.');
             if (!options.skipReturnToHome) {
                console.log('[Simulator Fixture] Navigating back via Menu...');
                const menuBtn = page.getByLabel('menu');
                await expect(menuBtn).toBeVisible();
                await menuBtn.click();

                const homeLink = page.getByTestId('nav-home');
                await expect(homeLink).toBeVisible();
                await homeLink.click();

                await page.waitForURL(/.*\/codes/);
                await expect(page.getByTestId('main-nav')).toBeVisible({ timeout: 10000 });
             }
          } catch (e) {
             console.log('[Simulator Fixture] No redirect detected or timed out, assuming standard flow.');
          }
        } else {
          // Onboarding not visible. We are on Dashboard.
          const disconnectedIcon = page.locator('svg[data-testid="BluetoothDisabledIcon"]');
          const count = await disconnectedIcon.count();
          const visible = count > 0 && (await disconnectedIcon.first().isVisible());

          if (visible) {
            console.log('[Simulator Fixture] Disconnected. Connecting via Header...');
            await page.getByTestId('connection-button').click();
            await page.waitForTimeout(4000); // Connection delay
          } else {
            console.log('[Simulator Fixture] Already connected.');
          }
        }
      }
    };

    // 3. Use the fixture
    await use(simulator);
  }, { auto: true }]
});
