import { test as base, expect } from '@playwright/test';
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

        // 1. Clear DB via StorageService if available
        // @ts-expect-error - boksDebug exposed by main/StorageService
        if (window.boksDebug && window.boksDebug.StorageService) {
           const originalReload = window.location.reload;
           window.location.reload = () => { console.log('[Test] Suppressed reload during reset'); }; // No-op
           // @ts-expect-error - boksDebug exposed by main/StorageService
           await window.boksDebug.StorageService.clearAllData();
           window.location.reload = originalReload;
        }

        // 2. Clear LocalStorage (preserve simulator flag)
        const sim = localStorage.getItem('BOKS_SIMULATOR_ENABLED');
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
        // Wait for UI to settle (Onboarding OR Main Nav)
        const onboarding = page.getByTestId('onboarding-view');
        const mainNav = page.getByTestId('main-nav');
        await expect(onboarding.or(mainNav)).toBeVisible({ timeout: 30000 });

        // Force enable simulator
        await page.evaluate(() => {
          if ((window as any).toggleSimulator) {
             (window as any).toggleSimulator(true);
          }
        });

        // Click Connect if needed
        if (await onboarding.isVisible()) {
           await page.getByTestId('connect-button').click();
           await expect(mainNav).toBeVisible({ timeout: 15000 });
        }
      }
    };

    // 3. Use the fixture
    await use(simulator);
  },
});
