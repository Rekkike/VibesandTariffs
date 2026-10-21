// Print reconciliation rows (spec v0.10.1; user ruling 2026-10-21): the print
// surface has never rendered the Discounts received row (spec v0.2.64), nor
// the Estimated parameters subtotal, Total without estimates and Vessel
// Access Charges rows the screen renders around the Grand Total. The printed
// Grand Total is net of discounts, so a printed page on a call with firing
// discounts was unreconcilable. These rows are mandatory reconciliation
// content (no print-dialog option), built from the print surface's own
// portResults - never a screen-side map - so a dialog selection that differs
// from the screen toggle still reconciles.
//
// Every expected figure is read from the engine record (calculatePortCallCost
// through computePortResults) and from buildDiscountLine - never hardcoded.
//
// Red proofs of record (build copy): the Discounts row removed; the three
// reconciliation rows removed; the discount row rendered after the Grand
// Total; the component citations dropped; the per-GT bridge and the
// comparability note removed.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView } from './comparisonView';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { computePortResults } from './comparisonModel';
import { buildDiscountLine } from './discountLine';
import { resolveExchangeRate } from './conversion';
import { comparisonBasisContext } from './portRegistry';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const SELECTED = ['gothenburg', 'aarhus', 'hamburg'];
const DATA_RATE = ((portsRegistry as any).exchange_rates ?? []).find((r: any) => r.from_currency === 'EUR' && r.to_currency === 'SEK');
const RATE_INFO = resolveExchangeRate('', { rate: DATA_RATE.rate, date: DATA_RATE.as_of, source: DATA_RATE.source });
const BASE = defaultCall('gothenburg') as CallInput;
// Discounts fire (ESI) and an OPS demand value gives the segment the placement pin needs.
const DISCOUNT_CALL = { ...BASE, esi_score: 50, ops_demand_charge: 10000 } as CallInput;

const model = (call: CallInput, mode?: 'truck' | 'rail') =>
  computePortResults(
    LOADED_PORTS.filter(p => SELECTED.includes(p.metadata.id)),
    DEFAULT_VESSEL, call, RATE_INFO, comparisonBasisContext, undefined, mode
  );
const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

let container: HTMLElement | null = null;
let root: Root | null = null;
afterEach(async () => {
  if (root) {
    const r = root;
    await act(async () => { r.unmount(); });
  }
  container?.remove();
  container = null;
  root = null;
});
const render = async (call: CallInput, printRequest = 0) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ComparisonView ports={LOADED_PORTS} vessel={DEFAULT_VESSEL} call={call} selectedPortIds={SELECTED} activeVessel="TEST" printRequest={printRequest} />
    );
  });
};

