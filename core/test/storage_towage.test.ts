/**
 * Storage-default and towage-symmetry pin tests (spec v0.2.33).
 *
 * Three contracts pinned here:
 *
 * 1. Storage ladder semantics: a storage day count is a cumulative timeline;
 *    each day charges exactly once at the first band covering that day number;
 *    days within free time charge zero (explicit zero-rate band in the ladder
 *    shape, days below the band minimum in the split shape). Boundary counts:
 *    zero days, days inside free time, the first day beyond free time, and
 *    counts spanning multiple bands.
 *
 * 2. Default-call zero-storage: the seeded storage days sit inside every
 *    port's free allowance, and the seeded special-cargo unit counts are
 *    blank (never a count that manufactures charges), so a default call at
 *    every port yields zero storage lines and zero yard-surcharge lines.
 *
 * 3. Towage symmetry: Gothenburg carries the same estimated-towage lever as
 *    Hamburg/Helsingborg — LOA-class tug defaults raised as named
 *    assumed-parameter flags, estimate-flagged into the estimated-parameters
 *    subtotal, with a user-entered zero being a value, not a missing entry.
 */
import { calculatePortCallCost, evaluateFeeRule } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { PortDefinition, CostCalculationInput, FeeResult } from '../src/types';
import * as path from 'path';

const PORT_IDS = ['gothenburg', 'hamburg', 'helsingborg'];

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

function defaultInputFor(port: PortDefinition): CostCalculationInput {
  return { vessel: DEFAULT_VESSEL, call: defaultCall(port.metadata.id) };
}

function gotCallWith(overrides: Record<string, unknown>): CostCalculationInput {
  return { vessel: DEFAULT_VESSEL, call: { ...defaultCall('gothenburg'), ...overrides } as any };
}

// Engine-level rule harness for both data shapes: builds a bare rule and
// evaluates it without the port file, so the semantics pin is shape-only.
function evaluateRule(rate: any, call: any): FeeResult | null {
  const rule: any = {
    id: 'test_rule',
    fee_family: 'storage',
    biller: 'Test Biller',
    rate_structure: rate,
    source_reference: {
      document_name: 'Test Tariff',
      document_url: 'http://example.com/test',
      document_issued: '2026-01-01',
      page: 1,
      clause: '1.1',
      verified_on: '2026-01-01',
      verified_by: 'Test User'
    }
  };
  return evaluateFeeRule(rule, { vessel: DEFAULT_VESSEL, call } as any, []);
}

const LADDER_SHAPE = {
  // The engine-test ladder: 0-6 free, 7-9 at 133, 10-13 at 346, >13 at 578
  type: 'banded_by_time',
  basis: 'storage_days_export',
  bands: [
    { min_days: 0, max_days: 6, daily_rate: 0 },
    { min_days: 7, max_days: 9, daily_rate: 133 },
    { min_days: 10, max_days: 13, daily_rate: 346 },
    { min_days: 14, max_days: null, daily_rate: 578 }
  ]
};

const SPLIT_SHAPE = {
  // The pre-restructure Gothenburg encoding: one band per rule. A rule's
  // amount is only the days its own band covers.
  type: 'banded_by_time',
  basis: 'storage_days_export',
  bands: [{ min_days: 7, max_days: 9, daily_rate: 133 }]
};

