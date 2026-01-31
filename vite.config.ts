import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
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
      devOptions: {
        enabled: false,
      },
      manifest: false, // Use the manifest.json file in the public directory
      includeAssets: ['favicon.ico', 'icon.png', 'icon-192.png'],
    }),
  ],
  base: '/',
});
