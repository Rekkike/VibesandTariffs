/**
 * Rotterdam smoke (spec v0.7.0, Unit 2b): the dues YAML priced against both
 * verified fixtures — the MAREN default (the capped cases) and VISTULA
 * MAERSK (the uncapped waste and the cap-binding cargo). The full pin
 * suite (31 pins, sub-unit 2c) extends this file; the smoke pins are the
 * fixture anchors every later pin hangs from.
 *
 * Figures (the verified design, docs/sources/netherlands/rotterdam/
 * UNIT2_BLUEPRINT.md):
 *   MAREN (194,849 GT, the 4,000-move profile): dues 29,422.20 +
 *   13,054.88; cargo capped 38,326.80 (80,000 t entered, 68,197.15 t
 *   ceiling); waste 2,000 (the whole-fee maximum; uncapped 9,962.45);
 *   total 82,803.88.
 *   VISTULA (34,882 GT, the 2,000-move profile): dues 5,267.18 +
 *   2,337.09; cargo cap-binding 6,861.29 (40,000 t entered, 12,208.70 t
 *   ceiling); waste 1,964.10 uncapped (below the 35,600 GT break-even).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { namedProfile } from '../src/vessel_profiles';
import { CostCalculationInput, FeeResult } from '../src/types';
import * as path from 'path';

const { port: rotterdam } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'rotterdam_2026.yaml'));

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`rule ${ruleId} did not fire`);
}

function makeInput(
  vesselOverrides: Record<string, unknown>,
  callOverrides: Record<string, unknown> = {}
): CostCalculationInput {
  return {
    vessel: { ...DEFAULT_VESSEL, ...vesselOverrides } as CostCalculationInput['vessel'],
    call: { ...defaultCall('rotterdam'), ...callOverrides } as CostCalculationInput['call']
  };
}

function profiledCall(imo: string): Record<string, unknown> {
  const profile = namedProfile(imo)!;
  return {
    containers_loaded_le20ft: profile.containers_loaded_le20ft,
    containers_loaded_gt20ft: profile.containers_loaded_gt20ft,
    containers_discharged_le20ft: profile.containers_discharged_le20ft,
    containers_discharged_gt20ft: profile.containers_discharged_gt20ft
  };
}

const VISTULA = {
  gt: 34882, nt: 16947, loa_m: 200, beam_m: 35.2, draft_m: 10.0,
  teu_capacity: 3596, built_year: 2018, name: 'VISTULA MAERSK', imo: '9775737'
};

describe('Rotterdam smoke (Unit 2b): both fixtures cent-exact', () => {
  it('MAREN (the default call): dues 29,422.20 + 13,054.88, cargo capped 38,326.80, waste 2,000 at the maximum, pilotage 20,856.00 (2 x (S 8,728 + TC5 1,700) at the library draught 160 dm), towage 20,478 (2 x 10,239 at 384-425), KRVE 9,333 (mooring 4,836 + unmooring 4,497 at 399 m), total 133,470.88 (v0.7.0 Unit 4 re-baseline: the joins +29,811 on the 103,659.88 Unit-3 fixture)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.component_amounts).toEqual([
      { label: 'Vessel component', amount: 29422.20 },
      { label: 'Sustainability component', amount: 13054.88 }
    ]);
    expect(dues.amount).toBe(42477.08);
    expect(feeByRule(result, 'rotterdam_cargo_dues').amount).toBe(38326.80);
    expect(feeByRule(result, 'rotterdam_waste_fee').amount).toBe(2000.00);
    // v0.7.0 Unit 3 re-baseline (in-test attribution): the compulsory
    // pilotage joins the default call - the dues surface above is the
    // 2b/2c fixture, unchanged; the pilotage adds both sea voyages.
    expect(feeByRule(result, 'rotterdam_pilotage_s_in').amount).toBe(8728);
    expect(feeByRule(result, 'rotterdam_pilotage_tc5_in').amount).toBe(1700);
    expect(feeByRule(result, 'rotterdam_pilotage_s_out').amount).toBe(8728);
    expect(feeByRule(result, 'rotterdam_pilotage_tc5_out').amount).toBe(1700);
    // v0.7.0 Unit 4 re-baseline (in-test attribution): the towage and
    // mooring joins - Boluda 2 x 10,239 = 20,478 at 384-425; KRVE mooring
    // 4,836 and unmooring 4,497 at 399 m (the 10-increment ladder).
    expect(feeByRule(result, 'rotterdam_towage').amount).toBe(20478);
    expect(feeByRule(result, 'rotterdam_mooring').amount).toBe(4836);
    expect(feeByRule(result, 'rotterdam_unmooring').amount).toBe(4497);
    expect(result.total).toBe(133470.88);
  });

  it('VISTULA (the small-vessel call): waste uncapped 1,964.10 below the 35,600 GT break-even, cargo cap-binding 6,861.29 with the discount delta shown, pilotage 12,408.00 (2 x (S 5,191 + TC5 1,013) at the library draught 100 dm), towage 5,281 (1 tug at 188-212), KRVE 1,498 (mooring 776 + unmooring 722 at 200 m), total 35,616.67 (v0.7.0 Unit 4 re-baseline)', () => {
    const result = calculatePortCallCost(
      rotterdam,
      makeInput(VISTULA, profiledCall('9775737'))
    );
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.component_amounts).toEqual([
      { label: 'Vessel component', amount: 5267.18 },
      { label: 'Sustainability component', amount: 2337.09 }
    ]);
    const cargo = feeByRule(result, 'rotterdam_cargo_dues');
    expect(cargo.amount).toBe(6861.29);
    const capStep = (cargo.derivation?.steps ?? []).find(s => s.label === 'GT efficiency cap');
    expect(capStep).toBeDefined();
    expect(capStep!.detail).toContain('22480');
    expect(capStep!.amount).toBe(-15618.71);
    expect(feeByRule(result, 'rotterdam_waste_fee').amount).toBe(1964.10);
    // v0.7.0 Unit 3 re-baseline (in-test attribution): the pilotage join.
    expect(feeByRule(result, 'rotterdam_pilotage_s_in').amount).toBe(5191);
    expect(feeByRule(result, 'rotterdam_pilotage_tc5_in').amount).toBe(1013);
    expect(feeByRule(result, 'rotterdam_pilotage_s_out').amount).toBe(5191);
    expect(feeByRule(result, 'rotterdam_pilotage_tc5_out').amount).toBe(1013);
    // v0.7.0 Unit 4 re-baseline (in-test attribution): the towage and
    // mooring joins - Boluda 1 x 5,281 at 188-212; KRVE mooring 776 and
    // unmooring 722 at the library LOA 200 m.
    expect(feeByRule(result, 'rotterdam_towage').amount).toBe(5281);
    expect(feeByRule(result, 'rotterdam_mooring').amount).toBe(776);
    expect(feeByRule(result, 'rotterdam_unmooring').amount).toBe(722);
    expect(result.total).toBe(35616.67);
  });
});

/**
 * The Rotterdam pin suite (spec v0.7.0, Unit 2c): 31 pins extending the
 * two smoke anchors above. Every figure is a published figure from the
 * archived documents (the extraction reference and the blueprint are the
 * authorities of record; the worked examples are R1 Annex 2, PDF p. 20).
 *
 * Inventory:
 *   a. Example 3 (75,246 GT, 39,000 t, ESI 35): the Annex 2 chain
 *      reproduced cent-exact through the engine (5 pins).
 *   b. MAREN default call: the full-chain pins around the smoke anchor
 *      (5 pins).
 *   c. VISTULA small-vessel call: the full chain (5 pins).
 *   d. ESI bands: each of the five encoded bands fired at a score inside
 *      it; the 120 percent NOx variant is recorded in the reference,
 *      never encoded (6 pins: five band pins plus the 100-not-120 pin).
 *   e. Waste boundary: the 35,600 GT break-even asserted as the engine
 *      computes it (3 pins).
 *   f. Quay dues: 3.86 per metre per commenced 24-hour period under
 *      berth_type 'quay'; the default call carries no quay line (3 pins).
 *   g. Reference-only records asserted where natural: the 45 percent
 *      Shortsea efficiency variant and the 3,500 cruise waste maximum
 *      live in the reference, never in the encoding (2 pins).
 *
 * Finding (recorded this unit): the quay rule as committed in 2b carried
 * basis 'loa_m', a key the per_commenced_period machinery does not
 * recognize (vessel LOA is 'loa', the Helsingborg precedent); the rule
 * was dead data - it returned null even with berth_type 'quay' and hours
 * entered. The one-token data repair (loa_m -> loa) is a wiring fix, not
 * a figure movement: the published rate 3.86, the commenced-period
 * semantics, and the never-default-fired gate are unchanged. Disclosed in
 * the 2c commit.
 */

