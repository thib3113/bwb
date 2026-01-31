import {defineConfig} from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173', // Vite default port
    // Pixel 7 Viewport
    viewportWidth: 412,
    viewportHeight: 915,
    setupNodeEvents() {
      // implement node event listeners here
    },
    supportFile: 'cypress/support/e2e.ts',
  },
});