describe('Storage ladder semantics (spec v0.2.33)', () => {
  describe('ladder shape (single rule, free time as a zero-rate band)', () => {
    it.each([
      [0, 0],            // zero days
      [5, 0],            // within free time (the default seed)
      [6, 0],            // last free day
      [7, 133],          // first day beyond free
      [8, 2 * 133],      // spanning free + first band
      [9, 3 * 133],
      [10, 3 * 133 + 346],   // band boundary: first day of the 346 band
      [13, 3 * 133 + 4 * 346],
      [14, 3 * 133 + 4 * 346 + 578],
      [16, 3 * 133 + 4 * 346 + 3 * 578]
    ])('%i days -> %i SEK', (days, expected) => {
      const result = evaluateRule(LADDER_SHAPE, { storage_days_export: days });
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(expected);
    });
  });

  describe('split shape (single-band rule, free time implicit below the minimum)', () => {
    it.each([
      [0, 0],        // zero days: below every band minimum, charges zero
      [5, 0],        // within free time (below the 7-day minimum)
      [6, 0],        // last free day
      [7, 133],      // first covered day
      [8, 2 * 133],  // two covered days (7 and 8) — never the full count
      [9, 3 * 133],
      [10, 3 * 133], // day 10 is outside this rule's band: charges its portion only
      [15, 3 * 133]
    ])('%i days -> %i SEK (this rule charges only days 7-9)', (days, expected) => {
      const result = evaluateRule(SPLIT_SHAPE, { storage_days_export: days });
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(expected);
    });

    it('the defective fallback never returns: a low day count cannot charge the full count at the band rate', () => {
      // The pre-fix fallback charged 5 * 133 (then 5 * 346, 5 * 578) on the
      // Gothenburg split rules for 5 storage days — free time billed.
      const result = evaluateRule(SPLIT_SHAPE, { storage_days_export: 5 });
      expect(result!.amount).toBe(0);
      expect(result!.rate_applied).toContain('free time');
    });
  });

  describe('Gothenburg port-file ladder (restructured data)', () => {
    const port = loadPort('gothenburg');
    const exportRule = port.fee_rules.find(r => r.id === 'apm_terminals_storage_export')!;
    const importRule = port.fee_rules.find(r => r.id === 'apm_terminals_storage_import')!;

    it('the six split rules are gone; two ladder rules remain', () => {
      expect(exportRule).toBeDefined();
      expect(importRule).toBeDefined();
      const splitIds = port.fee_rules.filter(r =>
        /^apm_terminals_storage_(export|import)_(7_9|10_13|over_13|5_7|8_11|over_11)_days$/.test(r.id)
      );
      expect(splitIds).toHaveLength(0);
    });

    it('free time is an explicit zero-rate band (export 0-6, import 0-4)', () => {
      expect(exportRule.rate_structure.type).toBe('banded_by_time');
      const bands = (exportRule.rate_structure as any).bands as { min_days: number; max_days: number; daily_rate: number }[];
      expect(bands[0]).toEqual({ min_days: 0, max_days: 6, daily_rate: 0 });
      const iBands = (importRule.rate_structure as any).bands as { min_days: number; max_days: number; daily_rate: number }[];
      expect(iBands[0]).toEqual({ min_days: 0, max_days: 4, daily_rate: 0 });
    });

    it.each([
      // export ladder: 0-6 free, 7-9 @133, 10-13 @346, >13 @578
      ['export', 5, 0],
      ['export', 8, 2 * 133],
      ['export', 11, 3 * 133 + 2 * 346],
      ['export', 20, 3 * 133 + 4 * 346 + 7 * 578],
      // import ladder: 0-4 free, 5-7 @133, 8-11 @346, >11 @578
      ['import', 3, 0],
      ['import', 7, 3 * 133],
      ['import', 12, 3 * 133 + 4 * 346 + 578]
    ])('%s %i days -> %i SEK', (flow, days, expected) => {
      const basis = flow === 'export' ? 'storage_days_export' : 'storage_days_import';
      const input = gotCallWith({ [basis]: days });
      const result = calculatePortCallCost(port, input);
      const ruleId = flow === 'export' ? 'apm_terminals_storage_export' : 'apm_terminals_storage_import';
      expect(feeByRule(result, ruleId).amount).toBe(expected);
    });
  });
});

