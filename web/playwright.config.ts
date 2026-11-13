// CI visual-geometry gate (v0.21.0): headless Chromium executing the ruled
// geometry against the BUILT dist served by `vite preview` - the same
// bundle the Pages deploy serves, so the gate runs the production artifact,
// not the dev server. baseURL carries the Vite base (/VibesandTariffs/).
// The suite is restricted to e2e/ (the geometry spec only) and retries are
// 0: a red run must stay red. Dev-only: nothing here enters the vite build
// (the app entry is index.html -> src; e2e/ and this file sit outside it).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: './test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173/VibesandTariffs/',
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' }
    }
  ],
  webServer: {
    command: 'npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/VibesandTariffs/',
    reuseExistingServer: false,
    timeout: 120000
  }
});
