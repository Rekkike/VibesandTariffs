// Web-suite runner (spec v0.15.0, the CRA migration Stage 1): Vitest replaces
// react-scripts test; the production build stays react-scripts 5.0.1 until
// Stage 2. globals provides describe/it/expect, jsdom the DOM environment,
// mockReset preserves CRA's resetMocks:true, fileParallelism:false is the
// --runInBand equivalent (the exact-path chunk discipline of spec §12.2
// carries over; positional filters stay regex).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    mockReset: true,
    include: ['src/**/*.test.{ts,tsx}'],
    fileParallelism: false,
    // Replaces the per-file jest.setTimeout lines (vi.setTimeout does not
    // exist in vitest 3.x): the largest pin asked for 60 s.
    testTimeout: 60000,
    hookTimeout: 60000
  }
});