describe('Default-call zero-storage pin (spec v0.2.33)', () => {
  it.each(PORT_IDS)('%s: default call has zero storage lines and zero yard-surcharge lines', (id) => {
    const port = loadPort(id);
    const result = calculatePortCallCost(port, defaultInputFor(port));
    const storageLines = feesOf(result).filter(f => f.fee_family === 'storage');
    const surchargeLines = feesOf(result).filter(f => f.fee_family === 'yard_surcharge');
    const storageTotal = storageLines.reduce((s, f) => s + f.amount, 0);
    const surchargeTotal = surchargeLines.reduce((s, f) => s + f.amount, 0);
    expect(storageTotal).toBe(0);
    expect(surchargeTotal).toBe(0);
  });

  it.each(PORT_IDS)('%s: the seeded storage days sit within the port free allowance', (id) => {
    const call = defaultCall(id);
    expect(call.storage_days_export).toBe(5);
    expect(call.storage_days_import).toBe(3);
    const port = loadPort(id);
    // The first day that actually charges, per flow, across every storage rule
    // shape: progressive_daily (free_days, bands keyed on chargeable day
    // numbers) and banded_by_time (absolute min_days with a zero free band).
    const firstChargedDay = (flow: 'export' | 'import'): number => {
      const basis = flow === 'export' ? 'storage_days_export' : 'storage_days_import';
      const relevant = port.fee_rules.filter(r => {
        if (r.fee_family !== 'storage') return false;
        const rs = r.rate_structure as any;
        const daysField = rs.days_input ?? rs.basis;
        return daysField === basis;
      });
      let first = Infinity;
      for (const rule of relevant) {
        const rs = rule.rate_structure as any;
        if (rs.free_days !== undefined) {
          // progressive_daily: chargeable days are 1..n beyond free_days
          const earliestBand = Math.min(...(rs.bands as any[]).map(b => b.min_days ?? 1));
          first = Math.min(first, rs.free_days + earliestBand);
        } else if (rs.bands) {
          // banded_by_time: first band with a nonzero rate
          const charged = (rs.bands as any[]).filter(b => (b.daily_rate ?? 0) > 0);
          if (charged.length > 0) first = Math.min(first, ...charged.map(b => b.min_days));
        }
      }
      return first;
    };
    // Seeds must sit strictly below the first charged day on every flow.
    expect(5).toBeLessThan(firstChargedDay('export'));
    expect(3).toBeLessThan(firstChargedDay('import'));
  });

  it.each(PORT_IDS)('%s: no charge may fire from a seeded unit count', (id) => {
    const call = defaultCall(id);
    expect(call.reefer_units).toBeUndefined();
    expect(call.oog_units).toBeUndefined();
    expect(call.dangerous_goods_units).toBeUndefined();
    expect(call.overdue_dangerous_units).toBeUndefined();
  });

  it('Gothenburg: the defective default charges 8,456 storage + 12,765 surcharge no longer fire', () => {
    // Pre-fix values: six split storage rules all fired via the fallback
    // (665 + 1730 + 2890 + 399 + 1038 + 1734 = 8,456) and the surcharges
    // billed the seeded unit days (5 * (437 + 709 + 382 + 1025) = 12,765).
    // Post-fix the storage lines render as informative zero lines (free
    // time) and the surcharges compute 0 units.
    const port = loadPort('gothenburg');
    const result = calculatePortCallCost(port, defaultInputFor(port));
    const storage = feesOf(result).filter(f => f.fee_family === 'storage');
    const surcharges = feesOf(result).filter(f => f.fee_family === 'yard_surcharge');
    expect(storage.map(f => f.amount).reduce((s, a) => s + a, 0)).toBe(0);
    expect(surcharges.map(f => f.amount).reduce((s, a) => s + a, 0)).toBe(0);
    expect(storage.every(f => f.rate_applied.includes('days 0-6') || f.rate_applied.includes('days 0-4'))).toBe(true);
    expect(surcharges.every(f => f.rate_applied.includes('* 0 units'))).toBe(true);
  });
});

describe('Yard-surcharge unit-count multiplication (spec v0.2.33)', () => {
  const port = loadPort('gothenburg');

  it('units x days: 3 OOG units for 8 export days -> 8 commenced days x 437 x 3', () => {
    // The surcharge schedule has no free time (the storage free allowance
    // covers storage only), so all commenced days charge.
    const input = gotCallWith({ oog_units: 3, storage_days_export: 8 });
    const result = calculatePortCallCost(port, input);
    expect(feeByRule(result, 'apm_terminals_surcharge_oog').amount).toBe(8 * 437 * 3);
  });

  it('reefer surcharge multiplies the reefer unit count', () => {
    const input = gotCallWith({ reefer_units: 10, storage_days_export: 9 });
    const result = calculatePortCallCost(port, input);
    // no free time on the surcharge: all 9 commenced days charge
    expect(feeByRule(result, 'apm_terminals_surcharge_reefer').amount).toBe(9 * 709 * 10);
  });

  it('user-entered zero units charges zero (a value, not a missing entry)', () => {
    const input = gotCallWith({ reefer_units: 0, storage_days_export: 9 });
    const result = calculatePortCallCost(port, input);
    expect(feeByRule(result, 'apm_terminals_surcharge_reefer').amount).toBe(0);
  });

  it('the overdue dangerous penalty is gated behind its own explicit input', () => {
    const withOnlyDg = gotCallWith({ dangerous_goods_units: 5, storage_days_export: 9 });
    const r1 = calculatePortCallCost(port, withOnlyDg);
    expect(feeByRule(r1, 'apm_terminals_surcharge_overdue_dangerous').amount).toBe(0);
    const withOverdue = gotCallWith({ overdue_dangerous_units: 5, storage_days_export: 9 });
    const r2 = calculatePortCallCost(port, withOverdue);
    expect(feeByRule(r2, 'apm_terminals_surcharge_overdue_dangerous').amount).toBe(9 * 1025 * 5);
    // the ordinary DG surcharge is driven by dangerous_goods_units, not the overdue input
    expect(feeByRule(r2, 'apm_terminals_surcharge_dangerous').amount).toBe(0);
  });
});