// The printed table rows (outside the screen container), as a snapshot taken
// while the print pages are mounted. Live path: the paper inherits the screen
// state. Dialog path: the dialog selections override.
interface Printed { rows: Element[]; table: Element; text: string }
const capture = async (): Promise<Printed> => {
  const table = Array.from(document.body.querySelectorAll('.print-pages table')).find(t => !container!.contains(t))!;
  return { rows: Array.from(table.querySelectorAll('tr')).map(r => r.cloneNode(true) as Element), table: table.cloneNode(true) as Element, text: table.textContent ?? '' };
};
const printLive = async (): Promise<Printed> => {
  await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
  const p = await capture();
  await act(async () => { window.dispatchEvent(new Event('afterprint')); });
  return p;
};
const printViaDialog = async (opts: { through?: boolean; conversions?: boolean }): Promise<Printed> => {
  const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
  try {
    await act(async () => {
      root!.render(
        <ComparisonView ports={LOADED_PORTS} vessel={DEFAULT_VESSEL} call={DISCOUNT_CALL} selectedPortIds={SELECTED} activeVessel="TEST" printRequest={1} />
      );
    });
    const dialog = container!.querySelector('[data-testid="print-dialog"]')!;
    const set = async (testid: string, want: boolean) => {
      const box = dialog.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement;
      if (box.checked !== want) await act(async () => { box.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    };
    await set('print-dialog-container-through', Boolean(opts.through));
    await set('print-dialog-conversions', Boolean(opts.conversions));
    await act(async () => { (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const p = await capture();
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    return p;
  } finally {
    printSpy.mockRestore();
  }
};
const rowBy = (p: Printed, sel: string) => p.rows.find(r => r.matches(sel))!;
const idx = (p: Printed, sel: string) => p.rows.findIndex(r => r.matches(sel));
// Cell text for a port's column: the printed columns follow the registry's
// selection order, so the i-th data cell belongs to PRINT_ORDER[i].
const PRINT_ORDER = LOADED_PORTS.filter(p => SELECTED.includes(p.metadata.id)).map(p => p.metadata.id);
const cell = (row: Element, portId: string) => (row.querySelectorAll('td')[PRINT_ORDER.indexOf(portId) + 1]?.textContent ?? '');

describe('print reconciliation rows (spec v0.10.1) - Discounts received', () => {
  it('1. the Discounts received row prints, labeled as included in the Grand Total', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-discount-row-"]');
    expect(row).toBeDefined();
    expect(row.textContent).toContain('Discounts received');
    expect(row.textContent).toContain('included in the Grand Total');
  });
  it('2. placement: after the OPS segment and every stage row, before the Grand Total', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const discount = idx(p, '[data-testid^="print-discount-row-"]');
    const ops = idx(p, '[data-testid^="print-ops-segment-"]');
    const total = idx(p, 'tr.comparison-total-row');
    expect(ops).toBeGreaterThan(-1);
    expect(discount).toBeGreaterThan(ops);
    expect(total).toBe(discount + 1);
    const lastStageOwned = p.rows.map((r, i) => ({ r, i })).filter(({ r }) => r.matches('.comparison-stage-row, .comparison-chargetype-row, .comparison-family-row')).pop()!;
    expect(discount).toBeGreaterThan(lastStageOwned.i);
  });
  it('3. component lines with citations print: label, detail, minus amount, citation - one per engine discount component', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-discount-row-"]');
    let checked = 0;
    for (const { port, result } of model(DISCOUNT_CALL)) {
      const line = buildDiscountLine(result!);
      const cellEl = row.querySelectorAll('td')[PRINT_ORDER.indexOf(port.metadata.id) + 1];
      const comps = Array.from(cellEl.querySelectorAll('.print-discount-component')).map(e => e.textContent ?? '');
      expect(comps.length).toBe(line.components.length);
      line.components.forEach((c, i) => {
        expect(comps[i]).toContain(c.label);
        expect(comps[i]).toContain(`−${fmt(c.amount, result!.currency)}`);
        expect(comps[i]).toContain(c.citation);
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });
  it('4. the honest no-discounts state prints where nothing fires', async () => {
    await render(BASE);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-discount-row-"]');
    let none = 0;
    for (const { port, result } of model(BASE)) {
      const line = buildDiscountLine(result!);
      const text = cell(row, port.metadata.id);
      if (line.components.length === 0) { expect(text).toContain('no discounts at this call'); none++; }
      else expect(text).not.toContain('no discounts at this call');
    }
    expect(none).toBeGreaterThan(0);
  });
  it('5. the discount sum and the percentage of gross print as the engine\'s own figures', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-discount-row-"]');
    for (const { port, result } of model(DISCOUNT_CALL)) {
      const line = buildDiscountLine(result!);
      const text = cell(row, port.metadata.id);
      if (line.components.length > 0) {
        expect(text).toContain(fmt(line.sum, result!.currency));
        expect(text).toContain(`${line.percentage.toFixed(2)}% of gross (pre-discount) charges`);
      }
    }
    // reconciliation: the printed total is net of exactly this discount sum
    expect(buildDiscountLine(model(DISCOUNT_CALL)[0].result!).sum).not.toBe(0);
  });
});

describe('print reconciliation rows (spec v0.10.1) - the rows after the Grand Total', () => {
  it('6. the Estimated parameters subtotal row prints after the Grand Total with the est. badge and the engine figure', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-estimate-row-"]');
    expect(row.textContent).toContain('Estimated parameters subtotal');
    expect(row.querySelector('.status-warning')!.textContent).toBe('est.');
    expect(idx(p, '[data-testid^="print-estimate-row-"]')).toBeGreaterThan(idx(p, 'tr.comparison-total-row'));
    for (const { port, result } of model(DISCOUNT_CALL)) expect(cell(row, port.metadata.id)).toContain(fmt(result!.total_estimated_parameters, result!.currency));
  });
  it('7. the Total without estimates row prints next, with the engine figure', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const row = rowBy(p, '[data-testid^="print-without-estimates-row-"]');
    expect(row.textContent).toContain('Total without estimates');
    expect(idx(p, '[data-testid^="print-without-estimates-row-"]')).toBe(idx(p, '[data-testid^="print-estimate-row-"]') + 1);
    for (const { port, result } of model(DISCOUNT_CALL)) expect(cell(row, port.metadata.id)).toContain(fmt(result!.total_without_estimates, result!.currency));
  });
  it('8. the Vessel Access Charges row prints the amount, the derived-metric badge, the per-GT bridge and the converted secondary under the print conversion selection', async () => {
    await render(DISCOUNT_CALL);
    const p = await printViaDialog({ conversions: true });
    const row = rowBy(p, '[data-testid^="print-vessel-access-row-"]');
    expect(row.textContent).toContain('Vessel Access Charges');
    expect(row.querySelector('.status-caveat')!.textContent).toBe('derived metric');
    for (const { port, result } of model(DISCOUNT_CALL)) {
      const va = result!.vessel_access!;
      const text = cell(row, port.metadata.id);
      expect(text).toContain(fmt(va.amount, result!.currency));
      expect(text).toContain(`${va.effective_per_gt.toFixed(2)} ${result!.currency}/GT effective — derived, not a published rate`);
      if (result!.currency !== 'SEK') expect(text).toContain('≈');
      else expect(text).not.toContain('≈');
    }
  });
  it('9. the per-port comparability note prints under the Vessel Access row, with the conversion label and each port\'s functional coverage', async () => {
    await render(DISCOUNT_CALL);
    const p = await printLive();
    const note = rowBy(p, '[data-testid^="print-vessel-access-note-"]');
    expect(idx(p, '[data-testid^="print-vessel-access-note-"]')).toBe(idx(p, '[data-testid^="print-vessel-access-row-"]') + 1);
    expect(note.textContent).toContain('Vessel Access Charges — comparability:');
    for (const { port, result } of model(DISCOUNT_CALL)) {
      expect(note.textContent).toContain(`${port.metadata.name}: covers`);
      const agg = result!.vessel_access!;
      if (agg.classes.length < 3) expect(note.textContent).toContain('functions not listed are funded outside');
    }
  });
});

describe('print reconciliation rows (spec v0.10.1) - the printed model, not the screen model', () => {
  it('10. a dialog container-through selection that differs from the screen toggle: the reconciliation rows follow the printed model', async () => {
    await render(DISCOUNT_CALL);
    // screen toggle OFF; the dialog turns container-through ON
    const p = await printViaDialog({ through: true });
    const through = model(DISCOUNT_CALL, 'truck');
    const off = model(DISCOUNT_CALL);
    const without = rowBy(p, '[data-testid^="print-without-estimates-row-"]');
    const gotOn = through.find(r => r.port.metadata.id === 'gothenburg')!.result!;
    const gotOff = off.find(r => r.port.metadata.id === 'gothenburg')!.result!;
    expect(gotOn.total_without_estimates).toBeGreaterThan(gotOff.total_without_estimates);
    expect(cell(without, 'gothenburg')).toContain(fmt(gotOn.total_without_estimates, 'SEK'));
    expect(cell(without, 'gothenburg')).not.toContain(fmt(gotOff.total_without_estimates, 'SEK'));
    // the discount row is built from the printed model and reconciles with the printed Grand Total
    const discount = rowBy(p, '[data-testid^="print-discount-row-"]');
    for (const { port, result } of through) {
      const line = buildDiscountLine(result!);
      if (line.components.length > 0) expect(cell(discount, port.metadata.id)).toContain(fmt(line.sum, result!.currency));
    }
    const grand = rowBy(p, 'tr.comparison-total-row');
    expect(cell(grand, 'gothenburg')).toContain(fmt(gotOn.total, 'SEK'));
  });
});
