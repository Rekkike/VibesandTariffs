// Discounts received and OPS placement pins (spec v0.2.64, the
// comparison-legibility pass). Zero-drift contract: every rendering in
// this suite is presentation-layer only — the engine, the data, and
// every figure are untouched, and every baseline pin holds exactly with
// the new rendering in place.
//
// Item 2 — the discount line: the tariff-derived negative adjustments
// firing at the current call, summed per port, with component
// itemization (amount + citation), the local-currency sum through the
// conversion disclosure machinery, a currency-neutral percentage against
// the port's gross (pre-discount) charges, and the before-Grand-Total
// placement labeled as included in it (not additive). Speculation inputs
// (OPS, the frequency what-if panel) are structurally excluded — no
// speculation value can enter the line. Zero renders the honest zero;
// no firing discount renders the honest no-discounts state.
//
// Item 3 — OPS placement: the user-specified OPS block renders inside
// the "At the berth" stage block on both comparison surfaces (desktop
// column and mobile card), before the Grand Total, labeled as included
// in it.
//
// Item 4 — the derived per-GT metric's OPS disclosure: where a per-GT
// OPS charge is entered, the disclosure states the same-GT-basis fact
// and the flow into the derived SEK/GT metric.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  calculatePortCallCost,
  DEFAULT_VESSEL,
  defaultCall
} from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { ComparisonView, __setMobileQueryForTests } from './App';
import { buildDiscountLine } from './discountLine';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

const OPS_ENTERED: Pick<CallInput, 'ops_kwh_consumption' | 'ops_electricity_price' | 'ops_demand_charge' | 'ops_connection_charge' | 'ops_per_gt_charge'> = {
  ops_kwh_consumption: 1250,
  ops_electricity_price: 2.5,
  ops_demand_charge: 10000,
  ops_connection_charge: 5000,
  ops_per_gt_charge: 0.1
};

const roundToCent = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

const renderComparison = async (mobile: boolean, call: CallInput) => {
  __setMobileQueryForTests(() => mobile);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
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

// ---- Item 1: zero-drift pins — every baseline holds exactly -------------
describe('comparison-legibility zero-drift pins (spec v0.2.64)', () => {
  it('every engine baseline holds with all new rendering in place (byte-identical totals and per-GT)', async () => {
    // v0.2.66 promotion re-baseline: HAM 2,313,489.31 -> 2,204,910.90
    // (the Eurogate terminal layer; §17.5); GOT/HEL byte-identical.
    for (const [portId, expected] of [
      ['gothenburg', 3275851.15],
      ['hamburg', 2204910.90],
      ['helsingborg', 8750057.40]
    ] as const) {
      const result = calculatePortCallCost(portById(portId), {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(portId)
      });
      expect(roundToCent(result.total)).toBe(expected);
    }
  });

  it('the rendered Grand Total strings are byte-identical to the pre-pass baseline (desktop)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const cells = Array.from(totalRow.querySelectorAll('td')).map(td => (td.textContent ?? '').trim());
    // Baseline captured at 5cc7a98 before any edit of this pass.
    expect(cells).toEqual([
      'Grand Total',
      '3\u00a0275\u00a0851\u00a0kr16.81 SEK/GT effective \u2014 derived, not a published rate',
      '8\u00a0750\u00a0057\u00a0kr44.91 SEK/GT effective \u2014 derived, not a published rate',
      '2\u00a0204\u00a0911\u00a0\u20ac\u2248 24\u00a0860\u00a0370\u00a0kr converted \u2014 at 11.275 kr/EUR, 2026-09-21127.59 SEK/GT effective \u2014 derived, not a published rate; converted at the exchange-rate input (at 11.275 kr/EUR, 2026-09-21)'
    ]);
  });

  it('the rendered stage-subtotal strings are byte-identical to the pre-pass baseline (desktop)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    const stageRows = container!.querySelectorAll('.comparison-stage-row');
    expect(stageRows.length).toBe(3);
    expect((stageRows[0].textContent ?? '').trim())
      .toBe('To reach the berth1\u00a0068\u00a0651\u00a0kr2\u00a0378\u00a0057\u00a0kr119\u00a0740\u00a0\u20ac');
    expect((stageRows[1].textContent ?? '').trim())
      .toBe('At the berth0\u00a0kr0\u00a0kr553\u00a0371\u00a0\u20ac');
    expect((stageRows[2].textContent ?? '').trim())
      .toBe('Quayside operations2\u00a0207\u00a0200\u00a0kr6\u00a0372\u00a0000\u00a0kr1\u00a0531\u00a0800\u00a0\u20ac');
  });
});

