// Share-of-total composition pins (spec v0.22.0, user rulings of
// 2026-11-20, adjudicated 2026-11-20): the comparison's new per-view
// disclosure "Show share of total" (default OFF) and the one compact
// composition strip each port's Grand Total gains while it is open.
// Every pin in this suite carries the in-test attribution of the user
// ruling of 2026-11-20.
//
// Delivered shape pinned here: default OFF renders nothing (both
// widths); opened, the strip sits in the Grand Total cell per port column
// on the desktop table and under the Grand Total lead on the phone card,
// identical on both widths (the v0.21.1 parity doctrine); one basis only
// (the presented result.total); components are the three stage shares
// with the existing stage labels verbatim, the OPS share when an OPS
// contribution is present (labeled user-specified), and the Discounts
// received share as a signed component when the discount sum is nonzero;
// largest-remainder rounding at one decimal so the displayed figures sum
// to exactly 100.0; the strip carries "derived, not a published tariff
// figure"; the v0.2.64 discount line keeps its own gross-basis wording;
// print is untouched. Screen only - no engine, no schema, no port data.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import path from 'path';
import { ComparisonView, __setMobileQueryForTests } from './App';
import { LOADED_PORTS as RENDERED_PORTS } from './portRegistry';
import { DEFAULT_VESSEL, defaultCall, calculatePortCallCost } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import { COMPARISON_STAGES } from './chargeTypes';
import { buildDiscountLine } from './discountLine';
import { buildShareOfTotal, largestRemainderPercents } from './shareOfTotal';

const LOADED_PORTS: PortDefinition[] = RENDERED_PORTS;
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

// Standard test vessel (Maren Maersk, GT 194,849) and default inputs, the
// suite-wide baseline of the comparison pins.
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

