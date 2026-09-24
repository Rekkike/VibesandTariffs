/**
 * Derivation-transparency exposure tests (spec v0.2.42).
 *
 * The engine exposes its computation structure as FeeResult.derivation:
 * ordered steps (bands → components → adjustments → composition), each with
 * the figure it produced. This is presentation data — the contract it pins:
 *
 * 1. Every fee line carries a derivation (no line renders an empty panel).
 * 2. A composite-tranche rule (HPA port fee) reproduces its full derivation
 *    against the CP1 worked example — tranche bands, per-component band sums,
 *    the adjustment stack in the tariff's stated order with deltas, and the
 *    printed component figures (32,838.88 / 7,022.54 / 39,861.43).
 * 3. A progressive rule (Gothenburg container dues) exposes one band row
 *    per band actually charged with rate, quantity, and amount.
 * 4. A storage day ladder (banded_by_time) exposes one band row per time
 *    band that fired, with the days charged in that band.
 * 5. A flat/simple rule exposes its single computation, not an empty panel.
 * 6. Zero figure drift: the derivation never changes an amount — the
 *    default-call Grand Totals at all three ports are identical with the
 *    exposure in place (pinned to the cent in the v0.2.41 ledger).
 */
import { calculatePortCallCost, evaluateFeeRule } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { CostCalculationInput, FeeResult, PortDefinition } from '../src/types';
import * as path from 'path';

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(__dirname, '..', 'data', `${id}_2026.yaml`)).port;
}

function feesOf(result: ReturnType<typeof calculatePortCallCost>): FeeResult[] {
  return result.billers.flatMap(b => b.fees);
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  const fee = feesOf(result).find(f => f.fee_rule_id === ruleId);
  if (!fee) throw new Error(`Fee rule ${ruleId} not found in result`);
  return fee;
}

const hamburg = loadPort('hamburg');
const gothenburg = loadPort('gothenburg');
const helsingborg = loadPort('helsingborg');

// CP1 inputs (S1 p.8): 149,000 GT, Tier III, ESI air 80, OPS, quantum 30 m GT.
const cp1 = (): CostCalculationInput => ({
  vessel: { gt: 149000 },
  call: {
    port_id: 'hamburg', date: '2026-06-01', vessel_type: 'container',
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
    calls_this_month: 1, flag_state: 'non-EU', ops_usage: true,
    pilotage_required: true,
    engine_tier: 'Tier III', engine_tier_estimated: false,
    esi_score: 80, quantum_prior_year_gt: 30000000
  } as CostCalculationInput['call']
});

describe('Derivation transparency (spec v0.2.42) — every fee line carries a derivation', () => {
  it('every fee line at all three ports (default call) carries a non-empty derivation', () => {
    for (const [port, id] of [[gothenburg, 'gothenburg'], [hamburg, 'hamburg'], [helsingborg, 'helsingborg']] as [PortDefinition, string][]) {
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      for (const fee of feesOf(result)) {
        expect(fee.derivation).toBeDefined();
        expect(fee.derivation!.steps.length).toBeGreaterThan(0);
        // The ordered composition ends in a fee-total step equal to the amount.
        const last = fee.derivation!.steps[fee.derivation!.steps.length - 1];
        expect(last.kind).toBe('composition');
        expect(last.label).toBe('Fee total');
        expect(last.amount).toBe(fee.amount);
      }
    }
  });
});

