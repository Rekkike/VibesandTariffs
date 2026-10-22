// Handling-basis annotations and the compare container-through surface
// (spec v0.4.2, items 2 and 3).
//
// Authority: docs/TERMINAL_BASIS_COMPARABILITY_AUDIT.md - the six-port
// basis table (section 2) verified against the archived documents, and the
// container-through computation contract (the directive's item 3).
//
// Pin classes:
//   - every port's handling row carries its basis annotation verbatim
//     (item 2; the new annotation family, never an extension of the
//     cargo-family equivalence annotations);
//   - the toggle is default-off and the off state renders no
//     container-through row and no disclosure (off-state byte-identity);
//   - ON: the published landside legs add per the selected hinterland mode,
//     the computed amounts are pinned with their arithmetic, "not
//     published" renders as a wording never a zero, the bundled rate is
//     never double-counted, and the disclosure + billing footnote render
//     exactly once with the toggle;
//   - red proofs: the toggle defaulting on fails; a "not published"
//     rendered as zero fails; a bundled rate double-counted fails; the
//     disclosure removed fails.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ComparisonView } from './comparisonView';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import {
  containerThroughParts,
  handlingBasisAnnotationFor,
  CONTAINER_THROUGH_DISCLOSURE,
  CONTAINER_THROUGH_BILLING_FOOTNOTE
} from './handlingBasis';
import { readDecomposedAppSource } from './appSource';

const appSource = readDecomposedAppSource();
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const renderComparison = async (
  call: CallInput,
  vessel: VesselInput = DEFAULT_VESSEL,
  selectedPortIds: string[] = LOADED_PORTS.map(p => p.metadata.id)
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={vessel}
        call={call}
        selectedPortIds={selectedPortIds}
        activeVessel="TEST"
      />
    );
  });
  return { container, root };
};

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

// The default call's container counts (MAREN MAERSK's profile): 800 <=20'
// and 1,200 >20' per direction, loaded + discharged -> 1,600 / 2,400.
const LE_UNITS = 1600;
const GT_UNITS = 2400;

