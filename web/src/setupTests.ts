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