describe('Derivation transparency — composite tranche (HPA port fee, CP1)', () => {
  const result = calculatePortCallCost(hamburg, cp1());
  const portFee = feeByRule(result, 'hpa_port_fee');
  const d = portFee.derivation!;

  it('the structure label names the composite tranche structure', () => {
    expect(d.structure_label).toBe('Composite tranches by GT');
  });

  it('exposes the three tranche bands actually charged with per-component rates and amounts', () => {
    const bandsStep = d.steps.find(s => s.kind === 'bands')!;
    expect(bandsStep).toBeDefined();
    expect(bandsStep.bands!.length).toBe(3);
    expect(bandsStep.bands!.map(b => b.quantity)).toEqual([20000, 80000, 49000]);
    // Band amounts are the pre-adjustment disp chain: GT+env per tranche.
    expect(bandsStep.bands!.map(b => b.amount)).toEqual([2140, 29816, 15219.40]);
    expect(bandsStep.amount).toBe(47175.40);
  });

  it('exposes the per-component band sums before adjustments', () => {
    const compSteps = d.steps.filter(s => s.kind === 'components');
    expect(compSteps.map(c => c.label)).toEqual(['GT component', 'Environmental component']);
    expect(compSteps[0].amount).toBe(37736.50);
    expect(compSteps[1].amount).toBe(9438.90);
  });

  it('exposes the adjustment stack in the tariff\'s stated order with deltas', () => {
    const adjSteps = d.steps.filter(s => s.kind === 'adjustment');
    // GT: OPS rebate, then Quantum. Env: Tier, then ESI air.
    expect(adjSteps.map(a => a.label)).toEqual([
      'GT component — OPS rebate',
      'GT component — Quantum',
      'Environmental component — Tier adjustment',
      'Environmental component — ESI air'
    ]);
    expect(adjSteps[0].amount).toBe(-2235.00);
    expect(adjSteps[1].amount).toBe(-2662.62);
    expect(adjSteps[2].amount).toBe(-1887.78);
    expect(adjSteps[3].amount).toBe(-528.58);
  });

  it('the composition step reproduces the S1 printed component figures and total', () => {
    const composition = d.steps.find(s => s.kind === 'composition' && s.components!.length > 0)!;
    expect(composition.components!.find(c => c.label === 'GT component')!.amount).toBe(32838.88);
    expect(composition.components!.find(c => c.label === 'Environmental component')!.amount).toBe(7022.54);
    const total = d.steps[d.steps.length - 1];
    expect(total.amount).toBe(39861.43);
    expect(total.amount).toBe(portFee.amount);
  });
});

describe('Derivation transparency — progressive dues (Gothenburg container vessel dues)', () => {
  // WE-GOT-1 inputs: 70,000 GT EU container vessel.
  const result = calculatePortCallCost(gothenburg, {
    vessel: { gt: 70000, nt: 35000, loa_m: 300 },
    call: {
      port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
      containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
      calls_this_month: 1, flag_state: 'EU', esi_score: 40, csi_class: 'A',
      fossil_free_fuel_percentage: 0, ops_usage: false, lay_up_days: 0,
      pilotage_required: true, pilotage_hours: 2, sludge_extra_m3: 4
    } as CostCalculationInput['call']
  });
  const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
  const d = dues.derivation!;

  it('the structure label names the progressive structure', () => {
    expect(d.structure_label).toBe('Progressive by GT');
  });

  it('exposes one band row per band actually charged, matching the sheet arithmetic', () => {
    const bandsStep = d.steps.find(s => s.kind === 'bands')!;
    // Sheet: (20,000 × 1.96) + (20,000 × 1.71) + (20,000 × 1.15) + (10,000 × 0.80)
    expect(bandsStep.bands!.map(b => b.quantity)).toEqual([20000, 20000, 20000, 10000]);
    expect(bandsStep.bands!.map(b => b.amount)).toEqual([39200, 34200, 23000, 8000]);
    expect(bandsStep.amount).toBe(104400);
  });

  it('the ESI/CSI discount appears as an adjustment step with its delta', () => {
    const adjStep = d.steps.find(s => s.kind === 'adjustment')!;
    expect(adjStep.detail).toContain('-10%');
    expect(adjStep.amount).toBe(-10440);
  });

  it('the fee total step equals the line amount (93,960 after the discount)', () => {
    const total = d.steps[d.steps.length - 1];
    expect(total.amount).toBe(93960);
    expect(total.amount).toBe(dues.amount);
  });
});

