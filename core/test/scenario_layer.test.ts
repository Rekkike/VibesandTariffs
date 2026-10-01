/**
 * Scenario-adjustment layer pin tests (spec v0.3.3).
 *
 * The extraction's adjudicated surfaces - the Eurogate ch. 7 storage
 * schedules and the ch. 3-4 shift/equipment rates - priced by scenario
 * parameters over the pinned published rates. Adjust, never re-transcribe;
 * scenario-off byte-identical to the pre-layer baselines.
 *
 * Pins:
 * 1. Scenario-off: the default call at every port is byte-identical to the
 *    v0.3.2 baselines (GOT 3,275,851.15 / HAM 2,204,910.90 / HEL
 *    8,750,057.40) - the scenario rules render no line and move no total.
 * 2. Storage arithmetic: the Eurogate ch. 7 import/export ladders price
 *    exactly at the stated band arithmetic (free days honored, each day at
 *    its band's rate, container counts per the call).
 * 3. Shift/equipment arithmetic: each scenario input contributes exactly
 *    count x rate (x gangs where the document prices per gang).
 * 4. Red-proof bases: a scenario value leaking into a non-Eurogate port's
 *    figures fails; a scenario-adjusted figure rendered as
 *    tariff-transcribed fails (the flag is the label's data source).
 * 5. The scenario lines carry the scenario_adjusted_basis flag.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { PortDefinition } from '../src/types';
import * as path from 'path';

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(__dirname, '..', 'data', `${id}_2026.yaml`)).port;
}

function feeAmount(result: any, ruleId: string): number {
  const fee = result.billers.flatMap((b: any) => b.fees).find((f: any) => f.fee_rule_id === ruleId);
  return fee ? fee.amount : 0;
}

function fee(result: any, ruleId: string): any {
  return result.billers.flatMap((b: any) => b.fees).find((f: any) => f.fee_rule_id === ruleId);
}

const VESSEL = { ...DEFAULT_VESSEL } as any;
const BASELINE_TOTALS: Record<string, number> = {
  gothenburg: 3275851.15,
  hamburg: 2204910.90,
  helsingborg: 8750057.40
};

describe('Scenario-adjustment layer (spec v0.3.3)', () => {
  it('scenario-off is byte-identical at every port (the zero-drift contract, pinned)', () => {
    for (const id of Object.keys(BASELINE_TOTALS)) {
      const port = loadPort(id);
      const result = calculatePortCallCost(port, { vessel: VESSEL, call: defaultCall(id) });
      expect(result.total).toBe(BASELINE_TOTALS[id]);
      // The scenario rules render no line at all on the default call.
      const scenarioLines = result.billers
        .flatMap((b: any) => b.fees)
        .filter((f: any) => f.fee_rule_id.startsWith('eurogate_storage_') ||
                            f.fee_rule_id === 'eurogate_shift_surcharges' ||
                            f.fee_rule_id === 'eurogate_equipment_hire');
      expect(scenarioLines).toEqual([]);
    }
  });

  it('the Eurogate import storage ladder prices exactly at the stated band arithmetic', () => {
    const hamburg = loadPort('hamburg');
    // 10 storage days, 3 free => 7 chargeable: days 1-5 at the first band,
    // days 6-7 at the second. The default profile discharges 800 20 ft and
    // 1,200 40 ft: 800 x (5x42 + 2x84) = 302,400.00; 1,200 x (5x84 +
    // 2x168) = 907,200.00.
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 10
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_storage_import_20ft')).toBe(800 * (5 * 42 + 2 * 84));
    expect(feeAmount(result, 'eurogate_storage_import_40ft')).toBe(1200 * (5 * 84 + 2 * 168));
  });

  it('the Eurogate import ladder spans all four bands exactly (as-from-day-19 arithmetic)', () => {
    const hamburg = loadPort('hamburg');
    // 22 storage days, 3 free => 19 chargeable: 5 at 42, 5 at 84, 5 at 126, 4 at 168.
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 22,
      containers_discharged_le20ft: 100
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_storage_import_20ft'))
      .toBe(100 * (5 * 42 + 5 * 84 + 5 * 126 + 4 * 168));
  });

  it('the export ladder prices at its own free time and bands (5 free days)', () => {
    const hamburg = loadPort('hamburg');
    // 14 export days, 5 free => 9 chargeable: 8 at 42, 1 at 84.
    const call = {
      ...defaultCall('hamburg'),
      storage_days_export: 14,
      containers_loaded_le20ft: 200
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_storage_export_20ft')).toBe(200 * (8 * 42 + 1 * 84));
    expect(feeAmount(result, 'eurogate_storage_export_40ft'))
      .toBe(1200 * (8 * 84 + 1 * 168));
  });

  it('days inside free time charge zero (the free-time boundary)', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 3
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_storage_import_20ft')).toBe(0);
    expect(fee(result, 'eurogate_storage_import_20ft')).toBeUndefined();
  });

  it('the shift scenario prices per shift/gang at the pinned ch. 3 rates', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      shift_gangs: 2,
      scenario_shifts_saturday_12: 1,
      scenario_shifts_sunday_34: 1,
      scenario_overtime_hours_weekday_1: 3
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_shift_surcharges'))
      .toBe(1 * 4956 * 2 + 1 * 6947 * 2 + 3 * 700 * 2);
  });

  it('the equipment scenario prices per hour/part at the pinned ch. 4 rates', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      scenario_staff_hours: 4,
      scenario_crane_hours: 2,
      scenario_mafi_trailer_days: 3
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    expect(feeAmount(result, 'eurogate_equipment_hire'))
      .toBe(4 * 142 + 2 * 1841 + 3 * 212);
  });

  it('every scenario line carries the scenario_adjusted_basis flag (the presentation-honesty data source)', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 10,
      scenario_staff_hours: 1
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    const storage20 = fee(result, 'eurogate_storage_import_20ft');
    const staff = fee(result, 'eurogate_equipment_hire');
    expect(storage20.quality_flags.some((f: any) => f.type === 'scenario_adjusted_basis')).toBe(true);
    expect(staff.quality_flags.some((f: any) => f.type === 'scenario_adjusted_basis')).toBe(true);
  });

  it('red proof base: a scenario input never leaks into a non-Eurogate port - GOT and HEL totals stay at baseline with the same inputs', () => {
    // The same scenario inputs applied at the Swedish ports move nothing:
    // the scenario rules exist only in the Hamburg file, operator-gated to
    // Eurogate.
    for (const id of ['gothenburg', 'helsingborg']) {
      const port = loadPort(id);
      const call = {
        ...defaultCall(id),
        shift_gangs: 2,
        scenario_shifts_saturday_12: 1,
        scenario_overtime_hours_weekday_1: 3,
        scenario_staff_hours: 4,
        scenario_crane_hours: 2
      } as any;
      const result = calculatePortCallCost(port, { vessel: VESSEL, call });
      expect(result.total).toBe(BASELINE_TOTALS[id]);
    }
  });

  it('red proof base: an HHLA call fires no Eurogate scenario line (the operator gate)', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      terminal_operator: 'HHLA',
      storage_days_import: 10,
      scenario_staff_hours: 4
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    const scenarioLines = result.billers
      .flatMap((b: any) => b.fees)
      .filter((f: any) => f.fee_rule_id.startsWith('eurogate_storage_') ||
                          f.fee_rule_id === 'eurogate_shift_surcharges' ||
                          f.fee_rule_id === 'eurogate_equipment_hire');
    expect(scenarioLines).toEqual([]);
    // The HHLA storage lines price at their own schedule instead.
    expect(feeAmount(result, 'hhla_storage_import_20ft')).toBe(800 * (7 * 41.10 + 0 * 82.20));
  });

  it('the scenario storage lines stay excluded from the social-fund base (S9 1.3.13)', () => {
    const hamburg = loadPort('hamburg');
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 10
    } as any;
    const result = calculatePortCallCost(hamburg, { vessel: VESSEL, call });
    const socialFund = fee(result, 'eurogate_social_fund_surcharge');
    // The social fund's rate_applied string states its base: storage must
    // not appear as a contributing family. The fund base is the non-excluded
    // fees only (1.5% on berthing + handling + lashing-adjacent services).
    expect(socialFund).toBeDefined();
    const fundBase = 2 * Math.round(feeAmount(result, 'eurogate_social_fund_surcharge') / 1.5 * 100) / 100;
    // With storage at 1,323,000.00 in the call, the fund amount must equal
    // 1.5% of (total - storage - scenario lines) exactly; simplest exact
    // check: the fund does not scale with the storage addition.
    const callNoStorage = { ...defaultCall('hamburg') } as any;
    const resultNoStorage = calculatePortCallCost(hamburg, { vessel: VESSEL, call: callNoStorage });
    expect(feeAmount(result, 'eurogate_social_fund_surcharge'))
      .toBe(feeAmount(resultNoStorage, 'eurogate_social_fund_surcharge'));
  });
});
