// Aarhus user-specified per-GT OPS inputs with minimum and maximum bounds
// (spec v0.9.1, user ruling 2026-10-21): three boxes in the Aarhus OPS card,
// all blank by default and user-overridable; configuration and machinery
// only - no figures anywhere. Descriptor-gated: ports whose descriptor does
// not declare bounds render no bound boxes.
//
// Red proof of record (build copy): per_gt.enabled reverted to false at
// Aarhus turns the presence pins red.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { DEFAULT_VESSEL, defaultCall, portResetFields, opsComponentsForPort } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

// Timing margin (v0.10.0): the workspace renders slower with the added shared
// inputs; the multi-step entries need more than jest's 5 s default.
jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const RATE = 'OPS additional per-GT charge';
const MIN = 'OPS per-GT minimum';
const MAX = 'OPS per-GT maximum';

let container: HTMLElement | null = null;
let root: Root | null = null;
let currentPort: PortDefinition = portOf('aarhus');
let currentCall: CallInput = defaultCall('aarhus') as CallInput;
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
const renderWorkspace = async (id: string) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  currentPort = portOf(id);
  currentCall = defaultCall(id) as CallInput;
  await mount();
};
const enter = async (label: string, value: string) => {
  const input = fieldByLabel(label);
  expect(input).not.toBeNull();
  await act(async () => { setInputValue(input!, value); });
  await mount();
};

describe('Aarhus per-GT OPS inputs (spec v0.9.1)', () => {
  it('the three boxes - rate, minimum, maximum - render at Aarhus and are blank by default; the other OPS boxes remain blank', async () => {
    await renderWorkspace('aarhus');
    for (const label of [RATE, MIN, MAX, 'OPS electricity price', 'OPS demand charge', 'OPS service/connection charge']) {
      const input = fieldByLabel(label);
      expect(input).not.toBeNull();
      expect(input!.value).toBe('');
    }
    expect(container!.textContent ?? '').not.toContain('OPS (user-specified, not tariff-derived)');
  });
  it('the bound boxes are descriptor-gated: Gothenburg offers the rate but no bound boxes; Hamburg offers neither', async () => {
    await renderWorkspace('gothenburg');
    expect(fieldByLabel(RATE)).not.toBeNull();
    expect(fieldByLabel(MIN)).toBeNull();
    expect(fieldByLabel(MAX)).toBeNull();
    await act(async () => { root!.unmount(); });
    container!.remove();
    await renderWorkspace('hamburg');
    expect(fieldByLabel(RATE)).toBeNull();
    expect(fieldByLabel(MIN)).toBeNull();
  });
  it('the descriptor and the reset fields are declared for Aarhus', () => {
    expect(opsComponentsForPort('aarhus').per_gt).toEqual({ enabled: true, currency: 'DKK', unit: 'DKK/GT', bounds: true });
    const reset = portResetFields('aarhus');
    for (const f of ['ops_per_gt_charge', 'ops_per_gt_min', 'ops_per_gt_max']) expect(reset).toContain(f);
  });
  it('an entered rate with an entered minimum prices the bounded line in the workspace OPS block; clearing the rate removes it', async () => {
    await renderWorkspace('aarhus');
    await enter(RATE, '0.5');
    await enter(MIN, String(DEFAULT_VESSEL.gt * 2));
    let text = container!.textContent ?? '';
    expect(text).toContain('OPS per-GT charge (user-specified)');
    expect(text).toContain('minimum');
    expect(text).toContain('applied');
    await enter(RATE, '');
    text = container!.textContent ?? '';
    expect(text).not.toContain('OPS per-GT charge (user-specified)');
  });
});