describe('Derivation transparency — storage day ladder (APMT yard storage, banded_by_time)', () => {
  it('exposes one band row per time band that fired, with days charged per band', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: { gt: 55000, nt: 30250, loa_m: 290 },
      call: {
        port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
        containers_loaded_le20ft: 500, containers_loaded_gt20ft: 500,
        containers_discharged_le20ft: 500, containers_discharged_gt20ft: 500,
        calls_this_month: 1, flag_state: 'EU', csi_class: 'E', ops_usage: false,
        pilotage_required: true, pilotage_hours: 4, lay_up_days: 0,
        storage_days_export: 9, storage_days_import: 3
      } as CostCalculationInput['call']
    });
    const storage = feeByRule(result, 'apm_terminals_storage_export');
    const d = storage.derivation!;
    expect(d.structure_label).toBe('Storage day ladder');
    const bandsStep = d.steps.find(s => s.kind === 'bands')!;
    expect(bandsStep.bands!.map(b => b.label)).toEqual(['Days 0-6', 'Days 7-9']);
    expect(bandsStep.bands!.map(b => b.quantity)).toEqual([6, 3]);
    expect(bandsStep.bands!.map(b => b.amount)).toEqual([0, 399]);
    expect(bandsStep.amount).toBe(399);
    expect(storage.amount).toBe(399);
  });

  it('zero-chargeable-days ladders expose the free-time step, not an empty derivation', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: { gt: 55000, nt: 30250, loa_m: 290 },
      call: {
        port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
        containers_loaded_le20ft: 500, containers_loaded_gt20ft: 500,
        containers_discharged_le20ft: 500, containers_discharged_gt20ft: 500,
        calls_this_month: 1, flag_state: 'EU', csi_class: 'E', ops_usage: false,
        pilotage_required: true, pilotage_hours: 4, lay_up_days: 0,
        storage_days_export: 3, storage_days_import: 3
      } as CostCalculationInput['call']
    });
    const storage = feeByRule(result, 'apm_terminals_storage_export');
    const d = storage.derivation!;
    expect(d.structure_label).toBe('Storage day ladder');
    const bandsStep = d.steps.find(s => s.kind === 'bands')!;
    expect(bandsStep.detail).toMatch(/free through day \d+/);
    expect(bandsStep.amount).toBe(0);
  });
});

describe('Derivation transparency — flat and simple structures', () => {
  it('a flat rule exposes its single computation, never an empty panel', () => {
    const result = calculatePortCallCost(hamburg, cp1());
    const towage = feeByRule(result, 'hamburg_towage_estimate');
    const d = towage.derivation!;
    expect(d.structure_label).toBe('Flat rate');
    const computation = d.steps.find(s => s.label === 'Computation')!;
    expect(computation).toBeDefined();
    expect(computation.amount).toBe(15000);
  });

  it('a per-unit rule exposes its computation step with the engine\'s stated arithmetic', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: { gt: 70000, nt: 35000, loa_m: 300 },
      call: {
        port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
        containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 20, containers_discharged_gt20ft: 10,
        calls_this_month: 1, flag_state: 'EU', esi_score: 0, csi_class: 'A',
        fossil_free_fuel_percentage: 0, ops_usage: false, lay_up_days: 0,
        pilotage_required: true, pilotage_hours: 2, sludge_extra_m3: 4,
        arrival_origin: 'europe'
      } as CostCalculationInput['call']
    });
    const solid = feeByRule(result, 'port_gothenburg_waste_solid_eu');
    const d = solid.derivation!;
    const computation = d.steps.find(s => s.label === 'Computation')!;
    expect(computation).toBeDefined();
    expect(computation.amount).toBe(9100);
  });

  it('the excess-units reduction names the threshold in its derivation step (SJ\u00d6FS 2025:5 \u00a725)', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: { gt: 8890, nt: 3200, loa_m: 137 },
      call: {
        port_id: 'gothenburg', date: '2026-06-01', vessel_type: 'container',
        containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
        calls_this_month: 1, flag_state: 'EU', esi_score: 0, csi_class: 'A',
        fossil_free_fuel_percentage: 0, ops_usage: false, lay_up_days: 0,
        pilotage_required: true, pilotage_hours: 8, pilotage_extra_pilot: false,
        pilotage_ordering_lead_time_hours: 4
      } as CostCalculationInput['call']
    });
    const hh = feeByRule(result, 'sjofartsverket_pilotage_class4_per_half_hour');
    const adjStep = hh.derivation!.steps.find(s => s.kind === 'adjustment')!;
    expect(adjStep.detail).toContain('discount 40%');
    expect(adjStep.detail).toContain('beyond 14');
    expect(hh.amount).toBe(59888); // lathund class 4 row 8h: start 17,300 + half-hours 59,888 = 77,188
  });
});