const toggle = () => container!.querySelector('[data-testid="share-of-total-toggle"]') as HTMLButtonElement;
const openShare = async () => {
  await act(async () => { toggle().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};
const strips = () => Array.from(container!.querySelectorAll('.comparison-share-of-total'));
const componentsText = (el: Element) => el.querySelector('[data-testid$="-components"]')!.textContent ?? '';
// Parse the displayed one-decimal percents and sum them (the vacuous-pass
// sweep: the set must be non-empty and the sum must be exactly 100.0).
const displayedSum = (text: string): number => {
  const parts = text.split(' · ');
  expect(parts.length).toBeGreaterThan(0);
  return parts.reduce((s, p) => s + parseFloat(p.match(/(-?\d+\.\d)%$/)![1]), 0);
};

describe('share-of-total disclosure — default OFF (user ruling 2026-11-20)', () => {
  it('desktop: the control renders "Show share of total" (aria-expanded false) and no strip renders anywhere', async () => {
    // (user ruling 2026-11-20) default OFF: the off state is byte-identical
    // to the pre-disclosure view.
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    expect(toggle()).not.toBeNull();
    expect(toggle().textContent).toBe('Show share of total');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().className).toContain('disclosure-header');
    expect(strips().length).toBe(0);
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).not.toContain('share of Grand Total');
    expect(container!.textContent).not.toContain('derived, not a published tariff figure — displayed shares sum to 100%');
  });

  it('mobile: exactly one control renders (the isMobile gating pattern) and no strip renders by default', async () => {
    // (user ruling 2026-11-20) one control render at a time; placed beside
    // "Convert to SEK" above the cards.
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg') as CallInput));
    const controls = container!.querySelectorAll('[data-testid="share-of-total-toggle"]');
    expect(controls.length).toBe(1);
    expect(toggle().textContent).toBe('Show share of total');
    expect(strips().length).toBe(0);
    // the control sits above the cards, beside the conversion disclosure
    const cards = container!.querySelector('.comparison-cards')!;
    expect(toggle().compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('share-of-total strip — opened at the standard test vessel and default inputs (user ruling 2026-11-20)', () => {
  it('desktop: each port\'s Grand Total cell gains one strip; the Gothenburg composition is the golden pin and the displayed shares sum to exactly 100.0', async () => {
    // (user ruling 2026-11-20) golden composition at the standard test
    // vessel (Maren Maersk, GT 194,849) and default inputs: GOT total
    // 3,275,851.15 SEK renders stage sums 1,068,651 / 0 / 2,207,200 kr, so
    // the strip is 32.6 / 0.0 / 67.4 and sums to 100.0.
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg') as CallInput));
    await openShare();
    expect(toggle().textContent).toBe('Hide share of total');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    const all = strips();
    // vacuous-pass sweep: the open strip set is non-empty, one per port.
    expect(all.length).toBe(LOADED_PORTS.length);
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    const rowStrips = totalRow.querySelectorAll('.comparison-share-of-total');
    expect(rowStrips.length).toBe(LOADED_PORTS.length);
    const got = container!.querySelector('[data-testid="share-of-total-gothenburg"]')!;
    expect(got).not.toBeNull();
    expect(componentsText(got)).toBe('To reach the berth 32.6% · At the berth 0.0% · Quayside operations 67.4%');
    // the existing stage labels verbatim, and only the components present
    // (no OPS, no discount at the default call):
    for (const stage of COMPARISON_STAGES) {
      expect(componentsText(got)).toContain(stage.label);
    }
    expect(componentsText(got)).not.toContain('OPS');
    expect(componentsText(got)).not.toContain('Discounts received');
    expect(displayedSum(componentsText(got))).toBeCloseTo(100.0, 6);
    expect(Math.round(displayedSum(componentsText(got)) * 10) / 10).toBe(100);
    // the derived convention rides the strip
    const convention = got.querySelector('.comparison-share-of-total-convention')!;
    expect(convention.textContent).toContain('share of Grand Total');
    expect(convention.textContent).toContain('derived, not a published tariff figure');
    expect(convention.textContent).toContain('sum to 100%');
    // every port's displayed composition sums to exactly 100.0
    for (const el of all) {
      expect(Math.round(displayedSum(componentsText(el)) * 10) / 10).toBe(100);
    }
  });

  it('mobile: the strip renders under the Grand Total on each card, identical to the desktop composition (parity doctrine)', async () => {
    // (user ruling 2026-11-20) identical on desktop and phone.
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg') as CallInput));
    await openShare();
    const all = strips();
    expect(all.length).toBe(LOADED_PORTS.length);
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    for (const card of Array.from(cards)) {
      const total = card.querySelector('.comparison-card-total')!;
      const strip = total.querySelector('.comparison-share-of-total');
      expect(strip).not.toBeNull();
      expect(Math.round(displayedSum(componentsText(strip!)) * 10) / 10).toBe(100);
    }
    const gotCard = Array.from(cards).find(c => (c.textContent ?? '').includes('Gothenburg'))!;
    expect(componentsText(gotCard.querySelector('.comparison-share-of-total')!))
      .toBe('To reach the berth 32.6% · At the berth 0.0% · Quayside operations 67.4%');
  });
});

describe('share-of-total strip — OPS entered on a port (user ruling 2026-11-20)', () => {
  it('the OPS share is present (labeled user-specified), the total moves, and the shares re-derive with no inclusion toggle', async () => {
    // (user ruling 2026-11-20) the OPS percentage answers the additive OPS
    // question: with the standard OPS entries at Gothenburg the total
    // moves 3,275,851.15 -> 3,308,461.05 (OPS 32,609.90, 0.9857% raw) and
    // the strip re-derives to the golden below, summing to 100.0.
    ({ container, root } = await renderComparison(false, {
      ...defaultCall('gothenburg'),
      ...OPS_ENTERED
    } as CallInput));
    const gotEngine = calculatePortCallCost(portById('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), ...OPS_ENTERED } as CallInput
    });
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row'))
      .find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).toContain('3 308 461');
    await openShare();
    const got = container!.querySelector('[data-testid="share-of-total-gothenburg"]')!;
    expect(componentsText(got)).toBe('To reach the berth 32.3% · At the berth 0.0% · Quayside operations 66.7% · OPS (user-specified) 1.0%');
    expect(Math.round(displayedSum(componentsText(got)) * 10) / 10).toBe(100);
    // the displayed OPS share is the raw additive share within the
    // one-decimal rounding bound
    const rawOps = (gotEngine.ops_speculative!.amount / gotEngine.total) * 100;
    const shown = parseFloat(componentsText(got).match(/OPS \(user-specified\) (-?\d+\.\d)%/)![1]);
    expect(Math.abs(shown - rawOps)).toBeLessThan(0.1);
    // re-derived against the default-input strip (no inclusion toggle: the
    // shares follow the presented total)
    expect(componentsText(got)).not.toBe('To reach the berth 32.6% · At the berth 0.0% · Quayside operations 67.4%');
    // every port's strip still sums to exactly 100.0 with OPS entered
    for (const el of strips()) {
      expect(Math.round(displayedSum(componentsText(el)) * 10) / 10).toBe(100);
    }
  });
});

describe('share-of-total strip — discounts received (user ruling 2026-11-20)', () => {
  it('the discount share renders as a signed component (percent of the NET total) while the v0.2.64 line keeps its gross basis untouched', async () => {
    // (user ruling 2026-11-20) with ESI 30 at Gothenburg the tariff
    // discount 20,427.92 fires: total 3,255,423.23, the strip shows
    // "Discounts received -0.6%" (net basis, -20,427.92 / 3,255,423.23 =
    // -0.6274% raw) and sums to 100.0; the ruled v0.2.64 line keeps
    // "0.62% of gross (pre-discount) charges" — the two bases stay
    // distinct by their labels.
    const call = { ...defaultCall('gothenburg'), esi_score: 30 } as CallInput;
    ({ container, root } = await renderComparison(false, call));
    const gotEngine = calculatePortCallCost(portById('gothenburg'), { vessel: DEFAULT_VESSEL, call });
    const line = buildDiscountLine(gotEngine);
    await openShare();
    const got = container!.querySelector('[data-testid="share-of-total-gothenburg"]')!;
    expect(componentsText(got)).toBe('To reach the berth 32.8% · At the berth 0.0% · Quayside operations 67.8% · Discounts received -0.6%');
    expect(Math.round(displayedSum(componentsText(got)) * 10) / 10).toBe(100);
    const rawDisc = (-line.sum / gotEngine.total) * 100;
    const shown = parseFloat(componentsText(got).match(/Discounts received (-?\d+\.\d)%/)![1]);
    expect(Math.abs(shown - rawDisc)).toBeLessThan(0.1);
    // coexistence: the v0.2.64 discount row is untouched — its percentage
    // line keeps the gross (pre-discount) basis wording, derived in-test.
    const discRow = container!.querySelector('.comparison-discount-row')!;
    expect(discRow.textContent).toContain(`${line.percentage.toFixed(2)}% of gross (pre-discount) charges`);
    expect(discRow.textContent).toContain('included in the Grand Total');
    // the strip's discount component is percent of the NET total, labeled
    // so the bases stay distinct
    expect(componentsText(got)).toContain('Discounts received -0.6%');
    expect(componentsText(got)).not.toContain('gross');
  });
});

describe('share-of-total computation — largest-remainder rounding and edges (user ruling 2026-11-20)', () => {
  it('largest-remainder at one decimal: displayed figures sum to exactly 100.0, ties break by component order', () => {
    // (user ruling 2026-11-20) the rounding contract itself.
    expect(largestRemainderPercents([1, 1, 1], 3)).toEqual(['33.4', '33.3', '33.3']);
    expect(largestRemainderPercents([10, 20, 70], 100)).toEqual(['10.0', '20.0', '70.0']);
    // a signed (negative) component participates in the same remainder
    // distribution: 2/3, 2/3, -1/3 of 3 sum to exactly 100.0, each within
    // the one-decimal rounding bound of its raw share
    const signed = largestRemainderPercents([2, 2, -1], 3);
    expect(Math.round(signed.reduce((s, p) => s + parseFloat(p), 0) * 10) / 10).toBe(100);
    const rawSigned = [2, 2, -1].map(a => (a / 3) * 100);
    signed.forEach((p, i) => expect(Math.abs(parseFloat(p) - rawSigned[i])).toBeLessThan(0.1));
    expect(largestRemainderPercents([70, 35, -5], 100)).toEqual(['70.0', '35.0', '-5.0']);
    const cases: [number[], number][] = [[[1, 1, 1], 3], [[2, 2, -1], 3], [[70, 35, -5], 100], [[1, 2, 3, 4, 90], 100]];
    for (const [amounts, total] of cases) {
      const sum = largestRemainderPercents(amounts, total).reduce((s, p) => s + parseFloat(p), 0);
      expect(Math.round(sum * 10) / 10).toBe(100);
    }
  });

  it('zero or negative totals and a missing result render nothing (no division artifact)', () => {
    // (user ruling 2026-11-20) the grand-total-per-GT precedent: a total of
    // zero or negative renders nothing; a port with no result renders no
    // strip.
    const fakeResult = (total: number) => ({ total, currency: 'SEK', billers: [], port_id: 'x' }) as never;
    const rows: never[] = [];
    expect(buildShareOfTotal('x', null, rows)).toBeNull();
    expect(buildShareOfTotal('x', fakeResult(0), rows)).toBeNull();
    expect(buildShareOfTotal('x', fakeResult(-5), rows)).toBeNull();
    expect(buildShareOfTotal('x', fakeResult(NaN), rows)).toBeNull();
  });
});

describe('share-of-total scope — print untouched (user ruling 2026-11-20)', () => {
  it('the print page set carries no strip: printComparisonPages.tsx has no share-of-total reference', () => {
    // (user ruling 2026-11-20) PRINT UNTOUCHED: the paper keeps no strip.
    const printSource = fs.readFileSync(path.join(__dirname, 'printComparisonPages.tsx'), 'utf8');
    expect(printSource).not.toContain('shareOfTotal');
    expect(printSource).not.toContain('share-of-total');
    expect(printSource).not.toContain('ShareOfTotal');
    // the registry and the ECB pins are untouched by this pass (hash
    // pinned at the base verification; asserted here against the file).
    // v0.25.0 re-baseline (ECB rate pass (user ruling 2026-11-23)): the
    // registry REGENERATES BY DESIGN in a rate pass, so its exchange_rates
    // block carries the new pins - EUR-SEK 11.2375 and EUR-DKK 7.4746, both
    // as_of 2026-11-23 (were 11.0628 / 7.4754, 2026-11-12).
    const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'ports.json'), 'utf8'));
    const sek = registry.exchange_rates.find((r: { pair?: string; from_currency: string; to_currency: string }) => r.from_currency === 'EUR' && r.to_currency === 'SEK');
    const dkk = registry.exchange_rates.find((r: { pair?: string; from_currency: string; to_currency: string }) => r.from_currency === 'EUR' && r.to_currency === 'DKK');
    expect(sek.rate).toBe(11.2375);
    expect(sek.as_of).toBe('2026-11-23');
    expect(dkk.rate).toBe(7.4746);
    expect(dkk.as_of).toBe('2026-11-23');
  });
});