const EX3 = {
  gt: 75246, nt: 38353, loa_m: 300, beam_m: 48.2, draft_m: 14.5,
  teu_capacity: 14000, built_year: 2015, name: 'EXAMPLE 3 VESSEL', imo: '9999999'
};

function ex3Call(tonnes: number, esi: number): CostCalculationInput {
  // A 40ft-only call at the shared 24 t planning weight: 39,000 t needs
  // 1,625 boxes (812 loaded + 813 discharged); the round_to_whole_tonnes
  // derivation reproduces the example's tonnage exactly.
  const boxes = tonnes / 24;
  return makeInput(EX3, {
    containers_loaded_le20ft: 0,
    containers_loaded_gt20ft: Math.ceil(boxes / 2),
    containers_discharged_le20ft: 0,
    containers_discharged_gt20ft: Math.floor(boxes / 2),
    esi_score: esi
  });
}

function feeOrNone(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult | undefined {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  return undefined;
}

describe('a. Example 3 (R1 Annex 2, PDF p. 20): the worked example cent-exact', () => {
  it('a1: vessel component 11,362.15 (75,246 GT x EUR 0.151)', () => {
    const result = calculatePortCallCost(rotterdam, ex3Call(39000, 35));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.component_amounts!.find(c => c.label === 'Vessel component')!.amount).toBe(11362.15);
  });

  it('a2: cargo uncapped 21,918.00 (39,000 t x EUR 0.562) shown in the cap step, capped to 14,800.89 (the ceiling 26,336.10 t = 75,246 GT x 35%), delta 7,117.11', () => {
    const result = calculatePortCallCost(rotterdam, ex3Call(39000, 35));
    const cargo = feeByRule(result, 'rotterdam_cargo_dues');
    expect(cargo.amount).toBe(14800.89);
    const capStep = (cargo.derivation?.steps ?? []).find(s => s.label === 'GT efficiency cap')!;
    expect(capStep.detail).toContain('uncapped 39000 x 0.562 = 21918');
    expect(capStep.detail).toContain('75246 GT x 35% = 26336.1 chargeable x 0.562 = 14800.89');
    expect(capStep.amount).toBe(-7117.11);
  });

  it('a3: sustainability printed 5,041.48 (75,246 GT x EUR 0.067) with the ESI 35 discount 3,024.89 (60 percent band), net 2,016.59', () => {
    const result = calculatePortCallCost(rotterdam, ex3Call(39000, 35));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    const esiStep = (dues.derivation?.steps ?? []).find(s => s.label.includes('ESI discount'))!;
    expect(esiStep.amount).toBe(-3024.89);
    expect(esiStep.detail).toContain('score 35: -60%');
    expect(dues.component_amounts!.find(c => c.label === 'Sustainability component')!.amount).toBe(2016.59);
  });

  it('a4: the dues fee line is 13,378.74 (11,362.15 + 2,016.59, the printed components summed)', () => {
    const result = calculatePortCallCost(rotterdam, ex3Call(39000, 35));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.amount).toBe(13378.74);
  });

  it('a5: the ESI discount is the ceiling on discounts - the sustainability component never prices below zero', () => {
    const result = calculatePortCallCost(rotterdam, ex3Call(39000, 90));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.component_amounts!.find(c => c.label === 'Sustainability component')!.amount).toBe(0);
  });
});

