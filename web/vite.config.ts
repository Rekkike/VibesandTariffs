// Production build config (spec v0.15.1, CRA migration Stage 2): Vite
// replaces react-scripts 5.0.1. base replaces the CRA homepage value
// (/VibesandTariffs); sourcemap keeps the .map artifact class of the v0.5.2
// evidence-class amendment; the explicit 'modules' target replaces CRA's
// browserslist-derived output (vite 8 is rolldown-based and rejects the
// legacy 'modules' keyword — observed BUNDLER_INITIALIZE_ERROR — so the
// explicit target is es2020, the old 'modules' baseline). The test runner
// config stays in vitest.config.ts (verified to survive the vitest 3 -> 5
// upgrade unchanged).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/VibesandTariffs/',
  plugins: [react()],
  build: {
    sourcemap: true,
    target: 'es2020'
  }
});
