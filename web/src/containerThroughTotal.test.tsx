// Container-through Grand Total reversal (spec v0.9.0, user ruling
// 2026-10-21). The v0.4.2 presentation-only contract is superseded: with the
// comparison's container-through toggle ON, each port's published landside
// leg is added to that port's Grand Total at the view/model layer (the
// engine is never fed), the ranked order follows the through totals, and the
// per-GT annotation and the printed Grand Total follow. OFF is byte-identical
// to the pre-reversal state.
//
// Every expected figure is read from the actual view model (computePortResults
// with and without the mode) and from containerThroughParts - never from a
// hardcoded constant.
//
// Red proofs of record (build copy): reverting computePortResults to the
// non-adding shape turns the ON-total, ranking and print pins red; forcing
// the OFF wiring under toggle ON turns the rendered-total pins red.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView } from './comparisonView';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { computePortResults } from './comparisonModel';
import { containerThroughParts } from './handlingBasis';
import { rankOrderByConvertedBasis, resolveExchangeRate } from './conversion';
import { comparisonBasisContext } from './portRegistry';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const DATA_RATE = ((portsRegistry as any).exchange_rates ?? []).find(
  (r: any) => r.from_currency === 'EUR' && r.to_currency === 'SEK'
);
const RATE_INFO = resolveExchangeRate('', { rate: DATA_RATE.rate, date: DATA_RATE.as_of, source: DATA_RATE.source });
const CALL = defaultCall('gothenburg') as CallInput;
const UNITS_LE = (CALL.containers_loaded_le20ft || 0) + (CALL.containers_discharged_le20ft || 0);
const UNITS_GT = (CALL.containers_loaded_gt20ft || 0) + (CALL.containers_discharged_gt20ft || 0);

// Printed columns follow the selection order (pages of three ports), as they
// always did; the printed Grand Total, not the column order, carries the leg.
const run = (mode?: 'truck' | 'rail') =>
  computePortResults(LOADED_PORTS, DEFAULT_VESSEL, CALL, RATE_INFO, comparisonBasisContext, undefined, mode);
const totalOf = (rows: ReturnType<typeof run>, id: string) => rows.find(r => r.port.metadata.id === id)!.result!.total;

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

const renderView = async (printRequest = 0) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={DEFAULT_VESSEL}
        call={CALL}
        selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
        activeVessel="TEST"
        printRequest={printRequest}
      />
    );
  });
};
const totalRowFigures = () =>
  Array.from(document.body.querySelectorAll('.container .comparison-total-row .comparison-figure')).map(e => e.textContent ?? '');
const clickToggle = async () => {
  const checkbox = container!.querySelector('[data-testid="container-through-checkbox"]') as HTMLInputElement;
  await act(async () => { checkbox.click(); });
};

describe('container-through Grand Total reversal (spec v0.9.0) - the model', () => {
  for (const mode of ['truck', 'rail'] as const) {
    it(`ON (${mode}): every port's Grand Total is its OFF total plus its own published leg; total-without-estimates moves by the same leg; the estimated subtotal is unchanged`, () => {
      const off = run();
      const on = run(mode);
      for (const { port, result } of off) {
        const id = port.metadata.id;
        const part = containerThroughParts(id, mode, UNITS_LE, UNITS_GT);
        const leg = part.addedAmount ?? 0;
        const onResult = on.find(r => r.port.metadata.id === id)!.result!;
        expect(onResult.total).toBeCloseTo(result!.total + leg, 2);
        expect(onResult.total_without_estimates).toBeCloseTo(result!.total_without_estimates + leg, 2);
        expect(onResult.total_estimated_parameters).toBe(result!.total_estimated_parameters);
      }
    });
  }
  it('Gothenburg ON = the engine total plus the 453 SEK leg on every handled unit, in either mode, read from the view model', () => {
    const engine = calculatePortCallCost(LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!, {
      vessel: DEFAULT_VESSEL,
      call: { ...(defaultCall('gothenburg') as CallInput), ...CALL, port_id: 'gothenburg' } as CallInput
    }).total;
    for (const mode of ['truck', 'rail'] as const) {
      const leg = containerThroughParts('gothenburg', mode, UNITS_LE, UNITS_GT).addedAmount!;
      expect(leg).toBe(453 * (UNITS_LE + UNITS_GT));
      expect(totalOf(run(mode), 'gothenburg')).toBeCloseTo(engine + leg, 2);
    }
  });
  it('ports with no published leg (Gävle bundled, Rotterdam, Norvik truck) are untouched by ON', () => {
    const off = run();
    const on = run('truck');
    expect(totalOf(on, 'gavle')).toBe(totalOf(off, 'gavle'));
    expect(totalOf(on, 'rotterdam')).toBe(totalOf(off, 'rotterdam'));
    expect(totalOf(on, 'norvik')).toBe(totalOf(off, 'norvik'));
    // and Norvik rail does add its published 1,300 kr leg
    expect(totalOf(run('rail'), 'norvik')).toBeCloseTo(totalOf(off, 'norvik') + 1300 * (UNITS_LE + UNITS_GT), 2);
  });
  it('OFF is the engine result byte for byte: no mode, no movement (the OFF byte-identity pin)', () => {
    for (const { port, result } of run()) {
      const merged = { ...(defaultCall(port.metadata.id) as unknown as Record<string, unknown>), ...CALL, port_id: port.metadata.id };
      const direct = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged as unknown as CallInput });
      expect(result!.total).toBe(direct.total);
      expect(result!.total_without_estimates).toBe(direct.total_without_estimates);
      expect(result!.total_estimated_parameters).toBe(direct.total_estimated_parameters);
    }
  });
  it('the ranked order follows the through totals (all ports), and the OFF order follows the OFF totals', () => {
    for (const mode of [undefined, 'truck', 'rail'] as const) {
      const rows = run(mode);
      const expected = rankOrderByConvertedBasis(
        rows.map(r => ({ portId: r.port.metadata.id, amount: r.result!.total, currency: r.result!.currency })),
        RATE_INFO,
        comparisonBasisContext
      ).map(e => e.portId);
      expect(rows.map(r => r.port.metadata.id)).toEqual(expected);
    }
  });
});