describe('b. MAREN default call: the full chain around the smoke anchor', () => {
  it('b1: the dues fee line is 42,477.08 (29,422.20 + 13,054.88)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    expect(feeByRule(result, 'rotterdam_seaport_dues').amount).toBe(42477.08);
  });

  it('b2: the cargo ceiling is 68,197.15 t (194,849 GT x 35%) and the uncapped charge 44,960.00 (80,000 t x 0.562)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const cargo = feeByRule(result, 'rotterdam_cargo_dues');
    const capStep = (cargo.derivation?.steps ?? []).find(s => s.label === 'GT efficiency cap')!;
    expect(capStep.detail).toContain('uncapped 80000 x 0.562 = 44960');
    expect(capStep.detail).toContain('194849 GT x 35% = 68197.15 chargeable x 0.562 = 38326.8');
  });

  it('b3: the waste fee is at the whole-fee maximum - flat 220 + 194,849 GT x 0.05 = 9,962.45 uncapped, capped to 2,000.00 with the cap line shown', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const waste = feeByRule(result, 'rotterdam_waste_fee');
    expect(waste.amount).toBe(2000.00);
    const steps = waste.derivation?.steps ?? [];
    expect(steps.find(s => s.label === 'Flat component')!.amount).toBe(220);
    expect(steps.find(s => s.label === 'Per-GT component')!.amount).toBe(9742.45);
    const max = steps.find(s => s.label === 'Maximum applied')!;
    expect(max.amount).toBe(-7962.45);
    expect(max.detail).toContain('uncapped 9962.45 exceeds the maximum 2000');
  });

  it('b4: the total is 133,470.88 (the Unit-3 fixture 103,659.88 plus the Unit 4 joins: towage 20,478 + KRVE mooring 4,836 + unmooring 4,497 = 29,811)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    expect(result.total).toBe(133470.88);
  });

  it('b5: the ESI score is blank on the default call - the sustainability component prices at list, no discount line', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const dues = feeByRule(result, 'rotterdam_seaport_dues');
    expect(dues.component_amounts!.find(c => c.label === 'Sustainability component')!.amount).toBe(13054.88);
    expect((dues.derivation?.steps ?? []).find(s => s.label.includes('ESI discount'))).toBeUndefined();
  });
});

