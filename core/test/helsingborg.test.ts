/**
 * Helsingborg port file checkpoint tests (Helsingborg Extraction Reference §7).
 *
 * Every figure must match to the cent; a mismatch is a failure, not a tolerance.
 *
 * Common checkpoint assumptions (reference §7): first call of the calendar
 * month (no Sjöfartsverket frequency discount); Sjöfartsverket environmental
 * class E (not registered — conservative default, reference §10.2); pilotage
 * required with hours per §5 and ordering lead time >= 4 h; zero storage days;
 * stay under 4 days (no long-stay surcharge); no ancillary services; EES at
 * the September 2026 level (35 SEK/move); valid ISSC.
 *
 * Vessel particulars from core/data/vessel_library.yaml (NT values are
 * library estimates, flagged there).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition, CostCalculationInput } from '../src/types';
import * as path from 'path';

const { port, validation } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml')
);
const errors = validation.errors;
const warnings = validation.warnings;

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  const { gt, nt, loa_m, ...callOverrides } = overrides;
  return {
    vessel: {
      gt: (gt as number) ?? 0,
      nt: nt as number | undefined,
      loa_m: loa_m as number | undefined
    },
    call: {
      port_id: 'helsingborg',
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
      pilotage_ordering_lead_time_hours: 4,
      issc_valid: true,
      storage_days_import: 0,
      storage_days_export: 0,
      lay_time_hours: 16,
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

function familyTotal(result: ReturnType<typeof calculatePortCallCost>, family: string) {
  return feesByFamily(result, family).reduce((sum, f) => sum + f.amount, 0);
}

describe('Loader validation', () => {
  it('loads with zero errors', () => {
    expect(errors).toHaveLength(0);
  });
  it('is a self-contained silo: national Sjöfartsverket tables transcribed in full', () => {
    // 10 NT classes x 5 environmental classes vessel fees + 10 readiness fees
    const vesselFees = port.fee_rules.filter(r => r.fee_family === 'vessel_fee');
    const readinessFees = port.fee_rules.filter(r => r.fee_family === 'readiness_fee');
    expect(vesselFees).toHaveLength(50);
    expect(readinessFees).toHaveLength(10);
    // spot-check against the reference §4.1/§4.2 tables
    const c4e = vesselFees.find(r =>
      (r.applicable_conditions as any)?.nt_class === 4 &&
      (r.applicable_conditions as any)?.csi_class === 'E'
    );
    expect((c4e!.rate_structure as any).amount).toBe(43975);
    const c9e = vesselFees.find(r =>
      (r.applicable_conditions as any)?.nt_class === 9 &&
      (r.applicable_conditions as any)?.csi_class === 'E'
    );
    expect((c9e!.rate_structure as any).amount).toBe(201805);
    const r4 = readinessFees.find(r => (r.applicable_conditions as any)?.nt_class === 4);
    expect((r4!.rate_structure as any).amount).toBe(13155);
  });
  it('encodes the full pilotage table (start + per-half-hour, classes 1-10)', () => {
    const starts = port.fee_rules.filter(r => r.id.startsWith('sfv_pilotage_start'));
    const halves = port.fee_rules.filter(r => r.id.startsWith('sfv_pilotage_half_hour'));
    expect(starts).toHaveLength(10);
    expect(halves).toHaveLength(10);
  });
  it('never references another port file (port-silo principle)', () => {
    const serialized = JSON.stringify(port);
    expect(serialized).not.toContain('gothenburg_2026');
    expect(serialized).not.toContain('hamburg_2026');
  });
});

describe('CP1 - HELGAFELL (8,890 GT, NT 3,200 class 4, 137 m, 400 moves, 2 pilotage hours)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 8890, nt: 3200, loa_m: 137,
    containers_discharged_le20ft: 400,
    pilotage_hours: 2
  }));

  it('port dues 6.85 x GT = 60,896.50', () => {
    expect(feeByRule(result, 'poh_port_dues').amount).toBe(60896.50);
  });
  it('waste: flat 25,000 applies below the 33,333 GT break-even', () => {
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(25000.00);
  });
  it('cargo side 400 moves x 1,628 = 651,200 (due 625 + security 78 + LO-LO 890 + EES 35)', () => {
    expect(feeByRule(result, 'poh_cargo_due').amount).toBe(250000);
    expect(feeByRule(result, 'poh_security_fee').amount).toBe(31200);
    expect(feeByRule(result, 'poh_lolo_handling').amount).toBe(356000);
    expect(feeByRule(result, 'poh_ees').amount).toBe(14000);
    expect(feeByRule(result, 'poh_cargo_due').amount
      + feeByRule(result, 'poh_security_fee').amount
      + feeByRule(result, 'poh_lolo_handling').amount
      + feeByRule(result, 'poh_ees').amount).toBe(651200);
  });
  it('vessel fee class 4 E = 43,975', () => {
    const vesselFees = feesByFamily(result, 'vessel_fee');
    expect(vesselFees).toHaveLength(1);
    expect(vesselFees[0].amount).toBe(43975);
  });
  it('readiness fee class 4 = 13,155', () => {
    expect(feeByRule(result, 'sfv_readiness_fee_class4').amount).toBe(13155);
  });
  it('pilotage: start 17,300 + 4 half-hours x 3,940 + ordering 1,880 = 34,940', () => {
    expect(feeByRule(result, 'sfv_pilotage_start_class4').amount).toBe(17300);
    expect(feeByRule(result, 'sfv_pilotage_half_hour_class4').amount).toBe(15760);
    expect(feeByRule(result, 'sfv_ordering_fee_4_5h').amount).toBe(1880);
    expect(familyTotal(result, 'pilotage') + familyTotal(result, 'ordering_fee')).toBe(34940);
  });
  it('towage estimate renders 0.00 at LOA 137 m (0 tugs by LOA class)', () => {
    expect(feeByRule(result, 'poh_towage_estimate').amount).toBe(0.00);
  });
  it('no storage lines at zero storage days', () => {
    expect(feesByFamily(result, 'storage')).toHaveLength(0);
  });
  it('total 829,166.50', () => {
    expect(result.total).toBe(829166.50);
  });
  it('charges SEK (local currency, no conversion)', () => {
    expect(result.currency).toBe('SEK');
  });
});

describe('CP2 - MSC KYUNGMIN (21,979 GT, NT 8,000 class 5, 171.92 m, 400 moves, 3 pilotage hours)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 21979, nt: 8000, loa_m: 171.92,
    containers_discharged_le20ft: 400,
    pilotage_hours: 3
  }));

  it('port dues 150,556.15', () => {
    expect(feeByRule(result, 'poh_port_dues').amount).toBe(150556.15);
  });
  it('waste 25,000.00', () => {
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(25000.00);
  });
  it('cargo side 651,200.00', () => {
    expect(familyTotal(result, 'terminal_handling')).toBe(356000);
    expect(feeByRule(result, 'poh_ees').amount).toBe(14000);
    expect(feeByRule(result, 'poh_cargo_due').amount).toBe(250000);
    expect(feeByRule(result, 'poh_security_fee').amount).toBe(31200);
  });
  it('vessel fee class 5 = 80,755.00', () => {
    expect(familyTotal(result, 'vessel_fee')).toBe(80755.00);
  });
  it('readiness fee class 5 = 24,165.00', () => {
    expect(familyTotal(result, 'readiness_fee')).toBe(24165.00);
  });
  it('pilotage: 19,305 + 6 x 4,400 + 1,880 = 47,585.00', () => {
    expect(feeByRule(result, 'sfv_pilotage_start_class5').amount).toBe(19305);
    expect(feeByRule(result, 'sfv_pilotage_half_hour_class5').amount).toBe(26400);
    expect(familyTotal(result, 'pilotage') + familyTotal(result, 'ordering_fee')).toBe(47585.00);
  });
  it('towage estimate 60,000.00 (1 tug at 150-250 m LOA)', () => {
    expect(feeByRule(result, 'poh_towage_estimate').amount).toBe(60000.00);
  });
  it('total 1,039,261.15', () => {
    expect(result.total).toBe(1039261.15);
  });
});

describe('CP3 - VISTULA MAERSK (34,882 GT, NT 13,000 class 6, 200 m, 500 moves, 3 pilotage hours)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 34882, nt: 13000, loa_m: 200,
    containers_discharged_le20ft: 500,
    pilotage_hours: 3
  }));

  it('port dues 238,941.70', () => {
    expect(feeByRule(result, 'poh_port_dues').amount).toBe(238941.70);
  });
  it('waste 0.75 x GT = 26,161.50 (above the 33,333 GT break-even)', () => {
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(26161.50);
  });
  it('cargo side 500 x 1,628 = 814,000.00', () => {
    expect(feeByRule(result, 'poh_cargo_due').amount).toBe(312500);
    expect(feeByRule(result, 'poh_security_fee').amount).toBe(39000);
    expect(feeByRule(result, 'poh_lolo_handling').amount).toBe(445000);
    expect(feeByRule(result, 'poh_ees').amount).toBe(17500);
  });
  it('vessel fee class 6 = 117,385.00', () => {
    expect(familyTotal(result, 'vessel_fee')).toBe(117385.00);
  });
  it('readiness fee class 6 = 35,100.00', () => {
    expect(familyTotal(result, 'readiness_fee')).toBe(35100.00);
  });
  it('pilotage: 26,105 + 6 x 5,865 + 1,880 = 63,175.00', () => {
    expect(familyTotal(result, 'pilotage') + familyTotal(result, 'ordering_fee')).toBe(63175.00);
  });
  it('towage estimate 60,000.00 (1 tug at 150-250 m LOA)', () => {
    expect(feeByRule(result, 'poh_towage_estimate').amount).toBe(60000.00);
  });
  it('total 1,354,763.20', () => {
    expect(result.total).toBe(1354763.20);
  });
});

describe('CP4 - MAREN MAERSK (194,849 GT, NT 70,000 class 9, 399 m, 3,000 moves, 4 pilotage hours)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 194849, nt: 70000, loa_m: 399,
    containers_discharged_le20ft: 3000,
    pilotage_hours: 4
  }));

  it('port dues 1,334,715.65', () => {
    expect(feeByRule(result, 'poh_port_dues').amount).toBe(1334715.65);
  });
  it('waste 0.75 x GT = 146,136.75', () => {
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(146136.75);
  });
  it('cargo side 3,000 x 1,628 = 4,884,000.00', () => {
    expect(feeByRule(result, 'poh_cargo_due').amount).toBe(1875000);
    expect(feeByRule(result, 'poh_security_fee').amount).toBe(234000);
    expect(feeByRule(result, 'poh_lolo_handling').amount).toBe(2670000);
    expect(feeByRule(result, 'poh_ees').amount).toBe(105000);
  });
  it('vessel fee class 9 = 201,805.00', () => {
    expect(familyTotal(result, 'vessel_fee')).toBe(201805.00);
  });
  it('readiness fee class 9 = 60,370.00', () => {
    expect(familyTotal(result, 'readiness_fee')).toBe(60370.00);
  });
  it('pilotage: 35,755 + 8 x 8,105 + 1,880 = 102,475.00', () => {
    expect(familyTotal(result, 'pilotage') + familyTotal(result, 'ordering_fee')).toBe(102475.00);
  });
  it('towage estimate 120,000.00 (2 tugs above 250 m LOA)', () => {
    expect(feeByRule(result, 'poh_towage_estimate').amount).toBe(120000.00);
  });
  it('total 6,849,502.40', () => {
    expect(result.total).toBe(6849502.40);
  });
});

describe('CP5 - HELGAFELL with ESI 35 and 35% fossil-free fuel (additive discount stacking)', () => {
  const result = calculatePortCallCost(port, makeCall({
    gt: 8890, nt: 3200, loa_m: 137,
    containers_discharged_le20ft: 400,
    pilotage_hours: 2,
    esi_score: 35,
    fossil_free_fuel_percentage: 35
  }));

  it('port dues 60,896.50 x 0.80 = 48,717.20 (two 10% discounts stack additively)', () => {
    expect(feeByRule(result, 'poh_port_dues').amount).toBe(48717.20);
    expect(feeByRule(result, 'poh_port_dues').adjustments_applied).toHaveLength(2);
  });
  it('no other component is discounted', () => {
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(25000.00);
    expect(familyTotal(result, 'vessel_fee')).toBe(43975.00);
    expect(familyTotal(result, 'readiness_fee')).toBe(13155.00);
    expect(familyTotal(result, 'pilotage') + familyTotal(result, 'ordering_fee')).toBe(34940.00);
  });
  it('total 816,987.20', () => {
    expect(result.total).toBe(816987.20);
  });
});

describe('Boundary behaviour', () => {
  it('missing environmental class defaults to E with a visible flag (spec 4.4.2)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2
    }));
    expect(familyTotal(result, 'vessel_fee')).toBe(43975.00);
    expect(result.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.includes('least favourable')
    )).toBe(true);
  });

  it('Sjöfartsverket frequency discount: 4 calls = 50% of vessel + readiness fees', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      calls_this_month: 4,
      csi_class: 'E'
    }));
    const discount = feeByRule(result, 'sfv_frequency_discount');
    // 43,975 + 13,155 = 57,130; 50% payable => -28,565.00
    expect(discount.amount).toBe(-28565.00);
  });

  it('Sjöfartsverket frequency discount: 6+ calls = fully waived', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      calls_this_month: 6,
      csi_class: 'E'
    }));
    const discount = feeByRule(result, 'sfv_frequency_discount');
    expect(discount.amount).toBe(-57130.00);
  });

  it('ordering fee band boundaries: exactly 4 h is the 4h_plus band (1,880)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 4,
      csi_class: 'E'
    }));
    expect(familyTotal(result, 'ordering_fee')).toBe(1880);
  });

  it('ordering fee band boundaries: just under 4 h is the 3-4 h band (3,775)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 3.99,
      csi_class: 'E'
    }));
    expect(familyTotal(result, 'ordering_fee')).toBe(3775);
  });

  it('missing ordering lead time defaults to the least favourable band (9,390)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: undefined,
      csi_class: 'E'
    }));
    expect(familyTotal(result, 'ordering_fee')).toBe(9390);
  });

  it('waste break-even: exactly 33,333 GT takes the flat 25,000 (highest applies)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 33333, nt: 3200, loa_m: 137,
      pilotage_hours: 2,
      csi_class: 'E'
    }));
    expect(feeByRule(result, 'poh_waste_fee').amount).toBe(25000.00);
  });

  it('long-stay surcharge after four days: 100 SEK per commenced metre LOA per 7-day period', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      csi_class: 'E',
      port_time_hours: 96.01
    }));
    expect(feeByRule(result, 'poh_long_stay_port_dues').amount).toBe(13700.00);
    expect(feeByRule(result, 'poh_long_stay_waste').amount).toBe(548.00);
  });

  it('no long-stay surcharge at or under 96 hours', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      csi_class: 'E',
      port_time_hours: 96
    }));
    expect(result.billers.some(b => b.fees.some(f => f.fee_rule_id === 'poh_long_stay_port_dues'))).toBe(false);
  });

  it('vessels without a valid ISSC pay the double security fee', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      csi_class: 'E',
      issc_valid: false
    }));
    expect(feeByRule(result, 'poh_security_fee_no_issc').amount).toBe(62400);
    expect(result.billers.some(b => b.fees.some(f => f.fee_rule_id === 'poh_security_fee'))).toBe(false);
  });

  it('pilotage discount: 40% beyond 7 hours on the half-hour fee only — lathund class-4 row 8,0 h = 77,188', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 8,
      csi_class: 'E'
    }));
    // Re-pinned in the worked-example fix pass (spec v0.2.37). The old pin
    // (48,204 total) recorded the defective whole-fee derivation. SJÖFS
    // 2025:5 §25 reduces the per-half-hour fee only, on the portion beyond
    // 7 hours: start 17,300 unreduced + first 14 half-hours full + 2 excess
    // half-hours at 60% — the lathund's published class-4 row for 8,0 h is
    // 77,188 (docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1).
    expect(feeByRule(result, 'sfv_pilotage_start_class4').amount).toBe(17300);
    expect(feeByRule(result, 'sfv_pilotage_half_hour_class4').amount).toBe(14 * 3940 + 2 * 3940 * 0.6);
    expect(familyTotal(result, 'pilotage')).toBe(77188.00);
  });

  it('storage: 7 free days, then 275/day per 20ft import unit', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      csi_class: 'E',
      storage_days_import: 10
    }));
    // 3 chargeable days x 400 x 275 = 330,000
    expect(feeByRule(result, 'poh_storage_full_import_20ft').amount).toBe(330000);
  });

  it('30ft and 45ft storage rules only bill their dedicated unit counts (no double count)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      containers_discharged_gt20ft: 100,
      pilotage_hours: 2,
      csi_class: 'E',
      storage_days_import: 10,
      storage_import_45ft_units: 20
    }));
    expect(feeByRule(result, 'poh_storage_full_import_20ft').amount).toBe(330000);
    expect(feeByRule(result, 'poh_storage_full_import_40ft').amount).toBe(100 * 3 * 550);
    expect(feeByRule(result, 'poh_storage_full_import_45ft').amount).toBe(20 * 3 * 620);
    const fee30 = result.billers.flatMap(b => b.fees.filter(f => f.fee_rule_id === 'poh_storage_full_import_30ft'));
    expect(fee30).toHaveLength(0);
  });

  it('godsavgift is surfaced as not-yet-encoded, never estimated', () => {
    const cargoFees = port.fee_rules.filter(r => r.fee_family === 'cargo_fee');
    expect(cargoFees).toHaveLength(0);
  });

  it('towage is a flagged estimate, never verified data', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 21979, nt: 8000, loa_m: 171.92,
      containers_discharged_le20ft: 400,
      pilotage_hours: 3,
      csi_class: 'E'
    }));
    expect(result.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
    const towageRule = port.fee_rules.find(r => r.id === 'poh_towage_estimate')!;
    expect(towageRule.estimated_parameter).toBeDefined();
  });

  it('user-supplied tug count overrides the LOA-class default', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, nt: 3200, loa_m: 137,
      containers_discharged_le20ft: 400,
      pilotage_hours: 2,
      csi_class: 'E',
      tug_count: 2,
      towage_cost_per_tug: 45000
    }));
    expect(feeByRule(result, 'poh_towage_estimate').amount).toBe(90000);
  });
});
