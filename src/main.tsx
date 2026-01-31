import 'preact/debug';
import {render} from 'preact';
import {BrowserRouter} from 'react-router-dom';
import {App} from './app';
import './index.css';
import './i18n';
import {AppProviders} from './context/AppProviders';
import './services/StorageService';
import {ErrorBoundary} from './components/ErrorBoundary';
import {initPWA} from './pwa';

// Initialize PWA (swears off Cypress)
initPWA();

// Simulator Helper
// @ts-expect-error - Custom global flag
window.enableBoksSimulator = () => {
  // @ts-expect-error - Custom global flag
  window.BOKS_SIMULATOR_ENABLED = true;
  console.log('✅ Boks Simulator Enabled! Reloading...');
  setTimeout(() => window.location.reload(), 500);
};

console.log('[Main] Preact debug initialized');

const appElement = document.getElementById('app');

if (appElement) {
  console.log('[Main] Rendering app...');
  // Use Vite's injected BASE_URL for routing
  // Strip trailing slash to ensure clean route matching
  const basename = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL;

  console.log(`[Main] Using basename: "${basename}"`);

  render(
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </ErrorBoundary>,
    appElement
  );
} else {
  console.error('Failed to find #app element');
}
