import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  // Prioritize process.env for CI injection
  const baseUrl = process.env.BASE_URL || env.BASE_URL || '/';

  return {
    server: {
      strictPort: true,
    },
    resolve: {
      alias: {
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
      },
    },
    plugins: [
      preact({
        devtoolsInProd: true,
        devToolsEnabled: true,
        prefreshEnabled: true,
      }),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // We will handle registration manually to support Cypress/CI constraints
        devOptions: {
          enabled: false,
        },
        manifest: false, // Use the manifest.json file in the public directory
        includeAssets: ['favicon.ico', 'icon.png', 'icon-192.png'],
        // Ensure SW scope matches the base URL
        scope: baseUrl,
        workbox: {
          // Prevent SW from caching generic files that might collide if not hashed (though Vite hashes assets)
          // and ensure navigation falls back to index.html within the scope
          navigateFallback: `${baseUrl}index.html`,
          // Ensure we don't cache requests to other PRs if sharing domain
          navigateFallbackDenylist: [
            // Exclude paths that don't start with our base (safety measure)
            new RegExp(`^${baseUrl === '/' ? '(?!.*)' : '(?!' + escapeRegExp(baseUrl) + ')'}`),
          ]
        },
      }),
    ],
    base: baseUrl,
  };
});

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
