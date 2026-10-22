// Fixed-date test baselines and the Gavle winter window disclosure (spec
// v0.11.3; user ruling 2026-10-22). The web suites anchor calendar today at
// the fixed date through setupTests (fixedClock.ts), the twin of the core
// anchor; the Gavle workspace's Date field states the winter period and its
// effect, derived from the port's own data and absent at every other port.
//
// Red proofs of record (build copy): the hint removed turns the presence pin
// red; a wrong window boundary turns the content pin red; the figure guard is
// unaffected by the hint.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { FIXED_TEST_DATE } from './fixedClock';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

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
const settle = async (ms = 650) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const renderWorkspace = async (portId: string) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf(portId)}
        vessel={DEFAULT_VESSEL}
        call={defaultCall(portId) as CallInput}
        onVesselChange={() => {}}
        onCallChange={() => {}}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};
// The helper text under the Date field.
const dateHint = (): string | null => {
  const label = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').trim() === 'Date');
  const forId = label?.getAttribute('for');
  if (!forId) return null;
  const input = container!.querySelector(`[id="${forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}"]`);
  const help = input?.closest('.MuiFormControl-root')?.querySelector('.MuiFormHelperText-root');
  return help ? (help.textContent ?? '') : null;
};

describe('fixed-date test baselines - the web anchor (spec v0.11.3)', () => {
  it('the baseline call\'s date is the fixed date, and the web twin agrees with the core anchor constant', () => {
    expect(FIXED_TEST_DATE).toBe('2026-06-15');
    expect((defaultCall('gavle') as CallInput).date).toBe(FIXED_TEST_DATE);
    expect(new Date().toISOString().split('T')[0]).toBe(FIXED_TEST_DATE);
    const core = fs.readFileSync(path.join(__dirname, '..', '..', 'core', 'test', 'fixed_clock.ts'), 'utf8');
    expect(core).toContain(`FIXED_TEST_DATE = '${FIXED_TEST_DATE}'`);
  });
});

describe('Gavle winter-window hint on the Date field (spec v0.11.3)', () => {
  it('presence and content at Gavle: the winter start and end, and the surcharge effect', async () => {
    await renderWorkspace('gavle');
    const hint = dateHint();
    expect(hint).not.toBeNull();
    expect(hint).toContain('1 December');   // winter start
    expect(hint).toContain('30 April');     // winter end
    expect(hint).toContain('winter surcharge');
    expect(hint).toContain('+100 %');
    expect(hint).toContain('hamnavgift');
    expect(hint).toContain('doubled');
    expect(hint).toContain('outside it prices the base rate');
  });
  it('absence at a port without a date window: Aarhus and Gothenburg carry no Date hint', async () => {
    for (const id of ['aarhus', 'gothenburg']) {
      await renderWorkspace(id);
      expect(dateHint()).toBeNull();
      expect(container!.textContent ?? '').not.toContain('Winter period');
      await act(async () => { root!.unmount(); });
      container!.remove();
      root = null;
    }
  });
  it('no figure changes from the hint: the blank GOT default 3,275,851.15 SEK and the Gavle default 10,306,979.35 SEK are byte-identical in the engine and on the workspace', async () => {
    const total = (id: string) =>
      calculatePortCallCost(portOf(id), { vessel: DEFAULT_VESSEL, call: defaultCall(id) as CallInput }).total;
    expect(total('gothenburg')).toBe(3275851.15);
    expect(total('gavle')).toBe(10306979.35);
    await renderWorkspace('gavle');
    expect(container!.textContent ?? '').toContain('10\u00a0306\u00a0979');
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;
    await renderWorkspace('gothenburg');
    expect(container!.textContent ?? '').toContain('3\u00a0275\u00a0851');
  });
});
