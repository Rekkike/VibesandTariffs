/**
 * Worked-example pinning tests (spec v0.2.36).
 *
 * Pins the tariff-sheet worked examples that had no prior pin, per
 * docs/TARIFF_EXAMPLE_VERIFICATION.md (the standing cross-check record).
 * Each test cites its sheet example (document, page) and pins the sheet's
 * printed figures.
 *
 * Deliberately NOT pinned here (per the verification-pass contract, fixes
 * belong to the future pass that repairs them):
 *  - the >7 h pilotage rows of the Sjöfartsverket lathund: the engine
 *    currently applies the 40% reduction to the whole fee rather than to
 *    the per-half-hour portion beyond 7 hours (SJÖFS 2025:5 §25); the
 *    existing >7 h pin in gothenburg_repair.test.ts pins the current
 *    behavior and is flagged for re-pinning in the fix pass
 *    (docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1).
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
  it('WE-GOT-1: 70,000 GT EU container vessel — dues 104,400 / sludge 14,700 / sludge excess 9,600 / solid waste 9,100 / total 137,800', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 70000, nt: 35000, loa_m: 300,
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

  it('WE-GOT-2: 12,000 GT non-EU container vessel with ESI ≥ 30 — dues 23,520 − 2,352 = 21,168 / sludge 3,720 / solid 2,880 / total 27,768', () => {
    const result = calculatePortCallCost(gothenburg, makeCall({
      gt: 12000, nt: 0, loa_m: 140,
      flag_state: 'non-EU',
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
  // embed the §25 40% reduction (excess-only), which the engine currently
  // mis-applies to the whole fee — pinned deliberately absent, see the file
  // header and docs/TARIFF_EXAMPLE_VERIFICATION.md §3.1.
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
    // last published band. NOTE (docs/TARIFF_EXAMPLE_VERIFICATION.md §3.3):
    // SJÖFS 2025:5 §11 charges the ordering fee only when the order is
    // placed less than 5 hours before the desired time; the engine's 4h+
    // band is open-ended (≥ 4 h all bill 1,880), so an explicitly entered
    // lead time ≥ 5 h currently over-bills. That defective behavior is
    // deliberately not pinned here; the fix pass re-pins the corrected
    // boundary.
    const inBand = calculatePortCallCost(gothenburg, makeCall({
      gt: 20000, nt: 4500, loa_m: 180,
      pilotage_required: true, pilotage_hours: 2,
      pilotage_ordering_lead_time_hours: 4
    }));
    expect(familyTotal(inBand, 'ordering_fee')).toBe(1880.00);
  });
});