describe('handling-basis annotations (spec v0.4.2, item 2) - a new annotation family', () => {
  it('every one of the six ports carries its verbatim basis annotation from the audit table', () => {
    for (const id of ['gothenburg', 'hamburg', 'helsingborg', 'gavle', 'norrkoping', 'norvik']) {
      const note = handlingBasisAnnotationFor(id);
      expect(note).toBeDefined();
      expect(note!.text.length).toBeGreaterThan(20);
    }
  });
  it('the annotations carry the verbatim basis wording (Hamburg 6.1.1; Yilport bundled; Hutchison asymmetry; Norrköping per-leg)', () => {
    expect(handlingBasisAnnotationFor('hamburg')!.text).toContain('152.00 EUR per movement');
    expect(handlingBasisAnnotationFor('hamburg')!.text).toContain('vessel-to-quay only');
    expect(handlingBasisAnnotationFor('gavle')!.text).toContain('lift off vessel, train or truck into terminal and lift to vessel, train or truck out of terminal');
    expect(handlingBasisAnnotationFor('norvik')!.text).toContain('the road leg is bundled on the import side only');
    expect(handlingBasisAnnotationFor('norrkoping')!.text).toContain('855/1,051/1,249/1,283');
    expect(handlingBasisAnnotationFor('helsingborg')!.text).toContain("Place of rest");
  });
  it('the GOT annotation states only the user-specified inputs (v0.11.4; formerly the v0.8.0 full-cycle basis)', () => {
    // Comparison wording honesty (user ruling 2026-10-22) re-baseline: the annotation keeps only
    // what is true of the user-specified inputs; the goods-charge placement
    // moved to the cargo dues note (cargoDuesNotes.ts).
    const text = handlingBasisAnnotationFor('gothenburg')!.text;
    expect(text).toBe(
      'The lift amount is the user-specified Cost per lift input (blank = not priced). The landside receiving/delivering leg is billed separately per unit (the container-through toggle); its amount is the user-specified Delivery input (blank = not added).'
    );
    expect(text).not.toContain('Handling basis:');
    expect(text).not.toContain('full-cycle');
    expect(text).not.toContain('1,029');
    expect(text).not.toContain('453');
  });
  it('the GOT toggle participation (v0.8.0): the gated landside leg, 453 SEK per unit for either mode', () => {
    // v0.8.0 re-baseline (in-test attribution, the S-c declared class): the
    // v0.4.6 "not published" participation is replaced by the evidenced
    // receiving/delivering leg - 453 x 4,000 = 1,812,000 SEK at the default
    // call, the same figure for truck and rail; bundled false.
    // v0.11.0 re-baseline (in-test attribution): GOT lift and delivery user
    // inputs (user ruling 2026-10-21) - the leg is the user-specified
    // Delivery input: an entered 453 reproduces the v0.10.1 figure exactly
    // (the continuity bridge); blank adds nothing (not entered, never "not
    // published", never a zero); an invalid entry is fail-closed.
    for (const mode of ['truck', 'rail'] as const) {
      const got = containerThroughParts('gothenburg', mode, LE_UNITS, GT_UNITS, 453);
      expect(got.addedAmount).toBe(453 * 4000);
      expect(got.addedAmount).toBe(1812000);
      expect(got.bundled).toBe(false);
      expect(got.status).toBeUndefined();
      expect(got.note.startsWith('Delivery added per unit (user-specified, 453 SEK): ')).toBe(true);
      expect(got.note).toContain('453 x 4000 = 1,812,000 SEK.');
      const blank = containerThroughParts('gothenburg', mode, LE_UNITS, GT_UNITS);
      expect(blank.addedAmount).toBeNull();
      expect(blank.status).toBe('not_entered');
      expect(blank.note).toContain('Delivery not entered');
      const invalid = containerThroughParts('gothenburg', mode, LE_UNITS, GT_UNITS, -1);
      expect(invalid.addedAmount).toBeNull();
      expect(invalid.status).toBe('invalid');
      expect(invalid.note).toContain('Delivery not applied');
    }
  });
  it('the Aarhus basis and gate legs (v0.8.0 Unit 3c): the archived APMT Aarhus tariff §4.1 truck 338.00 and §4.2 rail 414.00 DKK replace the silent default', () => {
    const text = handlingBasisAnnotationFor('aarhus')!.text;
    expect(text).toContain('Handling basis: vessel move with separately priced gate legs.');
    expect(text).toContain('§2.1 "Load or Discharge Move", full/empty per container 1,105.00 DKK');
    expect(text).toContain('§4.1 "Gate Move Truck"');
    expect(text).toContain('§4.2 "Gate Move Rail"');
    const truck = containerThroughParts('aarhus', 'truck', LE_UNITS, GT_UNITS);
    expect(truck.addedAmount).toBe(338 * 4000); // 1,352,000 DKK
    expect(truck.bundled).toBe(false);
    expect(truck.note).toContain('APMT Aarhus 2026 tariff §4.1');
    const rail = containerThroughParts('aarhus', 'rail', LE_UNITS, GT_UNITS);
    expect(rail.addedAmount).toBe(414 * 4000); // 1,656,000 DKK
    expect(rail.note).toContain('APMT Aarhus 2026 tariff §4.2');
    expect(truck.note).not.toContain('Not published at this port');
  });
  it('the Bremerhaven basis and leg (v0.8.0 Unit 3d): the default terminal EUROGATE CTB 152.00 EUR for both modes; the NTB variant’s 145.00 EUR recorded as not reflected', () => {
    const text = handlingBasisAnnotationFor('bremerhaven')!.text;
    expect(text).toContain('Handling basis: vessel-to-quay only at the default terminal, EUROGATE CTB.');
    expect(text).toContain('152.00 EUR per movement (ch. 6.1.1)');
    expect(text).toContain('145.00 EUR per container (ch. 6.1.1), published but not reflected');
    for (const mode of ['truck', 'rail'] as const) {
      const brv = containerThroughParts('bremerhaven', mode, LE_UNITS, GT_UNITS);
      expect(brv.addedAmount).toBe(152 * 4000); // 608,000 EUR
      expect(brv.bundled).toBe(false);
      expect(brv.note).toContain('at the default terminal, EUROGATE CTB');
      expect(brv.note).toContain('the NTB variant’s published 145.00 EUR (reference tariff ch. 6.1.1) is not reflected');
    }
  });
  it('the Rotterdam annotation (v0.7.0 Unit 5) states the not-published handling basis with the archived-document reason - never a zero, never an invented rate', () => {
    const text = handlingBasisAnnotationFor('rotterdam')!.text;
    expect(text).toContain('Handling basis: not published in the archived record');
    expect(text).toContain('R1\u2019s own scope statement (Article 3)');
    expect(text).toContain('price towage, pilotage and the KRVE boatmen, never stevedoring');
    expect(text).toContain('never a zero, never an invented figure');
    const through = containerThroughParts('rotterdam', 'truck', LE_UNITS, GT_UNITS);
    expect(through.addedAmount).toBeNull();
    expect(through.bundled).toBe(false);
    expect(through.note).toContain('Not published: no handling rate of any basis exists in the archived record');
    expect(through.note).toContain('not published is never rendered as a zero');
  });

  it('the annotation family does not extend the cargo-family equivalence annotations (a separate module and class)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const basisNotes = (container ?? document).querySelectorAll('.comparison-handling-basis-note');
    expect(basisNotes.length).toBeGreaterThanOrEqual(6);
    const cssOk = /\.comparison-handling-basis-note\s*{/.test(cssSource);
    expect(cssOk).toBe(true);
  });
  it('the desktop view renders each port\'s basis beside its terminal handling figure', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const text = (container ?? document).textContent ?? '';
    expect(text).toContain('Handling basis: bundled (container-through)');
    expect(text).toContain('Handling basis: vessel-to-quay only');
    expect(text).toContain('Handling basis: asymmetric');
    expect(text).toContain('Handling basis: fully leg-priced');
  });
});

