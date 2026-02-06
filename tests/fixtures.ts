/* eslint-disable react-hooks/rules-of-hooks */
import { expect, test as base } from '@playwright/test';
import { BLEOpcode } from '../src/utils/bleConstants';

// Re-export constants for easy access in tests
export { BLEOpcode } from '../src/utils/bleConstants';
export { expect } from '@playwright/test';

export interface Simulator {
  waitForTxOpcode(opcode: number, timeout?: number): Promise<void>;
  getTxEvents(): Promise<any[]>;
  clearTxEvents(): Promise<void>;
  connect(): Promise<void>;
}

export const test = base.extend<{ simulator: Simulator }>({
  simulator: async ({ page }, use) => {
    // Enable console logging from browser to node console
    page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // 1. Setup global variables and listeners before page load
    await page.addInitScript(() => {
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
      // @ts-expect-error - Custom global storage
      window.txEvents = [];

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

    // 2. Define helper methods
    const simulator: Simulator = {
      waitForTxOpcode: async (opcode, timeout = 5000) => {
        try {
          await page.waitForFunction(
            ({ op }) => {
              // @ts-expect-error - Custom global storage
              const events = window.txEvents || [];
              return events.some((e: any) => e.opcode === op);
            },
            { op: opcode },
            { timeout }
          );
        } catch (e) {
          // Debugging info
          const events = await page.evaluate(() => window.txEvents);
          console.error(
            `[Simulator Fixture] waitForTxOpcode(${opcode}) failed. Captured events: `,
            events
          );
          throw e;
        }
      },
      getTxEvents: async () => {
        return await page.evaluate(() => {
          // @ts-expect-error - Custom global storage
          return window.txEvents;
        });
      },
      clearTxEvents: async () => {
        await page.evaluate(() => {
          // @ts-expect-error - Custom global storage
          window.txEvents = [];
        });
      },
      connect: async () => {
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
        if (await onboarding.isVisible()) {
          await onboarding.getByRole('button', { name: /connect/i }).click();
          await page.waitForTimeout(2000);
        }
      },
    };

    // 3. Use the fixture
    await use(simulator);
  },
});
