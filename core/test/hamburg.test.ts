/**
 * Hamburg port file checkpoint tests (Hamburg Extraction Reference section 9).
 *
 * Every figure must match to the cent; a mismatch is a failure, not a tolerance.
 *
 * CP1 acceptance rule: the engine must reproduce the values printed in S1
 * (32,838.88 / 7,022.54 / 39,861.43), not strict re-rounding of the
 * intermediate arithmetic. Note that 35,501.50 x 0.925 strictly rounds to
 * 32,838.89 - S1's printed 32,838.88 reflects the authority's own
 * multi-decimal internal computation ("The HPA uses multiple decimals that
 * are not shown here"). The fixtures below use S1's printed figures verbatim;
 * the engine carries a parallel full-precision chain so both the printed
 * components and the printed total reproduce.
 *
 * CP2 note: Helgafell is a 2005 build; per the build-year heuristic her engine
 * Tier defaults to Tier I (reference states both Tier I and Tier II outcomes;
 * the primary checkpoint figure is Tier I, port fee ~ 998.79).
 */

import {
  calculatePortCallCost,
  roundToCent,
  inferEngineTier
} from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition, CostCalculationInput } from '../src/types';
import * as path from 'path';

const port: PortDefinition = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'hamburg_2026.yaml')
).port;

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  const { gt, built_year, ...callOverrides } = overrides;
  return {
    vessel: { gt: (gt as number) ?? 0, built_year: built_year as number | undefined },
    call: {
      port_id: 'hamburg',
      date: '2026-06-01',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      flag_state: 'non-EU',
      ops_usage: false,
      pilotage_required: true,
      ...callOverrides
    }
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

function feesByFamily(result: ReturnType<typeof calculatePortCallCost>, family: string) {
  return result.billers.flatMap(b => b.fees.filter(f => f.fee_family === family));
}

describe('CP1 - HPA worked example (S1 p.8, printed figures verbatim)', () => {
  // 149,000 GT container ship, Tier III (-20%), ESI air 80 (-7%, cap not
  // reached), OPS (50 MWh; rebate -0.015 EUR/GT), quantum level 3 (-7.5%).
  const result = calculatePortCallCost(port, makeCall({
    gt: 149000,
    engine_tier: 'Tier III',
    engine_tier_estimated: false,
    esi_score: 80,
    ops_usage: true,
    quantum_prior_year_gt: 30000000
  }));

  it('GT component reproduces S1 printed 32,838.88', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    expect(gt.amount).toBe(32838.88);
  });

  it('environmental component reproduces S1 printed 7,022.54', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(env.amount).toBe(7022.54);
  });

  it('port fee total reproduces S1 printed 39,861.43 (hidden-decimals; strict re-round would be 39,861.42)', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    expect(portFee.amount).toBe(39861.43);
  });

  it('charges EUR (currency per port, no conversion in the engine)', () => {
    expect(result.currency).toBe('EUR');
    expect(feeByRule(result, 'hpa_port_fee').currency).toBe('EUR');
  });
});

