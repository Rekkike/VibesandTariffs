/**
 * Frozen-2027 Gothenburg suite (dual-year accumulation, user ruling of
 * 2026-11-23, v0.24.0). Pins every drifted Port of Gothenburg rule of the
 * tree-inert fork core/data/gothenburg_2027.yaml at the 2027 published values,
 * the unchanged sentinel values (sludge 0.21/0.31/2,400; solid EU 0.13;
 * certificate -0.05), the ESI-20 threshold behavior, and both in-document
 * worked examples recomputed through the engine. Every pin carries in-test
 * attribution: the user's dual-year ruling of 2026-11-23 and the document
 * citation (port-tariff-2027.pdf, version 1, effective 1 January 2027,
 * published 30 September 2026, 37 pages, 551,198 bytes, sha256
 * e0d46c17e7bee2afcc1b78879e3089bfca19d51db1b1dd2e79661944fcece130, archived at
 * docs/sources/sweden/gothenburg/port-authority/port-tariff-2027.pdf). The
 * 2026 file (gothenburg_2026.yaml) stays FROZEN and byte-identical; the app
 * stays on the 2026 year constant - this fork never enters ports.json (the
 * vessels: [] sentinel, the v0.23.0 precedent, keeps the converter on its
 * vessel branch). DECLARED PIN COUNT: 19.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition, CostCalculationInput } from '../src/types';

const FILE = path.join(__dirname, '..', 'data', 'gothenburg_2027.yaml');
const RAW = yaml.load(fs.readFileSync(FILE, 'utf8')) as any;
const port: PortDefinition = loadAndValidatePort(FILE).port;
const FROZEN_2026 = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml'), 'utf8')
) as any;

// The six rules the 2027 drift table edits (user ruling 2026-11-23); every
// other fee rule is byte-carried from the frozen 2026 file.
const EDITED = new Set([
  'port_gothenburg_container_vessel_dues',
  'port_gothenburg_waste_solid_non_eu',
  'port_gothenburg_fresh_water',
  'port_gothenburg_waste_scrubber',
  'port_gothenburg_ops_connection',
  'port_gothenburg_layup',
]);

function rule(id: string): any {
  return port.fee_rules.find(r => r.id === id)!;
}

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  const { gt, nt, loa_m, ...callOverrides } = overrides;
  return {
    vessel: {
      gt: (gt as number) ?? 8890,
      nt: (nt as number) ?? 3783,
      loa_m: (loa_m as number) ?? 137
    },
    call: {
      port_id: 'gothenburg',
      date: '2027-06-01',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      flag_state: 'EU',
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
      ...callOverrides
    } as CostCalculationInput['call']
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

describe('frozen-2027 fork shape (user ruling 2026-11-23; port-tariff-2027.pdf published 2026-09-30)', () => {
  it('loads and validates as a port; metadata carries the 2027 validity window and the 2026-09-30 issue date', () => {
    expect(port.metadata.id).toBe('gothenburg');
    expect(port.metadata.validity_start).toBe('2027-01-01');
    expect(port.metadata.validity_end).toBe('2027-12-31');
    expect((port.metadata as any).issued).toBe('2026-09-30');
  });

  it('carries the tree-inert sentinel: an empty vessels array keeps the converter off the port branch while the year constant is 2026 (the v0.23.0 sentinel precedent)', () => {
    // Mechanism pin for "the 2027 yaml never enters the build": the converter's
    // first branch (Array.isArray(data.vessels)) classifies this file as an
    // empty vessel-library file, so ports.json stays byte-identical
    // (sha256 6a04579c8f63b25b63cf755644dfcd5c125cb908aaea708010f1d85a4d9f3544).
    expect(RAW.vessels).toEqual([]);
  });

  it('exactly the six drift-table rules differ from the frozen 2026 file; every other fee rule is byte-carried (Sjöfartsverket, APM, towage, Klippan included)', () => {
    const carried27 = RAW.fee_rules.filter((r: any) => !EDITED.has(r.id));
    const carried26 = FROZEN_2026.fee_rules.filter((r: any) => !EDITED.has(r.id));
    expect(carried27).toEqual(carried26);
    expect(RAW.fee_rules.filter((r: any) => EDITED.has(r.id)).length).toBe(6);
    expect(RAW.fee_rules.length).toBe(FROZEN_2026.fee_rules.length);
  });

  it('the per-port configuration sections are byte-carried (default_call, ops_speculative, user_specified_inputs, input_profile)', () => {
    expect(RAW.default_call).toEqual(FROZEN_2026.default_call);
    expect(RAW.ops_speculative).toEqual(FROZEN_2026.ops_speculative);
    expect(RAW.user_specified_inputs).toEqual(FROZEN_2026.user_specified_inputs);
    expect(RAW.input_profile).toEqual(FROZEN_2026.input_profile);
  });
});

describe('port_gothenburg_container_vessel_dues at the 2027 published values (section 2.2 table p. 9, worked examples pp. 11-12; user ruling 2026-11-23)', () => {
  it('band rates 2.08 / 1.83 / 1.26 / 0.91 SEK/GT with the band boundaries and progressive banding unchanged (0-20,000 / 20,001-40,000 / 40,001-60,000 / >60,001 GT)', () => {
    expect(rule('port_gothenburg_container_vessel_dues').rate_structure).toEqual({
      type: 'progressive',
      basis: 'gt',
      bands: [
        { min: 0, max: 20000, rate: 2.08 },
        { min: 20000, max: 40000, rate: 1.83 },
        { min: 40000, max: 60000, rate: 1.26 },
        { min: 60000, max: null, rate: 0.91 },
      ]
    });
  });

  it('minimum 800 SEK per vessel and per call (section 3 p. 3: "The minimum amount invoiced per vessel and per call is 800 SEK"; was 500) - the 2026 silo encoded the same section-3 minimum as the rule minimum, the same interpretation carried', () => {
    expect(rule('port_gothenburg_container_vessel_dues').minimum).toBe(800);
  });

  it('ESI adjustment threshold esi_score >= 20 (section 2.2 p. 10: "a minimum ESI score of 20 points or at least CSI-class 4"; was >= 30); the 10% discount, the CSI-class-4 alternative, and the stacking unchanged - second additive 10% fossil-free (order 2) and the 50% frequency discount (order 3) untouched', () => {
    const adj = rule('port_gothenburg_container_vessel_dues').adjustments;
    expect(adj[0].condition).toBe("esi_score >= 20 || clean_shipping_index_class == '4'");
    expect(adj[0].percentage).toBe(10);
    expect(adj[0].stack_method).toBe('additive');
    expect(adj[0].stacking_order).toBe(1);
    expect(adj[1]).toMatchObject({ percentage: 10, condition: 'fossil_free_fuel_percentage >= 30', stacking_order: 2 });
    expect(adj[2]).toMatchObject({ percentage: 50, stacking_order: 3 });
    expect(adj[2].condition).toContain('got_same_route_second_call');
  });

  it('source_reference re-points at the archived port-tariff-2027.pdf, issued 2026-09-30, band table p. 9', () => {
    const sr = rule('port_gothenburg_container_vessel_dues').source_reference;
    expect(sr.document_name).toBe('port-tariff-2027.pdf');
    expect(sr.document_url).toBe('docs/sources/sweden/gothenburg/port-authority/port-tariff-2027.pdf');
    expect(sr.upstream_url).toBe('https://www.portofgothenburg.com/globalassets/dokument/port_of_gothenburg_port_tariff_2027.pdf');
    expect(sr.document_issued).toBe('2026-09-30');
    expect(sr.page).toBe(9);
    expect(sr.clause).toContain('pp. 11-12');
    expect(sr.verified_on).toBe('2026-11-23');
  });
});

describe('the other five edited Port of Gothenburg rules at the 2027 published values (user ruling 2026-11-23)', () => {
  it('port_gothenburg_waste_solid_non_eu: 0.23 SEK/GT (section 2.2 p. 10, corroborated by the printed sample p. 12: 12,000 GT x 0.23 = 2,760 SEK); was 0.24; description carries the figure; certificate discount -0.05 unchanged', () => {
    const r = rule('port_gothenburg_waste_solid_non_eu');
    expect(r.rate_structure.unit_rate).toBe(0.23);
    expect(r.description).toContain('0.23 SEK/GT');
    expect(r.adjustments[0].amount_per_gt).toBe(0.05);
    expect(r.source_reference.document_name).toBe('port-tariff-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-09-30');
    expect(r.source_reference.page).toBe(10);
    expect(r.source_reference.clause).toContain('p. 12');
  });

  it('port_gothenburg_fresh_water: 55 SEK/m3 above 50 m3, free band below 50 m3 unchanged (section 2.1 copy p. 7; restructure note: the 2027 document folds the 2026 general section 4.2 into the per-segment sections); was 50', () => {
    const r = rule('port_gothenburg_fresh_water');
    expect(r.rate_structure.bands).toEqual([
      { min: null, max: 50, amount: 0 },
      { min: 50, max: null, rate: 55, cap_at_max: false },
    ]);
    expect(r.description).toContain('55 SEK per m3 above 50 m3');
    expect(r.source_reference.document_name).toBe('port-tariff-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-09-30');
    expect(r.source_reference.page).toBe(7);
    expect(r.source_reference.clause).toContain('restructure note');
    expect(r.source_reference.clause).toContain('section 4.2');
  });

  it('port_gothenburg_waste_scrubber: 850 SEK administration fee (section 2.2 p. 10); was 800', () => {
    const r = rule('port_gothenburg_waste_scrubber');
    expect(r.rate_structure.amount).toBe(850);
    expect(r.source_reference.document_name).toBe('port-tariff-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-09-30');
    expect(r.source_reference.page).toBe(10);
  });

  it('port_gothenburg_ops_connection: 7,100 SEK, one fee per port call, jetties 519/520/521 unchanged (section 2.1 copy pp. 7-8; restructure note: the 2027 document folds the 2026 general section 5.1 into the per-segment sections); was 7,000', () => {
    const r = rule('port_gothenburg_ops_connection');
    expect(r.rate_structure.amount).toBe(7100);
    expect(r.applicable_conditions).toEqual({ ops_usage: true, vessel_type: 'tanker' });
    expect(r.source_reference.document_name).toBe('port-tariff-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-09-30');
    expect(r.source_reference.page).toBe('7-8');
    expect(r.source_reference.clause).toContain('restructure note');
    expect(r.source_reference.clause).toContain('519/520/521');
  });

  it('port_gothenburg_layup: daily_rate 45.50 SEK/m LOA, "per calendar day or part thereof" unchanged (section 2.1 copy p. 7; restructure note: the 2027 document folds the 2026 general section 5.2 into the per-segment sections); was 45', () => {
    const r = rule('port_gothenburg_layup');
    expect(r.rate_structure).toEqual({ type: 'per_commenced_day', daily_rate: 45.50, basis: 'loa_m' });
    expect(r.source_reference.document_name).toBe('port-tariff-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-09-30');
    expect(r.source_reference.page).toBe(7);
    expect(r.source_reference.clause).toContain('restructure note');
    expect(r.source_reference.clause).toContain('calendar day or part thereof');
  });
});

describe('unchanged sentinel values pinned (user ruling 2026-11-23: byte-carried, still citing the 2026 archive)', () => {
  it('sludge: EU 0.21 / non-EU 0.31 SEK/GT up to 11 m3, excess 2,400 SEK/m3 - byte-carried, source_references still at port-tariff-2026.txt', () => {
    expect(rule('port_gothenburg_waste_sludge_eu').rate_structure.bands).toEqual([{ min: 0, max: null, rate: 0.21 }]);
    expect(rule('port_gothenburg_waste_sludge_non_eu').rate_structure.bands).toEqual([{ min: 0, max: null, rate: 0.31 }]);
    expect(rule('port_gothenburg_waste_sludge_excess').rate_structure.unit_rate).toBe(2400);
    for (const id of ['port_gothenburg_waste_sludge_eu', 'port_gothenburg_waste_sludge_non_eu', 'port_gothenburg_waste_sludge_excess']) {
      expect(rule(id).source_reference.document_name).toBe('port-tariff-2026.txt');
    }
  });

  it('solid waste EU 0.13 SEK/GT and the EU 2022/91 certificate discount -0.05 SEK/GT - byte-carried', () => {
    const r = rule('port_gothenburg_waste_solid_eu');
    expect(r.rate_structure.unit_rate).toBe(0.13);
    expect(r.adjustments[0].amount_per_gt).toBe(0.05);
    expect(r.source_reference.document_name).toBe('port-tariff-2026.txt');
  });
});

describe('engine pins at the 2027 values (user ruling 2026-11-23; worked examples pp. 11-12 of port-tariff-2027.pdf)', () => {
  it('worked example 1: 70,000 GT Europe call - infrastructure dues 20,000x2.08 + 20,000x1.83 + 20,000x1.26 + 10,000x0.91 = 112,500 SEK, band rows [41,600 / 36,600 / 25,200 / 9,100] on quantities [20,000 / 20,000 / 20,000 / 10,000]', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 70000, nt: 35000, loa_m: 300, arrival_origin: 'europe', sludge_extra_m3: 4
    }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.band_rows!.map(r => r.quantity)).toEqual([20000, 20000, 20000, 10000]);
    expect(dues.band_rows!.map(r => r.amount)).toEqual([41600, 36600, 25200, 9100]);
    expect(dues.amount).toBe(112500.00);
  });

  it('worked example 2: 12,000 GT non-Europe ESI-20 call - dues 12,000x2.08 = 24,960, ESI discount -2,496, sludge 12,000x0.31 = 3,720, solid 12,000x0.23 = 2,760; 24,960 - 2,496 + 3,720 + 2,760 = 28,944 SEK', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 12000, nt: 0, loa_m: 140, arrival_origin: 'outside-europe', esi_score: 20
    }));
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    const sludge = feeByRule(result, 'port_gothenburg_waste_sludge_non_eu');
    const solid = feeByRule(result, 'port_gothenburg_waste_solid_non_eu');
    expect(dues.band_rows!.map(r => r.amount)).toEqual([24960]);
    expect(dues.adjustments_applied.some(a => a.type === 'discount' && a.percentage === 10)).toBe(true);
    expect(dues.amount).toBe(22464.00); // 24,960 - 2,496 (the -10% ESI discount)
    expect(sludge.amount).toBe(3720.00);
    expect(solid.amount).toBe(2760.00);
    expect(dues.amount + sludge.amount + solid.amount).toBe(28944.00);
  });

  it('ESI threshold behavior at 20: a 20-point call earns the 10% discount (section 2.2 p. 10), a 19-point call does not', () => {
    const at20 = calculatePortCallCost(port, makeCall({ gt: 12000, arrival_origin: 'outside-europe', esi_score: 20 }));
    const at19 = calculatePortCallCost(port, makeCall({ gt: 12000, arrival_origin: 'outside-europe', esi_score: 19 }));
    expect(feeByRule(at20, 'port_gothenburg_container_vessel_dues').amount).toBe(22464.00);
    expect(feeByRule(at19, 'port_gothenburg_container_vessel_dues').amount).toBe(24960.00);
  });

  it('minimum pin: a 100 GT call bills the 800 SEK rule minimum (section 3 p. 3)', () => {
    const result = calculatePortCallCost(port, makeCall({ gt: 100, arrival_origin: 'europe' }));
    // 100 x 2.08 = 208 < 800 minimum
    expect(feeByRule(result, 'port_gothenburg_container_vessel_dues').amount).toBe(800.00);
  });
});
