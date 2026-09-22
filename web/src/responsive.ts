// Responsive layout contract (spec v0.2.39, section 4.8 Responsive Layout).
//
// Presentation-only logic: the minimum supported viewport, the stacking
// breakpoint, and the comparison-view transposition rule. The figures here
// are the single source of truth for both the rendered breakpoints (via the
// MUI theme in App.tsx) and the tests; a future edit that changes one
// without the other fails the pinning tests.
//
// The contract floor is 360 px: every surface must remain fully functional
// and readable at 360 px width - no clipped content, no controls lost
// off-canvas, no horizontal scrolling of the page itself. Below ~600 px the
// layout condenses to stacked single-column rendering (MUI's sm breakpoint
// is the stacking threshold); the comparison view transposes to a
// card-per-port layout (never a horizontal scroll fallback).

// Minimum supported viewport width in CSS pixels (the contract floor).
export const MIN_SUPPORTED_VIEWPORT_PX = 360;

// Stacking threshold in CSS pixels: at widths strictly below this value the
// layout renders condensed/stacked; at this width and above, the full
// multi-column layout renders. Matches the MUI theme's sm breakpoint (600).
export const STACKING_BREAKPOINT_PX = 600;

// The media query string the theme's sm breakpoint resolves to. The theme's
// breakpoint.values.sm and this constant must stay equal (pinned by tests).
export const STACKING_MEDIA_QUERY = `(max-width:${STACKING_BREAKPOINT_PX - 0.05}px)`;

// Test seam: the injected media-query hook used by the rendering paths.
// The default implementation reads window.matchMedia; tests inject a stub
// so the mobile and desktop rendering paths are both exercisable in jsdom
// (which otherwise reports a single desktop-like viewport).
export type MediaQueryHook = (query: string) => boolean;

export const defaultMatchMedia: MediaQueryHook = (query) =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

// Mobile-layout predicate: true when the viewport renders the condensed
// stacked layout (below the stacking breakpoint).
export function isMobileViewport(width: number | undefined): boolean {
  if (width === undefined || width === null) return false;
  return width < STACKING_BREAKPOINT_PX;
}

// Ranking-summary ordering (spec v0.2.39): the ranking strip is the
// comparison view's headline answer and survives the transposition intact -
// cheapest first, on the converted comparison basis (never raw amounts
// across currencies; spec v0.2.31). Pure function over the same inputs as
// rankByConvertedBasis so ordering integrity is directly testable.
export function rankOrderByConvertedBasis(
  totals: { portId: string; amount: number; currency: string }[],
  rate: { rate: number }
): { portId: string; amount: number; currency: string }[] {
  const basis = (t: { amount: number; currency: string }) =>
    t.currency === 'EUR' ? t.amount * rate.rate : t.amount;
  return [...totals].sort((a, b) => basis(a) - basis(b));
}
