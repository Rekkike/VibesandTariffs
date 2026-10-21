// Empty/full percentage split on the surfaces (spec v0.10.0; user rulings
// 2026-10-19 and 2026-10-21): two shared call inputs beside the container
// counts, blank by default; the sum-to-100 validation names the defect and
// fails closed (no charge responds); the derived laden and empty counts per
// size are disclosed; the comparison treats the pair as one shared call
// input across all ports; paper carries the pair and the derived counts as
// call facts and every responding charge prints on its derived basis.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { ComparisonView } from './comparisonView';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, containerSplit, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const CALL = defaultCall('gothenburg') as CallInput;
const PAIR = { container_empty_pct: 30, container_full_pct: 70 } as Partial<CallInput>;
const SELECTED = ['gothenburg', 'gavle', 'aarhus'];
const engineTotal = (id: string, extra: Partial<CallInput>) =>
  calculatePortCallCost(portOf(id), {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(id) as unknown as CallInput), ...CALL, ...extra, port_id: id } as CallInput
  }).total;
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

describe('empty/full split inputs - the workspace (spec v0.10.0)', () => {
  it('the two boxes render blank by default beside the container counts, at every port, as one shared call input', async () => {
    for (const id of ['gothenburg', 'aarhus']) {
      await renderWorkspace(id);
      for (const label of ['Empty containers %', 'Full containers %']) {
        const input = fieldByLabel(label);
        expect(input).not.toBeNull();
        expect(input!.value).toBe('');
      }
      expect(container!.querySelector('[data-testid="container-split-error"]')).toBeNull();
      expect(container!.querySelector('[data-testid="container-split-derived"]')).toBeNull();
      await act(async () => { root!.unmount(); });
      container!.remove();
      root = null;
    }
  });
  it('one box alone is fail-closed: the error names the defect, no derived counts show, and the total is the blank total', async () => {
    await renderWorkspace('gothenburg');
    await enter('gothenburg', 'Empty containers %', '30');
    const err = container!.querySelector('[data-testid="container-split-error"]');
    expect(err).not.toBeNull();
    expect(err!.textContent).toContain('Enter both Empty containers % and Full containers %');
    expect(container!.querySelector('[data-testid="container-split-derived"]')).toBeNull();
    expect(container!.textContent).toContain(fmt(engineTotal('gothenburg', {}), 'SEK').replace(/ kr$/, ''));
  });
  it('a pair not summing to 100 is fail-closed and names the sum', async () => {
    await renderWorkspace('gothenburg');
    await enter('gothenburg', 'Empty containers %', '30');
    await enter('gothenburg', 'Full containers %', '60');
    const err = container!.querySelector('[data-testid="container-split-error"]');
    expect(err!.textContent).toContain('sum to exactly 100 (entered 30 + 60 = 90)');
    expect(container!.querySelector('[data-testid="container-split-derived"]')).toBeNull();
  });
  it('a valid pair discloses the derived laden and empty counts per size and moves the total to the engine\'s split total', async () => {
    await renderWorkspace('gothenburg');
    await enter('gothenburg', 'Empty containers %', '30');
    await enter('gothenburg', 'Full containers %', '70');
    expect(container!.querySelector('[data-testid="container-split-error"]')).toBeNull();
    const split = containerSplit(currentCall);
    const disclosure = container!.querySelector('[data-testid="container-split-derived"]')!.textContent ?? '';
    expect(disclosure).toContain('round-half-up');
    expect(disclosure).toContain(`20 ft — ${split.le20.laden.toLocaleString('en-US')} full, ${split.le20.empty.toLocaleString('en-US')} empty of ${split.le20.handled.toLocaleString('en-US')} handled`);
    expect(disclosure).toContain(`40 ft — ${split.gt20.laden.toLocaleString('en-US')} full, ${split.gt20.empty.toLocaleString('en-US')} empty of ${split.gt20.handled.toLocaleString('en-US')} handled`);
    expect(engineTotal('gothenburg', PAIR)).toBeLessThan(engineTotal('gothenburg', {}));
    expect(container!.textContent).toContain(fmt(engineTotal('gothenburg', PAIR), 'SEK').replace(/ kr$/, ''));
  });
});

