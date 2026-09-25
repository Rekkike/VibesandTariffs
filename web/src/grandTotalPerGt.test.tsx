// Grand Total derived per-GT pins (spec v0.2.58).
//
// The comparison's cross-port comparability bridge: each port's Grand
// Total ÷ vessel GT, rendered adjacent to the Grand Total on the desktop
// table row and each mobile card's Grand Total lead. The Swedish ports are
// pure division (SEK ÷ GT); Hamburg converts through the same EUR/SEK rate
// input as every converted figure and names it as a dependency. Derived,
// never a published rate — the v0.2.30 convention. With OPS user-specified
// values entered the figure uses the Grand Total as presented (including
// OPS) and the note says so, so the label never implies the total is
// tariff-derived when it is not. Zero/blank GT renders nothing.
//
// Pinned baselines (default Maren Maersk call, GT 194,849, default rate
// 11.275 SEK/EUR from ports.json exchange_rates; re-pinned v0.2.61 — the
// godsavgift promotion adds 268,800.00 to GOT and HEL): GOT 3,275,851.15
// ÷ GT = 16.81 SEK/GT; HEL 8,750,057.40 ÷ GT = 44.91 SEK/GT;
// HAM 2,313,489.31 × 11.275 ÷ GT = 133.87 SEK/GT (untouched).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import path from 'path';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, calculatePortCallCost } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import { readDecomposedAppSource } from './appSource';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

const OPS_ENTERED: Partial<CallInput> = {
  ops_kwh_consumption: 1250,
  ops_electricity_price: 2.5,
  ops_demand_charge: 10000,
  ops_connection_charge: 5000,
  ops_per_gt_charge: 0.1
};

const renderComparison = async (mobile: boolean, call: CallInput, vessel: VesselInput = DEFAULT_VESSEL) => {
  __setMobileQueryForTests(() => mobile);
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
        activeVessel="TEST"
      />
    );
  });
  return { container: c, root: r };
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

describe('Grand Total derived per-GT — desktop comparison (spec v0.2.58)', () => {
  it('the Grand Total row carries the derived per-GT secondary line at all three ports', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow).toBeDefined();
    const perGtCells = totalRow.querySelectorAll('.comparison-total-pergt');
    expect(perGtCells.length).toBe(3);
    for (const cell of Array.from(perGtCells)) {
      expect(cell.textContent).toContain('SEK/GT effective — derived, not a published rate');
    }
  });

  it('GOT and HEL are pure division against the pinned baselines: 16.81 and 44.91 SEK/GT (re-pinned v0.2.61)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const text = totalRow.textContent ?? '';
    // v0.2.61 drift re-pin (godsavgift promotion, expected per the
    // directive): 3,275,851.15 ÷ 194,849 = 16.8123 → 16.81;
    // 8,750,057.40 ÷ 194,849 = 44.9069 → 44.91.
    expect(text).toContain('16.81 SEK/GT');
    expect(text).toContain('44.91 SEK/GT');
  });

  it('HAM converts through the rate input: 133.87 SEK/GT at the default 11.275, with the derived-and-converted disclosure naming the rate dependency', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const hamCell = Array.from(totalRow.querySelectorAll('.comparison-total-pergt'))
      .find(c => (c.textContent ?? '').includes('converted at the exchange-rate input'))!;
    expect(hamCell).toBeDefined();
    // 2,313,489.31 × 11.275 ÷ 194,849 = 133.87 SEK/GT
    expect(hamCell.textContent).toContain('133.87 SEK/GT');
    expect(hamCell.textContent).toContain('11.275 kr/EUR');
  });

  it('the figure changes when GT changes (a different vessel re-derives it)', async () => {
    // GT drives the tariff fees too, so the expected figure is derived from
    // the engine's own total at the changed GT — the rendered figure must
    // equal exactly that division (and differ from the 194,849-GT figure).
    const smallVessel = { ...DEFAULT_VESSEL, gt: 100000 };
    const gotResult = calculatePortCallCost(portById('gothenburg'), {
      vessel: smallVessel, call: defaultCall('gothenburg')
    });
    const expected = (gotResult.total / 100000).toFixed(2);
    expect(expected).not.toBe('16.81');
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg'), smallVessel));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).toContain(`${expected} SEK/GT`);
  });

  it('zero GT renders nothing (no division artifact)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg'), { ...DEFAULT_VESSEL, gt: 0 }));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.querySelectorAll('.comparison-total-pergt').length).toBe(0);
    expect(totalRow.textContent).not.toContain('Infinity');
    expect(totalRow.textContent).not.toContain('NaN');
  });
});

