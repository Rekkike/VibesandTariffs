// GOT lift and delivery presentation patch (spec v0.11.1, user ruling
// 2026-10-21): presentation only - no figure moves. P1/P2: the user-specified
// terminal handling input block renders at the end of the Vessel Call input
// section, between that section's content and the Energy at Berth section
// header, and the Energy at Berth (OPS) section carries no lift or delivery
// field. P3: the workspace lift line's basis text is the entered-rate
// disclosure (marker, purpose, entered rate, arithmetic) and the long
// handling-basis annotation does not render on the line.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { handlingBasisAnnotationFor } from './handlingBasis';

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
const renderWorkspace = async (portId: string, extra: Partial<CallInput> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf(portId)}
        vessel={DEFAULT_VESSEL}
        call={{ ...(defaultCall(portId) as CallInput), ...extra } as CallInput}
        onVesselChange={() => {}}
        onCallChange={() => {}}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};
const headingNamed = (cls: string, text: string): HTMLElement =>
  Array.from(container!.querySelectorAll(`.${cls}`)).find(h => (h.textContent ?? '').trim() === text) as HTMLElement;
const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('GOT lift and delivery presentation patch - the input block placement (spec v0.11.1)', () => {
  it('P1: the block renders within the Vessel Call input section, after its content and before the Energy at Berth section header', async () => {
    await renderWorkspace('gothenburg');
    const vesselCall = headingNamed('vessel-call-heading', 'Vessel Call');
    const energy = headingNamed('energy-heading', 'Energy at Berth');
    const block = container!.querySelector('[data-testid="user-specified-inputs-heading"]') as HTMLElement;
    expect(vesselCall && energy && block).toBeTruthy();
    expect(follows(vesselCall, block)).toBe(true);
    expect(follows(block, energy)).toBe(true);
    // within the Vessel Call input section (the card under the Vessel Call heading): that card contains the
    // heading and the block, and not the Energy at Berth heading
    let section: HTMLElement | null = block;
    while (section && !section.contains(vesselCall)) section = section.parentElement;
    expect(section).not.toBeNull();
    expect(section!.contains(energy)).toBe(false);
    // no other segment heading (energy, yard and storage) lies between the Vessel Call heading and the block
    const otherSegments = Array.from(container!.querySelectorAll('.energy-heading, .terminal-heading'));
    expect(otherSegments.some(h => follows(vesselCall, h) && follows(h, block))).toBe(false);
    // both fields, with their labels, inside the Vessel Call section after the block heading
    const fields = Array.from(section!.querySelectorAll('label')).filter(l => follows(block, l));
    for (const label of ['Cost per lift', 'Delivery']) {
      expect(fields.some(l => (l.textContent ?? '').includes(label))).toBe(true);
    }
    expect(block.textContent).toContain('Terminal handling inputs (user-specified, not tariff rates)');
  });
  it('P2: the Energy at Berth section contains no Cost per lift and no Delivery field and keeps its OPS content', async () => {
    await renderWorkspace('gothenburg');
    const energy = headingNamed('energy-heading', 'Energy at Berth');
    const yard = headingNamed('terminal-heading', 'Yard & Storage');
    expect(energy && yard).toBeTruthy();
    const inside = Array.from(container!.querySelectorAll('*')).filter(el => follows(energy, el) && follows(el, yard) && !el.contains(energy) && !el.contains(yard));
    const labels = inside.filter(el => el.tagName === 'LABEL').map(el => el.textContent ?? '');
    expect(labels.some(l => l.includes('Cost per lift'))).toBe(false);
    expect(labels.some(l => l.includes('Delivery'))).toBe(false);
    expect(inside.some(el => el.matches('[data-testid^="user-specified-"]'))).toBe(false);
    const text = inside.filter(el => el.children.length === 0).map(el => el.textContent ?? '').join(' ');
    expect(text).not.toContain('Terminal handling inputs');
    // the pre-v0.11.0 OPS section content is intact
    expect(labels.some(l => l.includes('OPS additional per-GT charge'))).toBe(true);
    expect(labels.some(l => l.includes('OPS charge per non-empty 20 ft unit'))).toBe(true);
    expect(labels.some(l => l.includes('OPS charge per non-empty 40 ft unit'))).toBe(true);
  });
  it('P4: the block is Gothenburg-only (absent at Aarhus) and blank by default', async () => {
    await renderWorkspace('aarhus');
    expect(container!.querySelector('[data-testid="user-specified-inputs-heading"]')).toBeNull();
  });
});

describe('GOT lift and delivery presentation patch - the lift line disclosure (spec v0.11.1)', () => {
  it('P3: at an entered 1,029 the lift line basis is the entered-rate disclosure with the arithmetic, and the handling-basis annotation does not render on the line', async () => {
    await renderWorkspace('gothenburg', { got_lift_cost: 1029 } as Partial<CallInput>);
    const cells = Array.from(container!.querySelectorAll('td')).filter(td => (td.textContent ?? '').includes('Terminal Handling - Lift (user-specified)'));
    expect(cells.length).toBeGreaterThan(0);
    const cell = cells[cells.length - 1];
    const basis = cell.querySelector('.source-ref')!.textContent ?? '';
    expect(basis).toBe('user-specified Cost per lift, 1,029 SEK per unit per move (entered) — 1,029 x 4,000 = 4,116,000 SEK');
    const annotation = handlingBasisAnnotationFor('gothenburg')!.text;
    expect(cell.textContent).not.toContain('Handling basis: full-cycle');
    expect(cell.textContent).not.toContain(annotation.slice(0, 60));
    expect(container!.textContent).not.toContain('Handling basis: full-cycle, leg-priced.');
  });
  it('the arithmetic follows the entered rate: 1,000 per lift reads 1,000 x 4,000 = 4,000,000 SEK', async () => {
    await renderWorkspace('gothenburg', { got_lift_cost: 1000 } as Partial<CallInput>);
    const cell = Array.from(container!.querySelectorAll('td')).filter(td => (td.textContent ?? '').includes('Terminal Handling - Lift (user-specified)')).pop()!;
    expect(cell.querySelector('.source-ref')!.textContent).toBe('user-specified Cost per lift, 1,000 SEK per unit per move (entered) — 1,000 x 4,000 = 4,000,000 SEK');
  });
});
