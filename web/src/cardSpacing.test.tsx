// Mobile card vertical rhythm pins (spec v0.2.56) — presentation only.
//
// The v0.2.56 pass established the card surface's vertical rhythm (spacing
// tokens only, card-scoped rules so the desktop table is untouched) and
// repaired the doubled flat-rate basis: the condensed derivation rendered
// "Flat rate — Flat rate: 201805" because the structure label and the
// composition string each carry the basis text adjacently. The verdict was
// presentation: the engine legitimately carries both (structure_label and
// rateApplied); the shared renderer now suppresses the structure span when
// the composition starts with "<structure>: " so a flat-rate line states
// its basis exactly once.
//
// jsdom cannot compute CSS custom-property cascades, so the structural
// separation is asserted the way the v0.2.51 theme-discipline pins assert
// it: against the stylesheet source (the established class-level pattern),
// plus DOM presence of the separated elements on the rendered card.
// Every red-provable pin here was proven red against the pre-fix code
// (CSS block reverted; dedupe condition reverted to exact inequality)
// before being trusted green.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import path from 'path';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const renderMobileComparison = async (call: CallInput) => {
  __setMobileQueryForTests(() => true);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const r = createRoot(container);
  let root: Root = r;
  await act(async () => {
    root.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={DEFAULT_VESSEL}
        call={call}
        selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
        onSelectionChange={() => {}}
        activeVessel="TEST"
      />
    );
  });
  return { container, root };
};

let container: HTMLElement | null = null;
let root: Root | null = null;

afterEach(async () => {
  __setMobileQueryForTests(null);
  if (root) {
    const r = root;
    await act(async () => { r.unmount(); });
  }
  container?.remove();
  container = null;
  root = null;
});

describe('mobile card vertical rhythm (spec v0.2.56)', () => {
  it('the stylesheet carries the card-scoped rhythm rules, on spacing tokens only', () => {
    // The rhythm block exists and is card-scoped: every rule is a descendant
    // of .comparison-card-list, so the desktop comparison table, the
    // per-port workspace and every other surface are untouched.
    const familyName = cssSource.match(/\.comparison-card-list \.comparison-card-family-name\s*\{[^}]*\}/);
    expect(familyName).not.toBeNull();
    expect(familyName![0]).toMatch(/flex:\s*none;/);
    expect(familyName![0]).toMatch(/max-width:\s*60%;/);

    const secondary = cssSource.match(/\.comparison-card-list \.comparison-secondary\s*\{[^}]*\}/);
    expect(secondary).not.toBeNull();
    expect(secondary![0]).toMatch(/margin-top:\s*var\(--space-1\);/);

    const derivation = cssSource.match(/\.comparison-card-list \.comparison-derivation-condensed\s*\{[^}]*\}/);
    expect(derivation).not.toBeNull();
    expect(derivation![0]).toMatch(/margin-top:\s*var\(--space-1\);/);

    // The v0.2.51 theme discipline holds inside the rhythm rules: spacing
    // comes from tokens, no new px literals (the three card-scoped rules
    // only; the OPS block that follows uses the pre-existing 2px border
    // convention and is not part of the rhythm block).
    expect(familyName![0]).not.toMatch(/\d+px/);
    expect(secondary![0]).not.toMatch(/\d+px/);
    expect(derivation![0]).not.toMatch(/\d+px/);
  });

  it('the Grand Total keeps its breathing room (padding token on the card total row)', () => {
    const total = cssSource.match(/\.comparison-card-total\s*\{[^}]*\}/);
    expect(total).not.toBeNull();
    expect(total![0]).toMatch(/padding-top:\s*var\(--space-3\);/);
    expect(total![0]).toMatch(/padding-bottom:\s*var\(--space-3\);/);
  });

  it('the separated derivation note renders within the mobile card list', async () => {
    ({ container, root } = await renderMobileComparison(defaultCall('gothenburg')));
    const card = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Gothenburg'));
    expect(card).toBeDefined();
    const inList = card!.querySelector('.comparison-card-list .comparison-derivation-condensed');
    expect(inList).not.toBeNull();
    const inListSecondary = card!.querySelectorAll('.comparison-card-list .comparison-secondary');
    expect(inListSecondary.length).toBeGreaterThan(0);
  });
});

describe('flat-rate basis renders exactly once (spec v0.2.56)', () => {
  it('a flat-rate line states its basis exactly once (the Sjofartsverket vessel fee 201805 line)', async () => {
    ({ container, root } = await renderMobileComparison(defaultCall('gothenburg')));
    const card = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Gothenburg'));
    expect(card).toBeDefined();
    // The Fairway dues charge-type row carries the Class 9 CSI D/E flat-rate
    // vessel fee (201,805 SEK); its condensed derivation is the flat-rate
    // case the doubled pattern hit.
    const flatRateDerivation = Array.from(card!.querySelectorAll('.comparison-derivation-condensed'))
      .find(el => (el.textContent ?? '').includes('Flat rate: 201805'));
    expect(flatRateDerivation).toBeDefined();
    const text = flatRateDerivation!.textContent ?? '';
    // exactly one basis statement, not "Flat rate — Flat rate: 201805"
    expect(text.split('Flat rate').length - 1).toBe(1);
    // and the basis itself survives the dedupe (stated once, never dropped)
    expect(text).toContain('Flat rate: 201805');
  });

  it('the doubled basis pattern renders nowhere on the cards', async () => {
    ({ container, root } = await renderMobileComparison(defaultCall('gothenburg')));
    for (const el of Array.from(container!.querySelectorAll('.comparison-derivation-condensed'))) {
      expect(el.textContent ?? '').not.toMatch(/Flat rate\s+—\s+Flat rate/);
    }
  });

  it('non-flat derivations keep their structure and composition (the dedupe only swallows the prefix case)', async () => {
    ({ container, root } = await renderMobileComparison(defaultCall('gothenburg')));
    const card = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Gothenburg'));
    expect(card).toBeDefined();
    // A line whose composition is not "<structure>: ..." still renders both
    // parts — e.g. the waste line's "Flat rate" structure with its
    // "Per unit: ..." composition. The structure appears once there and the
    // composition is not suppressed.
    const perUnit = Array.from(card!.querySelectorAll('.comparison-derivation-condensed'))
      .find(el => (el.textContent ?? '').includes('Per unit:'));
    expect(perUnit).toBeDefined();
    const text = perUnit!.textContent ?? '';
    expect(text).toMatch(/—\s*Per unit:/);
  });
});
