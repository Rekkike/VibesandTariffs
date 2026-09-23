// Responsive layout contract tests (spec v0.2.39, section 4.8 Responsive
// Layout). Every normative sentence of the contract is pinned here or in the
// accessibility suite's mobile-DOM block:
//   - minimum supported viewport 360 px  -> constant pins
//   - stacking threshold 600 px          -> isMobileViewport boundaries,
//                                            theme sm equality, media-query
//                                            string pin
//   - comparison transposition below the breakpoint, desktop table above,
//     ranking strip in both -> real-DOM render tests via the injected
//     media-query seam (jsdom reports one desktop-like viewport; the seam
//     exercises both rendering paths)
//   - conversion disclosure per-view, mobile-only -> render tests (button
//     absent on desktop, aria-expanded toggles)
//   - ranking integrity: cheapest-first on the converted basis -> pure
//     rankOrderByConvertedBasis pins (spec v0.2.31: never raw amounts)
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react'; // react-dom/test-utils act is deprecated in React 18
import {
  MIN_SUPPORTED_VIEWPORT_PX,
  STACKING_BREAKPOINT_PX,
  STACKING_MEDIA_QUERY,
  isMobileViewport,
  rankOrderByConvertedBasis,
  defaultMatchMedia
} from './responsive';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import type { PortDefinition, VesselInput, CallInput } from '@port-cost/core/types';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const vessel: VesselInput = {
  gt: 12000,
  nt: 6500,
  loa_m: 140,
  built_year: 2015
};

const call: CallInput = {
  port_id: 'gothenburg',
  date: '2026-06-15',
  vessel_type: 'container',
  containers_loaded_le20ft: 20,
  containers_loaded_gt20ft: 10,
  containers_discharged_le20ft: 20,
  containers_discharged_gt20ft: 10,
  calls_this_month: 1,
  flag_state: 'EU',
  ops_usage: false,
  pilotage_required: true,
  pilotage_hours: 2
};