// ---- Item 2: the discount line ------------------------------------------
describe('discounts received — the model (spec v0.2.64, item 2)', () => {
  it('the default call fires no discount at any port: sum 0, honest zero percentage, empty inventory', () => {
    for (const port of LOADED_PORTS) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id)
      });
      const line = buildDiscountLine(result);
      expect(line.sum).toBe(0);
      expect(line.components).toEqual([]);
      expect(line.percentage).toBe(0);
      // Gross equals the tariff-derived net charges exactly.
      expect(line.grossCharges).toBe(roundToCent(result.total));
    }
  });

  it('the GOT second-call discount requires the same-route attestation (spec v0.2.67): unattested calls=2 earns nothing, the attested pair earns 102,139.60 SEK, 3.12% of gross', () => {
    // Unattested: two unrelated calls earn nothing under the tariff
    // (§2.2: the discount is the same-route import/export pair).
    const unattested = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), calls_this_month: 2 } as CallInput
    });
    expect(buildDiscountLine(unattested).sum).toBe(0);
    const result = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), calls_this_month: 2, got_same_route_second_call: true } as CallInput
    });
    const line = buildDiscountLine(result);
    expect(line.sum).toBe(102139.60);
    expect(line.components.length).toBe(1);
    expect(line.components[0].label).toContain('Frequency discount');
    expect(line.components[0].amount).toBe(102139.60);
    expect(line.components[0].citation).toContain('port-tariff-2026.pdf');
    // Arithmetic: gross = net + discounts = 3,173,711.55 + 102,139.60
    // = 3,275,851.15; percentage = 102,139.60 / 3,275,851.15 = 3.1180...%
    expect(line.grossCharges).toBe(3275851.15);
    expect(line.percentage).toBeCloseTo(3.1180, 3);
    expect(line.percentage.toFixed(2)).toBe('3.12');
    // The itemization sum matches the rendered sum.
    expect(roundToCent(line.components.reduce((s, c) => s + c.amount, 0))).toBe(line.sum);
  });

  it('the GOT third call stacks both frequency discounts when the pair is attested: 167,683.35 SEK, 5.12% of gross (spec v0.2.67: unattested, only the national 65,543.75 remains)', () => {
    const unattested = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), calls_this_month: 3 } as CallInput
    });
    const unattestedLine = buildDiscountLine(unattested);
    expect(unattestedLine.sum).toBe(65543.75);
    expect(unattestedLine.components.map(c => c.amount)).toEqual([65543.75]);
    const result = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), calls_this_month: 3, got_same_route_second_call: true } as CallInput
    });
    const line = buildDiscountLine(result);
    expect(line.sum).toBe(167683.35);
    expect(line.components.length).toBe(2);
    // Port-dues second-call 50% (102,139.60) + Sjöfartsverket 75% payable (65,543.75)
    expect(line.components.map(c => c.amount)).toEqual([102139.60, 65543.75]);
    expect(line.grossCharges).toBe(3275851.15);
    expect(line.percentage.toFixed(2)).toBe('5.12');
  });

  it('the GOT environmental discount fires at ESI 50: 20,427.92 SEK, 0.62% of gross', () => {
    const result = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), esi_score: 50 } as CallInput
    });
    const line = buildDiscountLine(result);
    expect(line.sum).toBe(20427.92);
    expect(line.components.length).toBe(1);
    expect(line.components[0].label).toContain('Additive discounts');
    expect(line.percentage.toFixed(2)).toBe('0.62');
  });

  it('the HAM quantum discount fires at 2m prior-year GT: 1,228.25 EUR, 0.06% of gross (v0.2.66 re-baseline: the gross moved)', () => {
    const result = calculatePortCallCost(portById('hamburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), quantum_prior_year_gt: 2000000 } as CallInput
    });
    const line = buildDiscountLine(result);
    expect(line.sum).toBe(1228.25);
    expect(line.components.length).toBe(1);
    expect(line.components[0].label).toContain('Quantum');
    expect(line.components[0].citation).toContain('pricelist-maritime-shipping-2026.pdf');
    expect(line.grossCharges).toBe(2204910.90);
    expect(line.percentage.toFixed(2)).toBe('0.06');
  });

  it('the HEL environmental discounts stack additively: 266,943.13 SEK, 3.05% of gross', () => {
    const result = calculatePortCallCost(portById('helsingborg'), {
      vessel: DEFAULT_VESSEL,
      call: {
        ...defaultCall('helsingborg'),
        esi_score: 50,
        clean_shipping_index_class: '4',
        fossil_free_fuel_percentage: 40
      } as CallInput
    });
    const line = buildDiscountLine(result);
    expect(line.sum).toBe(266943.13);
    expect(line.components.length).toBe(1);
    expect(line.components[0].label).toContain('Additive discounts');
    expect(line.components[0].citation).toContain('tariff-2026.pdf');
    expect(line.grossCharges).toBe(8750057.40);
    expect(line.percentage.toFixed(2)).toBe('3.05');
  });

  it('speculation exclusion, structural: OPS values never enter the discount line (any component, any port)', () => {
    for (const port of LOADED_PORTS) {
      const blank = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id)
      });
      const entered = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(port.metadata.id), ...OPS_ENTERED } as CallInput
      });
      const blankLine = buildDiscountLine(blank);
      const enteredLine = buildDiscountLine(entered);
      expect(enteredLine.sum).toBe(blankLine.sum);
      expect(enteredLine.components).toEqual(blankLine.components);
      expect(enteredLine.percentage).toBe(blankLine.percentage);
      // The OPS amount itself is outside the line's basis entirely.
      expect(entered.ops_speculative).toBeDefined();
      expect(enteredLine.grossCharges).toBe(roundToCent(entered.total - (entered.ops_speculative?.amount ?? 0) + enteredLine.sum));
    }
  });

  it('speculation exclusion, structural: the call-count axis never enters the discount line at the default single call', () => {
    // The frequency what-if panel never feeds the engine; the call model's
    // calls_this_month=1 default renders zero in the line. The fired states
    // (calls>=2) are tariff-derived call-property adjustments — the GOT
    // second-call discount and the Sjöfartsverket rabatt — verified above.
    for (const port of LOADED_PORTS) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id)
      });
      expect(buildDiscountLine(result).sum).toBe(0);
    }
  });
});