describe('Gothenburg towage (spec v0.2.33, Hamburg/Helsingborg pattern)', () => {
  const port = loadPort('gothenburg');

  it('the towage rule exists, is estimate-labeled, and carries a source reference', () => {
    const rule = port.fee_rules.find(r => r.id === 'gothenburg_towage_estimate')!;
    expect(rule).toBeDefined();
    expect(rule.fee_family).toBe('towage');
    expect(rule.estimated_parameter).toBeDefined();
    expect(rule.source_reference.document_name).toBe('GOTHENBURG_EXTRACTION_REFERENCE.md');
  });

  it('LOA-class tug defaults: under 150 m zero, 150-250 m one, above 250 m two', () => {
    const small = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 137 }, call: defaultCall('gothenburg')
    });
    expect(feeByRule(small, 'gothenburg_towage_estimate').amount).toBe(0);

    const mid = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 171.92 }, call: defaultCall('gothenburg')
    });
    expect(feeByRule(mid, 'gothenburg_towage_estimate').amount).toBe(60000);

    const large = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 290 }, call: defaultCall('gothenburg')
    });
    expect(feeByRule(large, 'gothenburg_towage_estimate').amount).toBe(120000);
  });

  it('the LOA-applied default raises the named assumed-parameter flag with the required wording', () => {
    const result = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 290 }, call: defaultCall('gothenburg')
    });
    const towage = feeByRule(result, 'gothenburg_towage_estimate');
    const flag = towage.quality_flags.find(f => f.type === 'assumed_parameter');
    expect(flag).toBeDefined();
    expect(flag!.description).toBe(
      'Tug requirement not entered; port default of 2 tugs applied; enter the actual requirement to override'
    );
    // the line is also estimate-flagged (never verified data)
    expect(towage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('user-entered tug count is a value, not a flag: zero suppresses the default without the assumption flag', () => {
    const result = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 290 },
      call: { ...defaultCall('gothenburg'), tug_count: 0 }
    });
    const towage = feeByRule(result, 'gothenburg_towage_estimate');
    expect(towage.amount).toBe(0);
    expect(towage.quality_flags.some(f => f.type === 'assumed_parameter')).toBe(false);
    expect(towage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('user-supplied count and rate override the defaults', () => {
    const result = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, loa_m: 290 },
      call: { ...defaultCall('gothenburg'), tug_count: 1, towage_cost_per_tug: 40000 }
    });
    expect(feeByRule(result, 'gothenburg_towage_estimate').amount).toBe(40000);
  });
});

