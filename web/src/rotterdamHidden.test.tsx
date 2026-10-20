// Rotterdam out of view and the GOT handling layer - web pins (spec v0.8.0,
// Units 4 and 5).
//
// Unit 4 (the user ruling of 2026-10-20): Rotterdam is hidden from view by
// one web-layer exclusion constant (HIDDEN_PORT_IDS in portRegistry.ts), the
// route every rendered surface derives through. Hidden, never deleted: the
// port stays registered with the core lookups and its engine values stay
// pinned core-side. The red proof of record: the constant emptied in the
// build copy turns these pins red (Rotterdam reappears in the drawer, the
// comparison and the ranking).
//
// Units 1-2 on the rendered surfaces: the GOT goods charge renders on the
// Cargo dues line; the ordinary-time lift renders as the sole line under the
// terminal handling header in the per-port view, carrying the
// confidential-source disclosure.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App, { ComparisonView, PortWorkspace, __setMobileQueryForTests } from './App';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { HIDDEN_PORT_IDS, LOADED_PORTS } from './portRegistry';
import { printPagesFor } from './printPages';

jest.setTimeout(60000);

const settle = async (ms = 650) => {
  await act(async () => { await new Promise(r => setTimeout(r, ms)); });
};

describe('Rotterdam out of view - the exclusion constant (spec v0.8.0, Unit 4)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(async () => {
    __setMobileQueryForTests(null);
    const r = root;
    if (r) { await act(async () => { r.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  it('the constant hides Rotterdam alone; the port stays registered (hidden, never deleted)', () => {
    expect(Array.from(HIDDEN_PORT_IDS)).toEqual(['rotterdam']);
    const registered = ((portsRegistry as any).ports ?? []).map((p: any) => p.metadata.id);
    expect(registered).toContain('rotterdam');
    expect(LOADED_PORTS.map(p => p.metadata.id)).toEqual(
      ['aarhus', 'bremerhaven', 'gavle', 'gothenburg', 'hamburg', 'helsingborg', 'norrkoping', 'norvik']
    );
    // Registered with the core lookups: the hidden port's default call
    // still resolves (the resume surface is intact).
    expect(defaultCall('rotterdam').port_id ?? 'rotterdam').toBe('rotterdam');
  });

  it('the app drawer lists the eight rendered ports and no Netherlands group', async () => {
    __setMobileQueryForTests(() => false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root!.render(<App />); });
    await settle();
    const toggle = container.querySelector('.port-drawer-toggle');
    expect(toggle).not.toBeNull();
    await act(async () => { toggle!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const boxes = Array.from(container.querySelectorAll('.port-drawer-body input[type="checkbox"]'));
    expect(boxes).toHaveLength(8);
    const headers = Array.from(container.querySelectorAll('.port-drawer-country-header'))
      .map(h => (h.textContent ?? '').trim());
    expect(headers).toEqual(['Denmark', 'Germany', 'Sweden']);
    expect(container.querySelector('.port-drawer-body')!.textContent).not.toContain('Rotterdam');
  });

  it('the comparison over the rendered set: eight columns, no Rotterdam, Gothenburg carries the cheapest marker', async () => {
    __setMobileQueryForTests(() => false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          activeVessel="TEST"
        />
      );
    });
    const headerCells = Array.from(container.querySelectorAll('.comparison-table thead th'))
      .map(th => th.textContent ?? '');
    expect(headerCells).toHaveLength(9); // the row label plus eight port columns
    expect(headerCells.join('|')).not.toContain('Rotterdam');
    const cheapest = container.querySelectorAll('.comparison-marker.comparison-cheapest');
    expect(cheapest.length).toBe(1);
    expect(cheapest[0].closest('th')?.textContent ?? '').toContain('Gothenburg');
  });

  it('print over the rendered set: eight columns on 3+3+2 pages, no Rotterdam column', () => {
    const pages = printPagesFor(LOADED_PORTS.map(p => ({ id: p.metadata.id, name: p.metadata.name })));
    expect(pages.map(p => p.ports.length)).toEqual([3, 3, 2]);
    expect(pages.flatMap(p => p.ports.map(pp => pp.id))).not.toContain('rotterdam');
  });
});

describe('the GOT handling layer on the rendered surfaces (spec v0.8.0, Units 1-2)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(async () => {
    __setMobileQueryForTests(null);
    const r = root;
    if (r) { await act(async () => { r.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  it('the goods charge renders on the Cargo dues line in the comparison (377 x 1,600 + 535 x 2,400 = 1,887,200 SEK)', async () => {
    __setMobileQueryForTests(() => false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={['gothenburg']}
          activeVessel="TEST"
        />
      );
    });
    const rows = Array.from(container.querySelectorAll('.comparison-table tbody tr'));
    const cargo = rows.find(r => (r.querySelector('td')?.textContent ?? '').startsWith('Cargo dues'));
    expect(cargo).toBeDefined();
    expect(cargo!.textContent).toContain('1 887 200');
  });

  it('the per-port view: the lift is the sole line under the terminal handling header, with the confidential-source disclosure; the goods charge sits under port dues', async () => {
    const got = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={got}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg') as CallInput}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await settle();
    const groups = Array.from(container.querySelectorAll('.fee-family-group'));
    const th = groups.filter(g => (g.querySelector('.fee-family-header')?.textContent ?? '') === 'terminal handling');
    const apmTh = th.find(g => (g.textContent ?? '').includes('Lift (ordinary time)'));
    expect(apmTh).toBeDefined();
    expect(apmTh!.textContent).toContain('Terminal Handling - Lift (ordinary time)');
    expect(apmTh!.textContent).not.toContain('Goods Charge');
    expect(apmTh!.textContent).toContain('4 116 000');
    // The disclosure: the collapsed line carries the caveat badge (never a
    // list-price reading); the expanded line detail renders the citation of
    // record through the source line (the rule's clause) and names the
    // sanitized confidential-source record.
    const caveat = apmTh!.querySelector('.status-caveat');
    expect(caveat).not.toBeNull();
    expect(caveat!.textContent).toBe('contract rate may differ');
    const toggle = apmTh!.querySelector('[aria-controls="fee-derivation-apm_terminals_lift"]') as HTMLElement;
    expect(toggle).not.toBeNull();
    await act(async () => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const detail = container.querySelector('[id="fee-derivation-apm_terminals_lift"]');
    expect(detail).not.toBeNull();
    expect(detail!.textContent).toContain('user-delivered confidential commercial invoice — rates not published in any tariff; details withheld');
    expect(detail!.textContent).toContain('sanitized confidential-source record');
    const pd = groups.filter(g => (g.querySelector('.fee-family-header')?.textContent ?? '') === 'port dues');
    expect(pd.some(g => (g.textContent ?? '').includes('Goods Charge - <=20ft Container'))).toBe(true);
  });
});