describe('discounts received — the rendering (spec v0.2.64, item 2)', () => {
  it('desktop: the row renders before the Grand Total, labeled as included in it, with the honest no-discounts state at the default call', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    const discountRow = container!.querySelector('.comparison-discount-row');
    expect(discountRow).not.toBeNull();
    expect(discountRow!.textContent).toContain('Discounts received');
    expect(discountRow!.textContent).toContain('included in the Grand Total');
    // The honest zero state at the default call: no port fired a discount.
    const noDiscount = discountRow!.querySelectorAll('.comparison-no-discount');
    expect(noDiscount.length).toBe(LOADED_PORTS.length);
    for (const el of Array.from(noDiscount)) {
      expect(el.textContent).toContain('no discounts at this call');
    }
    // Placement: before the Grand Total row.
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(
      discountRow!.compareDocumentPosition(totalRow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('desktop: a firing discount renders the sum, the percentage, and the itemization with citation', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('gothenburg'),
      calls_this_month: 2, got_same_route_second_call: true
    } as CallInput));
    const discountRow = container!.querySelector('.comparison-discount-row')!;
    expect(discountRow.textContent).toContain('102\u00a0140');
    expect(discountRow.textContent).toContain('3.12% of gross (pre-discount) charges');
    expect(discountRow.textContent).toContain('Frequency discount');
    expect(discountRow.textContent).toContain('port-tariff-2026.pdf');
    // The honest zero still renders for the ports that fired nothing.
    const noDiscount = discountRow.querySelectorAll('.comparison-no-discount');
    expect(noDiscount.length).toBe(2);
  });

  it('desktop: the discount sum follows the conversion disclosure machinery (Hamburg native EUR with the converted secondary)', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('hamburg'),
      quantum_prior_year_gt: 2000000
    } as CallInput));
    const discountRow = container!.querySelector('.comparison-discount-row')!;
    expect(discountRow.textContent).toContain('1\u00a0228');
    expect(discountRow.textContent).toContain('converted');
    expect(discountRow.textContent).toContain('0.06% of gross (pre-discount) charges');
  });

  it('mobile: the card carries the discount line with the honest no-discounts state at the default call', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg') as CallInput));
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    for (const card of Array.from(cards)) {
      const line = card.querySelector('.comparison-card-discount');
      expect(line).not.toBeNull();
      expect(line!.textContent).toContain('Discounts received (included in the Grand Total)');
      expect(line!.textContent).toContain('no discounts at this call');
    }
  });

  it('mobile: a firing discount renders the sum and percentage on the card', async () => {
    ({ container, root } = await renderComparison(true, {
      ...defaultCall('gothenburg'),
      calls_this_month: 2, got_same_route_second_call: true
    } as CallInput));
    const got = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Gothenburg'))!;
    const line = got.querySelector('.comparison-card-discount')!;
    expect(line.textContent).toContain('102\u00a0140');
    expect(line.textContent).toContain('3.12% of gross (pre-discount) charges');
    // Placement: after the stage blocks, before the estimated-parameters
    // subtotal (the card's Grand Total leads; the discount line sits among
    // the closing lines, included in the total).
    const estimate = got.querySelector('.comparison-card-list')!.children;
    const discountIdx = Array.prototype.findIndex.call(estimate, (el: Element) => el.className.includes('comparison-card-discount'));
    const opsOrEstimateIdx = Array.prototype.findIndex.call(estimate, (el: Element) =>
      (el.textContent ?? '').includes('Estimated parameters subtotal'));
    expect(discountIdx).toBeGreaterThan(-1);
    expect(discountIdx).toBeLessThan(opsOrEstimateIdx);
  });
});

