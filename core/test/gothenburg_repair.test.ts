/**
 * Gothenburg repair-pass checkpoint tests (spec v0.2.22).
 *
 * Pins the repaired behavior so the defect class cannot recur silently:
 * rules that never fire (malformed conditions, impossible conditions, unknown
 * unit types) and pseudo-rule discounts (zero-amount rules that compute
 * nothing). Every figure is per INTENDED_STATE.md, the authority of record
 * for the Gothenburg 2026 tariff.
 */

import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition, CostCalculationInput } from '../src/types';
import * as path from 'path';

const { port, validation } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml')
);
const errors = validation.errors;

function makeCall(callOverrides: Record<string, unknown>): CostCalculationInput {
  return {
    vessel: {
      gt: (callOverrides.gt as number) ?? 8890,
      nt: (callOverrides.nt as number) ?? 3200,
      loa_m: (callOverrides.loa_m as number) ?? 137
    },
    call: {
      port_id: 'gothenburg',
      date: '2026-06-01',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      flag_state: 'EU',
      esi_score: 0,
      csi_class: 'A',
      fossil_free_fuel_percentage: 0,
      ops_usage: false,
      lay_up_days: 0,
      pilotage_required: true,
      pilotage_hours: 2,
      pilotage_extra_pilot: false,
      pilotage_ordering_lead_time_hours: 4,
      ...callOverrides
    }
  };
}

function feesByFamily(result: ReturnType<typeof calculatePortCallCost>, family: string) {
  return result.billers.flatMap(b => b.fees.filter(f => f.fee_family === family));
}

