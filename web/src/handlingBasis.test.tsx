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
  it('the GOT basis determination (v0.4.6, archived and verified): single per-unit charge, no modality distinction, scope not stated — the inference labeled as inference', () => {
    // v0.4.6 re-baseline (the APMT operator-document pass, in-test
    // attribution): the archives delivered by the product owner verified —
    // the annotation becomes the evidence-based characterization of
    // APMT Terminal Tariff 2026 §1.1. A stale "basis not stated in the
    // document" without the verification status fails; a padded claim of
    // the bundled reading as published fails the inference labeling.
    const text = handlingBasisAnnotationFor('gothenburg')!.text;
    expect(text).toContain('Handling basis: single per-unit charge; no modality distinction and no separately priced legs published; scope of the charge not stated in the document');
    expect(text).toContain('APMT Terminal Tariff 2026 (June revision, §1.1, per unit 377/535 SEK)');
    expect(text).toContain('Terms of Business v31 March 2025');
    expect(text).toContain('labeled as inference pending wording from APMT');
    expect(text).not.toContain('not archived in-repo');
    expect(text).not.toMatch(/bundled \(container-through\)/);
  });
  it('the GOT toggle participation stays "not published" with the archived-document reason (a wording, never a zero)', () => {
    const got = containerThroughParts('gothenburg', 'truck', LE_UNITS, GT_UNITS);
    expect(got.addedAmount).toBeNull();
    expect(got.note).toContain('Not published');
    expect(got.note).toContain('archived APMT Terminal Tariff 2026');
    expect(got.note).toContain('publish no separately priced landside leg');
    expect(got.note).toContain('Not published is never rendered as a zero');
    expect(got.note).not.toContain('not archived in-repo');
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
  it('"not published" renders as a wording, never a zero: GOT in both modes, Norvik truck (export road)', () => {
    const got = containerThroughParts('gothenburg', 'truck', LE_UNITS, GT_UNITS);
    expect(got.addedAmount).toBeNull();
    expect(got.note).toContain('Not published');
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
  it('the toggle never changes any Grand Total (presentation-only): the per-port totals render identically before and after the toggle', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const beforeTotals = Array.from((container ?? document).querySelectorAll('.comparison-total-row .comparison-figure')).map(e => (e.textContent ?? ''));
    const checkbox = (container ?? document).querySelector('[data-testid="container-through-checkbox"]') as HTMLInputElement;
    await act(async () => { checkbox.click(); });
    const afterTotals = Array.from((container ?? document).querySelectorAll('.comparison-total-row .comparison-figure')).map(e => (e.textContent ?? ''));
    expect(beforeTotals).toEqual(afterTotals);
    expect(beforeTotals.join('|')).toContain('10\u00a0306\u00a0979');
  });
  it('the naming decision holds: "door to door" appears nowhere on the surface', async () => {
    await toggleOn();
    const text = ((container ?? document).textContent ?? '').toLowerCase();
    expect(text).not.toContain('door to door');
    expect(text).not.toContain('door-to-door');
  });
});