describe('empty/full split - the comparison and the paper (spec v0.10.0)', () => {
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
          selectedPortIds={SELECTED}
          activeVessel="TEST"
        />
      );
    });
  };
  const screenTotals = () =>
    Array.from(container!.querySelectorAll('.comparison-total-row .comparison-figure')).map(e => e.textContent ?? '');
  const printed = async () => {
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const header = Array.from(document.body.querySelectorAll('[data-testid="print-header-line-split"]')).filter(h => !container!.contains(h)).map(h => h.textContent ?? '');
    const totals = Array.from(document.body.querySelectorAll('tr.comparison-total-row')).filter(r => !container!.contains(r))
      .flatMap(r => Array.from(r.querySelectorAll('.comparison-figure')).map(e => e.textContent ?? ''));
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    return { header, totals };
  };

  it('blank pair: no split item on the strip and the totals are the blank totals at every port', async () => {
    await renderComparison({});
    expect(container!.querySelector('[data-testid="comparison-context-split"]')).toBeNull();
    for (const id of SELECTED) expect(screenTotals()).toContain(fmt(engineTotal(id, {}), portOf(id).metadata.currency));
  });
  it('valid pair: one shared call fact on the strip with the derived counts, and every port\'s Grand Total is the engine\'s split total', async () => {
    await renderComparison(PAIR);
    const item = container!.querySelector('[data-testid="comparison-context-split"]')!.textContent ?? '';
    const split = containerSplit({ ...CALL, ...PAIR });
    expect(item).toContain('30% empty / 70% full (entered)');
    expect(item).toContain(`20 ft ${split.le20.laden.toLocaleString('en-US')} full + ${split.le20.empty.toLocaleString('en-US')} empty`);
    for (const id of SELECTED) expect(screenTotals()).toContain(fmt(engineTotal(id, PAIR), portOf(id).metadata.currency));
  });
  it('invalid pair: the strip names the defect and every total stays at the blank total (fail-closed, nothing partially applied)', async () => {
    await renderComparison({ container_empty_pct: 30, container_full_pct: 60 } as Partial<CallInput>);
    expect(container!.querySelector('[data-testid="comparison-context-split"]')!.textContent).toContain('not applied');
    expect(container!.querySelector('[data-testid="comparison-context-split"]')!.textContent).toContain('sum to exactly 100');
    for (const id of SELECTED) expect(screenTotals()).toContain(fmt(engineTotal(id, {}), portOf(id).metadata.currency));
  });
  it('paper: the entered pair and the derived counts print as a call fact, and the printed Grand Totals follow the split', async () => {
    await renderComparison(PAIR);
    const p = await printed();
    expect(p.header.length).toBeGreaterThan(0);
    const split = containerSplit({ ...CALL, ...PAIR });
    expect(p.header[0]).toContain('30% empty / 70% full (entered)');
    expect(p.header[0]).toContain(`20 ft ${split.le20.laden.toLocaleString('en-US')} full + ${split.le20.empty.toLocaleString('en-US')} empty`);
    for (const id of SELECTED) expect(p.totals).toContain(fmt(engineTotal(id, PAIR), portOf(id).metadata.currency));
  });
  it('paper: blank prints no split line; an invalid pair prints that it was not applied', async () => {
    await renderComparison({});
    expect((await printed()).header).toEqual([]);
    await act(async () => { root!.unmount(); });
    container!.remove();
    await renderComparison({ container_empty_pct: 30 } as Partial<CallInput>);
    const p = await printed();
    expect(p.header[0]).toContain('not applied');
  });
});
