// @ts-expect-error - Virtual module
import {registerSW} from 'virtual:pwa-register';

// Check for Cypress
// @ts-expect-error - Custom global flag
const isCypress = typeof window !== 'undefined' && window.Cypress;

export function initPWA() {
  if ('serviceWorker' in navigator) {
    if (isCypress) {
      console.log('[PWA] Cypress detected, skipping Service Worker registration');
      // Optionally unregister existing SW if any
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log('[PWA] Unregistered existing SW for Cypress');
        }
      });
      return;
    }

    registerSW({
      onNeedRefresh() {
        console.log('[PWA] New content available, auto-updating...');
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
    });
  }
}