describe('Derivation transparency — zero figure drift (the exposure never changes an amount)', () => {
  it('default-call Grand Totals at all three ports are unchanged to the cent (v0.2.48 default vessel: Maren Maersk; v0.2.50 re-pin: Gothenburg moved by the waste-origin dimension fix)', () => {
    const { port: g } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml'));
    const { port: h } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'hamburg_2026.yaml'));
    const { port: x } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml'));
    // Re-pinned for the v0.2.48 default-vessel contract (deliberate change,
    // not a defect): the default call is now Maren Maersk's profile —
    // GT 55,000→194,849, lay time 16 h→50 h, moves 2,000→4,000, tier
    // blank→Tier II (inferred from build year 2014). Old pins:
    // GOT 1,622,145.00 / HAM 861,430.56 / HEL 4,114,795.00.
    //
    // v0.2.50 defect-fix re-pin (Gothenburg only): the waste dues now price
    // the arrival origin (default outside Europe) instead of the flag (old
    // default EU). Sludge 0.31 vs 0.21 and solid 0.24 vs 0.13 on 194,849 GT:
    // +19,484.90 + 21,433.39 = +40,918.29 → 3,007,051.15. Hamburg and
    // Helsingborg are unchanged — no rule at those ports ever gated on the
    // flag, so the retirement touches nothing there.
    expect(calculatePortCallCost(g, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') }).total).toBe(3007051.15);
    expect(calculatePortCallCost(h, { vessel: DEFAULT_VESSEL, call: defaultCall('hamburg') }).total).toBe(2313489.31);
    expect(calculatePortCallCost(x, { vessel: DEFAULT_VESSEL, call: defaultCall('helsingborg') }).total).toBe(8481257.40);
  });
});