describe('c. VISTULA small-vessel call (34,882 GT, the 2,000-move profile)', () => {
  const vistula = () =>
    calculatePortCallCost(rotterdam, makeInput(VISTULA, profiledCall('9775737')));

  it('c1: the cargo ceiling is 12,208.70 t (34,882 GT x 35%), capped 6,861.29 against uncapped 22,480.00 (40,000 t x 0.562)', () => {
    const cargo = feeByRule(vistula(), 'rotterdam_cargo_dues');
    expect(cargo.amount).toBe(6861.29);
    const capStep = (cargo.derivation?.steps ?? []).find(s => s.label === 'GT efficiency cap')!;
    expect(capStep.detail).toContain('uncapped 40000 x 0.562 = 22480');
    expect(capStep.detail).toContain('34882 GT x 35% = 12208.7 chargeable');
    expect(capStep.amount).toBe(-15618.71);
  });

  it('c2: the waste fee is uncapped 1,964.10 (220 + 34,882 GT x 0.05 = 1,744.10), below the 35,600 GT break-even, no cap line', () => {
    const waste = feeByRule(vistula(), 'rotterdam_waste_fee');
    expect(waste.amount).toBe(1964.10);
    const steps = waste.derivation?.steps ?? [];
    expect(steps.find(s => s.label === 'Per-GT component')!.amount).toBe(1744.10);
    expect(steps.find(s => s.label === 'Maximum applied')).toBeUndefined();
  });

  it('c3: the dues components print 5,267.18 + 2,337.09', () => {
    const dues = feeByRule(vistula(), 'rotterdam_seaport_dues');
    expect(dues.component_amounts).toEqual([
      { label: 'Vessel component', amount: 5267.18 },
      { label: 'Sustainability component', amount: 2337.09 }
    ]);
  });

  it('c4: the dues fee line is 7,604.27 by the printed-component sum', () => {
    // Chain convention (recorded, never forced): the printed components
    // sum to 5,267.18 + 2,337.09 = 7,604.27; the engine's fee-line rule
    // (the greater of the printed-component sum and the unrounded full
    // chain) yields 7,604.28, a one-cent difference on this synthetic
    // fixture with no document figure to contradict either chain. The
    // pin asserts the engine value and records the convention here.
    const dues = feeByRule(vistula(), 'rotterdam_seaport_dues');
    expect(dues.amount).toBe(7604.28);
    expect(dues.component_amounts!.reduce((s, c) => s + c.amount, 0)).toBe(7604.27);
  });

  it('c5: the total is 35,616.67 by the engine chain (v0.7.0 Unit 4 re-baseline: the Unit-3 fixture 28,837.67 plus the towage 5,281 and the KRVE joins 1,498)', () => {
    // The one-cent chain difference, recorded per the directive: the
    // engine's full-precision dues chain totals 16,429.67 against the
    // rounded per-component sum 16,429.66; the engine value is pinned;
    // no chain is forced. The Unit 3 pilotage (whole-euro brochure
    // figures, no cents) adds exactly 12,408.00 to either chain.
    const result = vistula();
    expect(result.total).toBe(35616.67);
  });
});

describe('d. ESI discount bands (each encoded band fired at a score inside it)', () => {
  const sustAt = (score: number) =>
    calculatePortCallCost(rotterdam, makeInput({}, { esi_score: score }))
      .billers.flatMap(b => b.fees)
      .find(f => f.fee_rule_id === 'rotterdam_seaport_dues')!
      .component_amounts!.find(c => c.label === 'Sustainability component')!.amount;

  it('d1: ESI 10 (band 1-20): 5 percent - 13,054.88 discounted to 12,402.13', () => {
    expect(sustAt(10)).toBe(12402.13);
  });

  it('d2: ESI 25 (band 21-30): 10 percent - discounted to 11,749.39', () => {
    expect(sustAt(25)).toBe(11749.39);
  });

  it('d3: ESI 35 (band 31-40): 60 percent - discounted to 5,221.95', () => {
    expect(sustAt(35)).toBe(5221.95);
  });

  it('d4: ESI 50 (band 41-60): 80 percent - discounted to 2,610.97', () => {
    expect(sustAt(50)).toBe(2610.97);
  });

  it('d5: ESI 70 (band 61-plus): 100 percent - the component prices at zero', () => {
    expect(sustAt(70)).toBe(0);
  });

  it('d6: ESI 90 (above the 81 threshold of the published 120 percent NOx band): the least-favourable encoding prices the unconditional 100 percent band, never 120 - a benefit is never overstated without the ESI NOx sub-score input the model does not carry', () => {
    // The 120 percent NOx variant is recorded in the extraction reference
    // (section 7.2), never encoded.
    expect(sustAt(90)).toBe(0);
    const steps = calculatePortCallCost(rotterdam, makeInput({}, { esi_score: 90 }))
      .billers.flatMap(b => b.fees)
      .find(f => f.fee_rule_id === 'rotterdam_seaport_dues')!
      .derivation?.steps ?? [];
    expect(steps.find(s => s.label.includes('ESI discount'))!.detail).toContain('-100%');
  });
});

describe('e. Waste-fee boundary (35,600 GT break-even, as the engine computes it)', () => {
  const wasteAt = (gt: number) => {
    const result = calculatePortCallCost(rotterdam, makeInput({ gt }));
    return feeByRule(result, 'rotterdam_waste_fee');
  };

  it('e1: at 35,600 GT the fee equals 2,000.00 exactly (220 + 35,600 x 0.05) with no cap line - the break-even', () => {
    const waste = wasteAt(35600);
    expect(waste.amount).toBe(2000.00);
    expect((waste.derivation?.steps ?? []).find(s => s.label === 'Maximum applied')).toBeUndefined();
  });

  it('e2: one GT below the break-even (35,599) the fee is uncapped: 1,999.95', () => {
    expect(wasteAt(35599).amount).toBe(1999.95);
  });

  it('e3: one GT above the break-even (35,601) the maximum applies: 2,000.00 with the cap line shown', () => {
    const waste = wasteAt(35601);
    expect(waste.amount).toBe(2000.00);
    expect((waste.derivation?.steps ?? []).find(s => s.label === 'Maximum applied')).toBeDefined();
  });
});

describe('f. Quay dues (EUR 3.86/m per commenced 24-hour period, berth_type gated)', () => {
  it('f1: a 50-hour call at the public quay prices three commenced periods: 3 x 3.86 x 399 m = 4,620.42', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}, { berth_type: 'quay', quay_hours: 50 }));
    const quay = feeByRule(result, 'rotterdam_public_quay_dues');
    expect(quay.amount).toBe(4620.42);
    expect((quay.derivation?.steps ?? []).find(s => s.label === 'Beyond')!.detail).toContain('3 periods commenced');
  });

  it('f2: a 24-hour call prices one commenced period: 1 x 3.86 x 399 = 1,540.14', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}, { berth_type: 'quay', quay_hours: 24 }));
    expect(feeByRule(result, 'rotterdam_public_quay_dues').amount).toBe(1540.14);
  });

  it('f3: the default call carries no quay line - the rule never fires without the berth_type input (the never-default-fired pin)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    expect(feeOrNone(result, 'rotterdam_public_quay_dues')).toBeUndefined();
  });
});

