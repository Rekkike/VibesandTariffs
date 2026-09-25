// jsdom lacks window.matchMedia; MUI's useMediaQuery (via the responsive
// breakpoint infrastructure, spec v0.2.39) requires it. The stub reports a
// non-matching query by default; tests that need a specific rendering path
// inject the seam (__setMobileQueryForTests) or return matches explicitly.
// Plain function (not jest.fn): resetMocks:true would strip a jest.fn
// implementation before each test, leaving window.matchMedia returning
// undefined.
const listeners: Array<(event: MediaQueryListEvent) => void> = [];

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: (cb: (event: MediaQueryListEvent) => void) => listeners.push(cb),
    removeListener: () => {},
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList
});

// Per-port configuration registration (spec v0.2.59): the test environment
// registers each port's data sections from the generated registry, exactly
// as App.tsx does at module scope - the suites that call defaultCall or
// render workspaces get the registered data without importing App.
import { registerPortDefinition } from '@port-cost/core';
import portsRegistry from './data/ports.json';

const registeredPorts = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
for (const p of registeredPorts) {
  registerPortDefinition(p);
}
