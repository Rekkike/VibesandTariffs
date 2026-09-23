// Derivation-transparency render tests (spec v0.2.42, section 4.8
// Derivation Transparency contract). The contract: every fee line exposes
// its derivation — bands, components, adjustment order, flags adjacent —
// in both the per-port surface (full DerivationDetail) and the comparison
// surface (condensed); a fee whose structure is flat shows its single
// computation, not an empty panel. The UI renders the engine-exposed steps
// and never recomputes — these tests render real engine results:
//   - Hamburg port fee (CP1 worked-example inputs): tranche bands, the
//     two-component band sums, the four-step adjustment stack in the
//     tariff's stated order with deltas, and the S1 printed composition
//     (32,838.88 / 7,022.54 / 39,861.43).
//   - Gothenburg container dues (WE-GOT-1 inputs): progressive band rows
//     and the additive ESI/CSI discount step.
//   - Hamburg towage (flat): the single Computation step, not an empty
//     panel — and its assumed-parameter flags render adjacent inside the
//     derivation detail, not in a distant section.
// Condensed-derivation rendering in the comparison surfaces (desktop cells
// and the mobile card layout) is pinned in responsive.test.tsx.
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { DerivationDetail, condensedDerivation } from './derivation';
import { calculatePortCallCost } from '@port-cost/core';
import type { CostCalculationInput, FeeResult, PortDefinition } from '@port-cost/core';
import portsRegistry from './data/ports.json';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portOf = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;

const feesOf = (result: ReturnType<typeof calculatePortCallCost>): FeeResult[] =>
  result.billers.flatMap(b => b.fees);
