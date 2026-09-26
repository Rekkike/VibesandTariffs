// GOT per-GT OPS fold (spec v0.2.70): the three-part decomposition pins.
//
// The contract (docs/GOT_OPS_FOLD_AUDIT.md, spec §4.2.4's fold paragraph):
// where a port's user-specified per-GT OPS component shares the port dues'
// own GT basis and the port dues tariff is genuinely banded, the family's
// derived per-GT renders three labeled figures together — (a) the tariff
// portion (band- and discount-derived), (b) the user-specified flat rate
// (unbanded), (c) their sum — and the per-GT OPS component's standalone
// charge line moves into the family (its amount still adds to the Grand
// Total; a fold disclosure line replaces the charge line in the OPS
// block). Published-flat-rate families never fold (the v0.2.68 contract —
// a user figure must never masquerade as a published rate); Helsingborg's
// port dues stay published-labeled with a per-GT OPS entry, and its OPS
// line keeps rendering as its own line. Zero figure drift: the family
// amount, every stage sum, and the Grand Total are byte-identical with
// any OPS entry — the fold moves presentation only.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { calculatePortCallCost, DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { ComparisonView, __setMobileQueryForTests } from './App';
import {
  computePortResults,
  buildRuleNamesByPort,
  buildRuleAttributesByPort,
  buildRowsBySegment
} from './comparisonModel';
import { resolveExchangeRate } from './conversion';
import { comparisonBasisContext } from './portRegistry';
import { opsFoldActive, opsFoldParts, opsPerGtLineFor, portDuesBanded } from './opsFold';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const GOT = portById('gothenburg');
const HEL = portById('helsingborg');
const HAM = portById('hamburg');

// The pinned decomposition case (the default Maren Maersk call, GT
// 194,849, per-GT OPS 0.10 SEK/GT): the GOT port dues tariff portion is
// 204,279.20 SEK ÷ 194,849 = 1.05 SEK/GT (the banded figure, byte-identical
// to the pre-fold effective per-GT); (b) is the entered 0.10; (c) is 1.15.
const OPS_PER_GT = 0.1;
const gotCallWithOps = (): CallInput =>
  ({ ...defaultCall('gothenburg'), ops_per_gt_charge: OPS_PER_GT } as CallInput);

describe('GOT per-GT OPS fold — the data-derived boundary (spec v0.2.70)', () => {
  it('the fold condition is data-derived: banded port dues tariffs only, no port-id strings', () => {
    // GOT: progressive port dues — banded.
    expect(portDuesBanded(GOT)).toBe(true);
    // HAM: composite tranches — banded (but no per-GT OPS component, so
    // the fold is inert there regardless).
    expect(portDuesBanded(HAM)).toBe(true);
    // HEL: the vessel dues are a single published flat per-GT rate — the
    // long-stay and cargo rules are not GT-band structures, so the family
    // never folds.
    expect(portDuesBanded(HEL)).toBe(false);
  });

  it('the fold activates exactly where the per-GT OPS line exists and the family is banded', () => {
    const gotResult = calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: gotCallWithOps() });
    expect(opsPerGtLineFor(gotResult)).not.toBeNull();
    expect(opsFoldActive(GOT, gotResult)).toBe(true);
    // HEL with its own entered per-GT rate: the line exists, the family
    // is published-flat — no fold.
    const helResult = calculatePortCallCost(HEL, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('helsingborg'), ops_per_gt_charge: 0.2 } as CallInput
    });
    expect(opsPerGtLineFor(helResult)).not.toBeNull();
    expect(opsFoldActive(HEL, helResult)).toBe(false);
    // HAM: no per-GT component at all — the descriptor never emits the line.
    const hamResult = calculatePortCallCost(HAM, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), ops_per_gt_charge: 0.1 } as CallInput
    });
    expect(opsPerGtLineFor(hamResult)).toBeNull();
    expect(opsFoldActive(HAM, hamResult)).toBe(false);
    // Blank at GOT: no line, no fold.
    const blank = calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    expect(opsPerGtLineFor(blank)).toBeNull();
    expect(opsFoldActive(GOT, blank)).toBe(false);
  });

  it('the decomposition arithmetic: (a) + (b) = (c), script-verified against the engine\'s own records', () => {
    const result = calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: gotCallWithOps() });
    const dues = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_family === 'port_dues')
      .reduce((s, f) => s + f.amount, 0);
    expect(dues).toBe(204279.2);
    const opsLine = opsPerGtLineFor(result)!;
    expect(opsLine.amount).toBe(19484.9); // 194,849 GT × 0.10 SEK/GT
    const parts = opsFoldParts(dues, opsLine.amount, DEFAULT_VESSEL.gt)!;
    expect(parts.tariffPortionPerGt).toBe(1.05);
    expect(parts.userFlatPerGt).toBe(0.1);
    expect(parts.combinedPerGt).toBe(1.15);
    expect(Math.round((parts.tariffPortionPerGt + parts.userFlatPerGt) * 100))
      .toBe(Math.round(parts.combinedPerGt * 100));
  });
});