describe('CP2 - Helgafell (8,890 GT, Tier I per reference, 16 h, 400 containers, feeder gangway)', () => {
  // Reference CP2: Tier I (the reference's stated tier for this fixture;
  // entered explicitly per spec v0.2.29 - the default is worst-case Tier 0,
  // and the build-year heuristic is never invoked without user action).
  const result = calculatePortCallCost(port, makeCall({
    gt: 8890,
    engine_tier: 'Tier I',
    engine_tier_estimated: false,
    lay_time_hours: 16,
    containers_discharged_le20ft: 400,
    gangway_class: 'feeder'
  }));

  it('port fee ~ 998.79 (GT 760.98 + env 237.81)', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(gt.amount).toBe(760.98);
    expect(env.amount).toBe(237.81);
    expect(portFee.amount).toBe(998.79);
  });

  it('pilotage dues 1,251 + fees 856 = 2,107', () => {
    expect(feeByRule(result, 'gdws_pilotage_dues').amount).toBe(1251);
    expect(feeByRule(result, 'gdws_pilot_fees').amount).toBe(856);
  });

  it('HHLA tonnage dues 11,112.50 + gangway 453.50 = 11,566.00; security 6,800.00; Hafenfonds 1.5% of 11,566.00 + 6,800.00', () => {
    const tonnage = feeByRule(result, 'hhla_tonnage_dues');
    expect(tonnage.amount).toBe(11112.50);
    const gangway = feeByRule(result, 'hhla_gangway');
    expect(gangway.amount).toBe(453.50);
    const security = feeByRule(result, 'hhla_security_charge');
    expect(security.amount).toBe(6800.00);
    const hafenfonds = feesByFamily(result, 'hafenfonds')[0];
    // 11,566.00 + 6,800.00 = 18,366.00; 1.5% = 275.49
    expect(hafenfonds.amount).toBe(275.49);
    const hhlaBiller = result.billers.find(b => b.biller === 'HHLA Container Terminals')!;
    expect(hhlaBiller.subtotal).toBe(roundToCent(11739.49 + 6902.00 + 143200));
  });

  it('waste total 275.89 (120.02 + 1.00 + 107.57 + 47.30)', () => {
    const wasteFees = feesByFamily(result, 'waste');
    const wasteTotal = wasteFees.reduce((s, f) => s + f.amount, 0);
    expect(roundToCent(wasteTotal)).toBe(275.89);
    expect(feeByRule(result, 'bukea_waste_marpol_i').amount).toBe(120.02);
    expect(feeByRule(result, 'bukea_waste_marpol_iv').amount).toBe(1.00);
    expect(feeByRule(result, 'bukea_waste_marpol_v_abc').amount).toBe(107.57);
    expect(feeByRule(result, 'bukea_waste_marpol_v_defi').amount).toBe(47.30);
  });

  it('handling estimate 400 x 358 = 143,200 with estimated flag', () => {
    const handling = feeByRule(result, 'hhla_container_handling');
    expect(handling.amount).toBe(143200);
    expect(handling.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('towage estimate 15,000 with estimated flag', () => {
    const towage = feeByRule(result, 'hamburg_towage_estimate');
    expect(towage.amount).toBe(15000);
    expect(towage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });
});

describe('CP3 - MSC Kyungmin (21,979 GT, Tier II, 16 h, 400 containers, overseas gangway)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 21979,
    engine_tier: 'Tier II',
    engine_tier_estimated: false,
    lay_time_hours: 16,
    containers_discharged_le20ft: 400,
    gangway_class: 'overseas'
  }));

  it('port fee 2,906.35 (GT 2,301.94 + env 604.41)', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(gt.amount).toBe(2301.94);
    expect(env.amount).toBe(604.41);
    expect(portFee.amount).toBe(2906.35);
  });

  it('pilotage dues 3,030 + fees 1,450 = 4,480', () => {
    expect(feeByRule(result, 'gdws_pilotage_dues').amount).toBe(3030);
    expect(feeByRule(result, 'gdws_pilot_fees').amount).toBe(1450);
  });

  it('HHLA tonnage 27,473.75 + gangway 633.80; subtotal 28,107.55; Hafenfonds -> 28,529.16 (incl. security)', () => {
    expect(feeByRule(result, 'hhla_tonnage_dues').amount).toBe(27473.75);
    expect(feeByRule(result, 'hhla_gangway').amount).toBe(633.80);
    expect(feeByRule(result, 'hhla_security_charge').amount).toBe(6800.00);
    const hhlaBiller = result.billers.find(b => b.biller === 'HHLA Container Terminals')!;
    // 28,107.55 + 6,902.00 security (6,800 + 102 Hafenfonds on security alone is
    // included in the biller-level single uplift): 34,800.00 + 522.00 = 35,322.00? No:
    // reference: tonnage+gangway 28,107.55 -> 28,529.16 (+421.61); security 6,800 -> 6,902.00 (+102.00)
    expect(hhlaBiller.subtotal).toBe(roundToCent(28529.16 + 6902.00 + 143200));
  });

  it('waste total 610.97 (296.72 + 1.00 + 265.95 + 47.30)', () => {
    expect(feeByRule(result, 'bukea_waste_marpol_i').amount).toBe(296.72);
    expect(feeByRule(result, 'bukea_waste_marpol_v_abc').amount).toBe(265.95);
    const wasteTotal = roundToCent(feesByFamily(result, 'waste').reduce((s, f) => s + f.amount, 0));
    expect(wasteTotal).toBe(610.97);
  });

  it('handling estimate 400 x 358 = 143,200; towage estimate 15,000', () => {
    expect(feeByRule(result, 'hhla_container_handling').amount).toBe(143200);
    expect(feeByRule(result, 'hamburg_towage_estimate').amount).toBe(15000);
  });
});

