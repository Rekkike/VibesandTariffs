// Core-suite runner (spec v0.16.0, core test-runner migration to Vitest):
// replaces jest.config.js / ts-jest. globals provides describe/it/expect,
// the node environment replaces jest-environment-node, the two setupFiles
// keep the fixed-clock anchor and the on-disk registry registration,
// fileParallelism:false is the --runInBand equivalent (the exact-path chunk
// discipline of spec §12.2 carries over; positional filters stay regex).
// No per-run coverage collection (dropped at v0.16.0, recorded in
// docs/CODE_REVIEW_AUDIT.md); --coverage remains available on demand via
// @vitest/coverage-v8.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/vitest_setup_globals.ts', './test/fixed_clock.ts', './test/register_port_data.ts'],
    include: ['test/**/*.test.ts'],
    fileParallelism: false
  }
});
