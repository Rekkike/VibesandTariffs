// Comparison OPS segment (spec v0.9.1, user ruling 2026-10-21; supersedes the
// v0.2.64 merged OPS row inside the at-berth block). The OPS group is its own
// segment after all stage rows and before Discounts received: a header row
// whose cells carry each port's OPS subtotal (the engine's own
// ops_speculative amount), then one row per engine line with each port's own
// amount and basis string. Mobile reorganizes identically; print carries the
// same segment before the Grand Total. Every figure is read from the
// engine's own ops_speculative record.
//
// Red proofs of record (build copy): the segment reverted to the single
// merged row turns the granularity and placement pins red; the segment
// rendered inside the at-berth block turns the placement pin red; the print
// segment removed turns the print pin red.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const SELECTED = ['gothenburg', 'hamburg', 'aarhus'];
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const ENTERED = {
  ops_kwh_consumption: 1250,
  ops_electricity_price: 2.5,
  ops_demand_charge: 10000,
  ops_per_gt_charge: 0.1,
  ops_unit_charge_20ft: 10,
  ops_nonempty_units_20ft: 1000
} as Partial<CallInput>;
const callWith = (extra: Partial<CallInput>) => ({ ...(defaultCall('gothenburg') as CallInput), ...extra }) as CallInput;
const engineOps = (id: string, call: CallInput) =>
  calculatePortCallCost(portOf(id), {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(id) as unknown as CallInput), ...call, port_id: id } as CallInput
  }).ops_speculative;
const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

let container: HTMLElement | null = null;
let root: Root | null = null;
const render = async (call: CallInput, mobile: boolean) => {
  __setMobileQueryForTests(() => mobile);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ComparisonView ports={LOADED_PORTS} vessel={DEFAULT_VESSEL} call={call} selectedPortIds={SELECTED} activeVessel="TEST" />
    );
  });
};
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
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('comparison OPS segment - desktop (spec v0.9.1)', () => {
  it('granularity: one row per engine line, in the engine\'s own line order, and no merged OPS row remains', async () => {
    const call = callWith(ENTERED);
    await render(call, false);
    expect(container!.querySelector('.comparison-ops-row')).toBeNull();
    const ids = new Set<string>();
    for (const id of SELECTED) for (const l of engineOps(id, call)?.lines ?? []) ids.add(l.id);
    const rows = Array.from(container!.querySelectorAll('[data-testid^="comparison-ops-line-"]'))
      .map(r => r.getAttribute('data-testid')!.replace('comparison-ops-line-', ''));
    expect(rows.length).toBe(ids.size);
    expect(new Set(rows)).toEqual(ids);
    const engineOrder = ['ops_spec_electricity', 'ops_spec_demand', 'ops_spec_connection', 'ops_spec_per_gt', 'ops_spec_unit_20ft', 'ops_spec_unit_40ft'];
    expect(rows).toEqual(engineOrder.filter(i => ids.has(i)));
  });
  it('placement: the segment follows every stage row and precedes Discounts received; it is not inside the at-berth block', async () => {
    await render(callWith(ENTERED), false);
    const header = container!.querySelector('[data-testid="comparison-ops-segment"]')!;
    expect(header).not.toBeNull();
    const stageRows = Array.from(container!.querySelectorAll('.comparison-stage-row'));
    expect(stageRows.length).toBeGreaterThan(0);
    for (const s of stageRows) expect(follows(s, header)).toBe(true);
    // every stage-owned row (charge-type, family, container-through) precedes the segment
    const stageOwned = Array.from(container!.querySelectorAll('.comparison-chargetype-row, .comparison-family-row'));
    for (const r of stageOwned) expect(follows(r, header)).toBe(true);
    const discounts = container!.querySelector('.comparison-discount-row')!;
    expect(follows(header, discounts)).toBe(true);
    const lastLine = Array.from(container!.querySelectorAll('.comparison-ops-line-row')).pop()!;
    expect(follows(lastLine, discounts)).toBe(true);
    expect(header.classList.contains('comparison-stage-row')).toBe(false);
    // no OPS segment row sits between the at-berth stage row and the next stage row
    const atBerth = stageRows.find(r => (r.textContent ?? '').toLowerCase().includes('at the berth'))!;
    expect(atBerth).toBeDefined();
    const next = stageRows[stageRows.indexOf(atBerth) + 1];
    let node = atBerth.nextElementSibling;
    while (node && node !== next && node !== discounts) {
      expect(node.matches('.comparison-ops-segment-row, .comparison-ops-line-row')).toBe(false);
      node = node.nextElementSibling;
    }
  });
  it('header cells carry each port\'s OPS subtotal - the engine\'s own amount - and blank cells render nothing for a port without OPS', async () => {
    const call = callWith(ENTERED);
    await render(call, false);
    const header = container!.querySelector('[data-testid="comparison-ops-segment"]')!;
    expect(header.textContent).toContain('OPS (user-specified, not tariff-derived) — included in the Grand Total');
    const cells = Array.from(header.querySelectorAll('td')).slice(1);
    const cols = Array.from(container!.querySelectorAll('thead th')).slice(1).map(h => h.textContent ?? '');
    expect(cells.length).toBe(SELECTED.length);
    cells.forEach((cell, i) => {
      const id = SELECTED.find(sid => cols[i].toLowerCase().includes(sid))!;
      const ops = engineOps(id, call);
      expect(cell.textContent).toBe(ops ? fmt(ops.amount, portOf(id).metadata.currency) : '');
    });
  });
  it('line rows carry each port\'s own amount and the engine\'s own basis string; a port without the line renders an empty cell', async () => {
    const call = callWith(ENTERED);
    await render(call, false);
    const cols = Array.from(container!.querySelectorAll('thead th')).slice(1).map(h => (h.textContent ?? '').toLowerCase());
    for (const row of Array.from(container!.querySelectorAll('.comparison-ops-line-row'))) {
      const lineId = row.getAttribute('data-testid')!.replace('comparison-ops-line-', '');
      const cells = Array.from(row.querySelectorAll('td')).slice(1);
      cells.forEach((cell, i) => {
        const id = SELECTED.find(sid => cols[i].includes(sid))!;
        const line = engineOps(id, call)?.lines.find(l => l.id === lineId);
        if (line) {
          expect(cell.textContent).toContain(fmt(line.amount, portOf(id).metadata.currency));
          expect(cell.textContent).toContain(line.basis);
        } else {
          expect(cell.textContent).toBe('');
        }
      });
    }
  });
  it('blank OPS renders no segment at all', async () => {
    await render(callWith({}), false);
    expect(container!.querySelector('[data-testid="comparison-ops-segment"]')).toBeNull();
    expect(container!.querySelector('.comparison-ops-line-row')).toBeNull();
  });
  it('the Grand Total is unchanged by the redesign: it still includes the OPS subtotal', async () => {
    const call = callWith(ENTERED);
    await render(call, false);
    const gotTotal = calculatePortCallCost(portOf('gothenburg'), {
      vessel: DEFAULT_VESSEL,
      call: { ...(defaultCall('gothenburg') as unknown as CallInput), ...call, port_id: 'gothenburg' } as CallInput
    }).total;
    const totalRow = Array.from(container!.querySelectorAll('.comparison-total-row')).find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(totalRow.textContent).toContain(fmt(gotTotal, 'SEK'));
  });
});