// ---- Item 3: OPS stage placement ----------------------------------------
describe('OPS placement into the at-berth stage (spec v0.2.64, item 3)', () => {
  it('desktop: with OPS entered, the OPS row renders inside the At-the-berth stage block, before the Grand Total, labeled as included', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('gothenburg'),
      ...OPS_ENTERED
    } as CallInput));
    const opsRow = container!.querySelector('.comparison-ops-row');
    expect(opsRow).not.toBeNull();
    expect(opsRow!.textContent).toContain('user-specified, not tariff-derived');
    expect(opsRow!.textContent).toContain('included in the Grand Total');
    // Inside the at-berth stage: the stage row precedes it and no other
    // stage row sits between them.
    const rows = Array.from(opsRow!.closest('table')!.querySelectorAll('tr')) as HTMLElement[];
    const opsIdx = rows.indexOf(opsRow! as HTMLElement);
    const stageIdxs = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.classList.contains('comparison-stage-row'));
    const atBerth = stageIdxs.find(({ r }) => (r.textContent ?? '').includes('At the berth'))!;
    const quayside = stageIdxs.find(({ r }) => (r.textContent ?? '').includes('Quayside operations'))!;
    expect(opsIdx).toBeGreaterThan(atBerth.i);
    expect(opsIdx).toBeLessThan(quayside.i);
    // Before the Grand Total.
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(
      opsRow!.compareDocumentPosition(totalRow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    // The figures render per port (GOT 32,609.90; HAM 8,125 EUR; HEL 37,609.90).
    expect(opsRow!.textContent).toContain('32\u00a0610');
    expect(opsRow!.textContent).toContain('8\u00a0125');
    expect(opsRow!.textContent).toContain('37\u00a0610');
  });

  it('desktop: blank OPS renders no OPS row (the blank contract holds in the new position)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    expect(container!.querySelector('.comparison-ops-row')).toBeNull();
  });

  it('mobile: the card OPS line renders inside the at-berth stage block, before the estimated-parameters subtotal', async () => {
    ({ container, root } = await renderComparison(true, {
      ...defaultCall('gothenburg'),
      ...OPS_ENTERED
    } as CallInput));
    const cards = container!.querySelectorAll('.comparison-port-card');
    for (const card of Array.from(cards)) {
      const opsLine = card.querySelector('.comparison-card-ops');
      expect(opsLine).not.toBeNull();
      expect(opsLine!.textContent).toContain('included in the Grand Total');
      // Inside the at-berth stage block: the stage label precedes the OPS
      // line and the quayside stage label follows it.
      const list = card.querySelector('.comparison-card-list')!;
      const children = Array.from(list.children);
      const opsIdx = children.indexOf(opsLine! as Element);
      const stageIdxs = children
        .map((el, i) => ({ el, i }))
        .filter(({ el }) => el.className.includes('comparison-card-segment'));
      const atBerth = stageIdxs.find(({ el }) => (el.textContent ?? '').includes('At the berth'))!;
      const quayside = stageIdxs.find(({ el }) => (el.textContent ?? '').includes('Quayside operations'))!;
      expect(opsIdx).toBeGreaterThan(atBerth.i);
      expect(opsIdx).toBeLessThan(quayside.i);
    }
  });
});

