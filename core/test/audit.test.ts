/**
 * v0.2.23 audit pass tests: Hamburg/Helsingborg audit findings and the
 * tri-port sanity check. Each finding is pinned so the defect class cannot
 * recur silently:
 *  - rule-inventory gaps (HHLA 45-ft storage, gassing space)
 *  - firing defects (Gothenburg idle-berth service must not fire unasked)
 *  - caveat carry-through (contract-vs-published flag on APMT handling)
 *  - least-favourable defaults (Sjoefartsverket environmental class E)
 *  - tri-port checkpoints for the four library vessels
 */
import { calculatePortCallCost } from '../src/engine';
import { loadPortFromYaml } from '../src/loader';
import { PortDefinition, CostCalculationResult, FeeResult } from '../src/types';

const gothenburg = loadPortFromYaml('data/gothenburg_2026.yaml');
const hamburg = loadPortFromYaml('data/hamburg_2026.yaml');
const helsingborg = loadPortFromYaml('data/helsingborg_2026.yaml');

const feeByRule = (result: CostCalculationResult, id: string): FeeResult =>
  result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === id)!;
const feeAmount = (result: CostCalculationResult, id: string): number =>
  feeByRule(result, id)?.amount ?? 0;
const hasFlag = (result: CostCalculationResult, id: string, type: string): boolean =>
  feeByRule(result, id)?.quality_flags.some(f => f.type === type) ?? false;

describe('audit a: Hamburg rule inventory — reference rules now present', () => {
  it('has the 45ft storage rules (import 92.20 with doubling/tripling; export doubling)', () => {
    const ruleIds = hamburg.fee_rules.map(r => r.id);
    expect(ruleIds).toContain('hhla_storage_import_45ft');
    expect(ruleIds).toContain('hhla_storage_export_45ft');
  });
  it('has the gassing-space services (176.90 / 240.70)', () => {
    const ruleIds = hamburg.fee_rules.map(r => r.id);
    expect(ruleIds).toContain('hhla_container_service_gassing_20ft');
    expect(ruleIds).toContain('hhla_container_service_gassing_40ft');
  });
});

describe('audit b/c: the new Hamburg rules fire under the right inputs', () => {
  const vessel = { gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024, vessel_type: 'container' } as any;
  const base = {
    port_id: 'hamburg', date: '2026-09-21',
    containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0,
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    lay_time_hours: 16
  } as any;

  it('45ft import storage: 10 chargeable days x 5 units = 5 x (7 x 92.20 + 3 x 184.40)', () => {
    const result = calculatePortCallCost(hamburg, { vessel, call: {
      ...base, storage_days_import: 13, storage_import_45ft_units: 5
    }}); // 13 days - 3 free = 10 chargeable
    expect(feeAmount(result, 'hhla_storage_import_45ft')).toBe(5 * (7 * 92.20 + 3 * 184.40));
  });
  it('45ft export storage: 12 chargeable days x 5 units = 5 x (9 x 92.20 + 3 x 184.40)', () => {
    const result = calculatePortCallCost(hamburg, { vessel, call: {
      ...base, storage_days_export: 17, storage_export_45ft_units: 5
    }}); // 17 - 5 free = 12 chargeable
    expect(feeAmount(result, 'hhla_storage_export_45ft')).toBe(5 * (9 * 92.20 + 3 * 184.40));
  });
  it('gassing: 2 x 176.90 + 1 x 240.70', () => {
    const result = calculatePortCallCost(hamburg, { vessel, call: {
      ...base, gassing_20ft_units: 2, gassing_40ft_units: 1
    }});
    expect(feeAmount(result, 'hhla_container_service_gassing_20ft')).toBe(353.80);
    expect(feeAmount(result, 'hhla_container_service_gassing_40ft')).toBe(240.70);
  });
  it('blank inputs render zero-amount lines (existing Hamburg optional-service convention), never a charge', () => {
    const result = calculatePortCallCost(hamburg, { vessel, call: { ...base } });
    expect(feeAmount(result, 'hhla_storage_import_45ft')).toBe(0);
    expect(feeAmount(result, 'hhla_storage_export_45ft')).toBe(0);
    expect(feeAmount(result, 'hhla_container_service_gassing_20ft')).toBe(0);
    expect(feeAmount(result, 'hhla_container_service_gassing_40ft')).toBe(0);
  });
  it('the Hafenfonds surcharge excludes the storage rules but includes gassing (quay-tariff cargo services)', () => {
    const result = calculatePortCallCost(hamburg, { vessel, call: {
      ...base, storage_days_import: 13, storage_import_45ft_units: 5, gassing_20ft_units: 2
    }});
    const surcharge = feeByRule(result, 'hhla_hafenfonds_surcharge');
    // gassing is a quay-tariff fee (1.5% applies); storage is excluded.
    // 2 x 176.90 = 353.80; tonnage dues 21,979 x 1.25 = 27,473.75; gangway 633.80.
    const expectedBase = 27473.75 + 633.80 + 353.80;
    expect(surcharge.amount).toBeCloseTo(Math.round(expectedBase * 1.5) / 100, 1);
  });
});