describe('Derivation transparency — evaluateFeeRule exposure parity', () => {
  it('evaluateFeeRule (the rule-level harness path) also carries the derivation', () => {
    const rule: any = {
      id: 'test_flat', fee_family: 'security', biller: 'Test Biller',
      rate_structure: { type: 'flat', amount: 500 },
      source_reference: {
        document_name: 'Test Tariff', document_url: 'http://example.com',
        document_issued: '2026-01-01', page: 1, clause: '1.1',
        verified_on: '2026-01-01', verified_by: 'Test User'
      }
    };
    const fee = evaluateFeeRule(rule, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') } as CostCalculationInput, []);
    expect(fee!.derivation).toBeDefined();
    expect(fee!.derivation!.steps[fee!.derivation!.steps.length - 1].amount).toBe(500);
  });
});

// Two-clock tier display (spec v0.2.46): tiered-per-period and
// per-commenced-period fees expose each charged tier as its own labeled
// derivation step — hours covered, rate, periods commenced, amount, and
// the tariff citation — plus a composition step naming both components.
// Presentation-only: the amounts are the arithmetic already performed.
describe('Derivation transparency — two-clock tier display (v0.2.46)', () => {
  const hhlaCall = (lay: number): CostCalculationInput => ({
    vessel: DEFAULT_VESSEL,
    call: { ...defaultCall('hamburg'), lay_time_hours: lay }
  });

  it('hhla_tonnage_dues at 50 h: initial and subsequent tiers as distinct steps with citations', () => {
    const result = calculatePortCallCost(hamburg, hhlaCall(50));
    const d = feeByRule(result, 'hhla_tonnage_dues').derivation!;
    expect(d.structure_label).toBe('Tiered per period');
    const initial = d.steps.find(s => s.label === 'Initial tier')!;
    expect(initial.detail).toContain('First 24 hours of lay time');
    expect(initial.detail).toContain('1.25 EUR/GT');
    expect(initial.detail).toContain('quay-tariff-2026.pdf');
    expect(initial.amount).toBe(243561.25);
    const subsequent = d.steps.find(s => s.label === 'Subsequent tier')!;
    expect(subsequent.detail).toContain('per commenced 12 hours thereafter');
    expect(subsequent.detail).toContain('0.8 EUR/GT');
    expect(subsequent.detail).toContain('3 commenced periods');
    // 3 commenced periods x 194,849 GT x 0.80 = 467,637.60 (v0.2.48
    // default vessel; the old 132,000 pin was 3 x 55,000 x 0.80).
    expect(subsequent.amount).toBe(467637.6);
    const composition = d.steps.find(s => s.label === 'Components after tiers')!;
    expect(composition.components!.map(c => c.label)).toEqual([
      'First 24 h (1.25 EUR/GT)',
      'per commenced 12 h thereafter (0.8 EUR/GT)'
    ]);
    expect(composition.amount).toBe(711198.85);
    expect(d.steps[d.steps.length - 1].amount).toBe(711198.85);
  });

  it('hhla_tonnage_dues at 24 h: the initial tier only; no subsequent-tier step', () => {
    const result = calculatePortCallCost(hamburg, hhlaCall(24));
    const d = feeByRule(result, 'hhla_tonnage_dues').derivation!;
    expect(d.steps.find(s => s.label === 'Initial tier')).toBeDefined();
    expect(d.steps.find(s => s.label === 'Subsequent tier')).toBeUndefined();
  });

  it('hpa_demurrage at 130 h: the charged tier step carries rate, period, and citation (cat. 31 item B)', () => {
    const result = calculatePortCallCost(hamburg, hhlaCall(130));
    const d = feeByRule(result, 'hpa_demurrage').derivation!;
    expect(d.structure_label).toBe('Per commenced period');
    const tier = d.steps.find(s => s.label === 'Excess up to 120 h')!;
    expect(tier.detail).toContain('0.0165 EUR/GT');
    expect(tier.detail).toContain('per commenced 12 h');
    expect(tier.detail).toContain('pricelist-maritime-shipping-2026.pdf');
    expect(tier.amount).toBe(3215.01);
  });

  it('hpa_demurrage across both tiers: the Beyond tier step fires past 120 h excess', () => {
    // 380 h lay time: excess 260 h -> 120 h at 0.0165 (10 periods) + 140 h at 0.0255 (12 periods)
    const result = calculatePortCallCost(hamburg, hhlaCall(380));
    const dem = feeByRule(result, 'hpa_demurrage');
    const d = dem.derivation!;
    const first = d.steps.find(s => s.label === 'Excess up to 120 h')!;
    expect(first.detail).toContain('10 periods commenced');
    expect(first.amount).toBe(32150.09);
    const beyond = d.steps.find(s => s.label === 'Beyond')!;
    expect(beyond.detail).toContain('0.0255 EUR/GT');
    expect(beyond.detail).toContain('12 periods commenced');
    expect(beyond.amount).toBe(59623.79);
    expect(dem.amount).toBe(91773.88);
  });

  it('the HPA berth fee (per-commenced-period, minimum-per-period class) still exposes its computation', () => {
    const result = calculatePortCallCost(hamburg, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), hpa_berth_usage: true, berth_type: 'quay', berth_hours: 12 }
    });
    const berth = feeByRule(result, 'hpa_berth_fee_quay');
    const d = berth.derivation!;
    expect(d.structure_label).toBe('Per commenced period');
    const tier = d.steps.find(s => s.label === 'Beyond')!;
    expect(tier.detail).toContain('0.0152 EUR/GT');
    // 194,849 GT x 0.0152 x 2 commenced 6-h periods (12 h berth)
    expect(berth.amount).toBe(5923.41);
  });

  it('the tier-adjustment detail string no longer doubles the word Tier (cosmetic fix, v0.2.46)', () => {
    // Worst-case Tier 0: old string read "Tier Tier 0 +30% (estimated)".
    // Re-pinned for the v0.2.48 default vessel (deliberate change: Maren
    // Maersk, built 2014, infers Tier II from build year, so the default
    // call's tier step reads Tier II +5%, not the old blank-year Tier 0).
    const result = calculatePortCallCost(hamburg, hhlaCall(50));
    const portFee = feeByRule(result, 'hpa_port_fee');
    const tierStep = portFee.derivation!.steps.find(s => s.label.includes('Tier adjustment'))!;
    expect(tierStep.detail).toBe('Tier II +5% (estimated)');
    expect(tierStep.detail).not.toContain('Tier Tier');
  });
});