describe('CP4 - Vistula Maersk (34,882 GT, Tier II, 16 h, 500 containers)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 34882,
    engine_tier: 'Tier II',
    engine_tier_estimated: false,
    lay_time_hours: 16,
    containers_discharged_le20ft: 500,
    gangway_class: 'overseas'
  }));

  it('port fee 7,763.43 (GT 6,148.32 + env 1,615.11)', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(gt.amount).toBe(6148.32);
    expect(env.amount).toBe(1615.11);
    expect(portFee.amount).toBe(7763.43);
  });

  it('pilotage dues 4,701 + fees 1,974 = 6,675', () => {
    expect(feeByRule(result, 'gdws_pilotage_dues').amount).toBe(4701);
    expect(feeByRule(result, 'gdws_pilot_fees').amount).toBe(1974);
  });

  it('HHLA tonnage 43,602.50 + gangway 633.80 = 44,236.30; security 8,500.00 -> 8,627.50 with Hafenfonds', () => {
    expect(feeByRule(result, 'hhla_tonnage_dues').amount).toBe(43602.50);
    expect(feeByRule(result, 'hhla_gangway').amount).toBe(633.80);
    expect(feeByRule(result, 'hhla_security_charge').amount).toBe(8500.00);
    const hhlaBiller = result.billers.find(b => b.biller === 'HHLA Container Terminals')!;
    expect(hhlaBiller.subtotal).toBe(roundToCent(44899.84 + 8627.50 + 179000));
  });

  it('waste total 941.28 (470.91 + 1.00 + 422.07 + 47.30)', () => {
    expect(feeByRule(result, 'bukea_waste_marpol_i').amount).toBe(470.91);
    expect(feeByRule(result, 'bukea_waste_marpol_v_abc').amount).toBe(422.07);
    const wasteTotal = roundToCent(feesByFamily(result, 'waste').reduce((s, f) => s + f.amount, 0));
    expect(wasteTotal).toBe(941.28);
  });

  it('handling estimate 500 x 358 = 179,000; towage estimate 15,000', () => {
    expect(feeByRule(result, 'hhla_container_handling').amount).toBe(179000);
    expect(feeByRule(result, 'hamburg_towage_estimate').amount).toBe(15000);
  });
});

describe('CP5 - Maren Maersk (194,849 GT, Tier II, 50 h, 3,000 containers)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 194849,
    engine_tier: 'Tier II',
    engine_tier_estimated: false,
    lay_time_hours: 50,
    containers_discharged_le20ft: 3000,
    gangway_class: 'overseas'
  }));

  it('port fee 62,030.41 (GT 49,129.98 + env 12,900.43)', () => {
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(gt.amount).toBe(49129.98);
    expect(env.amount).toBe(12900.43);
    expect(portFee.amount).toBe(62030.41);
  });

  it('pilotage dues 5,322 (Elbe cap >52,000 GT) + fees 4,100 (capped) = 9,422', () => {
    expect(feeByRule(result, 'gdws_pilotage_dues').amount).toBe(5322);
    expect(feeByRule(result, 'gdws_pilot_fees').amount).toBe(4100);
  });

  it('HHLA tonnage dues (50 h): 194,849 x 3.65 = 711,198.85; + gangway 633.80 = 711,832.65; Hafenfonds -> 722,510.14 (incl. security)', () => {
    expect(feeByRule(result, 'hhla_tonnage_dues').amount).toBe(711198.85);
    expect(feeByRule(result, 'hhla_gangway').amount).toBe(633.80);
    expect(feeByRule(result, 'hhla_security_charge').amount).toBe(51000.00);
    const hhlaBiller = result.billers.find(b => b.biller === 'HHLA Container Terminals')!;
    expect(hhlaBiller.subtotal).toBe(roundToCent(722510.14 + 51765.00 + 1074000));
  });

  it('waste total 3,506.76 (2,630.46 + 1.00 + 828.00 flat >45,000 GT + 47.30)', () => {
    expect(feeByRule(result, 'bukea_waste_marpol_i').amount).toBe(2630.46);
    expect(feeByRule(result, 'bukea_waste_marpol_v_abc').amount).toBe(828.00);
    const wasteTotal = roundToCent(feesByFamily(result, 'waste').reduce((s, f) => s + f.amount, 0));
    expect(wasteTotal).toBe(3506.76);
  });

  it('handling estimate 3,000 x 358 = 1,074,000; towage estimate 15,000', () => {
    expect(feeByRule(result, 'hhla_container_handling').amount).toBe(1074000);
    expect(feeByRule(result, 'hamburg_towage_estimate').amount).toBe(15000);
  });
});

