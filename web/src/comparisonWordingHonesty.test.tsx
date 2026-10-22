// Comparison wording honesty (spec v0.11.4; user ruling 2026-10-22), wording
// only - every pinned figure stays byte-identical.
//  1. The not-charged cell states the archive's limit, never a claim about the
//     port: "no published rate in the archived record at this port" replaces
//     "not levied at this port", screen and print alike. The explicit-absence
//     principle of spec v0.2.52 is preserved: the absence is still rendered.
//  2. The Gothenburg handling annotation keeps only what is true of the
//     user-specified inputs; every other port's annotation is byte-identical.
//  3. A cargo dues note at Gothenburg states the placement of the published
//     goods charge (a cargo due carried on the Cargo dues line, not handling).
//
// Red proofs of record (build copy): the old phrase restored turns the
// new-phrase pins red; the Gothenburg annotation restored to the old text
// turns the exact-annotation pin red; the cargo dues note removed turns its
// pins red; the figure guard stays green throughout.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import { HANDLING_BASIS_ANNOTATIONS } from './handlingBasis';
import { cargoDuesNoteFor, CARGO_DUES_NOTES } from './cargoDuesNotes';
import * as crypto from 'crypto';

jest.setTimeout(60000);

const NEW = 'no published rate in the archived record at this port';
const OLD = 'not levied at this port';
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const CALL = defaultCall('gothenburg') as CallInput;
// Gothenburg and Hamburg: Hamburg carries no cargo due, so its Cargo dues cell is a not-charged cell.
const SELECTED = ['gothenburg', 'hamburg', 'aarhus'];

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
const render = async (mobile = false, selected = SELECTED, overrides?: Record<string, Record<string, unknown>>) => {
  __setMobileQueryForTests(() => mobile);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(
      <ComparisonView ports={LOADED_PORTS} vessel={DEFAULT_VESSEL} call={CALL} perPortCallOverrides={overrides} selectedPortIds={selected} activeVessel="TEST" />
    );
  });
};
const notLevied = () => Array.from(container!.querySelectorAll('.comparison-not-levied, .comparison-not-charged')).map(e => (e.textContent ?? '').trim());

describe('comparison wording honesty - the not-charged cell (spec v0.11.4)', () => {
  it('1. screen: a not-charged cell reads the new phrase, in the desktop table and on the mobile cards, and the old phrase renders nowhere', async () => {
    await render(false);
    const desktop = notLevied();
    expect(desktop.length).toBeGreaterThan(0);
    expect(desktop.filter(t => t.startsWith('no published rate')).every(t => t === NEW)).toBe(true);
    expect(desktop).toContain(NEW);
    expect(container!.textContent ?? '').not.toContain(OLD);
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;
    await render(true);
    expect(notLevied()).toContain(NEW);
    expect(container!.textContent ?? '').not.toContain(OLD);
  });
  it('2. print: the not-charged cell prints the new phrase and the old phrase does not print', async () => {
    await render(false);
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const printed = Array.from(document.body.querySelectorAll('.print-pages .comparison-not-levied')).map(e => (e.textContent ?? '').trim());
    const printedText = document.body.querySelector('.print-pages')?.textContent ?? '';
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(printed).toContain(NEW);
    expect(printedText).not.toContain(OLD);
  });
  it('3. the absence is still rendered, never hidden: the cell count equals the not-charged cells before the wording change (every absence keeps a cell)', async () => {
    await render(false);
    // Hamburg and Aarhus carry no cargo due on the default call; Gothenburg carries one.
    const cargoRow = Array.from(container!.querySelectorAll('.comparison-chargetype-row')).find(r => (r.textContent ?? '').includes('Cargo dues'))!;
    const cells = Array.from(cargoRow.querySelectorAll('td')).slice(1).map(c => c.textContent ?? '');
    expect(cells.some(t => t.includes(NEW))).toBe(true);
    expect(cells.length).toBe(SELECTED.length);
  });
});