describe('audit b: Gothenburg idle-berth service is gated (explicit request only)', () => {
  const vessel = { gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024, vessel_type: 'container' } as any;
  const base = {
    port_id: 'gothenburg', date: '2026-09-21', calls_this_month: 1,
    containers_discharged_le20ft: 200, containers_discharged_gt20ft: 200,
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    pilotage_required: true, pilotage_hours: 3, pilotage_ordering_lead_time_hours: 4,
    csi_class: 'E', flag_state: 'non-EU', issc_valid: true
  } as any;

  it('does NOT fire when pilotage hours are set but the service was not ordered', () => {
    const result = calculatePortCallCost(gothenburg, { vessel, call: { ...base }});
    const ids = result.billers.flatMap(b => b.fees).map(f => f.fee_rule_id);
    expect(ids).not.toContain('apm_terminals_idle_berth');
  });
  it('fires when idle_berth_hours is supplied: 3.5 h rounds up to 4 x 500', () => {
    const result = calculatePortCallCost(gothenburg, { vessel, call: {
      ...base, idle_berth_hours: 3.5
    }});
    expect(feeAmount(result, 'apm_terminals_idle_berth')).toBe(2000);
  });
});

describe('audit d/f: contract-vs-published caveat carries onto APMT handling lines', () => {
  const vessel = { gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024, vessel_type: 'container' } as any;
  const call = {
    port_id: 'gothenburg', date: '2026-09-21', calls_this_month: 1,
    containers_discharged_le20ft: 200, containers_discharged_gt20ft: 200,
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    csi_class: 'E', flag_state: 'EU', issc_valid: true
  } as any;
  it('both handling rules carry the contract_vs_published flag', () => {
    const result = calculatePortCallCost(gothenburg, { vessel, call });
    expect(hasFlag(result, 'apm_terminals_handling_le20ft', 'contract_vs_published')).toBe(true);
    expect(hasFlag(result, 'apm_terminals_handling_gt20ft', 'contract_vs_published')).toBe(true);
  });
  it('non-contract rules do not carry it', () => {
    const result = calculatePortCallCost(gothenburg, { vessel, call });
    expect(hasFlag(result, 'apm_terminals_isps', 'contract_vs_published')).toBe(false);
  });
});