describe('container-through Grand Total reversal (spec v0.9.0) - the rendered view', () => {
  it('OFF -> ON -> OFF: the rendered Grand Total row is byte-identical before and after, and differs while ON', async () => {
    await renderView();
    const before = totalRowFigures();
    expect(before.length).toBeGreaterThan(0);
    await clickToggle();
    const during = totalRowFigures();
    expect(during).not.toEqual(before);
    await clickToggle();
    expect(totalRowFigures()).toEqual(before);
  });
  it('ON: the rendered Grand Total figures are the model\'s through totals, in the model\'s ranked column order', async () => {
    await renderView();
    await clickToggle();
    const rows = run('truck');
    const fmt = (amount: number, currency: string) =>
      new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    const expected = rows.map(r => fmt(r.result!.total, r.result!.currency));
    const rendered = totalRowFigures().filter(t => expected.includes(t));
    expect(rendered).toEqual(expected);
  });
  it('the disclosure states that the published legs are included in the Grand Total when ON', async () => {
    await renderView();
    await clickToggle();
    const text = container!.querySelector('[data-testid="container-through-disclosure"]')!.textContent ?? '';
    expect(text).toContain('included in its Grand Total');
    expect(container!.querySelector('[data-testid="container-through-toggle-block"]')!.textContent).toContain('to the Grand Total');
  });
});

describe('container-through Grand Total reversal (spec v0.9.0) - print', () => {
  const fmt = (amount: number, currency: string) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  const selectionOrder = (rows: ReturnType<typeof run>) =>
    LOADED_PORTS.map(p => {
      const r = rows.find(x => x.port.metadata.id === p.metadata.id)!.result!;
      return fmt(r.total, r.currency);
    });
  const printedGrandTotals = () => {
    const rows = Array.from(document.body.querySelectorAll('tr.comparison-total-row'));
    // the print portal lives outside .container; take the rows that are not inside the screen container
    return rows.filter(r => !container!.contains(r)).flatMap(r => Array.from(r.querySelectorAll('.comparison-figure')).map(e => e.textContent ?? ''));
  };

  const printThroughDialog = async (dialogOn: boolean, screenOn: boolean) => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    try {
      await renderView();
      if (screenOn) await clickToggle();
      await act(async () => {
        root!.render(
          <ComparisonView
            ports={LOADED_PORTS}
            vessel={DEFAULT_VESSEL}
            call={CALL}
            selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
            activeVessel="TEST"
            printRequest={1}
          />
        );
      });
      const dialog = container!.querySelector('[data-testid="print-dialog"]')!;
      const box = dialog.querySelector('[data-testid="print-dialog-container-through"]') as HTMLInputElement;
      if (box.checked !== dialogOn) {
        await act(async () => { box.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      }
      await act(async () => {
        (dialog.querySelector('[data-testid="print-dialog-print"]') as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
      const totals = printedGrandTotals();
      await act(async () => { window.dispatchEvent(new Event('afterprint')); });
      return totals;
    } finally {
      printSpy.mockRestore();
    }
  };

  it('dialog path, ON while the screen is OFF: the printed Grand Totals are the model\'s through totals', async () => {
    const totals = await printThroughDialog(true, false);
    expect(totals).toEqual(selectionOrder(run('truck')));
  });
  it('dialog path, OFF while the screen is ON: the printed Grand Totals are the OFF totals', async () => {
    const totals = await printThroughDialog(false, true);
    expect(totals).toEqual(selectionOrder(run()));
  });
  it('live-state Ctrl+P path: the paper inherits the screen toggle - ON prints through totals, OFF prints OFF totals', async () => {
    await renderView();
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const offPrinted = printedGrandTotals();
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(offPrinted).toEqual(selectionOrder(run()));
    await clickToggle();
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const onPrinted = printedGrandTotals();
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(onPrinted).toEqual(selectionOrder(run('truck')));
    expect(onPrinted).not.toEqual(offPrinted);
  });
  it('the printed per-GT annotation follows the printed total (derivations ON, through ON)', async () => {
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    try {
      await renderView();
      await clickToggle();
      const derivButton = container!.querySelector('[aria-controls="comparison-derivation-panel"]') as HTMLButtonElement;
      await act(async () => { derivButton.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
      const got = run('truck').find(r => r.port.metadata.id === 'gothenburg')!.result!;
      const printedText = Array.from(document.body.querySelectorAll('tr.comparison-total-row'))
        .filter(r => !container!.contains(r)).map(r => r.textContent ?? '').join('|');
      await act(async () => { window.dispatchEvent(new Event('afterprint')); });
      expect(printedText).toContain(`${(got.total / DEFAULT_VESSEL.gt).toFixed(2)} SEK/GT effective`);
    } finally {
      printSpy.mockRestore();
    }
  });
});