const feeByRule = (result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult => {
  const fee = feesOf(result).find(f => f.fee_rule_id === ruleId);
  if (!fee) throw new Error(`Fee rule ${ruleId} not found`);
  return fee;
};

// CP1 inputs (S1 p.8): 149,000 GT, Tier III, ESI air 80, OPS, quantum 30 m GT.
const cp1 = (): CostCalculationInput => ({ vessel: { gt: 149000 }, call: {
  port_id: 'hamburg', date: '2026-06-01', vessel_type: 'container',
  containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
  containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
  calls_this_month: 1, flag_state: 'non-EU', ops_usage: true,
  pilotage_required: true, engine_tier: 'Tier III', engine_tier_estimated: false,
  esi_score: 80, quantum_prior_year_gt: 30000000 } as CostCalculationInput['call'] });

// WE-GOT-1 inputs: 70,000 GT EU container vessel, ESI 40 (scored discount).
const weGot1 = (): CostCalculationInput => ({ vessel: { gt: 70000, nt: 35000, loa_m: 300 }, call: {
  port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
  containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
  containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
  calls_this_month: 1, flag_state: 'EU', esi_score: 40, csi_class: 'A',
  fossil_free_fuel_percentage: 0, ops_usage: false, lay_up_days: 0,
  pilotage_required: true, pilotage_hours: 2, sludge_extra_m3: 4 } as CostCalculationInput['call'] });

const hamburgResult = calculatePortCallCost(portOf('hamburg'), cp1());
const hamburgPortFee = feeByRule(hamburgResult, 'hpa_port_fee');
const hamburgTowage = feeByRule(hamburgResult, 'hamburg_towage_estimate');
const gothenburgDues = feeByRule(
  calculatePortCallCost(portOf('gothenburg'), weGot1()),
  'port_gothenburg_container_vessel_dues'
);

describe('Derivation transparency (spec v0.2.42) — DerivationDetail rendering', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  const renderDetail = async (fee: FeeResult) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<DerivationDetail fee={fee} />);
    });
  };

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('Hamburg port fee: structure label, three tranche bands with GT ranges and amounts, band sum', async () => {
    await renderDetail(hamburgPortFee);
    expect(container!.querySelector('.derivation-detail')).not.toBeNull();
    expect(container!.querySelector('.derivation-structure-label')!.textContent)
      .toBe('Composite tranches by GT');
    const bandRows = Array.from(container!.querySelectorAll('.derivation-band-table tbody tr'));
    expect(bandRows.length).toBe(4); // 3 tranche bands + band sum row
    expect(bandRows[0].textContent).toContain('gt 0–20,000');
    expect(bandRows[0].textContent).toContain('GT component: 0.0856 × 20,000 = 1,712.00');
    expect(bandRows[0].textContent).toContain('Environmental component: 0.0214 × 20,000 = 428.00');
    expect(bandRows[0].textContent).toContain('2,140.00');
    expect(bandRows[1].textContent).toContain('gt 20,000–100,000');
    expect(bandRows[1].textContent).toContain('29,816.00');
    expect(bandRows[2].textContent).toContain('gt 100,000–∞');
    expect(bandRows[2].textContent).toContain('15,219.40');
    expect(bandRows[3].textContent).toContain('Band sum');
    expect(bandRows[3].textContent).toContain('47,175.40');
  });

  it('Hamburg port fee: the two components with band sums, then the adjustment stack in the tariff\'s stated order with deltas', async () => {
    await renderDetail(hamburgPortFee);
    const steps = Array.from(container!.querySelectorAll('.derivation-step'));
    const labels = steps.map(s => (s.querySelector('.derivation-step-label')?.textContent ?? ''));
    // Order contract: bands → GT component → Environmental component →
    // GT—OPS rebate → GT—Quantum → Env—Tier → Env—ESI air → composition.
    expect(labels.indexOf('Tranche bands charged')).toBeLessThan(labels.indexOf('GT component'));
    expect(labels.indexOf('GT component')).toBeLessThan(labels.indexOf('Environmental component'));
    expect(labels.indexOf('Environmental component')).toBeLessThan(labels.indexOf('GT component — OPS rebate'));
    expect(labels.indexOf('GT component — OPS rebate')).toBeLessThan(labels.indexOf('GT component — Quantum'));
    expect(labels.indexOf('GT component — Quantum')).toBeLessThan(labels.indexOf('Environmental component — Tier adjustment'));
    expect(labels.indexOf('Environmental component — Tier adjustment')).toBeLessThan(labels.indexOf('Environmental component — ESI air'));
    expect(labels.indexOf('Environmental component — ESI air')).toBeLessThan(labels.indexOf('Components after adjustments'));
    // Deltas render signed with the − sign (reductions).
    const opsStep = steps.find(s => s.textContent?.includes('GT component — OPS rebate'))!;
    expect(opsStep.querySelector('.derivation-step-amount')!.textContent).toContain('−2,235.00 EUR');
    const quantumStep = steps.find(s => s.textContent?.includes('GT component — Quantum'))!;
    expect(quantumStep.querySelector('.derivation-step-amount')!.textContent).toContain('−2,662.62 EUR');
    const tierStep = steps.find(s => s.textContent?.includes('Environmental component — Tier adjustment'))!;
    expect(tierStep.querySelector('.derivation-step-amount')!.textContent).toContain('−1,887.78 EUR');
    const esiStep = steps.find(s => s.textContent?.includes('Environmental component — ESI air'))!;
    expect(esiStep.querySelector('.derivation-step-amount')!.textContent).toContain('−528.58 EUR');
  });

  it('Hamburg port fee: the composition reproduces the S1 printed figures and the fee total', async () => {
    await renderDetail(hamburgPortFee);
    const composition = Array.from(container!.querySelectorAll('.derivation-step'))
      .find(s => s.querySelector('.derivation-step-label')?.textContent === 'Components after adjustments')!;
    const componentLines = Array.from(composition.querySelectorAll('.derivation-component-line'));
    expect(componentLines.length).toBe(2);
    expect(componentLines[0].textContent).toContain('GT component');
    expect(componentLines[0].querySelector('.derivation-component-amount')!.textContent)
      .toContain('32,838.88 EUR');
    expect(componentLines[1].textContent).toContain('Environmental component');
    expect(componentLines[1].querySelector('.derivation-component-amount')!.textContent)
      .toContain('7,022.54 EUR');
    const feeTotal = Array.from(container!.querySelectorAll('.derivation-step'))
      .find(s => s.querySelector('.derivation-step-label')?.textContent === 'Fee total')!;
    expect(feeTotal.querySelector('.derivation-component-amount')!.textContent)
      .toContain('32,838.88 EUR');
  });

  it('Gothenburg container dues: progressive band rows with GT ranges, rates, and amounts', async () => {
    await renderDetail(gothenburgDues);
    expect(container!.querySelector('.derivation-structure-label')!.textContent)
      .toBe('Progressive by GT');
    const bandRows = Array.from(container!.querySelectorAll('.derivation-band-table tbody tr'));
    expect(bandRows.length).toBe(5); // 4 charged bands + band sum
    expect(bandRows[0].textContent).toContain('gt 0–20,000');
    expect(bandRows[0].textContent).toContain('39,200.00');
    expect(bandRows[1].textContent).toContain('gt 20,000–40,000');
    expect(bandRows[1].textContent).toContain('34,200.00');
    expect(bandRows[2].textContent).toContain('gt 40,000–60,000');
    expect(bandRows[2].textContent).toContain('23,000.00');
    expect(bandRows[3].textContent).toContain('gt 60,000–∞');
    expect(bandRows[3].textContent).toContain('8,000.00');
    expect(bandRows[4].textContent).toContain('Band sum');
    expect(bandRows[4].textContent).toContain('104,400.00');
  });

  it('Gothenburg container dues: the ESI/CSI discount renders as a negative adjustment step, then the fee total', async () => {
    await renderDetail(gothenburgDues);
    const steps = Array.from(container!.querySelectorAll('.derivation-step'));
    const adjStep = steps.find(s => s.textContent?.includes('Additive discounts/surcharges'))!;
    expect(adjStep.querySelector('.derivation-step-detail')!.textContent).toContain('-10%');
    expect(adjStep.querySelector('.derivation-step-amount')!.textContent).toContain('−10,440.00 SEK');
    const feeTotal = steps.find(s => s.querySelector('.derivation-step-label')?.textContent === 'Fee total')!;
    expect(feeTotal.querySelector('.derivation-step-amount')!.textContent)
      .toContain('93,960.00 SEK');
  });

  it('a flat fee shows its single computation, not an empty panel', async () => {
    await renderDetail(hamburgTowage);
    expect(container!.querySelector('.derivation-structure-label')!.textContent).toBe('Flat rate');
    const steps = Array.from(container!.querySelectorAll('.derivation-step'));
    expect(steps.length).toBeGreaterThan(0); // never an empty panel
    const computation = steps.find(s => s.querySelector('.derivation-step-label')?.textContent === 'Computation')!;
    expect(computation).toBeDefined();
    expect(computation.querySelector('.derivation-step-detail')!.textContent).toContain('Flat rate: 15000');
    // The Computation step carries its own amount (composition kind).
    expect(computation.querySelector('.derivation-step-amount')!.textContent).toContain('15,000.00 EUR');
    const feeTotal = steps.find(s => s.querySelector('.derivation-step-label')?.textContent === 'Fee total')!;
    // A Fee-total step with no components renders its own amount line.
    expect(feeTotal.querySelector('.derivation-step-amount')!.textContent).toContain('15,000.00 EUR');
  });

  it('flags and assumed-parameter notices render inside the derivation detail, adjacent to the figures', async () => {
    await renderDetail(hamburgTowage);
    const flagsBox = container!.querySelector('.derivation-detail > .derivation-flags');
    expect(flagsBox).not.toBeNull(); // inside the derivation detail itself
    const details = Array.from(flagsBox!.querySelectorAll('.derivation-flag-detail'));
    expect(details.length).toBe(hamburgTowage.quality_flags.length);
    expect(details[0].textContent).toMatch(/^\[INFO\] estimated; no published tariff/);
    // No other surface renders the per-fee flag prose: the old distant
    // per-fee flag list is gone (only the call-level aggregate survives).
    expect(appSource).not.toMatch(/fee\.quality_flags\.map/);
  });

  it('the derivation detail is a labeled section (reading order), and a fee without derivation renders nothing', async () => {
    await renderDetail(hamburgPortFee);
    const section = container!.querySelector('.derivation-detail');
    expect(section!.getAttribute('aria-label')).toBe('Fee derivation');
    // A fee with no derivation (older saved results) renders no empty panel.
    const bare = { ...hamburgPortFee, derivation: undefined };
    await renderDetail(bare as FeeResult);
    expect(container!.querySelector('.derivation-detail')).toBeNull();
  });
});

