// Structural-presence pins (spec v0.2.55) — the silent-regression insurance.
//
// The v0.2.54 pass proved the pattern: a summary surface whose structure no
// test asserts can regress silently (the mobile card lost its Grand-Total
// lead for two versions before anyone noticed). This suite extends the
// presence-and-order pin pattern to the remaining uncovered summary
// surfaces. Presence and order only — no behavior assertions:
//   1. Desktop comparison table: the Grand Total row renders beneath the
//      stage rows; the three stage rows render in canonical order; the
//      charge-type rows nest within their stages (DOM-order assertions).
//   2. Mobile comparison cards: the three charge-type lines and the
//      "not levied at this port" absence wording render on the cards
//      (currently pinned on desktop only).
//   3. Mobile zero-suppression re-activation: entering storage days renders
//      the storage line on the mobile card (currently pinned on desktop
//      only).
// Every pin here was proven red against a temporarily reverted surface
// (DOM-order assertions fail when the structure is broken) before being
// trusted green.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView, __setMobileQueryForTests } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const renderComparison = async (mobile: boolean, call: CallInput) => {
  __setMobileQueryForTests(() => mobile);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={DEFAULT_VESSEL}
        call={call}
        selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
        onSelectionChange={() => {}}
        activeVessel="TEST"
      />
    );
  });
  return { container, root };
};

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

// ---- 1. Desktop comparison table: order and nesting --------------------

describe('desktop comparison table structure (spec v0.2.55 structural pins)', () => {
  it('the three stage rows render in canonical order: To reach the berth, At the berth, Quayside operations', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const stageRows = container!.querySelectorAll('.comparison-stage-row');
    expect(stageRows.length).toBe(3);
    expect(stageRows[0].textContent).toContain('To reach the berth');
    expect(stageRows[1].textContent).toContain('At the berth');
    expect(stageRows[2].textContent).toContain('Quayside operations');
    // canonical order, adjacent in the DOM
    expect(
      stageRows[0].compareDocumentPosition(stageRows[1]) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      stageRows[1].compareDocumentPosition(stageRows[2]) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('the Grand Total row renders beneath the stage rows', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const stageRows = container!.querySelectorAll('.comparison-stage-row');
    expect(stageRows.length).toBe(3);
    // the desktop total row is the last .comparison-total-row; every stage
    // row precedes it (the desktop structure keeps the Grand Total as the
    // table's closing row — its correct structure per v0.2.54)
    const totalRows = Array.from(container!.querySelectorAll('.comparison-total-row'));
    expect(totalRows.length).toBeGreaterThan(0);
    // the Grand Total row is the total row carrying the label (the Vessel
    // Access aggregate row shares the total-row class by styling)
    const totalRow = totalRows.find(r => (r.textContent ?? '').includes('Grand Total'));
    expect(totalRow).toBeDefined();
    const totalRowEl: Element = totalRow!;
    for (const stage of Array.from(stageRows)) {
      expect(
        stage.compareDocumentPosition(totalRowEl) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    expect(totalRowEl.textContent).toContain('Grand Total');
  });

  it('charge-type rows nest within their stages: each stage row is followed by its charge-type rows before the next stage row', async () => {
    ({ container, root } = await renderComparison(false, defaultCall('gothenburg')));
    const stageRows = Array.from(container!.querySelectorAll('.comparison-stage-row'));
    const chargeTypeRows = Array.from(container!.querySelectorAll('.comparison-chargetype-row'));
    expect(chargeTypeRows.length).toBe(3);
    // every charge-type row sits between two adjacent stage rows (its own
    // stage's row above it and either the next stage row or the table end
    // below it) — i.e. each stage row is immediately followed (in DOM
    // order, before the next stage row) by at least one charge-type row
    const stagePositions = stageRows.map(r => Array.prototype.indexOf.call(r.closest('table')!.querySelectorAll('tr'), r));
    const chargePositions = chargeTypeRows.map(r => Array.prototype.indexOf.call(r.closest('table')!.querySelectorAll('tr'), r));
    for (let i = 0; i < stagePositions.length; i++) {
      const lower = i + 1 < stagePositions.length ? stagePositions[i + 1] : Number.MAX_SAFE_INTEGER;
      const nested = chargePositions.filter(p => p > stagePositions[i] && p < lower);
      expect(nested.length).toBeGreaterThan(0);
    }
    // and no charge-type row renders before the first stage row
    for (const p of chargePositions) {
      expect(p).toBeGreaterThan(stagePositions[0]);
    }
  });
});

// ---- 2. Mobile comparison cards: presence pins --------------------------

describe('mobile comparison card structure (spec v0.2.55 structural pins)', () => {
  it('the three charge-type lines render on the cards (Fairway dues, Berth dues, Cargo dues)', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg')));
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    for (const card of Array.from(cards)) {
      const chargeTypeCells = card.querySelectorAll('.comparison-card-chargetype');
      expect(chargeTypeCells.length).toBe(3);
      const labels = Array.from(chargeTypeCells).map(c => (c.textContent ?? '').trim());
      expect(labels.some(t => t.includes('Fairway dues'))).toBe(true);
      expect(labels.some(t => t.includes('Berth dues'))).toBe(true);
      expect(labels.some(t => t.includes('Cargo dues'))).toBe(true);
    }
  });

  it('the "not levied at this port" absence wording renders on the cards', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg')));
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    let totalAbsence = 0;
    for (const card of Array.from(cards)) {
      const absences = Array.from(card.querySelectorAll('.comparison-not-levied'));
      totalAbsence += absences.length;
      for (const el of absences) {
        expect((el.textContent ?? '').trim()).toBe('not levied at this port');
      }
    }
    // absence structure is present on the mobile surface (e.g. GOT/HAM
    // cargo dues, the Swedish ports' berth dues) — the wording renders,
    // never hidden
    expect(totalAbsence).toBeGreaterThan(0);
  });
});

// ---- 3. Mobile zero-suppression re-activation ---------------------------

describe('mobile zero-suppression re-activation (spec v0.2.55 structural pin)', () => {
  it('entering storage days renders the storage line on the mobile card', async () => {
    ({ container, root } = await renderComparison(true, {
      ...defaultCall('gothenburg'),
      storage_days_export: 10,
      storage_days_import: 10
    } as CallInput));
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    // the storage family line renders on each card that levies it (GOT
    // storage fires at 10 days beyond free time; the figure is not
    // asserted here — presence and order only)
    const got = Array.from(cards).find(c => (c.textContent ?? '').includes('Gothenburg'));
    expect(got).toBeDefined();
    const storageLine = Array.from(got!.querySelectorAll('.comparison-card-family'))
      .find(el => (el.textContent ?? '').toLowerCase().includes('storage'));
    expect(storageLine).toBeDefined();
  });

  it('without storage days the storage line stays suppressed on the mobile card (suppression pinned on the mobile surface)', async () => {
    ({ container, root } = await renderComparison(true, defaultCall('gothenburg')));
    const got = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(c => (c.textContent ?? '').includes('Gothenburg'));
    expect(got).toBeDefined();
    const storageLine = Array.from(got!.querySelectorAll('.comparison-card-family'))
      .find(el => (el.textContent ?? '').toLowerCase().includes('storage'));
    expect(storageLine).toBeUndefined();
  });
});