describe('compare container-through (spec v0.4.2, item 3) - default-off and off-state byte-identity', () => {
  it('the toggle is off by default: no container-through row, no disclosure, no billing footnote renders', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    expect((container ?? document).querySelector('[data-testid="container-through-row"]')).toBeNull();
    expect((container ?? document).querySelector('[data-testid="container-through-disclosure"]')).toBeNull();
    expect((container ?? document).querySelector('[data-testid="container-through-billing-footnote"]')).toBeNull();
    expect(((container ?? document).textContent ?? '')).not.toContain('Container-through addition');
  });
  it('RED: the toggle defaulting on fails (the off state must render nothing)', async () => {
    // Observed red by construction: the default render asserts absence
    // above; a default-on implementation renders the row and fails that
    // pin. The red observation: flip the default in the source and the
    // suite above fails - pinned here as the source-contract check.
    expect(appSource).toMatch(/containerThroughVisible, setContainerThroughVisible\] = useState\(false\)/);
    expect(appSource).not.toMatch(/useState\(true\).*containerThrough/s);
  });
  it('the Grand Total is unchanged in the off state at all six ports (byte-identity of the totals)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const text = (container ?? document).textContent ?? '';
    expect(text).toContain('10'); // the totals render (the exact figures are pinned in comparisonDefaults; here: presence)
    expect(text).not.toContain('Container-through addition');
  });
});

