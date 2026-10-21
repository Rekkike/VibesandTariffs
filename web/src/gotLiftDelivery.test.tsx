// GOT lift and delivery user inputs (spec v0.11.0, user ruling 2026-10-21):
// two Gothenburg call inputs, "Cost per lift" (SEK per unit per move) and
// "Delivery" (SEK per unit, the container-through landside leg), blank by
// default and fail-closed. The lift prices on the call's moves as its own
// line in the terminal handling stage; the Delivery fires only with the
// container-through toggle ON. Both are user-specified call parameters, not
// estimated parameters: the entered values are stated in the context strip,
// the mobile cards carry the same line, and the paper header states them.
// The published rates (1,029 and 453 SEK) stay recorded in the extraction
// reference, never encoded.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace, ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { containerThroughParts } from './handlingBasis';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const CALL = defaultCall('gothenburg') as CallInput;
const SELECTED = ['gothenburg', 'gavle', 'aarhus'];
const fmt = (amount: number, currency: string) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

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
const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const fieldByLabel = (label: string): HTMLInputElement | null => {
  const target = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').includes(label));
  const forId = target?.getAttribute('for');
  if (!forId) return null;
  return container!.querySelector(`[id="${forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}"]`) as HTMLInputElement | null;
};
const settle = async (ms = 650) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };

let currentCall: CallInput = CALL;
const mountWorkspace = async (portId: string) => {
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf(portId)}
        vessel={DEFAULT_VESSEL}
        call={currentCall}
        onVesselChange={() => {}}
        onCallChange={(c) => { currentCall = c; }}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};
const renderWorkspace = async (portId: string) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  currentCall = defaultCall(portId) as CallInput;
  await mountWorkspace(portId);
};
const enter = async (portId: string, label: string, value: string) => {
  const input = fieldByLabel(label);
  expect(input).not.toBeNull();
  await act(async () => { setInputValue(input!, value); });
  await mountWorkspace(portId);
};

describe('GOT lift and delivery inputs - the workspace (spec v0.11.0)', () => {
  it('Cost per lift and Delivery render blank at Gothenburg and do not exist at Aarhus', async () => {
    await renderWorkspace('gothenburg');
    for (const label of ['Cost per lift', 'Delivery']) {
      const input = fieldByLabel(label);
      expect(input).not.toBeNull();
      expect(input!.value).toBe('');
    }
    expect(container!.textContent).toContain('Terminal handling inputs (user-specified, not tariff rates)');
    // the hints are suggestions: the recorded rates appear as text, never as a value
    expect(fieldByLabel('Cost per lift')!.value).toBe('');
    expect(container!.textContent).toContain('never a prefill');
    expect(container!.textContent).toContain('Gothenburg extraction reference section 8');
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;
    await renderWorkspace('aarhus');
    expect(fieldByLabel('Cost per lift')).toBeNull();
    expect(fieldByLabel('Delivery')).toBeNull();
  });
  it('blank: the strip total is the blank total 3 275 851 and there is no lift line', async () => {
    await renderWorkspace('gothenburg');
    expect(container!.textContent).toContain('3 275 851');
    expect(container!.querySelector('[id="fee-derivation-apm_terminals_lift"]')).toBeNull();
  });
  it('an entered Cost per lift of 1,029 prices the lift on the moves: total 7 391 851 and a user-specified line (no est. badge)', async () => {
    await renderWorkspace('gothenburg');
    await enter('gothenburg', 'Cost per lift', '1029');
    expect(currentCall.got_lift_cost).toBe(1029);
    expect(container!.textContent).toContain('7 391 851');
    expect(container!.textContent).toContain('Terminal Handling - Lift (user-specified)');
    const line = container!.querySelector('[id="fee-derivation-apm_terminals_lift"]');
    expect(line).not.toBeNull();
  });
  it('a negative entry is fail-closed: the field names the defect and the total stays at the blank total', async () => {
    await renderWorkspace('gothenburg');
    await enter('gothenburg', 'Cost per lift', '-5');
    expect(container!.textContent).toContain('Cost per lift must not be negative');
    expect(container!.textContent).toContain('3 275 851');
    expect(container!.textContent).not.toContain('7 391 851');
  });
});

