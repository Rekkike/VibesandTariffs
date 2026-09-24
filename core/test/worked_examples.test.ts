/**
 * Worked-example pinning tests (spec v0.2.36, fixed paths re-pinned in
 * the worked-example fix pass, spec v0.2.37).
 *
 * Pins the tariff-sheet worked examples that had no prior pin, per
 * docs/TARIFF_EXAMPLE_VERIFICATION.md (the standing cross-check record).
 * Each test cites its sheet example (document, page) and pins the sheet's
 * printed figures.
 *
 * The >7 h pilotage defect (§3.1) and the ordering-fee ≥5 h defect (§3.3)
 * were fixed in the v0.2.37 pass: the corrected >7 h pins live in
 * gothenburg_repair.test.ts and helsingborg.test.ts, and the corrected
 * 5 h boundary pins live in the ordering-boundary regression tests here.
 *
 * Deliberately NOT pinned here (out of engine scope, not a defect):
 *  - the Gothenburg tanker/RORO/ROPAX/car-carrier examples: the port file
 *    encodes container dues only (no tanker/RORO/ROPAX/carrier dues rules),
 *    so those examples are reconciled by documented arithmetic in the
 *    verification document, not by engine pins (§3.2).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { CostCalculationInput, FeeResult } from '../src/types';
import * as path from 'path';

const { port: gothenburg } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml')
);
const { port: helsingborg } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml')
);

function makeCall(overrides: Record<string, unknown> = {}): CostCalculationInput {
  return {
    vessel: {
      gt: (overrides.gt as number) ?? 8890,
      nt: (overrides.nt as number) ?? 3200,
      loa_m: (overrides.loa_m as number) ?? 137
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
      // v0.2.50: the waste-dues dimension is the arrival origin (previous
      // port of call). The tariff's own worked examples state it plainly —
      // WE-GOT-1 "arrives at the Port of Gothenburg from a port in Europe",
      // WE-GOT-2 "arrives ... from a port outside of Europe". Tests that
      // don't specify an origin fall to the outside-Europe default and gate
      // the non-European rules; WE-GOT-1 overrides to europe.
      arrival_origin: undefined,
      esi_score: undefined,
      csi_class: 'E',
      fossil_free_fuel_percentage: undefined,
      ops_usage: false,
      lay_up_days: 0,
      pilotage_required: false,
      pilotage_hours: 0,
      pilotage_extra_pilot: false,
      pilotage_ordering_lead_time_hours: 24,
      towage_cost_per_tug: 0,
      tug_count: 0,
      sludge_extra_m3: 0,
      storage_days_export: 0,
      storage_days_import: 0,
      ...overrides
    } as CostCalculationInput['call']
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

function familyTotal(result: ReturnType<typeof calculatePortCallCost>, family: string): number {
  return result.billers
    .flatMap(b => b.fees.filter(f => f.fee_family === family))
    .reduce((sum, f) => sum + f.amount, 0);
}

describe('Port of Gothenburg Port Tariff 2026 — container worked examples (WE-GOT-1, WE-GOT-2)', () => {
  // Port Tariff 2026 §2.2, p.11 "Calculation models — Container vessels".
  it('WE-GOT-1: 70,000 GT container vessel arriving from a European port — dues 104,400 / sludge 14,700 / sludge excess 9,600 / solid waste 9,100 / total 137,800 (v0.2.50 re-pin: the sheet states the arrival origin, not the flag)', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 70000, nt: 35000, loa_m: 300,
      arrival_origin: 'europe',
      sludge_extra_m3: 4
    }));

    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    const sludge = feeByRule(result, 'port_gothenburg_waste_sludge_eu');
    const sludgeExcess = feeByRule(result, 'port_gothenburg_waste_sludge_excess');
    const solid = feeByRule(result, 'port_gothenburg_waste_solid_eu');

    expect(dues.amount).toBe(104400.00);
    expect(sludge.amount).toBe(14700.00);
    expect(sludgeExcess.amount).toBe(9600.00);
    expect(solid.amount).toBe(9100.00);
    expect(dues.amount + sludge.amount + sludgeExcess.amount + solid.amount).toBe(137800.00);

    // Progressive band arithmetic verbatim from the sheet:
    // (20,000 x 1.96) + (20,000 x 1.71) + (20,000 x 1.15) + (10,000 x 0.80)
    expect(dues.band_rows!.map(r => r.amount)).toEqual([39200, 34200, 23000, 8000]);
    expect(dues.band_rows!.map(r => r.quantity)).toEqual([20000, 20000, 20000, 10000]);
  });

  it('WE-GOT-1 blank-ESI assumption: the sheet example enters no ESI score, so the worst-case default holds the figures; entering ESI 40 fires the −10% discount to 93,960', () => {
    const blank = calculatePortCallCost(gothenburg, makeCall({
      gt: 70000, nt: 35000, loa_m: 300,
      sludge_extra_m3: 4
    }));
    expect(feeByRule(blank, 'port_gothenburg_container_vessel_dues').amount).toBe(104400.00);

    const esi = calculatePortCallCost(gothenburg, makeCall({
      gt: 70000, nt: 35000, loa_m: 300,
      esi_score: 40,
      sludge_extra_m3: 4
    }));
    const dues = feeByRule(esi, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(93960.00); // 104,400 - 10%
    expect(dues.adjustments_applied.some(a => a.type === 'discount' && a.percentage === 10)).toBe(true);
  });

  it('WE-GOT-2: 12,000 GT container vessel arriving from outside Europe with ESI ≥ 30 — dues 23,520 − 2,352 = 21,168 / sludge 3,720 / solid 2,880 / total 27,768 (v0.2.50 re-pin: the sheet states the arrival origin, not the flag)', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 12000, nt: 0, loa_m: 140,
      arrival_origin: 'outside-europe',
      esi_score: 40
    }));

    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    const sludge = feeByRule(result, 'port_gothenburg_waste_sludge_non_eu');
    const solid = feeByRule(result, 'port_gothenburg_waste_solid_non_eu');

    // Sheet: 12,000 x 1.96 = 23,520 base; ESI/CSI discount line −2,352.
    expect(dues.band_rows!.map(r => r.amount)).toEqual([23520]);
    expect(dues.amount).toBe(21168.00); // 23,520 - 10%
    expect(sludge.amount).toBe(3720.00);
    expect(solid.amount).toBe(2880.00);
    expect(dues.amount + sludge.amount + solid.amount).toBe(27768.00);
  });
});

describe('Sjöfartsverket LATHUND 2026 — pilotage ready-reckoner rows (WE-SJV-L)', () => {
  // Lathund lotsavgifter 2026 (per SJÖFS 2025:5): start fee + per-commenced-
  // half-hour lotsningsavgift, time rounded up to the next half hour. The
  // reckoner's rows at or below 7 hours are pinned here; rows above 7 hours
  // embed the §25 40% reduction (excess-only) and are pinned in the
  // worked-example fix pass's regression tests (spec v0.2.37), per
  // docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1.
  const CLASS4_ROWS: Array<[number, number]> = [
    // [piloted hours, lathund total] — NT class 4 (3,000–5,999): start 17,300, 3,940/half-hour
    [0.5, 21240], [1, 25180], [2, 33060], [3, 40940],
    [4, 48820], [5, 56700], [6, 64580], [7, 72460]
  ];

  it('class 4 rows (NT 4,500) reconcile: start + ceil(hours x 2) x 3,940 = lathund', () => {
    for (const [hours, lathund] of CLASS4_ROWS) {
      const result = calculatePortCallCost(gothenburg, makeCall({
        gt: 20000, nt: 4500, loa_m: 180,
        pilotage_required: true,
        pilotage_hours: hours
      }));
      const start = feeByRule(result, 'sjofartsverket_pilotage_class4_start');
      const halfHour = feeByRule(result, 'sjofartsverket_pilotage_class4_per_half_hour');
      expect(start.amount).toBe(17300);
      expect(halfHour.amount).toBe(Math.ceil(hours * 2) * 3940);
      expect(start.amount + halfHour.amount).toBe(lathund);
    }
  });

  it('the same class-4 rows reconcile via Helsingborg (shared SJÖFS scale, rule ids sfv_pilotage_*)', () => {
    for (const [hours, lathund] of CLASS4_ROWS) {
      const call = makeCall({
        port_id: 'helsingborg',
        gt: 20000, nt: 4500, loa_m: 180,
        pilotage_required: true,
        pilotage_hours: hours
      });
      const result = calculatePortCallCost(helsingborg, call);
      const start = feeByRule(result, 'sfv_pilotage_start_class4');
      const halfHour = feeByRule(result, 'sfv_pilotage_half_hour_class4');
      expect(start.amount).toBe(17300);
      expect(halfHour.amount).toBe(Math.ceil(hours * 2) * 3940);
      expect(start.amount + halfHour.amount).toBe(lathund);
    }
  });

  it('class 8 rows (NT 45,000) reconcile: start 32,540 + per-half-hour 7,335', () => {
    const rows: Array<[number, number]> = [
      // NT class 8 (30,000–59,999): start 32,540, 7,335/half-hour
      [0.5, 39875], [1, 47210], [2, 61880], [3, 76550],
      [4, 91220], [5, 105890], [6, 120560], [7, 135230]
    ];
    for (const [hours, lathund] of rows) {
      const result = calculatePortCallCost(gothenburg, makeCall({
        gt: 70000, nt: 45000, loa_m: 300,
        pilotage_required: true,
        pilotage_hours: hours
      }));
      const start = feeByRule(result, 'sjofartsverket_pilotage_class8_start');
      const halfHour = feeByRule(result, 'sjofartsverket_pilotage_class8_per_half_hour');
      expect(start.amount).toBe(32540);
      expect(halfHour.amount).toBe(Math.ceil(hours * 2) * 7335);
      expect(start.amount + halfHour.amount).toBe(lathund);
    }
  });
});

describe('Sjöfartsverket prislista 2026 — rate-table confirmations (WE-SJV-P)', () => {
  // Sammanfattning av Sjöfartsverkets farledsavgifter 2026-01-01: vessel fee
  // by NT class and environmental class; readiness fee by NT class.
  it('class 8 vessel fee 172,385 + readiness 51,555 (CSI D/E, 35,000 NT)', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 70000, nt: 35000, loa_m: 300,
      csi_class: 'E'
    }));
    expect(feeByRule(result, 'sjofartsverket_vessel_fee_class8_csi_e').amount).toBe(172385.00);
    expect(feeByRule(result, 'sjofartsverket_readiness_fee_class8').amount).toBe(51555.00);
  });

  it('class 5 vessel fee 80,755 + readiness 24,165 (CSI D/E, 6,000 NT)', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 12000, nt: 6000, loa_m: 140,
      csi_class: 'E'
    }));
    expect(feeByRule(result, 'sjofartsverket_vessel_fee_class5_csi_e').amount).toBe(80755.00);
    expect(feeByRule(result, 'sjofartsverket_readiness_fee_class5').amount).toBe(24165.00);
  });

  it('ordering-fee band per prislista: 4h–4h59 lead time = 1,880 (the last published band)', () => {
    // The prislista's Beställningsavgift table: 4h–4h59 = 1,880 SEK, the
    // last published band. Fixed in the worked-example fix pass (spec
    // v0.2.37): SJÖFS 2025:5 §11 charges the ordering fee only when the
    // order is placed less than 5 hours before the desired time, so the
    // band is 4 to under 5 hours and a lead ≥ 5 h charges nothing (the
    // boundary pins live in the regression tests for the fix).
    const inBand = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 4
    }));
    expect(familyTotal(inBand, 'ordering_fee')).toBe(1880.00);
  });
});

describe('Worked-example fix pass regression pins (spec v0.2.37)', () => {
  // The corrected >7 h derivation (SJÖFS 2025:5 §25): start fee unreduced +
  // first 14 half-hours full + each commenced half-hour beyond 14 at 60%.
  // Every figure below is a printed lathund row (Sjöfartsverket LATHUND
  // 2026), per docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1.
  const ROWS_ABOVE_7H: Array<[number, number, number, number, number]> = [
    // [nt class, piloted hours, start fee, per-half-hour rate, lathund total]
    [4, 7.5, 17300, 3940, 74824],
    [4, 8, 17300, 3940, 77188],
    [4, 9, 17300, 3940, 81916],
    [4, 9.5, 17300, 3940, 84280],
    [8, 7.5, 32540, 7335, 139631],
    [8, 8, 32540, 7335, 144032],
    [1, 7.5, 9670, 2160, 41206]
  ];

  it.each(ROWS_ABOVE_7H)(
    'lathund class %i at %s h: start %s unreduced + 14 full + excess at 60%% = %s',
    (cls, hours, startFee, rate, lathund) => {
      const nt = cls === 1 ? 500 : cls === 4 ? 4500 : 35000;
      const result = calculatePortCallCost(gothenburg, makeCall({
        gt: 70000, nt, loa_m: 300,
        pilotage_required: true,
        pilotage_hours: hours
      }));
      const start = feeByRule(result, `sjofartsverket_pilotage_class${cls}_start`);
      const halfHour = feeByRule(result, `sjofartsverket_pilotage_class${cls}_per_half_hour`);
      expect(start.amount).toBe(startFee);
      const totalHalfHours = Math.ceil(hours * 2);
      const excess = totalHalfHours - 14;
      expect(halfHour.amount).toBe(14 * rate + excess * rate * 0.6);
      expect(start.amount + halfHour.amount).toBe(lathund);
    }
  );

  it('lathund >7 h rows reconcile via Helsingborg too (shared SJÖFS scale, sfv_pilotage_* rule ids)', () => {
    for (const [cls, hours, startFee, rate, lathund] of ROWS_ABOVE_7H) {
      const nt = cls === 1 ? 500 : cls === 4 ? 4500 : 35000;
      const result = calculatePortCallCost(helsingborg, makeCall({
        port_id: 'helsingborg',
        gt: 70000, nt, loa_m: 300,
        pilotage_required: true,
        pilotage_hours: hours
      }));
      const start = feeByRule(result, `sfv_pilotage_start_class${cls}`);
      const halfHour = feeByRule(result, `sfv_pilotage_half_hour_class${cls}`);
      const totalHalfHours = Math.ceil(hours * 2);
      const excess = totalHalfHours - 14;
      expect(start.amount).toBe(startFee);
      expect(halfHour.amount).toBe(14 * rate + excess * rate * 0.6);
      expect(start.amount + halfHour.amount).toBe(lathund);
    }
  });

  it('the >7 h discount never reduces the start fee and never fires at or below 7 h', () => {
    // Boundary: exactly 7 h (14 half-hours) is all full-rate (lathund class-4
    // row 7,0 h = 72,460); 7.5 h discounts only the 15th half-hour.
    const at7 = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 7
    }));
    expect(feeByRule(at7, 'sjofartsverket_pilotage_class4_start').amount).toBe(17300);
    expect(feeByRule(at7, 'sjofartsverket_pilotage_class4_per_half_hour').amount).toBe(14 * 3940);

    const at75 = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 7.5
    }));
    const hh75 = feeByRule(at75, 'sjofartsverket_pilotage_class4_per_half_hour');
    expect(hh75.amount).toBe(14 * 3940 + 3940 * 0.6);
    expect(hh75.adjustments_applied.length).toBe(1);
    expect(hh75.adjustments_applied[0].apply_to).toBe('excess_units');
    // rate_applied names the excess computation
    expect(hh75.rate_applied).toContain('excess-units');
    const start75 = feeByRule(at75, 'sjofartsverket_pilotage_class4_start');
    expect(start75.amount).toBe(17300);
    expect(start75.adjustments_applied.length).toBe(0);
  });

  it('ordering-fee 5 h boundary (SJÖFS 2025:5 §11): exactly 5 h charges nothing; 4h59 still bills 1,880', () => {
    // Fixed defect: the old open-ended 4h_plus band billed 1,880 at any lead
    // ≥ 4 h. §11 charges nothing at 5 h or more.
    const at5 = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 5
    }));
    expect(familyTotal(at5, 'ordering_fee')).toBe(0);

    const at499 = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 4.99
    }));
    expect(familyTotal(at499, 'ordering_fee')).toBe(1880);

    const at24 = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 24
    }));
    expect(familyTotal(at24, 'ordering_fee')).toBe(0);
  });

  it('ordering-fee 5 h boundary via Helsingborg: 5 h charges nothing; 4 h bills 1,880', () => {
    const at5 = calculatePortCallCost(helsingborg, makeCall({
      port_id: 'helsingborg',
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 5
    }));
    expect(familyTotal(at5, 'ordering_fee')).toBe(0);

    const at4 = calculatePortCallCost(helsingborg, makeCall({
      port_id: 'helsingborg',
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 4
    }));
    expect(familyTotal(at4, 'ordering_fee')).toBe(1880);
  });
});