function familyTotal(result: ReturnType<typeof calculatePortCallCost>, family: string) {
  return feesByFamily(result, family).reduce((sum, f) => sum + f.amount, 0);
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

describe('Gothenburg repair pass (v0.2.22)', () => {
  it('loads with zero errors', () => {
    expect(errors).toHaveLength(0);
  });

  it('no pseudo-rules remain: every rule has a non-empty rate structure', () => {
    for (const rule of port.fee_rules) {
      expect(rule.rate_structure).toBeDefined();
      expect((rule.rate_structure as any).type).toBeDefined();
    }
  });

  it('pilotage conditions are well-formed: exactly one start and one per-half-hour rule per class', () => {
    const pilotage = port.fee_rules.filter(r => r.fee_family === 'pilotage');
    const startRules = pilotage.filter(r => r.id.endsWith('_start'));
    const halfHourRules = pilotage.filter(r => r.id.includes('_per_half_hour'));
    expect(startRules).toHaveLength(10);
    expect(halfHourRules).toHaveLength(10);
    for (const rule of [...startRules, ...halfHourRules]) {
      const cond = rule.applicable_conditions as any;
      expect(cond.nt_class).toEqual(expect.any(Number));
      expect(cond.pilotage_required).toBe(true);
    }
  });

  // 4a. Pilotage fires with visible separate lines (INTENDED_STATE 2.2 table)
  it('CP-a: class 4 pilotage = start 17,300 + 4 x 3,940 + ordering 1,880 = 34,940 as separate lines', () => {
    const result = calculatePortCallCost(port, makeCall({}));
    const start = feeByRule(result, 'sjofartsverket_pilotage_class4_start');
    const halfHour = feeByRule(result, 'sjofartsverket_pilotage_class4_per_half_hour');
    const ordering = feeByRule(result, 'sjofartsverket_ordering_fee_4_5h');
    expect(start.amount).toBe(17300.00);
    expect(halfHour.amount).toBe(4 * 3940);
    expect(ordering.amount).toBe(1880.00);
    expect(familyTotal(result, 'pilotage')).toBe(17300 + 4 * 3940);
    expect(familyTotal(result, 'ordering_fee')).toBe(1880.00);
    expect(start.amount + halfHour.amount + ordering.amount).toBe(34940.00);
  });

  it('pilotage exactly one start and one half-hour rule fire for the class (no cross-class leakage)', () => {
    const result = calculatePortCallCost(port, makeCall({}));
    const pilotageLines = feesByFamily(result, 'pilotage').filter(f => f.amount > 0);
    expect(pilotageLines).toHaveLength(2);
    expect(pilotageLines.map(f => f.fee_rule_id).sort()).toEqual(
      ['sjofartsverket_pilotage_class4_per_half_hour', 'sjofartsverket_pilotage_class4_start']
    );
  });

  // 4b. Sjöfartsverket frequency discount on vessel fee + readiness fee
  it('CP-b: at 4 calls this month, vessel + readiness fees reduce to 50% (visible -21,950 line)', () => {
    const result = calculatePortCallCost(port, makeCall({ calls_this_month: 4 }));
    const vessel = feeByRule(result, 'sjofartsverket_vessel_fee_class4_csi_a');
    const readiness = feeByRule(result, 'sjofartsverket_readiness_fee_class4');
    expect(vessel.amount).toBe(8795.00);
    expect(readiness.amount).toBe(13155.00);
    const discount = feesByFamily(result, 'frequency_discount');
    expect(discount).toHaveLength(1);
    // 50% payable on 21,950 of vessel + readiness fees
    expect(discount[0].amount).toBe(-(8795 + 13155) * 0.5);
    expect(discount[0].amount).toBe(-10975.00);
  });

  it('CP-b: at 6 calls this month, vessel + readiness fees reduce to zero', () => {
    const result = calculatePortCallCost(port, makeCall({ calls_this_month: 6 }));
    const discount = feesByFamily(result, 'frequency_discount');
    expect(discount).toHaveLength(1);
    // 0% payable: the full 21,950 is discounted away
    expect(discount[0].amount).toBe(-(8795 + 13155));
    // The Sjöfartsverket biller nets the pilotage and ordering fees only:
    // 21,950 vessel+readiness minus 21,950 discount + pilotage 34,940 + ordering 1,880
    const sfv = result.billers.find(b => b.biller === 'Sjöfartsverket')!;
    expect(sfv.subtotal).toBe((8795 + 13155) - 21950 + 17300 + 15760 + 1880);
    // The net vessel + readiness contribution is zero
    const netVesselReadiness = sfv.fees
      .filter(f => ['vessel_fee', 'readiness_fee', 'frequency_discount'].includes(f.fee_family))
      .reduce((s, f) => s + f.amount, 0);
    expect(netVesselReadiness).toBe(0);
  });

  it('CP-b: no frequency discount line at 1-2 calls (100% payable)', () => {
    const r1 = calculatePortCallCost(port, makeCall({ calls_this_month: 1 }));
    expect(feesByFamily(r1, 'frequency_discount')).toHaveLength(0);
    const r2 = calculatePortCallCost(port, makeCall({ calls_this_month: 2 }));
    expect(feesByFamily(r2, 'frequency_discount')).toHaveLength(0);
  });

  // 4c. Port dues environmental discounts: exactly 10%, and additive 20%
  it('CP-c: ESI score 40 reduces port dues by exactly 10% (15,681.96), not 19 or 21', () => {
    const result = calculatePortCallCost(port, makeCall({ esi_score: 40 }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    // Base 8,890 GT progressive dues = 17,424.40; 10% off = 15,681.96.
    // Multiplicative would give 19% at the second 10% threshold; wrong-side
    // stacking would give 21%; additive gives exactly 10% here.
    expect(dues.amount).toBe(15681.96);
  });

  it('CP-c: ESI 40 + fossil-free 35% reduces port dues by exactly 20% (additive, 13,939.52)', () => {
    const result = calculatePortCallCost(port, makeCall({ esi_score: 40, fossil_free_fuel_percentage: 35 }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    // Additive stacking: 10% + 10% off the base = exactly 20%, not 19 (multiplicative)
    expect(dues.amount).toBe(13939.52);
    expect(dues.amount).toBeCloseTo(17424.40 * 0.8, 2);
  });

  it('CP-c: CSI class 4 (port Clean Shipping Index) also earns the 10% port-dues discount', () => {
    const result = calculatePortCallCost(port, makeCall({ clean_shipping_index_class: '4' }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBeCloseTo(17424.40 * 0.9, 2);
  });

  it('CP-c: the port 50% frequency discount on port dues computes from the second call', () => {
    const result = calculatePortCallCost(port, makeCall({ calls_this_month: 2 }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(17424.40 * 0.5);
  });

  it('discounts never touch other Port of Gothenburg lines (waste is undiscounted)', () => {
    const result = calculatePortCallCost(port, makeCall({ esi_score: 40, fossil_free_fuel_percentage: 35 }));
    const waste = feesByFamily(result, 'waste');
    expect(waste.length).toBeGreaterThan(0);
    for (const w of waste) {
      expect(w.adjustments_applied).toHaveLength(0);
    }
  });

  // 4d. Ordering fee bands
  it('CP-d: ordering fee 3.99 h -> 3,775 (3-4 h band)', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_ordering_lead_time_hours: 3.99 }));
    expect(familyTotal(result, 'ordering_fee')).toBe(3775);
  });

  it('CP-d: ordering fee exactly 4 h -> 1,880 (4h+ band)', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_ordering_lead_time_hours: 4 }));
    expect(familyTotal(result, 'ordering_fee')).toBe(1880);
  });

  it('CP-d: missing ordering lead time -> 9,390 with the least-favourable flag', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_ordering_lead_time_hours: undefined }));
    expect(familyTotal(result, 'ordering_fee')).toBe(9390);
    expect(result.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.toLowerCase().includes('least favourable')
    )).toBe(true);
  });

  it('CP-d: exactly one ordering fee band fires (previously all five fired simultaneously)', () => {
    const result = calculatePortCallCost(port, makeCall({}));
    const orderingLines = feesByFamily(result, 'ordering_fee');
    expect(orderingLines).toHaveLength(1);
    expect(orderingLines[0].fee_rule_id).toBe('sjofartsverket_ordering_fee_4_5h');
  });

  // Pilotage >7h discount (SJÖFS 2025:5 §25). Re-pinned in the worked-example
  // fix pass (spec v0.2.37): the old pin (17300*0.6 + 16*3940*0.6 = 45,840 for
  // class 4 at 8 h) faithfully recorded the defective whole-fee derivation
  // the extraction believed. The lathund (Sjöfartsverket LATHUND 2026, the
  // published worked table for SJÖFS 2025:5) computes 77,188 for class 4 at
  // 8 h: start 17,300 unreduced + first 14 half-hours full + 2 excess
  // half-hours at 60% (docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1, row 8,0 h).
  it('pilotage 40% discount beyond 7 hours: start unreduced, first 14 half-hours full, excess at 60% (lathund class-4 row 8,0 h = 77,188)', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_hours: 8 }));
    const start = feeByRule(result, 'sjofartsverket_pilotage_class4_start');
    const halfHour = feeByRule(result, 'sjofartsverket_pilotage_class4_per_half_hour');
    expect(start.amount).toBe(17300);
    expect(halfHour.amount).toBe(14 * 3940 + 2 * 3940 * 0.6);
    expect(start.amount + halfHour.amount).toBe(77188);
  });

  it('extra pilot fee fires when requested (previously never fired)', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_extra_pilot: true }));
    expect(feeByRule(result, 'sjofartsverket_pilotage_extra_pilot').amount).toBe(12620);
  });

  // 4e. Full-call regression: the INTENDED_STATE panamax call, now with pilotage
  it('CP-e: panamax regression (55,000 GT, NT 30,250 class 8, ESI 40, 1,500 moves) includes pilotage', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 55000, nt: 30250, loa_m: 290,
      containers_discharged_le20ft: 750,
      containers_discharged_gt20ft: 750,
      esi_score: 40,
      csi_class: 'A',
      pilotage_hours: 4,
      pilotage_ordering_lead_time_hours: 4
    }));

    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(81585); // 90,650 base - 10% ESI (INTENDED_STATE checkpoint)
    const vessel = feeByRule(result, 'sjofartsverket_vessel_fee_class8_csi_a');
    expect(vessel.amount).toBe(34475);
    const readiness = feeByRule(result, 'sjofartsverket_readiness_fee_class8');
    expect(readiness.amount).toBe(51555);
    const start = feeByRule(result, 'sjofartsverket_pilotage_class8_start');
    expect(start.amount).toBe(32540);
    const halfHour = feeByRule(result, 'sjofartsverket_pilotage_class8_per_half_hour');
    expect(halfHour.amount).toBe(8 * 7335);
    const ordering = feeByRule(result, 'sjofartsverket_ordering_fee_4_5h');
    expect(ordering.amount).toBe(1880);
    // Pilotage is now present: this is the repair's delta on the panamax call
    expect(start.amount + halfHour.amount + ordering.amount).toBe(32540 + 8 * 7335 + 1880);
  });

  it('rule inventory: pilotage table complete (start + half-hour for classes 1-10)', () => {
    for (let cls = 1; cls <= 10; cls++) {
      expect(port.fee_rules.find(r => r.id === `sjofartsverket_pilotage_class${cls}_start`)).toBeDefined();
      expect(port.fee_rules.find(r => r.id === `sjofartsverket_pilotage_class${cls}_per_half_hour`)).toBeDefined();
    }
  });
});