describe('GOT lift and delivery inputs - the comparison and the paper (spec v0.11.0)', () => {
  const renderComparison = async (extra: Partial<CallInput>, overrides?: Record<string, Record<string, unknown>>, mobile = false) => {
    __setMobileQueryForTests(() => mobile);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...CALL, ...extra } as CallInput}
          perPortCallOverrides={overrides}
          selectedPortIds={SELECTED}
          activeVessel="TEST"
        />
      );
    });
  };
  const gotTotal = () => {
    const row = container!.querySelector('.comparison-total-row')!;
    return Array.from(row.querySelectorAll('.comparison-figure')).map(e => e.textContent ?? '');
  };
  const printed = async (testid: string) => {
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const header = Array.from(document.body.querySelectorAll(`[data-testid="${testid}"]`)).filter(h => !container!.contains(h)).map(h => h.textContent ?? '');
    const totals = Array.from(document.body.querySelectorAll('tr.comparison-total-row')).filter(r => !container!.contains(r))
      .flatMap(r => Array.from(r.querySelectorAll('.comparison-figure')).map(e => e.textContent ?? ''));
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    return { header, totals };
  };

  it('blank: no lift or delivery item on the strip, and the Gothenburg total is the blank total', async () => {
    await renderComparison({});
    expect(container!.querySelector('[data-testid="comparison-context-user-got_lift_cost"]')).toBeNull();
    expect(container!.querySelector('[data-testid="comparison-context-user-got_delivery_cost"]')).toBeNull();
    expect(gotTotal().join('|')).toContain(fmt(3275851.15, 'SEK'));
  });
  it('entered: the strip states both values as user-specified call parameters, and the total follows the lift', async () => {
    await renderComparison({}, { gothenburg: { got_lift_cost: 1029, got_delivery_cost: 453 } });
    const lift = container!.querySelector('[data-testid="comparison-context-user-got_lift_cost"]')!.textContent ?? '';
    const delivery = container!.querySelector('[data-testid="comparison-context-user-got_delivery_cost"]')!.textContent ?? '';
    expect(lift).toContain('Gothenburg Cost per lift:');
    expect(lift).toContain('1,029 SEK per unit per move (entered, user-specified)');
    expect(delivery).toContain('453 SEK per unit (entered, user-specified)');
    expect(gotTotal().join('|')).toContain(fmt(7391851.15, 'SEK'));
    // a user-specified call parameter, not an estimate: no est. wording on the items
    expect(lift).not.toContain('est.');
  });
  it('invalid: the strip names the defect, nothing is applied, the total is the blank total', async () => {
    await renderComparison({}, { gothenburg: { got_lift_cost: -5 } });
    const item = container!.querySelector('[data-testid="comparison-context-user-got_lift_cost"]')!.textContent ?? '';
    expect(item).toContain('not applied');
    expect(item).toContain('must not be negative');
    expect(gotTotal().join('|')).toContain(fmt(3275851.15, 'SEK'));
  });
  it('mobile card: the Gothenburg card carries the same total, and the strip carries the same disclosure', async () => {
    await renderComparison({}, { gothenburg: { got_lift_cost: 1029 } }, true);
    const cards = Array.from(container!.querySelectorAll('.comparison-port-card'));
    const got = cards.find(c => (c.textContent ?? '').includes('Gothenburg'))!;
    expect(got).toBeDefined();
    expect(got.querySelector('.comparison-card-total')!.textContent).toContain('7 391 851');
    expect(container!.querySelector('[data-testid="comparison-context-user-got_lift_cost"]')).not.toBeNull();
  });
  it('paper: the entered values print in the header as call parameters and the printed Grand Total follows; blank prints nothing; invalid prints not applied', async () => {
    await renderComparison({}, { gothenburg: { got_lift_cost: 1029, got_delivery_cost: 453 } });
    const lift = await printed('print-header-user-got_lift_cost');
    expect(lift.header[0]).toContain('Gothenburg Cost per lift: 1,029 SEK per unit per move (entered, user-specified)');
    expect(lift.totals).toContain(fmt(7391851.15, 'SEK'));
    await act(async () => { root!.unmount(); });
    container!.remove();
    await renderComparison({});
    expect((await printed('print-header-user-got_lift_cost')).header).toEqual([]);
    await act(async () => { root!.unmount(); });
    container!.remove();
    await renderComparison({}, { gothenburg: { got_lift_cost: -5 } });
    expect((await printed('print-header-user-got_lift_cost')).header[0]).toContain('not applied');
  });
  it('the container-through cell: blank reads "not entered", an entered Delivery adds the leg, an invalid one reads "not applied"', async () => {
    const part = (v: unknown) => containerThroughParts('gothenburg', 'truck', 1600, 2400, v);
    expect(part(undefined).status).toBe('not_entered');
    expect(part(453).addedAmount).toBe(1812000);
    expect(part('abc').status).toBe('invalid');
  });
});

describe('GOT lift and delivery inputs - recorded, not encoded (spec v0.11.0)', () => {
  it('the handling-basis code carries no encoded 453 or 1,029 rate; the silo carries no lift rule', () => {
    const src = fs.readFileSync(path.join(__dirname, 'handlingBasis.ts'), 'utf8');
    const gothenburgCase = src.slice(src.indexOf("case 'gothenburg':"), src.indexOf("case 'rotterdam':"));
    expect(gothenburgCase).not.toMatch(/\b453\b/);
    expect(gothenburgCase).not.toMatch(/1,?029/);
    expect(portOf('gothenburg').fee_rules.map(r => r.id)).not.toContain('apm_terminals_lift');
    const engineLine = calculatePortCallCost(portOf('gothenburg'), { vessel: DEFAULT_VESSEL, call: { ...CALL, got_lift_cost: 1029 } as CallInput })
      .billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'apm_terminals_lift');
    expect(engineLine!.amount).toBe(4116000);
  });
});