describe('comparison wording honesty - the Gothenburg handling annotation (spec v0.11.4)', () => {
  it('4. the Gothenburg annotation equals the ruled text exactly: no "Handling basis:" prefix, no full-cycle, no goods-charge citation, no 377/535', () => {
    const text = HANDLING_BASIS_ANNOTATIONS.gothenburg.text;
    expect(text).toBe(
      'The lift amount is the user-specified Cost per lift input (blank = not priced). The landside receiving/delivering leg is billed separately per unit (the container-through toggle); its amount is the user-specified Delivery input (blank = not added).'
    );
    for (const absent of ['Handling basis:', 'full-cycle', 'leg-priced', 'goods charge', 'Terminal Charges on goods', 'June revision', '377', '535']) {
      expect(text).not.toContain(absent);
    }
  });
  it('5. every other port\'s annotation is byte-identical to main (sha-256 and length of the v0.11.3 text)', () => {
    const MAIN: Record<string, [string, number]> = {
      aarhus: ['ad8e8f3888da5cd40eb30fa802c25edccd5628a2e86bd50570316cde08df646c', 422],
      bremerhaven: ['4cf74661d5fa825af2b57a6736bf854557a2b251fae7f0f2f48f9f36ffedd19e', 510],
      gavle: ['975b5dd617abbc6cddbe7acc43fce1025e6fefa697b72e9faa0bdf20e2ec0b16', 298],
      hamburg: ['ad1f5428a7a160528eff67c2e7938781d8f414fc4dd6bb706d43163a170db61c', 293],
      helsingborg: ['7024ad7ef6613e8be90af0e80581d3a42df8ebcd5b77b80cc206c940d7721815', 268],
      norrkoping: ['4258ddd1761852439de4889933f6a19a102db9dba4d9e137d42174b9ffec2e4c', 293],
      norvik: ['08547f6213b28052bdcb166931418758e366144d00eabd842052db9b2a05c5dc', 428],
      rotterdam: ['3eb3f092487848c036a6059f15b048be0c3eed9e911e48e4766badd3a64a97ac', 645]
    };
    expect(Object.keys(HANDLING_BASIS_ANNOTATIONS).sort()).toEqual([...Object.keys(MAIN), 'gothenburg'].sort());
    for (const [id, [hash, len]] of Object.entries(MAIN)) {
      const text = HANDLING_BASIS_ANNOTATIONS[id].text;
      expect(text.length).toBe(len);
      expect(crypto.createHash('sha256').update(text).digest('hex')).toBe(hash);
    }
  });
  it('6. the annotation renders in the Gothenburg terminal handling cell of the comparison view with the ruled text (the family row exists once a lift is entered)', async () => {
    await render(false, ['gothenburg'], { gothenburg: { got_lift_cost: 999 } });
    const notes = Array.from(container!.querySelectorAll('.comparison-handling-basis-note')).map(e => e.textContent ?? '');
    expect(notes).toContain(HANDLING_BASIS_ANNOTATIONS.gothenburg.text);
    expect(container!.textContent ?? '').not.toContain('full-cycle');
  });
});

describe('comparison wording honesty - the cargo dues note (spec v0.11.4)', () => {
  it('7. the note exists for Gothenburg only and carries every ruled element', () => {
    expect(Object.keys(CARGO_DUES_NOTES)).toEqual(['gothenburg']);
    const text = cargoDuesNoteFor('gothenburg')!.text;
    for (const element of [
      'The published goods charge',
      'archived APMT Terminal Tariff 2026',
      '(June revision)',
      'Terminal Charges on goods',
      '377/535 SEK per unit',
      'a cargo due carried on the Cargo dues line, not handling'
    ]) expect(text).toContain(element);
    expect(cargoDuesNoteFor('hamburg')).toBeUndefined();
    expect(cargoDuesNoteFor('aarhus')).toBeUndefined();
  });
  it('8. rendered on the Gothenburg Cargo dues line, desktop and mobile; absent at every other port', async () => {
    await render(false);
    const notes = Array.from(container!.querySelectorAll('[data-testid^="cargo-dues-note-"]'));
    expect(notes.map(n => n.getAttribute('data-testid'))).toEqual(['cargo-dues-note-gothenburg']);
    expect(notes[0].textContent).toBe(cargoDuesNoteFor('gothenburg')!.text);
    expect(notes[0].closest('.comparison-chargetype-row')!.textContent).toContain('Cargo dues');
    await act(async () => { root!.unmount(); });
    container!.remove();
    root = null;
    await render(true);
    const mobile = Array.from(container!.querySelectorAll('[data-testid^="cargo-dues-note-"]'));
    expect(mobile.map(n => n.getAttribute('data-testid'))).toEqual(['cargo-dues-note-gothenburg']);
    expect(mobile[0].closest('.comparison-card-chargetype')!.textContent).toContain('Cargo dues');
  });
  it('9. screen only: the cargo dues note does not print', async () => {
    await render(false);
    await act(async () => { window.dispatchEvent(new Event('beforeprint')); });
    const printedText = document.body.querySelector('.print-pages')?.textContent ?? '';
    await act(async () => { window.dispatchEvent(new Event('afterprint')); });
    expect(printedText).not.toContain('is a cargo due carried on the Cargo dues line');
    expect(printedText.length).toBeGreaterThan(0);
  });
  it('10. no figure changes from the wording or the notes: the Gothenburg blank default (3,275,851.15 SEK) and the engine totals are byte-identical, and the rendered Grand Total row carries them', async () => {
    const total = (id: string) => calculatePortCallCost(portOf(id), { vessel: DEFAULT_VESSEL, call: defaultCall(id) as CallInput }).total;
    expect(total('gothenburg')).toBe(3275851.15);
    expect(total('hamburg')).toBe(2204910.9);
    expect(total('gavle')).toBe(10306979.35);
    await render(false);
    const row = Array.from(container!.querySelectorAll('.comparison-total-row')).find(r => (r.textContent ?? '').includes('Grand Total'))!;
    expect(row.textContent).toContain('3 275 851');
    expect(row.textContent).toContain('2 204 911');
  });
});