// ---- Item 4: the derived per-GT metric's OPS disclosure --------------------
describe('the derived per-GT metric\u2019s per-GT-OPS disclosure (spec v0.2.64, item 4)', () => {
  it('with a per-GT OPS charge entered, the per-GT note discloses the same-GT basis and the flow into the metric', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('gothenburg'),
      ...OPS_ENTERED
    } as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const perGtCells = totalRow.querySelectorAll('.comparison-total-pergt');
    expect(perGtCells.length).toBe(3);
    // GOT and HEL (per-GT descriptor enabled + value entered) carry the
    // disclosure; HAM (no per-GT component) carries only the inclusion note.
    const texts = Array.from(perGtCells).map(c => c.textContent ?? '');
    expect(texts[0]).toContain('includes user-specified OPS');
    expect(texts[0]).toContain('per-GT OPS charge uses the same GT basis as the port dues');
    expect(texts[0]).toContain('flows into this derived metric');
    expect(texts[1]).toContain('per-GT OPS charge uses the same GT basis as the port dues');
    expect(texts[2]).not.toContain('per-GT OPS charge uses the same GT basis');
    expect(texts[2]).toContain('includes user-specified OPS');
  });

  it('without OPS the note carries no disclosure (the plain derived note only, unchanged)', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).not.toContain('includes user-specified OPS');
    expect(totalRow.textContent).not.toContain('per-GT OPS charge');
  });

  it('OPS entered without a per-GT component (Hamburg) carries no per-GT-basis disclosure', async () => {
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('hamburg'),
      ops_kwh_consumption: 1250,
      ops_electricity_price: 2.5,
      ops_connection_charge: 5000
    } as CallInput));
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const hamCell = Array.from(totalRow.querySelectorAll('.comparison-total-pergt'))
      .find(c => (c.textContent ?? '').includes('128.06'))!;
    expect(hamCell.textContent).toContain('includes user-specified OPS');
    expect(hamCell.textContent).not.toContain('per-GT OPS charge uses the same GT basis');
  });

  it('the workspace per-GT OPS input carries the GT-basis and no-published-rate disclosure', () => {
    const fs = require('fs');
    const source = fs.readFileSync('src/portWorkspaceInputs.tsx', 'utf8');
    expect(source).toContain('same GT basis as the port dues');
    expect(source).toContain('no published tariff prices container-terminal OPS per GT');
  });
});
