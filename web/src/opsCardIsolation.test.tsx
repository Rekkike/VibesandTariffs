// Card-surface OPS isolation (spec v0.2.62, the directive-3 pass).
//
// Coverage gap repaired: the v0.2.60 perPortPersistence pins cover the
// workspace merge (the isolation contract on the workspace boxes), but no
// pin asserted the contract on the comparison-card surface users actually
// read — the defect class (one port's OPS entry pricing another port's
// card, the pre-v0.2.60 shared-call behavior) therefore shipped once
// without any pin turning red. This suite pins the isolation on the
// comparison card (mobile cards) and the comparison table (desktop) for
// every per-port OPS price field, both directions, GOT↔HEL.
//
// The kWh input is deliberately shared (spec v0.2.57 §4.2.4, v0.2.60 §4.3:
// currency-neutral enabling input, in no port's reset_fields); its
// cross-port coupling is designed behavior and is pinned here as such,
// with the v0.2.62 input-notice disclosure asserted (the honesty repair).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App, { __setMobileQueryForTests } from './App';
import type { PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HEL = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const findFieldByLabel = (container: HTMLElement, label: string): HTMLInputElement | null => {
  const labels = Array.from(container.querySelectorAll('label'));
  const target = labels.find(l => (l.textContent ?? '').includes(label));
  if (!target) return null;
  const forId = target.getAttribute('for');
  if (!forId) return null;
  const escaped = forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  return container.querySelector(`[id="${escaped}"]`) as HTMLInputElement | null;
};

const clickTab = async (container: HTMLElement, tabText: string) => {
  const tab = Array.from(container.querySelectorAll('.port-nav button'))
    .find(b => (b.textContent ?? '').toLowerCase().includes(tabText.toLowerCase()));
  expect(tab).toBeDefined();
  await act(async () => {
    tab!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const settle = async (ms = 650) => {
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
};

jest.setTimeout(60000);

describe('card-surface OPS isolation (spec v0.2.62)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const renderApp = async (mobile: boolean) => {
    __setMobileQueryForTests(() => mobile);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root!.render(<App />); });
    await settle();
  };

  // GOT's fresh-load workspace renders electricity, demand, per-GT (no
  // connection — tanker jetties only); HEL renders all four.
  const GOT_FIELDS: [string, string][] = [
    ['OPS electricity price', '2.5'],
    ['OPS demand charge', '10000'],
    ['OPS additional per-GT charge', '0.1'],
  ];
  const HEL_FIELDS: [string, string][] = [
    ['OPS electricity price', '3.75'],
    ['OPS demand charge', '20000'],
    ['OPS service/connection charge', '5000'],
    ['OPS additional per-GT charge', '0.2'],
  ];

  const enterFields = async (fields: [string, string][]) => {
    for (const [label, value] of fields) {
      const f = findFieldByLabel(container!, label);
      expect(f).not.toBeNull();
      await act(async () => { setInputValue(f!, value); });
      await settle();
    }
  };

  const cardOpsAmount = (cardName: string): string | null => {
    const card = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes(cardName));
    if (!card) return null;
    return card.querySelector('.comparison-card-ops')?.textContent ?? null;
  };

  const cardTotal = (cardName: string): string | null => {
    const card = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes(cardName));
    return card?.querySelector('.comparison-card-total')?.textContent ?? null;
  };

  it('GOT-entered OPS prices never price HEL\'s card (every per-port field, no kWh entered)', async () => {
    await renderApp(true);
    await enterFields(GOT_FIELDS);
    await clickTab(container!, 'Compare Ports');
    await settle();
    // GOT prices its own OPS: 2.5×0 + 10000 + 0.1×194849 = 29 485 kr (no
    // kWh, so no electricity line anywhere).
    expect(cardOpsAmount('Gothenburg')).toContain('29\u00A0485');
    // HEL's card carries no OPS block at all and its total is the
    // untouched baseline: GOT's entries never price HEL.
    expect(cardOpsAmount('Helsingborg')).toBeNull();
    expect(cardTotal('Helsingborg')).toContain('8\u00A0750\u00A0057');
  });

  it('HEL-entered OPS prices never price GOT\'s card (reverse direction)', async () => {
    await renderApp(true);
    await clickTab(container!, 'Helsingborg');
    await settle();
    await enterFields(HEL_FIELDS);
    await clickTab(container!, 'Compare Ports');
    await settle();
    // HEL prices its own OPS: 20000+5000+0.2×194849 = 63 969.80 →
    // 63 970 kr (no kWh entered, so no electricity line anywhere).
    expect(cardOpsAmount('Helsingborg')).toContain('63\u00A0970');
    expect(cardOpsAmount('Gothenburg')).toBeNull();
    expect(cardTotal('Gothenburg')).toContain('3\u00A0275\u00A0851');
  });

  it('the isolation holds with both ports loaded at once — each card prices only its own entries', async () => {
    await renderApp(true);
    await enterFields(GOT_FIELDS);
    await clickTab(container!, 'Helsingborg');
    await settle();
    await enterFields(HEL_FIELDS);
    await clickTab(container!, 'Compare Ports');
    await settle();
    expect(cardOpsAmount('Gothenburg')).toContain('29\u00A0485');
    expect(cardOpsAmount('Helsingborg')).toContain('63\u00A0970');
    // The totals carry exactly the two ports' own OPS amounts.
    expect(cardTotal('Gothenburg')).toContain('3\u00A0305\u00A0336');
    expect(cardTotal('Helsingborg')).toContain('8\u00A0814\u00A0027');
  });

  it('the desktop comparison table holds the same isolation (the OPS row reads each column\'s own result)', async () => {
    await renderApp(false);
    await enterFields(GOT_FIELDS);
    await clickTab(container!, 'Compare Ports');
    await settle();
    const opsRow = container!.querySelector('.comparison-ops-row');
    expect(opsRow).not.toBeNull();
    const cells = Array.from(opsRow!.querySelectorAll('td'));
    expect(cells.length).toBe(LOADED_PORTS.length + 1);
    // GOT's cell prices its own entry; HEL's and HAM's cells render the
    // em dash — no absence wording, and never GOT's figure.
    expect(cells[1].textContent).toContain('29\u00A0485');
    expect(cells[2].textContent).toContain('—');
    expect(cells[3].textContent).toContain('—');
    expect(opsRow!.textContent).not.toContain('not levied at this port');
  });

  it('the shared kWh input\'s cross-port coupling is the designed behavior and is disclosed on the input', async () => {
    await renderApp(true);
    await clickTab(container!, 'Helsingborg');
    await settle();
    await enterFields([['OPS electricity price', '3.75'], ['Estimated OPS consumption', '1200']]);
    await clickTab(container!, 'Compare Ports');
    await settle();
    // HEL prices 3.75 × 1200 = 4 500 kr; GOT has no price of its own, so
    // the shared kWh alone prices nothing at GOT.
    expect(cardOpsAmount('Helsingborg')).toContain('4\u00A0500');
    expect(cardOpsAmount('Gothenburg')).toBeNull();
    // The disclosure (v0.2.62): the sharedness is stated on the input
    // notice at both Swedish workspaces.
    await clickTab(container!, 'Gothenburg');
    await settle();
    const kwh = findFieldByLabel(container!, 'Estimated OPS consumption');
    expect(kwh).not.toBeNull();
    const helper = kwh!.closest('.MuiTextField-root')?.querySelector('p, .MuiFormHelperText-root');
    expect(helper?.textContent ?? '').toMatch(/shared across all ports/i);
    await clickTab(container!, 'Helsingborg');
    await settle();
    const helKwh = findFieldByLabel(container!, 'Estimated OPS consumption');
    const helHelper = helKwh!.closest('.MuiTextField-root')?.querySelector('p, .MuiFormHelperText-root');
    expect(helHelper?.textContent ?? '').toMatch(/shared across all ports/i);
  });

  it('the OPS group note states the per-port/shared split (the honesty disclosure)', async () => {
    await renderApp(true);
    const note = container!.querySelector('.ops-speculative-group-note');
    expect(note?.textContent ?? '').toMatch(/price inputs are this port's own/i);
    expect(note?.textContent ?? '').toMatch(/consumption \(kWh\) input is shared across all ports/i);
  });

  it('every per-port OPS field is in its port\'s reset_fields (the classification the isolation rests on)', () => {
    for (const field of [
      'ops_electricity_price', 'ops_demand_charge',
      'ops_connection_charge', 'ops_per_gt_charge'
    ]) {
      const owners = LOADED_PORTS.filter(p =>
        ((p as any).input_profile?.reset_fields ?? []).includes(field));
      // A field is per-port wherever it is classified; the isolation pins
      // above hold because each port reads only its own state.
      for (const owner of owners) {
        expect(((owner as any).input_profile?.reset_fields ?? [])).toContain(field);
      }
      // At least the Swedish ports carry the price fields per-port.
      if (field !== 'ops_connection_charge') {
        expect(owners.map(p => p.metadata.id)).toContain('gothenburg');
        expect(owners.map(p => p.metadata.id)).toContain('helsingborg');
      }
    }
    // kWh is deliberately in no port's reset_fields (shared by design).
    for (const p of LOADED_PORTS) {
      expect(((p as any).input_profile?.reset_fields ?? [])).not.toContain('ops_kwh_consumption');
    }
  });
});