describe('g. Reference-only records (asserted against the encoding of record)', () => {
  it('g1: the encoded cargo cap is the Deepsea 35 percent figure; the 45 percent Shortsea efficiency variant (Article 1.4(A)) is recorded in the extraction reference, never encoded - the YAML of record carries one cap_pct', () => {
    const rule: any = rotterdam.fee_rules.find(r => r.id === 'rotterdam_cargo_dues')!;
    expect(rule.rate_structure.gt_efficiency_cap.cap_pct).toBe(35);
    expect(rule.rate_structure.gt_efficiency_cap.cap_pct).not.toBe(45);
  });

  it('g2: the encoded waste maximum is the 2,000 general figure; the 3,500 cruise-shipping maximum (R1 PDF p. 17, printed pp. 32-33, section 3.1) is recorded in the extraction reference, never encoded - the YAML of record carries per_gt_maximum 2,000', () => {
    const rule: any = rotterdam.fee_rules.find(r => r.id === 'rotterdam_waste_fee')!;
    expect(rule.rate_structure.flat_plus_per_gt.per_gt_maximum).toBe(2000);
    expect(rule.rate_structure.flat_plus_per_gt.per_gt_maximum).not.toBe(3500);
  });
});

describe('h. EU ETS block (sub-unit 2e — the silo transcription, spec v0.2.69)', () => {
  // The EU-wide instruments transcribed per the port-silo principle, exactly
  // per the aarhus template (the same archived EU reference every port file
  // cites; no new citation coined, no new source hunted). k = 5 pins.
  it('h1: the file carries its own ETS and FuelEU rules under rotterdam rule ids (the silo transcription)', () => {
    const reg = rotterdam.fee_rules.filter(r => r.fee_family === 'regulatory');
    expect(reg.map(r => r.id).sort()).toEqual(['rotterdam_eu_ets_allowances', 'rotterdam_fueleu_notice']);
  });
  it('h2: the default call carries no ETS line and the total stays 133,470.88 (the never-default-fired guarantee; v0.7.0 Unit 4 re-baseline: the Unit-3 fixture joined by the towage and mooring, +29,811)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    expect(result.total).toBe(133470.88);
    expect(feeOrNone(result, 'rotterdam_eu_ets_allowances')).toBeUndefined();
    const notice = feeOrNone(result, 'rotterdam_fueleu_notice');
    expect(notice).toBeDefined();
    expect(notice!.amount).toBe(0);
    expect(notice!.quality_flags.some(f => f.type === 'regulatory_notice')).toBe(true);
  });
  it('h3: entered ETS inputs add exactly the product (1000 tCO2 x EUR 70 x 100 percent = 70,000) to the 133,470.88 default and move no pre-existing line (v0.7.0 Unit 4 re-baseline: the Unit-3 chain joined by the towage and mooring)', () => {
    const blank = calculatePortCallCost(rotterdam, makeInput({}));
    const withEts = calculatePortCallCost(rotterdam, makeInput({}, { ets_emissions_tco2: 1000, ets_allowance_price: 70 }));
    expect(withEts.total).toBe(203470.88);
    const ets = feeByRule(withEts, 'rotterdam_eu_ets_allowances');
    expect(ets.amount).toBe(70000);
    expect(ets.quality_flags.some(f => f.type === 'ets_user_specified_basis')).toBe(true);
    for (const b of blank.billers) {
      for (const f of b.fees) {
        if (f.fee_rule_id === 'rotterdam_eu_ets_allowances') continue;
        expect(feeByRule(withEts, f.fee_rule_id).amount).toBe(f.amount);
      }
    }
  });
  it('h4: below 5,000 GT the block renders nothing (the exemption is entire — both rules min_gt-gated)', () => {
    const below = calculatePortCallCost(rotterdam, makeInput({ gt: 4999 }, { ets_emissions_tco2: 1000, ets_allowance_price: 70 }));
    expect(below.billers.flatMap(b => b.fees).filter(f => f.fee_family === 'regulatory')).toEqual([]);
  });
  it('h5: blank-means-nothing — one ETS input alone renders no line (each input required)', () => {
    expect(feeOrNone(calculatePortCallCost(rotterdam, makeInput({}, { ets_emissions_tco2: 1000 })), 'rotterdam_eu_ets_allowances')).toBeUndefined();
    expect(feeOrNone(calculatePortCallCost(rotterdam, makeInput({}, { ets_allowance_price: 70 })), 'rotterdam_eu_ets_allowances')).toBeUndefined();
  });
});

