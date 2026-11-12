import { useState, useEffect } from 'react';
import { createTheme, useMediaQuery } from '@mui/material';
import { getInitialTheme, persistTheme } from './theme';
import type { ThemeMode } from './theme';
import {
  MIN_SUPPORTED_VIEWPORT_PX,
  STACKING_BREAKPOINT_PX,
  STACKING_MEDIA_QUERY,
  MediaQueryHook
} from './responsive';
import { paletteFor, fontFamily, typeScale, radiusScale } from './designTokens';

// Theme hooks and the MUI bridge (spec v0.2.60 decomposition, audit item B):
// extracted from App.tsx verbatim - the stored-preference hook, the
// responsive hook with its test seam, and the token-bridged MUI theme.
// Theme (spec v0.2.25 Presentation Principles): semantic CSS tokens on :root,
// dark default, light mapped over the same token names. The stored preference
// wins; absent one, prefers-color-scheme: light is honored, else dark.
// Preference logic lives in theme.ts (pure, injectable storage) so the
// persistence contract is unit-tested there; the hook wires it to the DOM.
export const useAppTheme = (): [ThemeMode, () => void] => {
  const [mode, setMode] = useState<ThemeMode>(() =>
    getInitialTheme(localStorage, () =>
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: light)').matches
        : false
    )
  );
  useEffect(() => {
    persistTheme(localStorage, mode);
    document.documentElement.dataset.theme = mode;
    // The browser chrome color follows the active mode; both modes' values
    // live in designTokens.ts (themeColor per palette).
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', paletteFor(mode).themeColor);
  }, [mode]);
  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));
  return [mode, toggle];
};

// Responsive layout (spec v0.2.39): true when the viewport is below the
// stacking breakpoint (600 px) and the condensed stacked layout renders.
// The MUI useMediaQuery path is live in the browser; the injected test seam
// lets the suites exercise both rendering paths deterministically.
let injectedMobileQuery: MediaQueryHook | null = null;
export const useIsMobile = (): boolean => {
  const muiMatches = useMediaQuery(STACKING_MEDIA_QUERY);
  if (injectedMobileQuery) return injectedMobileQuery(STACKING_MEDIA_QUERY);
  return muiMatches;
};
export const __setMobileQueryForTests = (hook: MediaQueryHook | null) => {
  injectedMobileQuery = hook;
};
// MUI palette bridged to the design tokens so MUI components follow the
// theme: every value below is read from designTokens.ts, the single source
// of truth (its :root blocks in index.css are the mirrored CSS face).
// Breakpoints (spec v0.2.39 Responsive Layout): sm is the stacking threshold
// (600 px - the responsive.ts contract constant); the minimum supported
// viewport is 360 px. MUI xs is widened to the contract floor so grid
// gutters never squeeze below it.
export const muiThemeFor = (mode: ThemeMode) => {
  const t = paletteFor(mode);
  return createTheme({
    breakpoints: {
      values: { xs: MIN_SUPPORTED_VIEWPORT_PX, sm: STACKING_BREAKPOINT_PX, md: 900, lg: 1200, xl: 1536 }
    },
    palette: {
      mode,
      primary: { main: t.accent },
      background: {
        default: t.surface,
        paper: t.surfaceRaised
      },
      text: {
        primary: t.textPrimary,
        secondary: t.textSecondary
      },
      divider: t.border
    },
    typography: {
      fontFamily,
      h1: { fontSize: typeScale.headline, fontWeight: 600 },
      h2: { fontSize: typeScale.subtitle, fontWeight: 600 },
      h3: { fontSize: typeScale.subtitle, fontWeight: 600 },
      h5: { fontSize: typeScale.subtitle, fontWeight: 600 },
      h6: { fontSize: typeScale.subtitle, fontWeight: 600 },
      subtitle1: { fontSize: typeScale.body },
      subtitle2: { fontSize: typeScale.caption },
      body1: { fontSize: typeScale.body },
      body2: { fontSize: typeScale.caption },
      caption: { fontSize: typeScale.caption }
    },
    shape: { borderRadius: Number.parseInt(radiusScale.s, 10) },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTab: { styleOverrides: { root: { minHeight: 48 } } },
      MuiToggleButton: { styleOverrides: { root: { minHeight: 40 } } }
    }
  });
};
