// Theme preference logic (spec v0.2.25 Presentation Principles), extracted
// from App.tsx as pure functions with injectable storage and media query so
// the persistence contract is unit-testable without a component harness.

export type ThemeMode = 'dark' | 'light';
export const THEME_KEY = 'pcca-theme';

// Stored preference wins; absent one, prefers-color-scheme: light is honored;
// with no media preference either, dark is the default.
export function getInitialTheme(
  storage: Pick<Storage, 'getItem'>,
  prefersLight: () => boolean
): ThemeMode {
  try {
    const stored = storage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch (e) {
    // localStorage unavailable (private mode etc.): fall through to media query
  }
  return prefersLight() ? 'light' : 'dark';
}

export function persistTheme(
  storage: Pick<Storage, 'setItem'>,
  mode: ThemeMode
): void {
  try {
    storage.setItem(THEME_KEY, mode);
  } catch (e) {
    // Persistence is best-effort; the theme still applies for the session
  }
}

// Progressive-disclosure defaults (spec v0.2.25): Vessel and Call open;
// Port-Specific Parameters collapsed until the user expands it.
export const FORM_SECTION_DEFAULTS = {
  vessel: true,
  call: true,
  portSpecific: false
} as const;