describe('i. Pilotage (Unit 3 - the Loodswezen sea route, draught-banded S + TC5)', () => {
  // The route of record: Sea to tariff area J (2e Maasvlakte) = S-IN/OUT + TC5
  // (brochure p. 21 matrix, row J, Sea cell). The IN/OUT table serves to and
  // from the pilot station identically; a call prices both voyages. The
  // tables end at >=196 dm (no 239-dm band exists); the brochure's worked
  // example (p. 22) carries the recorded TC4-label-with-TC5-amount defect and
  // is never a checkpoint. The figures below are the brochure's own rows.
  const pilotageAt = (draughtM: number) =>
    calculatePortCallCost(rotterdam, makeInput({ draft_m: draughtM }));

  const legSum = (result: ReturnType<typeof calculatePortCallCost>) =>
    ['rotterdam_pilotage_s_in', 'rotterdam_pilotage_tc5_in',
     'rotterdam_pilotage_s_out', 'rotterdam_pilotage_tc5_out']
      .reduce((s, id) => s + feeByRule(result, id).amount, 0);

  it('i1: a draught in each adjacent band pair at the named thresholds prices its own row - 10.5 m (105 dm) prices S 5,490 + TC5 1,072 per leg; 10.4 m (104 dm) prices the 104-dm row (S 5,447 + TC5 1,064); 10.51 m rises to the 106-dm row (S 5,532 + TC5 1,079)', () => {
    // The bands are half-open in metres: (10.4, 10.5] is the 105-dm row,
    // so an integer-decimetre draught prices its own row (10.5 = 105 dm).
    const at105 = pilotageAt(10.5);
    expect(feeByRule(at105, 'rotterdam_pilotage_s_in').amount).toBe(5490);
    expect(feeByRule(at105, 'rotterdam_pilotage_tc5_in').amount).toBe(1072);
    const at104 = pilotageAt(10.4);
    expect(feeByRule(at104, 'rotterdam_pilotage_s_in').amount).toBe(5447);
    expect(feeByRule(at104, 'rotterdam_pilotage_tc5_in').amount).toBe(1064);
    const above = pilotageAt(10.51);
    expect(feeByRule(above, 'rotterdam_pilotage_s_in').amount).toBe(5532);
    expect(feeByRule(above, 'rotterdam_pilotage_tc5_in').amount).toBe(1079);
  });

  it('i2: the table\'s lower boundary - 27 dm (2.7 m) prices the <=27 row (S 345 + TC5 68); 2.71 m already prices the 28-dm row (S 368 + TC5 71)', () => {
    const at27 = pilotageAt(2.7);
    expect(feeByRule(at27, 'rotterdam_pilotage_s_in').amount).toBe(345);
    expect(feeByRule(at27, 'rotterdam_pilotage_tc5_in').amount).toBe(68);
    const above = pilotageAt(2.71);
    expect(feeByRule(above, 'rotterdam_pilotage_s_in').amount).toBe(368);
    expect(feeByRule(above, 'rotterdam_pilotage_tc5_in').amount).toBe(71);
  });

  it('i3: the end-of-table behaviour at 196 dm and above, as the engine computes it - 19.6 m (196 dm) and 25 m both price the >=196 terminal row (S 11,496 + TC5 2,241 per leg); no higher band exists (the no-239-dm-band finding)', () => {
    // The terminal band is (19.5, infinity] in metres: 19.6 m = 196 dm
    // prices it; 19.5 m = exactly 195 dm prices the 195-dm row (the
    // half-open upper-inclusive convention, observed live).
    const at196 = pilotageAt(19.6);
    expect(feeByRule(at196, 'rotterdam_pilotage_s_in').amount).toBe(11496);
    expect(feeByRule(at196, 'rotterdam_pilotage_tc5_in').amount).toBe(2241);
    const far = pilotageAt(25);
    expect(feeByRule(far, 'rotterdam_pilotage_s_in').amount).toBe(11496);
    expect(feeByRule(far, 'rotterdam_pilotage_tc5_in').amount).toBe(2241);
    // 19.5 m (195 dm) and 19.49 m both price the 195-dm row (S 11,357 +
    // TC5 2,213) - the last banded row before the terminal band.
    const below = pilotageAt(19.5);
    expect(feeByRule(below, 'rotterdam_pilotage_s_in').amount).toBe(11357);
    expect(feeByRule(below, 'rotterdam_pilotage_tc5_in').amount).toBe(2213);
  });

  it('i4: the default-route composition is S plus TC5 on both voyages - inbound and outbound price identically (the IN/OUT table serves to and from the pilot station), four lines at the default call', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const ids = result.billers.flatMap(b => b.fees).map(f => f.fee_rule_id);
    expect(ids).toContain('rotterdam_pilotage_s_in');
    expect(ids).toContain('rotterdam_pilotage_tc5_in');
    expect(ids).toContain('rotterdam_pilotage_s_out');
    expect(ids).toContain('rotterdam_pilotage_tc5_out');
    expect(feeByRule(result, 'rotterdam_pilotage_s_in').amount)
      .toBe(feeByRule(result, 'rotterdam_pilotage_s_out').amount);
    expect(feeByRule(result, 'rotterdam_pilotage_tc5_in').amount)
      .toBe(feeByRule(result, 'rotterdam_pilotage_tc5_out').amount);
  });

  it('i5: the fixtures\' pilotage figures at their library draughts - MAREN 16.0 m = 160 dm: 2 x (S 8,728 + TC5 1,700) = 20,856; VISTULA 10.0 m = 100 dm: 2 x (S 5,191 + TC5 1,013) = 12,408', () => {
    const maren = calculatePortCallCost(rotterdam, makeInput({}));
    expect(legSum(maren)).toBe(20856);
    const vistula = calculatePortCallCost(rotterdam, makeInput(VISTULA, profiledCall('9775737')));
    expect(legSum(vistula)).toBe(12408);
  });

  it('i6: the pilotage_required gate - the compulsory due never fires when the call declines pilotage (the rules render nothing, the total falls by the full join)', () => {
    const declined = calculatePortCallCost(rotterdam, makeInput({}, { pilotage_required: false }));
    expect(feeOrNone(declined, 'rotterdam_pilotage_s_in')).toBeUndefined();
    expect(feeOrNone(declined, 'rotterdam_pilotage_tc5_in')).toBeUndefined();
    expect(feeOrNone(declined, 'rotterdam_pilotage_s_out')).toBeUndefined();
    expect(feeOrNone(declined, 'rotterdam_pilotage_tc5_out')).toBeUndefined();
    expect(declined.total).toBe(133470.88 - 20856);
  });
});