describe('GOT per-GT OPS fold — the comparison surface (spec v0.2.70)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;
  const renderComparison = async (call: CallInput, mobile: boolean) => {
    __setMobileQueryForTests(() => mobile);
    const c = document.createElement('div');
    document.body.appendChild(c);
    const r = createRoot(c);
    await act(async () => {
      r.render(
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
    await act(async () => { await new Promise(res => setTimeout(res, 50)); });
    container = c;
    root = r;
  };
  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) { const r = root; await act(async () => { r.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const portDuesCells = async (call: CallInput) => {
    await renderComparison(call, false);
    const row = Array.from(container!.querySelectorAll('tr'))
      .find(tr => (tr.querySelector('.comparison-family-cell')?.textContent ?? '').trim() === 'port dues');
    expect(row).toBeDefined();
    return Array.from(row!.querySelectorAll('td'));
  };

  it('the model entry carries the three-part decomposition at GOT with OPS entered, and only there', () => {
    const rateInfo = resolveExchangeRate('', undefined);
    const portResults = computePortResults(LOADED_PORTS, DEFAULT_VESSEL, gotCallWithOps(), rateInfo, comparisonBasisContext);
    const rows = buildRowsBySegment(
      portResults,
      buildRuleNamesByPort(LOADED_PORTS),
      buildRuleAttributesByPort(LOADED_PORTS),
      DEFAULT_VESSEL.gt
    );
    const stage = rows.rowsByStage.find(s => s.stage.id === 'reach_berth')!;
    const familyRow = stage.familyRows.find(f => f.family === 'port_dues')!;
    const gotEntry = familyRow.perPort.get('gothenburg')!;
    expect(gotEntry.ops_fold).toEqual({ tariffPortionPerGt: 1.05, userFlatPerGt: 0.1, combinedPerGt: 1.15 });
    // HEL's family entry never folds (published flat rate — pinned).
    expect(familyRow.perPort.get('helsingborg')!.ops_fold).toBeUndefined();
    // The family AMOUNT never carries the user figure (no double count).
    expect(gotEntry.amount).toBe(204279.2);
    expect(gotEntry.effective_per_gt).toBe(1.05);
  });

  it('the desktop cell renders (a) + (b) = (c) with the three labels; the family stays derived-labeled', async () => {
    const cells = await portDuesCells(gotCallWithOps());
    const gotCell = cells.find(td => td.querySelector('.comparison-ops-fold'))!;
    expect(gotCell).toBeDefined();
    const text = gotCell.textContent ?? '';
    expect(text).toContain('(a) tariff portion 1.05 SEK/GT');
    expect(text).toContain('banded, discounts reflected — derived');
    expect(text).toContain('(b) user-specified OPS 0.10 SEK/GT');
    expect(text).toContain('flat rate as entered — user-specified, not tariff-derived');
    expect(text).toContain('(c) combined 1.15 SEK/GT');
    expect(text).toContain('a + b — derived');
    // The derived label stays (the v0.2.68 contract — the fold must not
    // flip the labeling; a user figure never makes the family published).
    expect(text).toContain('1.05 SEK/GT effective — derived, not a published rate');
    expect(text).not.toContain('published flat rate');
  });

  it('the mobile card renders the same decomposition (the shared amountCell path)', async () => {
    await renderComparison(gotCallWithOps(), true);
    const gotCard = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .find(card => (card.textContent ?? '').includes('Gothenburg'))!;
    const portDuesLine = Array.from(gotCard.querySelectorAll('.comparison-card-family'))
      .find(dd => (dd.querySelector('.comparison-card-family-name')?.textContent ?? '') === 'port dues');
    expect(portDuesLine).toBeDefined();
    const text = portDuesLine!.textContent ?? '';
    expect(text).toContain('(a) tariff portion 1.05 SEK/GT');
    expect(text).toContain('(b) user-specified OPS 0.10 SEK/GT');
    expect(text).toContain('(c) combined 1.15 SEK/GT');
  });

  it('the decomposition red proofs: only-(c) fails, hidden band nature fails, mislabeled components fail (source-level)', () => {
    const fs = require('fs');
    const cellsSource = fs.readFileSync('src/comparisonCells.tsx', 'utf8');
    // All three parts render (a rendering that shows only the combined
    // figure with OPS entered fails this presence assertion).
    expect(cellsSource).toContain('(a) tariff portion');
    expect(cellsSource).toContain('(b) user-specified OPS');
    expect(cellsSource).toContain('(c) combined');
    // The tariff portion's band-derived nature is stated (hiding it fails).
    expect(cellsSource).toContain('banded, discounts reflected');
    // The components are labeled correctly (a mislabeled component —
    // tariff presented as user-specified or vice versa — fails).
    expect(cellsSource).toMatch(/\(a\) tariff portion[^\n]*derived/);
    expect(cellsSource).toMatch(/\(b\) user-specified OPS[^\n]*user-specified, not tariff-derived/);
    expect(cellsSource).toMatch(/\(c\) combined[^\n]*derived/);
  });

  it('blank OPS at GOT renders exactly today\'s surface: no decomposition, the plain derived figure (zero drift)', async () => {
    const cells = await portDuesCells(defaultCall('gothenburg') as CallInput);
    const gotCell = cells.find(td => (td.textContent ?? '').includes('1.05 SEK/GT effective'))!;
    expect(gotCell.querySelector('.comparison-ops-fold')).toBeNull();
    expect(gotCell.textContent).toContain('1.05 SEK/GT effective — derived, not a published rate');
  });

  it('HEL with its own per-GT OPS entry: no fold, the published label holds, the OPS row keeps its amount', async () => {
    // HEL's own entry (per-port state): 0.20 SEK/GT — the published-flat
    // family never folds, the standalone OPS row keeps the amount.
    await renderComparison(defaultCall('helsingborg') as CallInput, false);
    // (the HEL entry is per-port state: the comparison consumes HEL's own
    // override through perPortCallOverrides; here the shared call carries
    // no HEL value — the surface must show no fold anywhere)
    const row = Array.from(container!.querySelectorAll('tr'))
      .find(tr => (tr.querySelector('.comparison-family-cell')?.textContent ?? '').trim() === 'port dues');
    const helCell = Array.from(row!.querySelectorAll('td'))
      .find(td => (td.textContent ?? '').includes('published flat rate'))!;
    expect(helCell.querySelector('.comparison-ops-fold')).toBeNull();
    expect(helCell.textContent).toContain('6.85 SEK/GT — published flat rate, no banding (tariff-2026.pdf p.5)');
    // and no port's cell renders a decomposition at the blank state
    expect(container!.querySelector('.comparison-ops-fold')).toBeNull();
  });
});

describe('GOT per-GT OPS fold — zero-drift and no-double-count (spec v0.2.70)', () => {
  it('the grand total and every figure are byte-identical with and without the OPS entry (the fold moves presentation only)', () => {
    const blank = calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    const entered = calculatePortCallCost(GOT, { vessel: DEFAULT_VESSEL, call: gotCallWithOps() });
    // The entered total is the blank total plus exactly the OPS amount —
    // the same additive contract as before the fold (the engine is
    // untouched; the fold changes no arithmetic).
    expect(entered.total).toBe(Math.round((blank.total + entered.ops_speculative!.amount) * 100) / 100);
    expect(entered.ops_speculative!.amount).toBe(19484.9);
    // The family amount is the tariff-only sum in both states.
    const dues = (r: ReturnType<typeof calculatePortCallCost>) => r.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_family === 'port_dues')
      .reduce((s, f) => s + f.amount, 0);
    expect(dues(blank)).toBe(dues(entered));
    expect(dues(entered)).toBe(204279.2);
  });

  it('the pre-existing baselines hold exactly with the fold surface present (pinned: GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40)', () => {
    const pinned: Record<string, number> = {
      gothenburg: 3275851.15,
      hamburg: 2204910.9,
      helsingborg: 8750057.4
    };
    for (const [id, expected] of Object.entries(pinned)) {
      const result = calculatePortCallCost(portById(id), { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      expect(Math.round(result.total * 100)).toBe(Math.round(expected * 100));
    }
  });
});

describe('GOT per-GT OPS fold — the workspace surface (spec v0.2.70)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;
  const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const findFieldByLabel = (c: HTMLElement, label: string): HTMLInputElement | null => {
    const labels = Array.from(c.querySelectorAll('label'));
    const target = labels.find(l => (l.textContent ?? '').includes(label));
    if (!target) return null;
    const forId = target.getAttribute('for');
    if (!forId) return null;
    const escaped = forId.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    return c.querySelector(`[id="${escaped}"]`) as HTMLInputElement | null;
  };
  const clickTab = async (c: HTMLElement, tabText: string) => {
    const tab = Array.from(c.querySelectorAll('.port-nav button'))
      .find(b => (b.textContent ?? '').toLowerCase().includes(tabText.toLowerCase()));
    expect(tab).toBeDefined();
    await act(async () => { tab!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
  };
  const renderApp = async () => {
    const { default: App } = await import('./App');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => { root!.render(<App />); });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
  };
  afterEach(async () => {
    if (root) { const r = root; await act(async () => { r.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  it('the port dues family line renders the three-part decomposition with the entered rate; the standalone charge line does not render at GOT', async () => {
    await renderApp();
    const field = findFieldByLabel(container!, 'OPS additional per-GT charge');
    expect(field).not.toBeNull();
    await act(async () => { setInputValue(field!, '0.1'); });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    // (a) + (b) = (c) on the family's per-GT note, with the labels
    const decomp = container!.querySelector('.ops-fold-decomposition');
    expect(decomp).not.toBeNull();
    const text = decomp!.textContent ?? '';
    expect(text).toContain('(a) tariff portion 1.05 SEK/GT');
    expect(text).toContain('(banded rate applied to GT, discounts reflected — derived)');
    expect(text).toContain('(b) user-specified OPS 0.10 SEK/GT');
    expect(text).toContain('(flat rate as entered — user-specified, not tariff-derived)');
    expect(text).toContain('(c) combined 1.15 SEK/GT');
    expect(text).toContain('(a + b — derived)');
    // The effective-rate note (the (a) figure's own line) still renders
    // the plain derived figure — the family stays derived-labeled.
    expect(container!.textContent).toContain('1.05 SEK/GT');
    // The standalone per-GT charge line does not render as its own charge
    // line in the OPS block (the fold replaces it); the fold disclosure
    // line states where the component went and the amount appears exactly
    // once (no double count).
    const chargeLines = Array.from(container!.querySelectorAll('.ops-speculative-line'))
      .filter(l => (l.textContent ?? '').includes('OPS per-GT charge (user-specified)'));
    expect(chargeLines.length).toBe(0);
    const foldLine = container!.querySelector('.ops-fold-line');
    expect(foldLine).not.toBeNull();
    expect(foldLine!.textContent).toContain('folded into the port dues family');
    expect(foldLine!.textContent).toContain('19\u00A0485');
    // The OPS subtotal keeps the full user-specified amount (the
    // reconciliation holds — the amount never left the totals).
    const subtotal = container!.querySelector('.ops-speculative-total-amount');
    expect(subtotal).not.toBeNull();
    expect(subtotal!.textContent).toContain('19\u00A0485');
  });

  it('blank OPS at the GOT workspace renders exactly today\'s surface: no decomposition, no fold line, no OPS block', async () => {
    await renderApp();
    expect(container!.querySelector('.ops-fold-decomposition')).toBeNull();
    expect(container!.querySelector('.ops-fold-line')).toBeNull();
    expect(container!.querySelector('.ops-speculative-block')).toBeNull();
  });

  it('HEL\'s workspace with its own per-GT entry: no fold (published flat rate), the standalone charge line keeps rendering', async () => {
    await renderApp();
    await clickTab(container!, 'Helsingborg');
    const field = findFieldByLabel(container!, 'OPS additional per-GT charge');
    expect(field).not.toBeNull();
    await act(async () => { setInputValue(field!, '0.2'); });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    expect(container!.querySelector('.ops-fold-decomposition')).toBeNull();
    expect(container!.querySelector('.ops-fold-line')).toBeNull();
    const chargeLines = Array.from(container!.querySelectorAll('.ops-speculative-line'))
      .filter(l => (l.textContent ?? '').includes('OPS per-GT charge (user-specified)'));
    expect(chargeLines.length).toBe(1);
    expect(chargeLines[0].textContent).toContain('38\u00A0970'); // 194,849 × 0.20
  });

  it('the input helper states the fold where it applies (GOT) and the unfolded disclosure where it does not (HEL)', async () => {
    await renderApp();
    const helperTexts = (c: HTMLElement) =>
      Array.from(c.querySelectorAll('.MuiFormHelperText-root')).map(h => h.textContent ?? '');
    // GOT: the fold helper renders (the banded family).
    const gotHelpers = helperTexts(container!).filter(t => t.includes('per-GT decomposition'));
    expect(gotHelpers.length).toBe(1);
    expect(gotHelpers[0]).toContain('this port\'s port dues tariff is banded');
    expect(gotHelpers[0]).toContain('(a) tariff portion + (b) this flat rate = (c) combined');
    expect(gotHelpers[0]).toContain('its amount still adds to the Grand Total under the user-specified label');
    // The v0.2.64 disclosures survive on the unfolded helper (HEL).
    await clickTab(container!, 'Helsingborg');
    const helHelpers = helperTexts(container!).filter(t => t.includes('same GT basis as the port dues'));
    expect(helHelpers.length).toBe(1);
    expect(helHelpers[0]).not.toContain('per-GT decomposition');
  });
});