describe('comparison OPS segment - mobile card (spec v0.9.1)', () => {
  it('each card with OPS values carries the segment header with the subtotal and one row per its own line, after all stage segments and before Discounts', async () => {
    const call = callWith(ENTERED);
    await render(call, true);
    const cards = Array.from(container!.querySelectorAll('.comparison-port-card'));
    expect(cards.length).toBe(SELECTED.length);
    expect(container!.querySelector('.comparison-card-ops')).toBeNull();
    for (const card of cards) {
      const header = card.querySelector('[data-testid="comparison-card-ops-segment"]');
      const name = (card.textContent ?? '').toLowerCase();
      const id = SELECTED.find(sid => name.includes(sid))!;
      const ops = engineOps(id, call);
      if (!ops) { expect(header).toBeNull(); continue; }
      expect(header).not.toBeNull();
      expect(header!.textContent).toContain(fmt(ops.amount, portOf(id).metadata.currency));
      const lineEls = Array.from(card.querySelectorAll('.comparison-card-ops-line'));
      expect(lineEls.map(e => e.getAttribute('data-testid')!.replace('comparison-card-ops-line-', ''))).toEqual(ops.lines.map(l => l.id));
      lineEls.forEach((el, i) => {
        expect(el.textContent).toContain(fmt(ops.lines[i].amount, portOf(id).metadata.currency));
        expect(el.textContent).toContain(ops.lines[i].basis);
      });
      for (const s of Array.from(card.querySelectorAll('.comparison-card-segment'))) expect(follows(s, header!)).toBe(true);
      expect(follows(header!, card.querySelector('.comparison-card-discount')!)).toBe(true);
    }
  });
  it('blank OPS renders no segment on any card', async () => {
    await render(callWith({}), true);
    expect(container!.querySelector('.comparison-card-ops-segment')).toBeNull();
  });
});

describe('comparison OPS segment - print (spec v0.9.1)', () => {
  const printedSegment = async () => {
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const headers = Array.from(document.body.querySelectorAll('[data-testid^="print-ops-segment-"]')).filter(h => !container!.contains(h));
    const result = headers.map(h => {
      const table = h.closest('table')!;
      return {
        text: h.textContent ?? '',
        lines: Array.from(table.querySelectorAll('.print-ops-line-row')).map(r => r.textContent ?? ''),
        beforeTotal: follows(h, table.querySelector('.comparison-total-row')!)
      };
    });
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    return result;
  };
  it('entered values print the segment before the Grand Total: header subtotals, per-line amounts and basis strings', async () => {
    const call = callWith(ENTERED);
    await render(call, false);
    const printed = await printedSegment();
    expect(printed.length).toBeGreaterThan(0);
    const all = printed.map(p => p.text + p.lines.join('')).join('');
    for (const id of SELECTED) {
      const ops = engineOps(id, call);
      if (!ops) continue;
      expect(all).toContain(fmt(ops.amount, portOf(id).metadata.currency));
      for (const l of ops.lines) expect(all).toContain(l.basis);
    }
    for (const p of printed) expect(p.beforeTotal).toBe(true);
  });
  it('blank prints nothing', async () => {
    await render(callWith({}), false);
    expect(await printedSegment()).toEqual([]);
  });
});