describe('j. Towage and mooring (Unit 4 - Boluda per-tug by LOA; KRVE by LOA)', () => {
  // The adjudication record (extraction reference sections 8.1/8.2): the
  // median MV2 per-tug rate at the MAREN reference LOA band selects Boluda
  // (10,239 against Fairplay's 10,312.50 with the Maasvlakte II surcharge
  // and Svitzer's 5,737); the KRVE mooring class is the median of the three
  // class figures (3,576 of 3,576/3,327/5,178; no class designated standard).
  // The tug count rides the settled shared LOA-class default.
  const atLoa = (loa: number) =>
    calculatePortCallCost(rotterdam, makeInput({ loa_m: loa }));
  const feeAmt = (result: ReturnType<typeof calculatePortCallCost>, id: string) =>
    feeByRule(result, id).amount;

  it('j1: towage band edges - MAREN at 399 m prices the 384-425 row (10,239 per tug, 2 tugs = 20,478); 384 m prices the same row; 383 m prices the 359-383 row (9,818 x 2 tugs = 19,636)', () => {
    // Boluda's printed bands 359-383 and 384-425 abut without a gap; the
    // engine's half-open (lo, hi] convention prices 383 in the lower row
    // and 383.01 in the upper (observed live; the convention recorded).
    expect(feeAmt(atLoa(399), 'rotterdam_towage')).toBe(20478);
    expect(feeAmt(atLoa(384), 'rotterdam_towage')).toBe(20478);
    expect(feeAmt(atLoa(383.01), 'rotterdam_towage')).toBe(20478);
    expect(feeAmt(atLoa(383), 'rotterdam_towage')).toBe(19636);
  });

  it('j2: the tug-count LOA-class default - below 150 m the LOA-class count is zero (an honest zero-amount line, the assumed_parameter flag), 150-250 m one tug, above 250 m two tugs (the estimated-parameter convention)', () => {
    const small = atLoa(140);
    expect(feeByRule(small, 'rotterdam_towage').amount).toBe(0);
    expect(feeByRule(small, 'rotterdam_towage').quality_flags.some(f => f.type === 'assumed_parameter')).toBe(true);
    const mid = atLoa(200);
    expect(feeAmt(mid, 'rotterdam_towage')).toBe(5281);
    expect(feeByRule(mid, 'rotterdam_towage').quality_flags.some(f => f.type === 'assumed_parameter')).toBe(true);
    expect(feeAmt(atLoa(399), 'rotterdam_towage')).toBe(2 * 10239);
    // A user-entered count overrides the default.
    const entered = calculatePortCallCost(rotterdam, makeInput({ loa_m: 200 }, { tug_count: 3 }));
    expect(feeAmt(entered, 'rotterdam_towage')).toBe(3 * 5281);
  });

  it('j3: the KRVE mooring band edges - the last base band 345.00-349.99 prices 3,576 mooring / 3,327 unmooring; 344.99 m falls to the 340-344.99 row (3,455 / 3,214)', () => {
    expect(feeAmt(atLoa(349.99), 'rotterdam_mooring')).toBe(3576);
    expect(feeAmt(atLoa(349.99), 'rotterdam_unmooring')).toBe(3327);
    expect(feeAmt(atLoa(344.99), 'rotterdam_mooring')).toBe(3455);
    expect(feeAmt(atLoa(344.99), 'rotterdam_unmooring')).toBe(3214);
  });

  it('j4: the increment boundary at 350 m as the engine computes it - 350.00 m prices the base figure (3,576 / 3,327, no increment); 350.01 m commences one unit (+126 / +117 -> 3,702 / 3,444); 355 m still one unit; 355.01 m commences two (3,828 / 3,561)', () => {
    expect(feeAmt(atLoa(350), 'rotterdam_mooring')).toBe(3576);
    expect(feeAmt(atLoa(350), 'rotterdam_unmooring')).toBe(3327);
    expect(feeAmt(atLoa(350.01), 'rotterdam_mooring')).toBe(3702);
    expect(feeAmt(atLoa(350.01), 'rotterdam_unmooring')).toBe(3444);
    expect(feeAmt(atLoa(355), 'rotterdam_mooring')).toBe(3702);
    expect(feeAmt(atLoa(355.01), 'rotterdam_mooring')).toBe(3828);
    expect(feeAmt(atLoa(355.01), 'rotterdam_unmooring')).toBe(3561);
  });

  it('j5: the MAREN increment ladder at 399 m - 10 commenced 5-m units in excess of 350: mooring 3,576 + 10 x 126 = 4,836; unmooring 3,327 + 10 x 117 = 4,497; at 425 m (the table top) 15 units: 5,466 / 5,082', () => {
    expect(feeAmt(atLoa(399), 'rotterdam_mooring')).toBe(4836);
    expect(feeAmt(atLoa(399), 'rotterdam_unmooring')).toBe(4497);
    expect(feeAmt(atLoa(425), 'rotterdam_mooring')).toBe(5466);
    expect(feeAmt(atLoa(425), 'rotterdam_unmooring')).toBe(5082);
  });

  it('j6: the mooring class default is the median of the three class figures at the last base band - 3,576 (mooring), not 3,327 (unmooring) or 5,178 (shifting); the shifting class is never encoded as a default-call rule', () => {
    const rule: any = rotterdam.fee_rules.find(r => r.id === 'rotterdam_mooring')!;
    const lastBand = rule.rate_structure.bands[rule.rate_structure.bands.length - 1];
    expect(lastBand.amount).toBe(3576);
    expect(lastBand.amount).not.toBe(5178);
    expect(rotterdam.fee_rules.some((r: any) => r.id === 'rotterdam_shifting')).toBe(false);
  });

  it('j7: the fixtures at their library LOAs - MAREN 399 m: towage 20,478, mooring 4,836, unmooring 4,497 (join 29,811); VISTULA 200 m: towage 5,281, mooring 776, unmooring 722 (join 6,779)', () => {
    const maren = calculatePortCallCost(rotterdam, makeInput({}));
    expect(feeAmt(maren, 'rotterdam_towage')).toBe(20478);
    expect(feeAmt(maren, 'rotterdam_mooring')).toBe(4836);
    expect(feeAmt(maren, 'rotterdam_unmooring')).toBe(4497);
    const vistula = calculatePortCallCost(rotterdam, makeInput(VISTULA, profiledCall('9775737')));
    expect(feeAmt(vistula, 'rotterdam_towage')).toBe(5281);
    expect(feeAmt(vistula, 'rotterdam_mooring')).toBe(776);
    expect(feeAmt(vistula, 'rotterdam_unmooring')).toBe(722);
  });

  it('j8: a vessel LOA below the table\'s lower bound prices the <=99.99 band (the table\'s own first band) - 90 m prices mooring 199 / unmooring 186; no extrapolated figure exists (the band covers the whole lower range)', () => {
    expect(feeAmt(atLoa(90), 'rotterdam_mooring')).toBe(199);
    expect(feeAmt(atLoa(90), 'rotterdam_unmooring')).toBe(186);
  });
});

