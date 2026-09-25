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
// MUI palette bridged to the same tokens so MUI components follow the theme.
// Breakpoints (spec v0.2.39 Responsive Layout): sm is the stacking threshold
// (600 px - the responsive.ts contract constant); the minimum supported
// viewport is 360 px. MUI xs is widened to the contract floor so grid
// gutters never squeeze below it.
export const muiThemeFor = (mode: ThemeMode) => createTheme({
  breakpoints: {
    values: { xs: MIN_SUPPORTED_VIEWPORT_PX, sm: STACKING_BREAKPOINT_PX, md: 900, lg: 1200, xl: 1536 }
  },
  palette: {
    mode,
    primary: { main: mode === 'dark' ? '#6ea8fe' : '#0b57d0' },
    background: {
      default: mode === 'dark' ? '#16191d' : '#f4f5f6',
      paper: mode === 'dark' ? '#1f2429' : '#ffffff'
    },
    text: {
      primary: mode === 'dark' ? '#eceeef' : '#1a1e22',
      secondary: mode === 'dark' ? '#a7b0b7' : '#4d5860'
    },
    divider: mode === 'dark' ? '#3a4148' : '#cdd2d8'
  },
  typography: {
    fontFamily: "'IBM Plex Sans', -apple-system, 'Segoe UI', Roboto, sans-serif",
    h1: { fontSize: '20px', fontWeight: 600 },
    h2: { fontSize: '16px', fontWeight: 600 },
    h3: { fontSize: '16px', fontWeight: 600 },
    h5: { fontSize: '16px', fontWeight: 600 },
    h6: { fontSize: '16px', fontWeight: 600 },
    subtitle1: { fontSize: '14px' },
    subtitle2: { fontSize: '12px' },
    body1: { fontSize: '14px' },
    body2: { fontSize: '12px' },
    caption: { fontSize: '12px' }
  },
  shape: { borderRadius: 4 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTab: { styleOverrides: { root: { minHeight: 48 } } },
    MuiToggleButton: { styleOverrides: { root: { minHeight: 40 } } }
  }
});
