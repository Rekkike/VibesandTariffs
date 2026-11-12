// Design tokens — the single source of truth for the web layer's visual
// tokens (Stage 2 of the design overhaul, "theme and token foundation"; the
// rulings of 2026-11-12 are recorded in docs/DESIGN_OVERHAUL_AUDIT.md).
//
// Two faces, one source. This module feeds muiThemeFor in appTheme.ts
// directly, and the :root blocks in index.css are its mirrored CSS face:
// extend a token here, mirror the value in the :root block(s), never rename
// an existing token name (the v0.2.51 token discipline, pinned by
// summaryTheme — the stylesheet sweep allows color literals only inside the
// two :root blocks, this module, and the @media print paper palette).
//
// Dark is the default mode; the light palette remaps the same token names.
// The accent is the refined port-blue of the 2026-11-12 ruling: same hue
// family as the pre-redesign accent, slightly deeper and more saturated.
// The radius scale, the three-level elevation scale, the tint pairs and the
// on-accent text colors are new token families; the density token ships at
// 1 — exactly today's density, a token, never a user-facing lever.
import type { ThemeMode } from './theme';

// Mode-independent tokens (the :root base block carries these once; the
// light remap inherits them).
export const fontFamily =
  "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif";
export const typeScale = {
  caption: '12px',
  body: '14px',
  subtitle: '16px',
  headline: '20px',
  display: '28px'
} as const;
export const radiusScale = { s: '6px', m: '10px', l: '14px' } as const;
export const density = '1';

// Mode-dependent palette tokens. Keys map to the CSS custom property names
// in the :root blocks (--accent, --accent-hover, ...).
export interface PaletteTokens {
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  accent: string;
  accentHover: string;
  onAccent: string;
  positive: string;
  warning: string;
  error: string;
  accentTint: string;
  positiveTint: string;
  warningTint: string;
  errorTint: string;
  focusRing: string;
  modalShadow: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  themeColor: string;
  colorScheme: 'dark' | 'light';
}

export const DARK_PALETTE: PaletteTokens = {
  surface: '#16191d',
  surfaceRaised: '#1f2429',
  surfaceSunken: '#111317',
  border: '#3a4148',
  borderStrong: '#545d66',
  textPrimary: '#eceeef',
  textSecondary: '#a7b0b7',
  textDisabled: '#6a737b',
  accent: '#5c9dff',
  accentHover: '#8db9ff',
  onAccent: '#0b1a2e',
  positive: '#5cd6a9',
  warning: '#e8c268',
  error: '#ff8f8f',
  accentTint: 'rgba(92, 157, 255, 0.14)',
  positiveTint: 'rgba(92, 214, 169, 0.12)',
  warningTint: 'rgba(232, 194, 104, 0.12)',
  errorTint: 'rgba(255, 143, 143, 0.12)',
  focusRing: '#8db9ff',
  modalShadow: 'rgba(0, 0, 0, 0.25)',
  elevation1: '0 1px 2px rgba(0, 0, 0, 0.35)',
  elevation2: '0 4px 14px rgba(0, 0, 0, 0.35)',
  elevation3: '0 12px 32px rgba(0, 0, 0, 0.45)',
  themeColor: '#16191d',
  colorScheme: 'dark'
};

export const LIGHT_PALETTE: PaletteTokens = {
  surface: '#f4f5f6',
  surfaceRaised: '#ffffff',
  surfaceSunken: '#e9ebed',
  border: '#cdd2d8',
  borderStrong: '#9aa3ac',
  textPrimary: '#1a1e22',
  textSecondary: '#4d5860',
  textDisabled: '#8b949d',
  accent: '#0a52c9',
  accentHover: '#083e9c',
  onAccent: '#ffffff',
  positive: '#0e7245',
  warning: '#8a5a00',
  error: '#b3232e',
  accentTint: 'rgba(10, 82, 201, 0.08)',
  positiveTint: 'rgba(14, 114, 69, 0.08)',
  warningTint: 'rgba(138, 90, 0, 0.09)',
  errorTint: 'rgba(179, 35, 46, 0.08)',
  focusRing: '#0a52c9',
  modalShadow: 'rgba(20, 30, 45, 0.12)',
  elevation1: '0 1px 2px rgba(20, 30, 45, 0.06)',
  elevation2: '0 4px 14px rgba(20, 30, 45, 0.08)',
  elevation3: '0 12px 32px rgba(20, 30, 45, 0.12)',
  themeColor: '#f4f5f6',
  colorScheme: 'light'
};

export const paletteFor = (mode: ThemeMode): PaletteTokens =>
  mode === 'light' ? LIGHT_PALETTE : DARK_PALETTE;
