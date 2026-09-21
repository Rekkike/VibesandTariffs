import { getInitialTheme, persistTheme, THEME_KEY, FORM_SECTION_DEFAULTS } from './theme';

// jsdom provides localStorage in the CRA test environment; tests mock it with
// an in-memory map to control the stored preference exactly.
const makeStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => { map.set(k, v); },
    _map: map
  };
};

describe('theme preference (spec v0.2.25)', () => {
  it('stored preference wins over the media query', () => {
    const storage = makeStorage();
    storage.setItem(THEME_KEY, 'dark');
    expect(getInitialTheme(storage, () => true)).toBe('dark');
    storage.setItem(THEME_KEY, 'light');
    expect(getInitialTheme(storage, () => false)).toBe('light');
  });

  it('no stored preference + prefers-color-scheme: light -> light', () => {
    expect(getInitialTheme(makeStorage(), () => true)).toBe('light');
  });

  it('no stored preference + no light preference -> dark (the default)', () => {
    expect(getInitialTheme(makeStorage(), () => false)).toBe('dark');
  });

  it('invalid stored values fall back to the media query / dark default', () => {
    const storage = makeStorage();
    storage.setItem(THEME_KEY, 'blue');
    expect(getInitialTheme(storage, () => false)).toBe('dark');
    expect(getInitialTheme(storage, () => true)).toBe('light');
  });

  it('persistTheme writes the toggle choice under the canonical key', () => {
    const storage = makeStorage();
    persistTheme(storage as any, 'light');
    expect(storage.getItem(THEME_KEY)).toBe('light');
    persistTheme(storage as any, 'dark');
    expect(storage.getItem(THEME_KEY)).toBe('dark');
  });

  it('persistTheme survives a throwing storage (session still works)', () => {
    expect(() =>
      persistTheme({ setItem: () => { throw new Error('quota'); } }, 'light')
    ).not.toThrow();
  });
});

describe('progressive-disclosure defaults (spec v0.2.25)', () => {
  it('Vessel and Call open by default; Port-Specific Parameters collapsed', () => {
    expect(FORM_SECTION_DEFAULTS.vessel).toBe(true);
    expect(FORM_SECTION_DEFAULTS.call).toBe(true);
    expect(FORM_SECTION_DEFAULTS.portSpecific).toBe(false);
  });
});