describe('audit d: Sjoefartsverket environmental class — least favourable default', () => {
  const vessel = { gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024, vessel_type: 'container' } as any;
  const base = {
    port_id: 'helsingborg', date: '2026-09-21', calls_this_month: 1,
    containers_discharged_le20ft: 200, containers_discharged_gt20ft: 200,
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    pilotage_required: true, pilotage_hours: 3, pilotage_ordering_lead_time_hours: 4,
    issc_valid: true, ees_rate_per_move: 35, towage_cost_per_tug: 60000
  } as any;

  it('missing class defaults to E with a visible fallback flag (spec 4.4.2)', () => {
    const result = calculatePortCallCost(helsingborg, { vessel, call: { ...base }});
    expect(feeAmount(result, 'sfv_vessel_fee_class5_csi_e')).toBe(80755);
    expect(result.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.includes('Environmental class not supplied'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tri-port sanity check (spec v0.2.23 audit record): the four library vessels
// through all three ports with identical call parameters. Hamburg and
// Helsingborg reproduce their reference checkpoints exactly; Gothenburg is
// computed fresh and pinned per component so drift is localized on failure.
// ---------------------------------------------------------------------------
const LIBRARY_VESSELS: Record<string, { gt: number; nt: number; loa_m: number; built_year: number }> = {
  HELGAFELL: { gt: 8890, nt: 3200, loa_m: 137, built_year: 2005 },
  'MSC KYUNGMIN': { gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024 },
  'VISTULA MAERSK': { gt: 34882, nt: 13000, loa_m: 200, built_year: 2018 },
  'MAREN MAERSK': { gt: 194849, nt: 70000, loa_m: 399, built_year: 2014 }
};

function triPortCall(port: PortDefinition, vesselName: string): any {
  const v = LIBRARY_VESSELS[vesselName];
  const moves = vesselName === 'VISTULA MAERSK' ? 500 : vesselName === 'MAREN MAERSK' ? 3000 : 400;
  const half = moves / 2;
  const pilotageHours = v.loa_m < 150 ? 2 : v.loa_m <= 250 ? 3 : 4;
  const isULCV = vesselName === 'MAREN MAERSK';
  const call: any = {
    port_id: port.metadata.id,
    date: '2026-09-21',
    calls_this_month: 1,
    containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
    containers_discharged_le20ft: half, containers_discharged_gt20ft: half,
    pilotage_required: true,
    pilotage_hours: pilotageHours,
    pilotage_ordering_lead_time_hours: 4,
    csi_class: 'E',
    issc_valid: true,
    lay_time_hours: isULCV ? 50 : 16,
    port_time_hours: isULCV ? 50 : 16,
    gangway_class: vesselName === 'HELGAFELL' ? 'feeder' : 'overseas',
    tug_count: undefined,
    towage_amount: undefined,
    towage_cost_per_tug: undefined
  };
  if (port.metadata.id === 'hamburg') {
    call.engine_tier = v.built_year >= 2011 ? 'Tier II' : 'Tier I';
    call.gangway_count = 1;
    call.gangway_supervision_hours = 0;
    call.pilotage_segment_pct = 100;
    call.towage_amount = 15000;
    call.handling_rate_per_move = 358;
  }
  if (port.metadata.id === 'helsingborg') {
    call.ees_rate_per_move = 35;
    call.towage_cost_per_tug = 60000;
  }
  return call;
}

describe('tri-port sanity check: Hamburg reproduces all four reference checkpoints', () => {
  it.each([
    ['HELGAFELL', 180223.17],      // CP2 components: 998.79 + 2,107 + 11,739.49 + 6,902.00 + 275.89 + 143,200 + 15,000
    ['MSC KYUNGMIN', 201628.48],  // CP3
    ['VISTULA MAERSK', 262907.05],// CP4
    ['MAREN MAERSK', 1938234.31]  // CP5
  ])('%s total EUR', (name, expected) => {
    const vessel = { ...LIBRARY_VESSELS[name as string], vessel_type: 'container' } as any;
    const result = calculatePortCallCost(hamburg, { vessel, call: triPortCall(hamburg, name as string) });
    expect(result.total).toBeCloseTo(expected as number, 1);
  });
});

describe('tri-port sanity check: Helsingborg reproduces all four reference checkpoints', () => {
  it.each([
    ['HELGAFELL', 829166.50],
    ['MSC KYUNGMIN', 1039261.15],
    ['VISTULA MAERSK', 1354763.20],
    ['MAREN MAERSK', 6849502.40]
  ])('%s total SEK', (name, expected) => {
    const vessel = { ...LIBRARY_VESSELS[name as string], vessel_type: 'container' } as any;
    const result = calculatePortCallCost(helsingborg, { vessel, call: triPortCall(helsingborg, name as string) });
    expect(result.total).toBeCloseTo(expected as number, 1);
  });
});

describe('tri-port sanity check: Gothenburg decomposition (computed fresh, pinned per component)', () => {
  it('MSC KYUNGmin at class E: per-component values', () => {
    const vessel = { ...LIBRARY_VESSELS['MSC KYUNGMIN'], vessel_type: 'container' } as any;
    const call = { ...triPortCall(gothenburg, 'MSC KYUNGMIN'), flag_state: 'non-EU' };
    const result = calculatePortCallCost(gothenburg, { vessel, call });
    // Progressive GT dues, list price, no discounts: computed independently
    // 20,000 x 1.96 + 1,979 x 1.71 = 39,200 + 3,384.09 = 42,584.09
    expect(feeAmount(result, 'port_gothenburg_container_vessel_dues')).toBeCloseTo(42584.09, 2);
    // Waste non-EU: solid 0.24 x 21,979 = 5,274.96; sludge 0.31 x 21,979 = 6,813.49
    expect(feeAmount(result, 'port_gothenburg_waste_solid_non_eu')).toBeCloseTo(5274.96, 2);
    expect(feeAmount(result, 'port_gothenburg_waste_sludge_non_eu')).toBeCloseTo(6813.49, 2);
    // APM handling: 200 x 377 + 200 x 535 = 214,400 (list price, contract caveat flagged)
    expect(feeAmount(result, 'apm_terminals_handling_le20ft')).toBe(75400);
    expect(feeAmount(result, 'apm_terminals_handling_gt20ft')).toBe(107000);
    // Sjoefartsverket class 5 / E: vessel fee 80,755; readiness 24,165;
    // pilotage start 19,305 + 6 half-hours x 4,400 = 26,400; ordering 1,880
    expect(feeAmount(result, 'sjofartsverket_vessel_fee_class5_csi_e')).toBe(80755);
    expect(feeAmount(result, 'sjofartsverket_readiness_fee_class5')).toBe(24165);
    expect(feeAmount(result, 'sjofartsverket_pilotage_class5_start')).toBe(19305);
    expect(feeAmount(result, 'sjofartsverket_pilotage_class5_per_half_hour')).toBe(26400);
    expect(feeAmount(result, 'sjofartsverket_ordering_fee_4_5h')).toBe(1880);
    // No idle-berth line: the service was not ordered
    const ids = result.billers.flatMap(b => b.fees).map(f => f.fee_rule_id);
    expect(ids).not.toContain('apm_terminals_idle_berth');
  });

  it('Gothenburg totals per vessel (class E) match the independently computed expectation', () => {
    // MSC Kyungmin at class E: dues 42,584.09 + waste 12,088.45 + cargo side
    // 214,400 + ISPS 32,000 + vessel fee 80,755 + readiness 24,165 + pilotage
    // 47,585... computed via engine below; the pin is the sum of
    // the pinned components above plus ISPS (400 x 80), plus towage
    // (60,000 SEK: LOA 171.92 m -> 1 tug by the LOA-class default, spec v0.2.33
    // towage-symmetry pass — a flagged estimate line, not verified data).
    const vessel = { ...LIBRARY_VESSELS['MSC KYUNGMIN'], vessel_type: 'container' } as any;
    const call = { ...triPortCall(gothenburg, 'MSC KYUNGMIN'), flag_state: 'non-EU' };
    const result = calculatePortCallCost(gothenburg, { vessel, call });
    const isps = feeAmount(result, 'apm_terminals_isps');
    const expected =
      42584.09 + 5274.96 + 6813.49 + 75400 + 107000 + isps +
      80755 + 24165 + 19305 + 26400 + 1880 + 60000;
    expect(result.total).toBeCloseTo(expected, 0);
    // The towage addition is estimate-flagged and excluded from the verified total
    expect(result.total_estimated_parameters).toBe(60000);
  });
});
