import { test as base, Page } from '@playwright/test';
import { BLEOpcode } from '../src/utils/bleConstants';

export { expect } from '@playwright/test';

// Re-export constants for easy access in tests
export { BLEOpcode } from '../src/utils/bleConstants';

export interface Simulator {
  waitForTxOpcode(opcode: number, timeout?: number): Promise<void>;
  getTxEvents(): Promise<any[]>;
  clearTxEvents(): Promise<void>;
}

export const test = base.extend<{ simulator: Simulator }>({
  simulator: async ({ page }, use) => {
    // Enable console logging from browser to node console
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.text()}`);
    });

    // 1. Setup global variables and listeners before page load
    await page.addInitScript(() => {
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
          console.error(`[Simulator Fixture] waitForTxOpcode(${opcode}) failed. Captured events: `, events);
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
    };

    // 3. Use the fixture
    await use(simulator);
  },
});
