// spec v0.16.0 (core test-runner migration to Vitest): Vitest runs test
// files as ESM, so the CJS access the suites use is provided as globals —
// __dirname in ~25 test files (all of them live in test/, so one value is
// correct) and require() at five sites (crypto x2, js-yaml/fs/path in
// engine.test.ts's Panamax beforeAll). Loaded first in setupFiles.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as nodePath from 'path';

(globalThis as any).require = createRequire(import.meta.url);
(globalThis as any).__dirname = nodePath.dirname(fileURLToPath(import.meta.url));
