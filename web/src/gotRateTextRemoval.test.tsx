// GOT lift and delivery rate-text removal (spec v0.11.2; user ruling
// 2026-10-21): the recorded figures are not stated anywhere in the app. The
// two input hints keep their wording minus the parenthetical figures; the
// recorded-not-encoded doctrine is unchanged (the extraction reference
// section 8 and the specification record keep the figures). An entered value
// is the user's own figure and still discloses on the strip, the line and
// the paper exactly as before.
//
// Red proofs of record (build copy): the figures restored in either hint turn
// P1 and P2 red; the entered-value disclosure broken turns P3 red.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace, ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(60000);

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const CALL = defaultCall('gothenburg') as CallInput;

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
const settle = async (ms = 650) => { await act(async () => { await new Promise(r => setTimeout(r, ms)); }); };
const fieldByLabel = (label: string): HTMLInputElement | null => {
  const target = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').includes(label));
  const forId = target?.getAttribute('for');
  if (!forId) return null;
  return container!.querySelector(`[id="${forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1')}"]`) as HTMLInputElement | null;
};
const renderWorkspace = async (extra: Partial<CallInput> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf('gothenburg')}
        vessel={DEFAULT_VESSEL}
        call={{ ...(defaultCall('gothenburg') as CallInput), ...extra } as CallInput}
        onVesselChange={() => {}}
        onCallChange={() => {}}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};

describe('GOT lift and delivery rate-text removal (spec v0.11.2)', () => {
  it('P1: the Gothenburg workspace at the blank default, with the input block present and both fields rendered, states no 1,029 and no 453 anywhere in its text', async () => {
    await renderWorkspace();
    expect(fieldByLabel('Cost per lift')).not.toBeNull();
    expect(fieldByLabel('Delivery')).not.toBeNull();
    const text = container!.textContent ?? '';
    expect(text).toContain('Terminal handling inputs (user-specified, not tariff rates)');
    expect(text).toContain('never a prefill');
    expect(text).toContain('Gothenburg extraction reference section 8');
    for (const figure of ['1,029', '1029', '1 029', '453']) expect(text).not.toContain(figure);
  });

  it('P2: the hint map carries no occurrence of the figure strings, and the existing hint wording (never a prefill; extraction reference section 8) carries unchanged', () => {
    const src = fs.readFileSync(path.join(__dirname, 'userSpecifiedDisclosure.ts'), 'utf8');
    const start = src.indexOf('const HINTS');
    const end = src.indexOf('export const userSpecifiedHint');
    expect(start).toBeGreaterThan(-1);
    const hintMap = src.slice(start, end);
    for (const figure of ['1,029', '1029', '453']) expect(hintMap).not.toContain(figure);
    expect(hintMap).toContain('Blank = not entered; no lift is priced. Suggestion only, never a prefill: the published ordinary-time rate is recorded in the Gothenburg extraction reference section 8. Prices on the call\\\'s moves (loaded + discharged).');
    expect(hintMap).toContain('Blank = not entered; no landside leg is added. Applies only with the container-through toggle ON, under the selected hinterland mode. Suggestion only, never a prefill: the published receiving/delivering rate is recorded in the Gothenburg extraction reference section 8.');
  });

  it('P3: an entered non-published value (999 lift, 888 delivery) still discloses on the line, the strip and the paper exactly as before', async () => {
    // the line: the workspace charge line carries the entered-rate disclosure
    await renderWorkspace({ got_lift_cost: 999 } as Partial<CallInput>);
    const cell = Array.from(container!.querySelectorAll('td')).filter(td => (td.textContent ?? '').includes('Terminal Handling - Lift (user-specified)')).pop()!;
    expect(cell.querySelector('.source-ref')!.textContent).toBe('user-specified Cost per lift, 999 SEK per unit per move (entered) — 999 x 4,000 = 3,996,000 SEK');
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;

    // the strip and the paper
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={CALL}
          perPortCallOverrides={{ gothenburg: { got_lift_cost: 999, got_delivery_cost: 888 } }}
          selectedPortIds={['gothenburg', 'gavle', 'aarhus']}
          activeVessel="TEST"
        />
      );
    });
    const lift = container.querySelector('[data-testid="comparison-context-user-got_lift_cost"]')!.textContent ?? '';
    const delivery = container.querySelector('[data-testid="comparison-context-user-got_delivery_cost"]')!.textContent ?? '';
    expect(lift).toContain('Gothenburg Cost per lift:');
    expect(lift).toContain('999 SEK per unit per move (entered, user-specified)');
    expect(delivery).toContain('888 SEK per unit (entered, user-specified)');
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const header = Array.from(document.body.querySelectorAll('[data-testid="print-header-user-got_lift_cost"]')).filter(h => !container!.contains(h)).map(h => h.textContent ?? '');
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(header[0]).toContain('Gothenburg Cost per lift: 999 SEK per unit per move (entered, user-specified)');
  });
});