describe('Grand Total derived per-GT — mobile comparison cards (spec v0.2.58)', () => {
  it('each card\'s Grand Total lead carries the derived figure, and the Grand Total keeps its pin-asserted first position', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg')));
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    for (const card of Array.from(cards)) {
      const total = card.querySelector('.comparison-card-total')!;
      expect(total).not.toBeNull();
      // the Grand Total is still the card's first element above the first stage row
      const firstStage = card.querySelector('.comparison-card-segment');
      expect(
        total.compareDocumentPosition(firstStage!) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      // the derived figure renders inside the Grand Total lead
      const perGt = total.querySelector('.comparison-total-pergt');
      expect(perGt).not.toBeNull();
    }
    // GOT card carries the exact figure
    const got = Array.from(cards).find(c => (c.textContent ?? '').includes('Gothenburg'))!;
    expect(got.querySelector('.comparison-card-total')!.textContent).toContain('16.81 SEK/GT');
  });

  it('the mobile converted collapse (spec v0.2.39) hides the converted Hamburg per-GT behind the disclosure', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg')));
    const ham = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Hamburg'))!;
    const hiddenTags = ham.querySelectorAll('.comparison-card-total .comparison-converted-hidden-tag');
    expect(hiddenTags.length).toBe(2);
    expect(Array.from(hiddenTags).some(t => (t.textContent ?? '').includes('converted per-GT figure hidden'))).toBe(true);
    expect(ham.querySelector('.comparison-card-total')!.textContent).not.toContain('133.87');
  });
});

describe('Grand Total derived per-GT — OPS honesty (spec v0.2.58)', () => {
  it('with OPS user-specified values entered, the figure uses the Grand Total as presented and the note states the inclusion', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('gothenburg'),
      ...OPS_ENTERED
    } as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const perGtCells = totalRow.querySelectorAll('.comparison-total-pergt');
    expect(perGtCells.length).toBe(3);
    for (const cell of Array.from(perGtCells)) {
      expect(cell.textContent).toContain('includes user-specified OPS');
      expect(cell.textContent).toContain('derived, not a published rate');
    }
    // and the arithmetic holds against the presented (OPS-inclusive) totals:
    // GOT (3,275,851.15 + 32,609.90) ÷ 194,849 = 16.98 SEK/GT
    // (v0.2.61 drift re-pin: the godsavgift moves the base to 3,275,851.15)
    const gotCell = Array.from(perGtCells).find(c => (c.textContent ?? '').startsWith('16.98'))!;
    expect(gotCell).toBeDefined();
  });

  it('without OPS the note carries no inclusion claim (the plain derived note only)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).not.toContain('includes user-specified OPS');
  });
});

describe('Grand Total derived per-GT — per-port workspace untouched (spec v0.2.58)', () => {
  it('the per-port workspace strip presentation is unchanged: the new figure renders only in the comparison', () => {
    // The workspace strip already renders segment figures and the vessel-access
    // effective per-GT; the new Grand-Total per-GT is comparison-only.
    // Source-level assertion (the established summaryTheme pattern): the
    // helper is defined inside ComparisonView, and the workspace strip's
    // Grand Total line carries no per-GT suffix.
    const appSource = readDecomposedAppSource();
    expect(appSource).toContain('grandTotalPerGtCell');
    const stripIdx = appSource.indexOf('Grand Total: <strong>');
    expect(stripIdx).toBeGreaterThan(0);
    const stripExcerpt = appSource.slice(stripIdx, stripIdx + 220);
    expect(stripExcerpt).not.toContain('pergt');
    expect(stripExcerpt).not.toContain('SEK/GT');
  });
});