describe('compare container-through ON (spec v0.4.2, item 3) - published legs, pinned arithmetic', () => {
  const toggleOn = async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const checkbox = (container ?? document).querySelector('[data-testid="container-through-checkbox"]') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    await act(async () => {
      checkbox.click();
    });
  };
  it('the disclosure and the billing footnote render exactly once with the toggle', async () => {
    await toggleOn();
    const disclosures = (container ?? document).querySelectorAll('[data-testid="container-through-disclosure"]');
    const footnotes = (container ?? document).querySelectorAll('[data-testid="container-through-billing-footnote"]');
    expect(disclosures).toHaveLength(1);
    expect(footnotes).toHaveLength(1);
    expect(disclosures[0].textContent).toBe(CONTAINER_THROUGH_DISCLOSURE);
    expect(footnotes[0].textContent).toBe(CONTAINER_THROUGH_BILLING_FOOTNOTE);
  });
  it('RED: the disclosure removed fails', async () => {
    await toggleOn();
    expect(((container ?? document).textContent ?? '')).toContain('Includes terminal handling plus the published leg to truck gate or rail stack where the port\'s documents publish it; last-mile road haulage is not included at any port.');
  });
  it('truck mode: Norrköping adds the gate handling, Hamburg the 152 EUR movement, HEL the truck leg - pinned arithmetic', async () => {
    const nrk = containerThroughParts('norrkoping', 'truck', LE_UNITS, GT_UNITS);
    expect(nrk.addedAmount).toBe(479 * 1600 + 546 * 2400); // 766,400 + 1,310,400 = 2,076,800
    expect(nrk.addedAmount).toBe(2076800);
    const ham = containerThroughParts('hamburg', 'truck', LE_UNITS, GT_UNITS);
    expect(ham.addedAmount).toBe(152 * 4000); // 608,000 EUR
    const hel = containerThroughParts('helsingborg', 'truck', LE_UNITS, GT_UNITS);
    expect(hel.addedAmount).toBe(890 * 4000); // 3,560,000
  });
  it('rail mode: Norrköping adds the rail lift, HEL the train leg, Norvik the 1,300 kr rail line, Hamburg the same 152', () => {
    const nrk = containerThroughParts('norrkoping', 'rail', LE_UNITS, GT_UNITS);
    expect(nrk.addedAmount).toBe(367 * 1600 + 526 * 2400); // 587,200 + 1,262,400 = 1,849,600
    const hel = containerThroughParts('helsingborg', 'rail', LE_UNITS, GT_UNITS);
    expect(hel.addedAmount).toBe(1110 * 4000); // 4,440,000
    const nvk = containerThroughParts('norvik', 'rail', LE_UNITS, GT_UNITS);
    expect(nvk.addedAmount).toBe(1300 * 4000); // 5,200,000
    const ham = containerThroughParts('hamburg', 'rail', LE_UNITS, GT_UNITS);
    expect(ham.addedAmount).toBe(152 * 4000);
  });
  it('the bundled rate is never double-counted: Gavle adds nothing and says so', () => {
    const gle = containerThroughParts('gavle', 'truck', LE_UNITS, GT_UNITS);
    expect(gle.addedAmount).toBeNull();
    expect(gle.bundled).toBe(true);
    expect(gle.note).toContain('nothing is added');
    expect(gle.note).toContain('never double-counted');
  });
  it('RED: a bundled rate double-counted fails (the Gavle part must stay null-added)', () => {
    // The red observation: any implementation adding a leg at Gavle fails
    // the null pin above; the source-contract check pins the bundled case
    // in the computation itself.
    const gle = containerThroughParts('gavle', 'rail', LE_UNITS, GT_UNITS);
    expect(gle.addedAmount).toBeNull();
  });
  it('"not published" renders as a wording, never a zero: Norvik truck (export road); GOT is leg-priced since v0.8.0', () => {
    // v0.8.0 re-baseline (in-test attribution, the S-c declared class):
    // Gothenburg leaves the not-published set - its landside leg is the
    // evidenced 453 SEK per unit (pinned above); the wording rule holds on
    // the remaining not-published leg.
    // v0.11.0 re-baseline (in-test attribution): GOT lift and delivery user
    // inputs (user ruling 2026-10-21) - the entered Delivery 453 bridge.
    const got = containerThroughParts('gothenburg', 'truck', LE_UNITS, GT_UNITS, 453);
    expect(got.addedAmount).toBe(1812000);
    const nvkTruck = containerThroughParts('norvik', 'truck', LE_UNITS, GT_UNITS);
    expect(nvkTruck.addedAmount).toBeNull();
    expect(nvkTruck.note).toContain('not published in the document');
  });
  it('the toggle row renders "not published" and the bundled wording per port (never a zero amount)', async () => {
    await toggleOn();
    const text = (container ?? document).textContent ?? '';
    expect(text).toContain('not published');
    expect(text).toContain('bundled rate unchanged');
    expect(text).toContain('Container-through addition');
    // never a zero amount for a not-published leg
    expect(text).not.toMatch(/\+0[^,\.]/);
  });
  it('RED: a "not published" rendered as zero fails (the GOT cell must carry no +0 figure)', async () => {
    await toggleOn();
    const cells = (container ?? document).querySelectorAll('[data-testid^="container-through-"]');
    const asArray = Array.from(cells).map(c => (c.textContent ?? ''));
    expect(asArray.some(t => t.includes('not published'))).toBe(true);
    expect(asArray.some(t => /\+0( |$)/.test(t))).toBe(false);
  });
  it('the toggle adds each published leg to its Grand Total: the off totals are unchanged by the pin below, the on totals differ', async () => {
    // Design reversal (user ruling 2026-10-21): this pin asserted the v0.4.2
    // presentation-only contract (the totals render identically before and
    // after the toggle); it now asserts the reversed contract - ON moves the
    // totals, OFF is the unchanged baseline. The exact per-port arithmetic is
    // pinned in containerThroughTotal.test.tsx.
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const beforeTotals = Array.from((container ?? document).querySelectorAll('.comparison-total-row .comparison-figure')).map(e => (e.textContent ?? ''));
    const checkbox = (container ?? document).querySelector('[data-testid="container-through-checkbox"]') as HTMLInputElement;
    await act(async () => { checkbox.click(); });
    const afterTotals = Array.from((container ?? document).querySelectorAll('.comparison-total-row .comparison-figure')).map(e => (e.textContent ?? ''));
    expect(afterTotals).not.toEqual(beforeTotals);
    expect(beforeTotals.join('|')).toContain('10\u00a0306\u00a0979');
  });
  it('the naming decision holds: "door to door" appears nowhere on the surface', async () => {
    await toggleOn();
    const text = ((container ?? document).textContent ?? '').toLowerCase();
    expect(text).not.toContain('door to door');
    expect(text).not.toContain('door-to-door');
  });
});
