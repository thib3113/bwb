import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// 1. CRITICAL: Initialize Simulator flag BEFORE any other imports
// This must run before services (like BoksBLEService) are initialized via imports.
if (
  typeof window !== 'undefined' &&
  globalThis.localStorage &&
  globalThis.localStorage.getItem('BOKS_SIMULATOR_ENABLED') === 'true'
) {
  globalThis.window.BOKS_SIMULATOR_ENABLED = true;
  console.warn('⚠️ BOKS SIMULATOR ENABLED via localStorage ⚠️');
}

// Force React DevTools activation in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const win = window as unknown as {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: { inject: (renderer: unknown) => void };
  };
  if (typeof win.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = () => {};
  }
}

import { App } from './app';
import './index.css';
import './i18n';
import { AppProviders } from './context/AppProviders';
import './services/StorageService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initPWA } from './pwa';

// Initialize PWA (swears off Cypress)
initPWA();

// Simulator Helper
window.enableBoksSimulator = () => {
  window.BOKS_SIMULATOR_ENABLED = true;
  console.log('✅ Boks Simulator Enabled! Reloading...');
  setTimeout(() => window.location.reload(), 500);
};

console.log('[Main] React initialized');

const appElement = document.getElementById('app');

if (appElement) {
  console.log('[Main] Rendering app...');
  // Use Vite's injected BASE_URL for routing
  // Strip trailing slash to ensure clean route matching
  const basename = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL;

  console.log(`[Main] Using basename: "${basename}"`);

  const root = createRoot(appElement);
  root.render(
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>
  );
} else {
  console.error('Failed to find #app element');
}