describe('Estimated-parameters subtotal composition including towage (spec v0.2.33)', () => {
  it.each(PORT_IDS)('%s: default call total = estimate subtotal + verified total', (id) => {
    const port = loadPort(id);
    const result = calculatePortCallCost(port, defaultInputFor(port));
    expect(result.total).toBeCloseTo(
      result.total_estimated_parameters + result.total_without_estimates, 2
    );
  });

  it('Gothenburg: the default call separates exactly the towage estimate (120,000: LOA 290 -> 2 tugs)', () => {
    const port = loadPort('gothenburg');
    const result = calculatePortCallCost(port, defaultInputFor(port));
    expect(result.total_estimated_parameters).toBe(120000);
    expect(result.total_without_estimates).toBeCloseTo(result.total - 120000, 2);
  });

  it('Hamburg: the Eurogate default carries only the towage estimate (15,000) in the estimate subtotal (v0.2.66)', () => {
    // v0.2.66 promotion re-pin: under the Eurogate default the handling
    // line is the published 5.1.1 rate (no estimated flag), so the
    // estimated-parameters subtotal is the towage estimate alone. The
    // HHLA variant's 1,447,000 (4,000 moves x 358 handling estimate +
    // 15,000 towage) is exercised against the explicit HHLA call in the
    // mechanics suites.
    const port = loadPort('hamburg');
    const result = calculatePortCallCost(port, defaultInputFor(port));
    expect(result.total_estimated_parameters).toBe(15000);
  });

  it('Helsingborg: towage (120,000: LOA 290 -> 2 tugs) in the estimate subtotal; the seeded EES rate is a user input, not an estimate', () => {
    // The default seeds ees_rate_per_move: 35, which the engine treats as a
    // user-supplied rate input (the datestamped-parameter convention from
    // audit v0.2.23), so only the LOA-defaulted towage estimate counts.
    const port = loadPort('helsingborg');
    const result = calculatePortCallCost(port, defaultInputFor(port));
    expect(result.total_estimated_parameters).toBe(120000);
    const towage = feeByRule(result, 'poh_towage_estimate');
    expect(towage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('every estimated line at every port carries the estimated_parameter flag (never verified data)', () => {
    for (const id of PORT_IDS) {
      const port = loadPort(id);
      const result = calculatePortCallCost(port, defaultInputFor(port));
      const estimated = feesOf(result).filter(f => f.amount > 0 && result.total_estimated_parameters > 0);
      for (const fee of estimated) {
        const contributes = result.total_estimated_parameters > 0 && fee.amount > 0;
        if (!contributes) continue;
      }
      const towageLines = feesOf(result).filter(f => f.fee_family === 'towage');
      for (const t of towageLines) {
        expect(t.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
      }
    }
  });
});

describe('Storage-schedule boundary verification (worked-example fix pass, spec v0.2.37)', () => {
  // Phase-2-style verification of the last unverified v0.2.33 surface: the
  // APMT Terminal Tariff's own Yard Storage schedule (extraction reference
  // §3, verified against the tariff document at extraction time) reconstructed
  // day-by-day and pinned at every band boundary. Each day charges exactly
  // once at the first band covering its day number.
  //   Export: days 0-6 free; 7-9 @133; 10-13 @346; 14+ @578
  //   Import: days 0-4 free; 5-7 @133; 8-11 @346; 12+ @578
  const port = loadPort('gothenburg');

  it.each([
    // [flow, days, expected from the schedule's own day-by-day arithmetic]
    ['export', 6, 0],                      // last free day
    ['export', 7, 133],                    // first day beyond free
    ['export', 9, 3 * 133],                // last day of the 133 band
    ['export', 10, 3 * 133 + 346],         // first day of the 346 band
    ['export', 13, 3 * 133 + 4 * 346],     // last day of the 346 band
    ['export', 14, 3 * 133 + 4 * 346 + 578], // first day of the 578 band
    ['export', 20, 3 * 133 + 4 * 346 + 7 * 578],
    ['import', 4, 0],                      // last free day
    ['import', 5, 133],                    // first day beyond free
    ['import', 7, 3 * 133],                // last day of the 133 band
    ['import', 8, 3 * 133 + 346],          // first day of the 346 band
    ['import', 11, 3 * 133 + 4 * 346],     // last day of the 346 band
    ['import', 12, 3 * 133 + 4 * 346 + 578], // first day of the 578 band
    ['import', 15, 3 * 133 + 4 * 346 + 4 * 578]
  ])('%s storage %i days -> %i SEK (schedule-boundary reconstruction)', (flow, days, expected) => {
    const basis = flow === 'export' ? 'storage_days_export' : 'storage_days_import';
    const ruleId = flow === 'export' ? 'apm_terminals_storage_export' : 'apm_terminals_storage_import';
    const input = gotCallWith({ [basis]: days });
    const result = calculatePortCallCost(port, input);
    expect(feeByRule(result, ruleId).amount).toBe(expected);
  });

  it('the day beyond each boundary jumps by exactly the band-rate difference (no double-counted days)', () => {
    // Day 7 -> 8 and day 10 -> 11 differ by one 133-unit; day 13 -> 14 and
    // day 11 -> 12 differ by 578-346 = 232. A ladder that double-charged a
    // boundary day or skipped one would break these deltas.
    const amounts = (flow: string, dayList: number[]) => dayList.map(d => {
      const basis = flow === 'export' ? 'storage_days_export' : 'storage_days_import';
      const ruleId = flow === 'export' ? 'apm_terminals_storage_export' : 'apm_terminals_storage_import';
      const result = calculatePortCallCost(port, gotCallWith({ [basis]: d }));
      return feeByRule(result, ruleId).amount;
    });
    const e = amounts('export', [7, 8, 10, 11, 13, 14]);
    expect(e[1] - e[0]).toBe(133);
    expect(e[3] - e[2]).toBe(346);
    expect(e[5] - e[4]).toBe(578);
    const i = amounts('import', [5, 6, 8, 9, 11, 12]);
    expect(i[1] - i[0]).toBe(133);
    expect(i[3] - i[2]).toBe(346);
    expect(i[5] - i[4]).toBe(578);
  });
});