describe('k. Terminal handling notice (Unit 5 - the separately-billed surface, no published rate)', () => {
  // The GOT mooring precedent's shape exactly: a zero-amount line with the
  // service_gap_notice flag - the informative-zero convention; never a
  // zero rendered as a figure, never an invented rate, nothing in any total.
  it('k1: the notice line renders at the default call with the service_gap_notice flag and the zero amount (the informative-zero convention)', () => {
    const result = calculatePortCallCost(rotterdam, makeInput({}));
    const notice = feeByRule(result, 'rotterdam_handling_notice');
    expect(notice.amount).toBe(0);
    expect(notice.quality_flags.some(f => f.type === 'service_gap_notice')).toBe(true);
    const flag = notice.quality_flags.find(f => f.type === 'service_gap_notice')!;
    expect(flag.description).toContain('separately-billed service with no published rate');
    expect(flag.description).toContain('total excludes it');
    expect(flag.description).toContain('never a tariff-derived figure');
  });

  it('k2: the honest-notice guarantee - no zero rendered as a figure and no invented rate: the rule carries no rate structure beyond the flat zero, no estimated_parameter block, and no amount_input (nothing for a user or the engine to price)', () => {
    const rule: any = rotterdam.fee_rules.find(r => r.id === 'rotterdam_handling_notice')!;
    expect(rule.rate_structure.type).toBe('flat');
    expect(rule.rate_structure.amount).toBe(0);
    expect(rule.rate_structure.amount_input).toBeUndefined();
    expect(rule.estimated_parameter).toBeUndefined();
    expect(rule.description).toContain('notice only and adds nothing to any total');
    expect(rule.description).toContain('no stevedoring rate appears anywhere in the archived record');
    // The citation evidences the surface, not a rate.
    expect(rule.source_reference.clause).toContain('no handling tariff exists in the archived record');
  });

  it('k3: the totals do not move - MAREN 133,470.88 and VISTULA 35,616.67 byte-identical with the notice in place', () => {
    const maren = calculatePortCallCost(rotterdam, makeInput({}));
    expect(maren.total).toBe(133470.88);
    const vistula = calculatePortCallCost(rotterdam, makeInput(VISTULA, profiledCall('9775737')));
    expect(vistula.total).toBe(35616.67);
    // The notice adds nothing: the fee sum equals the total at both fixtures.
    for (const r of [maren, vistula]) {
      const feeSum = r.billers.flatMap(b => b.fees).reduce((s, f) => s + f.amount, 0);
      expect(Math.round(feeSum * 100)).toBe(Math.round(r.total * 100));
    }
  });
});
