// D-01 remediation (spec v0.12.0, user rulings 2026-10-26): the five
// Helsingborg optional-service inputs (tariff 2026 p.8) render in the
// Helsingborg workspace, in the port's ancillary-services section, each with
// its label and the tariff basis in its hint; no other port renders them.
//
// P3: each input renders with its label at Helsingborg and is absent at the
// other ports. Red proof of record (build copy): observed failing before the
// section existed.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

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
const renderWorkspace = async (portId: string, overrides: Partial<CallInput> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <PortWorkspace
        port={portOf(portId)}
        vessel={DEFAULT_VESSEL}
        call={{ ...defaultCall(portId), ...overrides } as CallInput}
        onVesselChange={() => {}}
        onCallChange={() => {}}
        onActiveVesselChange={() => {}}
      />
    );
  });
  await settle();
};
const labels = (): string[] => Array.from(container!.querySelectorAll('label')).map(l => (l.textContent ?? '').trim());

// [label, a fragment of its hint stating the tariff basis]
const INPUTS: [string, string][] = [
  ['IMO Transport to a Dedicated Area (units)', '510.00 SEK per unit'],
  ['VGM Weighing (pre-advised export units)', '430.00 SEK per pre-advised unit, export units only'],
  ['Other Administrative Services (events)', '360.00 SEK per event'],
  ['Customs, Veterinary or Agricultural Inspections (units)', '1,015.00 SEK per unit'],
  ['Transport Within the Port Area (containers)', "950.00 SEK per container, 20'–45'"]
];

describe('P3: the five Helsingborg optional-service inputs render with their labels', () => {
  it('each input renders at Helsingborg with its label and its tariff basis in the hint, under the ancillary-services heading', async () => {
    await renderWorkspace('helsingborg');
    const text = container!.textContent ?? '';
    expect(text).toContain('Helsingborg Ancillary Services (optional)');
    for (const [label, hint] of INPUTS) {
      expect(labels()).toContain(label);
      expect(text).toContain(hint);
    }
    // The VGM hint states the not-pre-advised rate as recorded, never priced.
    expect(text).toContain('the not-pre-advised rate, 1,175.00 SEK per unit, is recorded, not priced');
  });

  it('the inputs are blank by default', async () => {
    await renderWorkspace('helsingborg');
    for (const [label] of INPUTS) {
      const labelEl = Array.from(container!.querySelectorAll('label')).find(l => (l.textContent ?? '').trim() === label)!;
      const input = document.getElementById(labelEl.htmlFor) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe('');
    }
  });

  it.each(['gothenburg', 'aarhus', 'hamburg'])('absent at %s', async portId => {
    await renderWorkspace(portId);
    for (const [label] of INPUTS) {
      expect(labels()).not.toContain(label);
    }
    expect(container!.textContent ?? '').not.toContain('Helsingborg Ancillary Services (optional)');
  });
});