describe('Derivation transparency — condensed derivation (comparison surfaces)', () => {
  it('Hamburg port fee condenses to structure + printed composition figures', () => {
    const c = condensedDerivation(hamburgPortFee)!;
    expect(c).not.toBeNull();
    expect(c.structure).toBe('Composite tranches by GT');
    expect(c.composition).toContain('GT component: 32,838.88');
    expect(c.composition).toContain('Environmental component: 7,022.54');
    expect(c.total).toBe('39,861.43');
  });

  it('Gothenburg dues condense to structure + the discount with its delta (the band detail stays on the per-port view)', () => {
    const c = condensedDerivation(gothenburgDues)!;
    expect(c.structure).toBe('Progressive by GT');
    // No raw band arithmetic string in the condensed form.
    expect(c.composition).not.toMatch(/20000 \* 1\.96/);
    expect(c.composition).toContain('Additive discounts/surcharges (off the pre-adjustment base): −10,440.00');
    expect(c.total).toBe('93,960.00');
  });

  it('a flat fee condenses to its computation line (never an empty string)', () => {
    const c = condensedDerivation(hamburgTowage)!;
    expect(c.structure).toBe('Flat rate');
    expect(c.composition).toContain('Flat rate: 15000');
    expect(c.total).toBe('15,000.00');
  });

  it('a fee without derivation condenses to null (the line renders without the block)', () => {
    const bare = { ...hamburgTowage, derivation: undefined };
    expect(condensedDerivation(bare as FeeResult)).toBeNull();
  });

  it('the comparison render path wires the condensed derivation into both layouts (desktop cells and mobile cards)', () => {
    // amountCell renders the condensed block for every line that carries one;
    // the same helper feeds the desktop table cells and the mobile cards, so
    // the condensed derivation appears on both surfaces.
    expect(appSource).toContain('comparison-derivation-condensed');
    expect(appSource).toContain('comparison-derivation-structure');
    expect(appSource).toContain('comparison-derivation-composition');
    expect(appSource).toMatch(/derivation: condensedDerivation\(fee\)/);
    // Mobile cards route through the same amountCell as desktop cells.
    const cardIdx = appSource.indexOf('comparison-card-family');
    const cellIdx = appSource.indexOf('amountCell(');
    expect(cellIdx).toBeGreaterThan(-1);
    expect(cardIdx).toBeGreaterThan(-1);
  });
});
