import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  // Prioritize process.env for CI injection
  const baseUrl = process.env.BASE_URL || env.BASE_URL || '/';

  // Get commit hash
  let commitHash = '';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    commitHash = 'unknown';
  }

  return {
    define: {
      __COMMIT_HASH__: JSON.stringify(commitHash),
    },
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
        // Ensure the manifest link in index.html is correct? No, Vite handles it if we use `manifest: false` and manual link.
        // But we need to ensure the SW is generated with correct paths.
        workbox: {
          // Prevent SW from caching generic files that might collide if not hashed (though Vite hashes assets)
          // and ensure navigation falls back to index.html within the scope
          navigateFallback: `${baseUrl}index.html`,
          // Ensure we don't cache requests to other PRs if sharing domain
          navigateFallbackDenylist: [
            // Exclude paths that don't start with our base (safety measure)
            new RegExp(`^${baseUrl === '/' ? '(?!.*)' : '(?!' + escapeRegExp(baseUrl) + ')'}`),
            // Exclude PR deployments (e.g. /bwb/pr-1/)
            new RegExp(`^${escapeRegExp(baseUrl)}pr-`),
          ],
          // Ensure assets in the manifest are prefixed with base URL
          modifyURLPrefix: {
            '': baseUrl === '/' ? '' : baseUrl,
          },
        },
      }),
      {
        name: 'copy-index-to-404',
        closeBundle() {
          const distDir = path.resolve(__dirname, 'dist');
          const indexHtml = path.join(distDir, 'index.html');
          const fallbackHtml = path.join(distDir, '404.html');
          if (fs.existsSync(indexHtml)) {
            fs.copyFileSync(indexHtml, fallbackHtml);
            console.log('Copied index.html to 404.html for GitHub Pages SPA routing');
          }
        },
      },
    ],
    base: baseUrl,
  };
});

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
