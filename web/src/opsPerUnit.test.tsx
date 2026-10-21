// Gothenburg OPS per-unit charges (spec v0.9.0, user commission
// 2026-10-21): the four inputs in the Gothenburg OPS card (two user-specified
// amounts, two overridable basis counts), the lines on the comparison OPS row,
// and the Grand Total on screen and on paper. Blank renders nothing.
//
// Red proofs of record (build copy): a forced default amount turns the blank
// pins red; a forced all-units basis that ignores the non-empty counts turns
// the reduced-basis pins red.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { ComparisonView } from './comparisonView';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOT = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAM = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const CALL = defaultCall('gothenburg') as CallInput;
const H20 = (CALL.containers_loaded_le20ft || 0) + (CALL.containers_discharged_le20ft || 0);
const H40 = (CALL.containers_loaded_gt20ft || 0) + (CALL.containers_discharged_gt20ft || 0);

const L20 = 'OPS charge per non-empty 20 ft unit';
const L40 = 'OPS charge per non-empty 40 ft unit';
const N20 = 'Non-empty 20 ft units';
const N40 = 'Non-empty 40 ft units';

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
let currentPort: PortDefinition = GOT;
let currentCall: CallInput = CALL;
// The workspace is controlled by its parent: the parent keeps the call the
// workspace reports and re-renders it, as the app does.
const mount = async () => {
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={currentPort}
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
const renderWorkspace = async (port: PortDefinition) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  currentPort = port;
  currentCall = defaultCall(port.metadata.id) as CallInput;
  await mount();
};
const enter = async (label: string, value: string) => {
  const input = fieldByLabel(label);
  expect(input).not.toBeNull();
  await act(async () => { setInputValue(input!, value); });
  await mount();
};

describe('Gothenburg OPS per-unit inputs (spec v0.9.0) - the workspace card', () => {
  it('the four inputs render at Gothenburg and are blank by default (no default amount, no default count)', async () => {
    await renderWorkspace(GOT);
    for (const label of [L20, L40, N20, N40]) {
      const input = fieldByLabel(label);
      expect(input).not.toBeNull();
      expect(input!.value).toBe('');
    }
    expect(container!.textContent ?? '').not.toContain('OPS charge per non-empty 20 ft unit (user-specified)');
  });
  it('the four inputs do not render at a port without the descriptor (Hamburg)', async () => {
    await renderWorkspace(HAM);
    for (const label of [L20, L40, N20, N40]) expect(fieldByLabel(label)).toBeNull();
  });
  it('entered amounts with the default basis: the OPS block lists one line per size at rate x handled units, labeled user-specified', async () => {
    await renderWorkspace(GOT);
    await enter(L20, '10');
    await enter(L40, '20');
    const text = container!.textContent ?? '';
    expect(text).toContain('OPS charge per non-empty 20 ft unit (user-specified)');
    expect(text).toContain('OPS charge per non-empty 40 ft unit (user-specified)');
    expect(text).toContain(`${H20.toLocaleString('en-US')} non-empty 20 ft units`);
    expect(text).toContain(`${H40.toLocaleString('en-US')} non-empty 40 ft units`);
  });
  it('a reduced basis (the empties case): the entered non-empty counts replace the handled counts in the line arithmetic', async () => {
    await renderWorkspace(GOT);
    await enter(L20, '10');
    await enter(N20, '1000');
    const text = container!.textContent ?? '';
    expect(text).toContain('1,000 non-empty 20 ft units');
    expect(text).not.toContain(`${H20.toLocaleString('en-US')} non-empty 20 ft units`);
  });
});

describe('Gothenburg OPS per-unit charges (spec v0.9.0) - the comparison and the paper', () => {
  const fmt = (amount: number) =>
    new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  const engineTotal = (extra: Partial<CallInput>) =>
    calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: { ...CALL, ...extra, port_id: 'gothenburg' } as CallInput }).total;
  const renderComparison = async (extra: Partial<CallInput>) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...CALL, ...extra } as CallInput}
          selectedPortIds={['gothenburg', 'hamburg']}
          activeVessel="TEST"
        />
      );
    });
  };
  const screenTotals = () =>
    Array.from(container!.querySelectorAll('.comparison-total-row .comparison-figure')).map(e => e.textContent ?? '');
  const printedTotals = () =>
    Array.from(document.body.querySelectorAll('tr.comparison-total-row'))
      .filter(r => !container!.contains(r))
      .flatMap(r => Array.from(r.querySelectorAll('.comparison-figure')).map(e => e.textContent ?? ''));

  it('blank: the comparison carries no per-unit text and the Gothenburg Grand Total is the baseline engine total', async () => {
    await renderComparison({});
    expect(container!.textContent ?? '').not.toContain('non-empty 20 ft unit');
    expect(screenTotals()).toContain(fmt(engineTotal({})));
  });
  it('entered amounts: the comparison OPS row names both lines, and the Grand Total moves by exactly rate x units, on screen and on paper', async () => {
    const extra = { ops_unit_charge_20ft: 10, ops_unit_charge_40ft: 20, ops_nonempty_units_20ft: 1000 } as Partial<CallInput>;
    await renderComparison(extra);
    const text = container!.textContent ?? '';
    expect(text).toContain('OPS charge per non-empty 20 ft unit (user-specified)');
    expect(text).toContain('OPS charge per non-empty 40 ft unit (user-specified)');
    const expectedTotal = engineTotal(extra);
    expect(expectedTotal).toBeCloseTo(engineTotal({}) + 10 * 1000 + 20 * H40, 2);
    expect(screenTotals()).toContain(fmt(expectedTotal));
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const printed = printedTotals();
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(printed).toContain(fmt(expectedTotal));
  });
});