describe('responsive contract constants (spec v0.2.39)', () => {
  it('pins the contract floor: minimum supported viewport is 360 px', () => {
    expect(MIN_SUPPORTED_VIEWPORT_PX).toBe(360);
  });

  it('pins the stacking threshold: 600 px', () => {
    expect(STACKING_BREAKPOINT_PX).toBe(600);
  });

  it('the stacking media query matches MUI sm resolution (max-width:599.95px)', () => {
    expect(STACKING_MEDIA_QUERY).toBe('(max-width:599.95px)');
  });

  it('the MUI theme sm breakpoint equals the stacking threshold constant', () => {
    expect(appSource).toContain(`sm: STACKING_BREAKPOINT_PX`);
    expect(appSource).toContain(`xs: MIN_SUPPORTED_VIEWPORT_PX`);
  });

  it('the theme uses MUI breakpoints.values (configuration, not a framework rewrite)', () => {
    expect(appSource).toMatch(/breakpoints:\s*\{\s*values:/);
  });

  it('CSS: the desktop table is display:none below the stacking breakpoint', () => {
    const m = cssSource.match(/@media \(max-width: 599\.95px\)\s*\{[^}]*\.comparison-table-container\s*\{[^}]*display:\s*none;/);
    expect(m).not.toBeNull();
  });
});

describe('isMobileViewport boundaries', () => {
  it('below the contract floor (359 px) is mobile', () => {
    expect(isMobileViewport(359)).toBe(true);
  });

  it('at the contract floor (360 px) is mobile', () => {
    expect(isMobileViewport(360)).toBe(true);
  });

  it('at the stacking threshold (600 px) is desktop, not mobile', () => {
    expect(isMobileViewport(600)).toBe(false);
  });

  it('just below the stacking threshold (599 px) is mobile', () => {
    expect(isMobileViewport(599)).toBe(true);
  });

  it('undefined width reports desktop (no layout guessing)', () => {
    expect(isMobileViewport(undefined)).toBe(false);
  });
});

describe('ranking integrity: cheapest first on the converted basis (spec v0.2.31)', () => {
  it('orders cheapest-first on the converted SEK basis, never raw amounts', () => {
    // hamburg 5000 EUR x 11.275 = 56,375 SEK; gothenburg 40,000 SEK is cheapest
    const ranked = rankOrderByConvertedBasis(
      [
        { portId: 'hamburg', amount: 5000, currency: 'EUR' },
        { portId: 'gothenburg', amount: 40000, currency: 'SEK' },
        { portId: 'helsingborg', amount: 90000, currency: 'SEK' }
      ],
      { rate: 11.275 }
    );
    expect(ranked.map(r => r.portId)).toEqual(['gothenburg', 'hamburg', 'helsingborg']);
  });

  it('raw-amount ordering would differ — the pin proves the basis is converted', () => {
    const totals = [
      { portId: 'hamburg', amount: 5000, currency: 'EUR' },
      { portId: 'gothenburg', amount: 40000, currency: 'SEK' }
    ];
    const rawOrder = [...totals].sort((a, b) => a.amount - b.amount).map(t => t.portId);
    const convertedOrder = rankOrderByConvertedBasis(totals, { rate: 11.275 }).map(t => t.portId);
    expect(rawOrder).toEqual(['hamburg', 'gothenburg']);
    expect(convertedOrder).toEqual(['gothenburg', 'hamburg']);
  });

  it('does not mutate the input array', () => {
    const totals = [
      { portId: 'b', amount: 2, currency: 'SEK' },
      { portId: 'a', amount: 1, currency: 'SEK' }
    ];
    rankOrderByConvertedBasis(totals, { rate: 1 });
    expect(totals.map(t => t.portId)).toEqual(['b', 'a']);
  });

  it('defaultMatchMedia reports false when the query does not match', () => {
    expect(defaultMatchMedia('(max-width:599.95px)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Real-DOM render tests: both rendering paths exercisable in jsdom through
// the injected media-query seam (__setMobileQueryForTests).
// ---------------------------------------------------------------------------
describe('comparison view responsive rendering paths', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  const renderComparison = async (mobile: boolean) => {
    __setMobileQueryForTests(() => mobile);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="Custom vessel — 12,000 GT"
        />
      );
    });
  };

  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) {
      await act(async () => {
        root!.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('below the breakpoint: renders the transposed card-per-port layout, not the desktop table', async () => {
    await renderComparison(true);
    expect(container!.querySelector('.comparison-cards')).not.toBeNull();
    expect(container!.querySelectorAll('.comparison-port-card').length).toBe(LOADED_PORTS.length);
    expect(container!.querySelector('.comparison-table-container')).toBeNull();
    // no horizontal-scroll fallback: the cards layout is the design
    expect(cssSource).not.toMatch(/\.comparison-cards\s*\{[^}]*overflow-x/);
  });

  it('above the breakpoint: renders the desktop table, not the transposed cards', async () => {
    await renderComparison(false);
    expect(container!.querySelector('.comparison-table-container')).not.toBeNull();
    expect(container!.querySelector('.comparison-cards')).toBeNull();
  });

  it('the ranking strip is removed; the call-context strip renders in both layouts (spec v0.2.47)', async () => {
    // Removal pin: the v0.2.39 ranking strip's DOM must not exist in
    // either layout — the table's cheapest/most-expensive badges carry
    // the ranking. The call-context strip replaces it above the
    // table/cards, stating the priced call in both layouts.
    await renderComparison(true);
    expect(container!.querySelector('.comparison-ranking-strip')).toBeNull();
    expect(container!.querySelectorAll('.comparison-ranking-list li').length).toBe(0);
    expect(container!.querySelector('.comparison-context-strip')).not.toBeNull();
    await renderComparison(false);
    expect(container!.querySelector('.comparison-ranking-strip')).toBeNull();
    expect(container!.querySelector('.comparison-context-strip')).not.toBeNull();
  });

  it('the ranking survives as the table badges: exactly one cheapest and one most-expensive marker, cheapest-first on the converted basis', async () => {
    await renderComparison(false);
    // The ranking contract is carried by the badges (spec v0.2.31: the
    // ordering uses the converted basis; rankByConvertedBasis stays the
    // single tested path, pinned in the conversion suite).
    const cheapest = container!.querySelectorAll('.comparison-marker.comparison-cheapest');
    const mostExpensive = container!.querySelectorAll('.comparison-marker.comparison-most-expensive');
    expect(cheapest.length).toBe(1);
    expect(mostExpensive.length).toBe(1);
    // deterministic: with the default rate the cheapest badge sits on
    // Gothenburg's column header and most-expensive on Hamburg's
    const cheapestHeader = cheapest[0].closest('th') ?? cheapest[0].closest('.comparison-port-card');
    expect((cheapestHeader?.textContent ?? '')).toContain('Gothenburg');
    const mostExpensiveHeader = mostExpensive[0].closest('th') ?? mostExpensive[0].closest('.comparison-port-card');
    expect((mostExpensiveHeader?.textContent ?? '')).toContain('Hamburg');
  });

  it('mobile: the conversion disclosure is a keyboard-operable button with per-view state', async () => {
    await renderComparison(true);
    const button = container!.querySelector<HTMLButtonElement>('.comparison-conversion-disclosure');
    expect(button).not.toBeNull();
    expect(button!.tagName).toBe('BUTTON');
    expect(button!.getAttribute('aria-expanded')).toBe('false');
    expect(button!.getAttribute('aria-controls')).toBe('comparison-conversions-panel');
    // disclosure state is per-comparison-view: useState inside ComparisonView
    expect(appSource).toMatch(/const \[conversionsVisible, setConversionsVisible\] = useState\(false\)/);
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(button!.getAttribute('aria-expanded')).toBe('true');
    const buttonAfter = container!.querySelector<HTMLButtonElement>('.comparison-conversion-disclosure');
    expect(buttonAfter!.textContent).toBe('Hide converted figures');
  });

  it('desktop: no conversion disclosure control renders', async () => {
    await renderComparison(false);
    expect(container!.querySelector('.comparison-conversion-disclosure')).toBeNull();
  });

  it('mobile with conversions hidden: native-primary figure renders with the hidden-converted tag; no converted figure', async () => {
    await renderComparison(true);
    // SEK ports (native basis) render unconverted primary figures
    expect(container!.querySelector('.comparison-converted-tag')).toBeNull();
    // the EUR port's converted figure is behind the disclosure (hidden by default)
    expect(container!.querySelectorAll('.comparison-converted-hidden-tag').length).toBeGreaterThan(0);
    expect(container!.textContent).toContain('converted figure hidden');
  });

  it('mobile disclosure toggle reveals converted figures (native-primary convention preserved)', async () => {
    await renderComparison(true);
    const button = container!.querySelector<HTMLButtonElement>('.comparison-conversion-disclosure');
    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(container!.querySelectorAll('.comparison-converted-tag').length).toBeGreaterThan(0);
    expect(container!.textContent).not.toContain('converted figure hidden');
  });

  it('mobile card structure: fee families listed with figures, grand total and estimate rows present', async () => {
    await renderComparison(true);
    const card = container!.querySelector('.comparison-port-card')!;
    expect(card).not.toBeNull();
    expect(card.querySelectorAll('.comparison-card-family').length).toBeGreaterThan(0);
    expect(card.querySelector('.comparison-card-total')).not.toBeNull();
    expect(card.textContent).toContain('Grand Total');
    expect(card.textContent).toContain('Total without estimates');
  });
});

// ---------------------------------------------------------------------------
// Derivation transparency at the breakpoint (spec v0.2.42): the condensed
// derivation rides every comparison surface — the desktop cells and the
// transposed mobile cards alike — so no figure is opaque at any viewport.
// ---------------------------------------------------------------------------
describe('comparison view: condensed derivation in both layouts (spec v0.2.42)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  const renderComparison = async (mobile: boolean) => {
    __setMobileQueryForTests(() => mobile);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="Custom vessel — 12,000 GT"
        />
      );
    });
  };

  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) {
      await act(async () => {
        root!.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('mobile: the card lines carry the condensed derivation (structure stated under the figure)', async () => {
    await renderComparison(true);
    const condensed = container!.querySelectorAll('.comparison-derivation-condensed');
    expect(condensed.length).toBeGreaterThan(0);
    const first = condensed[0];
    expect(first.querySelector('.comparison-derivation-structure')).not.toBeNull();
    expect((first.textContent ?? '')).not.toBe('');
    // Hamburg's composite port fee states its component composition —
    // the CP class of figure the transposition must never make opaque.
    const hamburgCard = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Hamburg'))!;
    expect(hamburgCard).toBeDefined();
    expect(hamburgCard.querySelectorAll('.comparison-derivation-condensed').length).toBeGreaterThan(0);
    // Mobile cards keep derivations visible by default, no disclosure
    // required (spec v0.2.43): the card layout fits without the collapse.
    expect(container!.querySelector('.comparison-derivation-disclosure')).toBeNull();
  });

  it('desktop: the condensed derivation is collapsed by default in the table layout (spec v0.2.43 fit contract)', async () => {
    await renderComparison(false);
    // Collapsed by default: the default cell shows the native-primary figure
    // and rate note as before v0.2.42 — no condensed block renders until the
    // per-view disclosure is opened.
    expect(container!.querySelectorAll('.comparison-derivation-condensed').length).toBe(0);
    // The disclosure control is a keyboard-operable button with per-view state.
    const btn = container!.querySelector('button.comparison-derivation-disclosure') as HTMLButtonElement | null;
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('aria-expanded')).toBe('false');
    expect(btn!.getAttribute('aria-controls')).toBe('comparison-derivation-panel');
    expect(btn!.textContent).toContain('Show fee derivations');
    // Figure cells still carry the native figure.
    expect(container!.querySelectorAll('.comparison-table .comparison-figure').length).toBeGreaterThan(0);
  });
  it('desktop: the derivation disclosure reveals the condensed derivation per-view (toggle)', async () => {
    await renderComparison(false);
    const btn = container!.querySelector('button.comparison-derivation-disclosure') as HTMLButtonElement;
    await act(async () => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const condensed = container!.querySelectorAll('.comparison-derivation-condensed');
    expect(condensed.length).toBeGreaterThan(0);
    const hamburgCell = Array.from(condensed)
      .map(el => el.closest('tr') ?? el.closest('td') ?? el.parentElement)
      .find(el => (el?.textContent ?? '').includes('Hamburg'));
    expect(hamburgCell).toBeDefined();
    const btn2 = container!.querySelector('button.comparison-derivation-disclosure') as HTMLButtonElement;
    expect(btn2.getAttribute('aria-expanded')).toBe('true');
    expect(btn2.textContent).toContain('Hide fee derivations');
  });

  it('the condensed derivation never leaks the raw band arithmetic string (opaque-proof, compact)', async () => {
    await renderComparison(true);
    const texts = Array.from(container!.querySelectorAll('.comparison-derivation-condensed'))
      .map(el => el.textContent ?? '');
    for (const t of texts) {
      expect(t).not.toMatch(/\* 1\.96/);
    }
  });
});

describe('comparison-table fit contract (spec v0.2.43)', () => {
  it('the label column wraps: white-space normal with a bounded max-width', () => {
    const m = cssSource.match(/\.comparison-table \.comparison-family-cell\s*\{[^}]*white-space:\s*normal;[^}]*\}/);
    expect(m).not.toBeNull();
    expect(cssSource).toMatch(/\.comparison-table \.comparison-family-cell\s*\{[^}]*max-width:\s*180px;/);
    expect(cssSource).toMatch(/\.comparison-table \.comparison-family-cell\s*\{[^}]*overflow-wrap:\s*break-word;/);
  });
  it('nowrap is scoped to figure spans only — no blanket cell-level nowrap remains', () => {
    // The v0.2.42 regression cause was the blanket nowrap on every td/th; it
    // is removed, so a rate note or label can never force horizontal scroll.
    expect(cssSource).not.toMatch(/\.comparison-table th,\s*\.comparison-table td\s*\{[^}]*white-space:\s*nowrap/);
    const scoped = cssSource.match(/\.comparison-table \.comparison-figure\s*\{[^}]*white-space:\s*nowrap;[^}]*\}/);
    expect(scoped).not.toBeNull();
    // No rule may put nowrap on a comparison-table cell at any specificity.
    const cellRules = cssSource.match(/\.comparison-table[^{]*\b(t[dh]?)\b[^{]*\{[^}]*\}/g) ?? [];
    for (const rule of cellRules) {
      expect(rule).not.toMatch(/white-space:\s*nowrap/);
    }
  });
  it('no min-width forces the label-column gap (no comparison min-width exists)', () => {
    const comparisonBlock = cssSource.slice(
      cssSource.indexOf('.comparison-table-container'),
      cssSource.indexOf('.comparison-estimate-row')
    );
    expect(comparisonBlock).not.toMatch(/min-width/);
    const familyRules = cssSource.match(/[^{}]*comparison-family-cell[^{]*\{[^}]*\}/g) ?? [];
    for (const rule of familyRules) {
      expect(rule).not.toMatch(/min-width/);
    }
  });
  it('the figure spans render in the table cells (scoped nowrap actually applied)', async () => {
    __setMobileQueryForTests(() => false);
    const c = document.createElement('div');
    document.body.appendChild(c);
    const r = createRoot(c);
    await act(async () => {
      r.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="Custom vessel — 12,000 GT"
        />
      );
    });
    const figures = c.querySelectorAll('.comparison-table td .comparison-figure');
    expect(figures.length).toBeGreaterThan(0);
    await act(async () => { r.unmount(); });
    c.remove();
    __setMobileQueryForTests(null);
  });
  it('fit-fix regression pin (v0.2.47 form): badges carry the ranking, the context strip renders, no ranking strip returns', async () => {
    __setMobileQueryForTests(() => false);
    const c = document.createElement('div');
    document.body.appendChild(c);
    const r = createRoot(c);
    await act(async () => {
      r.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="Custom vessel — 12,000 GT"
        />
      );
    });
    // v0.2.47: the ranking strip must not return
    expect(c.querySelector('.comparison-ranking-strip')).toBeNull();
    // the badges carry the ranking
    expect(c.querySelectorAll('.comparison-marker.comparison-cheapest').length).toBe(1);
    expect(c.querySelectorAll('.comparison-marker.comparison-most-expensive').length).toBe(1);
    // the call-context strip states the priced call above the table
    expect(c.querySelector('.comparison-context-strip')).not.toBeNull();
    expect((c.querySelector('.comparison-context-vessel')?.textContent ?? '')).toContain('Custom vessel — 12,000 GT');
    await act(async () => { r.unmount(); });
    c.remove();
    __setMobileQueryForTests(null);
  });
});