describe('Hamburg engine mechanics (reference sections 3-8)', () => {
  it('Tier heuristic: built 2011+ -> Tier II, 2000-2010 -> Tier I, earlier/unknown -> Tier 0', () => {
    expect(inferEngineTier(2024)).toBe('Tier II');
    expect(inferEngineTier(2011)).toBe('Tier II');
    expect(inferEngineTier(2010)).toBe('Tier I');
    expect(inferEngineTier(2000)).toBe('Tier I');
    expect(inferEngineTier(1999)).toBe('Tier 0');
    expect(inferEngineTier(undefined)).toBe('Tier 0');
  });

  it('default call is worst-case Tier 0 with a named assumed-parameter flag (spec v0.2.29)', () => {
    // No tier entered, no inference requested: the build year must NOT
    // influence the result. The default is Tier 0 (+30% env), explicitly
    // flagged as an assumed parameter.
    const modern = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      lay_time_hours: 16
    }));
    const legacy = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 1995,
      lay_time_hours: 16
    }));
    const tierFlag = modern.quality_flags.find(
      f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier'
    );
    expect(tierFlag).toBeDefined();
    expect(tierFlag!.description).toContain('NOx Tier not entered; worst case (Tier 0) applied');
    expect(legacy.quality_flags.some(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier')).toBe(true);
    // Same GT, same tier outcome regardless of build year
    expect(feeByRule(modern, 'hpa_port_fee').amount).toBe(feeByRule(legacy, 'hpa_port_fee').amount);
    const env = feeByRule(modern, 'hpa_port_fee').component_amounts!.find(c => c.label === 'Environmental component')!;
    // 20,000 x 0.0214 + 1,979 x 0.0746 = 575.63 base; Tier 0 +30% -> 748.32
    expect(env.amount).toBe(748.32);
  });

  it('explicit infer-from-build-year action applies the heuristic and flags it as an assumption', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      infer_engine_tier_from_build_year: true,
      lay_time_hours: 16
    }));
    const flag = result.quality_flags.find(
      f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier'
    );
    expect(flag).toBeDefined();
    expect(flag!.description).toContain('inferred from build year 2024');
    const env = feeByRule(result, 'hpa_port_fee').component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(env.amount).toBe(604.41); // Tier II +5% (heuristic value, now explicit)
  });

  it('entering a certified tier removes the assumed-parameter flag', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      engine_tier: 'Tier II',
      engine_tier_estimated: false,
      lay_time_hours: 16
    }));
    expect(result.quality_flags.some(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier')).toBe(false);
    expect(result.quality_flags.some(f => f.type === 'estimated_engine_tier')).toBe(false);
    const env = feeByRule(result, 'hpa_port_fee').component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(env.amount).toBe(604.41);
  });

  it('Helgafell Tier II alternative: port fee ~ 960.74 (env 199.76)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890,
      engine_tier: 'Tier II',
      engine_tier_estimated: false,
      lay_time_hours: 16,
      containers_discharged_le20ft: 400,
      gangway_class: 'feeder'
    }));
    const portFee = feeByRule(result, 'hpa_port_fee');
    expect(portFee.amount).toBe(960.74);
  });

  it('no demurrage while lay time is within the port fee 120 h coverage', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      lay_time_hours: 50,
      built_year: 2024
    }));
    expect(result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_demurrage')).toBeUndefined();
  });

  it('demurrage beyond 120 h: 0.0165 EUR/GT per commenced 12 h (e.g. 16 h excess -> 2 periods)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      port_time_hours: 136,
      built_year: 2024
    }));
    const demurrage = feeByRule(result, 'hpa_demurrage');
    expect(demurrage.amount).toBe(725.31); // 2 commenced 12-h periods x 21,979 x 0.0165
  });

  it('HPA berth fees off by default (terminal berths) and available via the HPA-berth toggle', () => {
    const off = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      lay_time_hours: 16
    }));
    expect(off.billers.flatMap(b => b.fees).find(f => f.fee_family === 'idle_berth')).toBeUndefined();

    const on = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      lay_time_hours: 16,
      hpa_berth_usage: true,
      berth_type: 'quay',
      berth_hours: 12
    }));
    const berthFee = on.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_berth_fee_quay')!;
    expect(berthFee.amount).toBe(668.16); // two commenced 6-h periods x 21,979 x 0.0152
  });

  it('pilotage segment percentage scales both dues and fees (partial Elbe transit)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      pilotage_segment_pct: 40
    }));
    expect(feeByRule(result, 'gdws_pilotage_dues').amount).toBe(3030 * 0.4);
    expect(feeByRule(result, 'gdws_pilot_fees').amount).toBe(1450 * 0.4);
  });

  it('ESI air discount bands with euro caps (env component)', () => {
    // ESI air 20-<25: 0.35%, max 175. Small vessel: pct applies.
    const small = calculatePortCallCost(port, makeCall({
      gt: 8890,
      engine_tier: 'Tier I',
      engine_tier_estimated: false,
      esi_score: 22
    }));
    const envSmall = feeByRule(small, 'hpa_port_fee').component_amounts!.find(c => c.label === 'Environmental component')!;
    // 190.25 * 1.25 (Tier I) = 237.8125 -> 237.81; -0.35% = 0.8324, rebate rounded up -> 0.84
    expect(envSmall.amount).toBe(236.97);
  });

  it('gangway class fallback is overseas with a visible flag when unset', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890,
      built_year: 2005
    }));
    const gangway = feeByRule(result, 'hhla_gangway');
    expect(gangway.amount).toBe(633.80);
    expect(gangway.quality_flags.some(f => f.type === 'fallback_value')).toBe(true);
  });

  it('waste reductions apply per component when enabled and are combinable', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      waste_short_sea_reduction: true,
      waste_alternative_fuel_reduction: true,
      waste_sustainable_waste_reduction: true
    }));
    // MARPOL I: 296.72, -50% alt-fuel -> 148.36, then -90% short-sea -> 14.84
    expect(feeByRule(result, 'bukea_waste_marpol_i').amount).toBe(14.84);
    // MARPOL V A-C: 265.95, -2% -> 260.63, then -90% -> 26.06
    expect(feeByRule(result, 'bukea_waste_marpol_v_abc').amount).toBe(26.06);
  });

  it('Hafenfonds excludes storage and the estimated handling parameter', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      lay_time_hours: 16,
      containers_discharged_le20ft: 400,
      storage_days_import: 10,
      gangway_class: 'overseas'
    }));
    const hhlaBiller = result.billers.find(b => b.biller === 'HHLA Container Terminals')!;
    const hafenfonds = hhlaBiller.fees.find(f => f.fee_family === 'hafenfonds')!;
    const storage = hhlaBiller.fees.filter(f => f.fee_family === 'storage').reduce((s, f) => s + f.amount, 0);
    const handling = feeByRule(result, 'hhla_container_handling').amount;
    const nonExcluded = hhlaBiller.fees
      .filter(f => f.fee_family !== 'hafenfonds' && f.fee_family !== 'storage' && f.fee_family !== 'terminal_handling')
      .reduce((s, f) => s + f.amount, 0);
    expect(hafenfonds.amount).toBe(roundToCent(nonExcluded * 0.015));
    expect(storage).toBeGreaterThan(0);
    expect(handling).toBe(143200);
  });

  it('storage import escalation: free 3 days, doubling after 7, tripling after 14', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      containers_discharged_le20ft: 10,
      storage_days_import: 16
    }));
    const storage20 = feeByRule(result, 'hhla_storage_import_20ft');
    // 3 free; 10 containers x (7 days x 41.10 + 6 days x 82.20) = 10 x 780.90 = 7,809.00
    expect(storage20.amount).toBe(7809.00);
  });

  it('GT cap: 225,000 GT not chargeable above (Tier 0 surcharge case uses capped GT)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 240000,
      built_year: 1990, // Tier 0 +30%
      lay_time_hours: 16
    }));
    const portFee = feeByRule(result, 'hpa_port_fee');
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    // env: 20,000*0.0214 + 80,000*0.0746 + 125,000*0.0621 = 428 + 5,968 + 7,762.50 = 14,158.50; x1.30 = 18,406.05
    expect(env.amount).toBe(18406.05);
  });

  it('towage and handling are user-editable estimated parameters', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      containers_discharged_le20ft: 100,
      towage_amount: 18000,
      handling_rate_per_move: 300
    }));
    expect(feeByRule(result, 'hamburg_towage_estimate').amount).toBe(18000);
    expect(feeByRule(result, 'hhla_container_handling').amount).toBe(30000);
    expect(feeByRule(result, 'hhla_container_handling').quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('every Hamburg result line carries a complete source reference', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979,
      built_year: 2024,
      lay_time_hours: 16,
      containers_discharged_le20ft: 400
    }));
    for (const biller of result.billers) {
      for (const fee of biller.fees) {
        const ref = fee.source_reference;
        expect(ref).toBeDefined();
        for (const field of ['document_name', 'document_url', 'document_issued', 'page', 'clause', 'verified_on', 'verified_by']) {
          expect(ref[field as keyof typeof ref]).toBeTruthy();
        }
      }
    }
  });
});
