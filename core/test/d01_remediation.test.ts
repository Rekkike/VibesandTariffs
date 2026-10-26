/**
 * D-01 remediation (spec v0.12.0, user rulings 2026-10-26).
 *
 * L1-L3: the loader fails closed on a per_unit unit_type that resolves
 * neither to an engine case nor to a CallInput field, naming the port, the
 * rule and the unit_type; every delivered silo loads clean.
 * P1: each of the five Helsingborg optional-service rules prices at an
 * entered count at its published rate (tariff 2026 p.8).
 * P2: a blank, zero or negative count fires nothing, and every port's
 * default-call total is byte-identical to the pre-pass baseline (v0.11.5).
 * The retired rules (the Aarhus gate move truck, the two Gothenburg
 * godsavgift passenger and private-vehicle components, the ungated
 * Gothenburg break-bulk duplicate) priced 0.00 before the pass; their lines
 * are gone and no total moves.
 */
import * as fs from 'fs';
import * as path from 'path';
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort, validatePort } from '../src/loader';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { ENGINE_PER_UNIT_CASES, CALL_INPUT_FIELDS, resolvesUnitType } from '../src/unit_resolution';
import { CallInput, CostCalculationResult, FeeRule, PortDefinition } from '../src/types';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT_IDS = ['aarhus', 'bremerhaven', 'gavle', 'gothenburg', 'hamburg', 'helsingborg', 'norrkoping', 'norvik', 'rotterdam'];
const load = (id: string): PortDefinition => loadAndValidatePort(path.join(DATA_DIR, `${id}_2026.yaml`)).port;
const run = (id: string, overrides: Partial<CallInput> = {}): CostCalculationResult =>
  calculatePortCallCost(load(id), { vessel: DEFAULT_VESSEL, call: { ...defaultCall(id), ...overrides } });
const lines = (r: CostCalculationResult, ruleId: string) => r.billers.flatMap(b => b.fees).filter(f => f.fee_rule_id === ruleId);

describe('L1-L3: the loader fails closed on an unresolved per_unit unit_type', () => {
  it('L1: a rule with a unit_type that resolves to nothing fails the load, naming the port, the rule and the unit_type', () => {
    const port = load('helsingborg');
    const bogus: FeeRule = {
      ...port.fee_rules[0],
      id: 'bogus_unit_rule',
      rate_structure: { type: 'per_unit', unit_type: 'bogus_units', unit_rate: 1 } as FeeRule['rate_structure']
    };
    const result = validatePort({ ...port, fee_rules: [...port.fee_rules, bogus] });
    expect(result.is_valid).toBe(false);
    const messages = result.errors.map(e => e.message);
    expect(messages).toContain(
      'Port "helsingborg", rule "bogus_unit_rule": per_unit unit_type "bogus_units" resolves neither to an engine case nor to a CallInput field (an unresolved unit_type would price a silent zero)'
    );
    expect(result.errors.find(e => e.rule_id === 'bogus_unit_rule')?.path).toBe('rate_structure.unit_type');
  });

  it('L2: all nine delivered silos load clean', () => {
    for (const id of PORT_IDS) {
      expect(() => load(id)).not.toThrow();
    }
  });

  it('L3: the resolution set matches the engine per_unit switch and the five Helsingborg fields are CallInput fields', () => {
    const engine = fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.ts'), 'utf8');
    const start = engine.indexOf('switch (perUnit.unit_type) {');
    const end = engine.indexOf('// Try to get from call directly', start);
    const cases = new Set([...engine.slice(start, end).matchAll(/case '([a-z_0-9]+)':/g)].map(m => m[1]));
    expect([...cases].sort()).toEqual([...ENGINE_PER_UNIT_CASES].sort());
    for (const field of ['imo_transport_units', 'vgm_units', 'other_admin_units', 'customs_inspection_count', 'port_area_transport_units']) {
      expect(CALL_INPUT_FIELDS.has(field)).toBe(true);
      expect(resolvesUnitType(field)).toBe(true);
    }
    for (const retired of ['gate_moves_truck', 'pax', 'unit', '1000_kg']) {
      expect(resolvesUnitType(retired)).toBe(false);
    }
  });
});

// The five Helsingborg optional services (tariff 2026 p.8): rule id, input
// field, published rate, the entered count used by the pin.
const HEL_SERVICES: [string, keyof CallInput, number, number][] = [
  ['poh_imo_transport', 'imo_transport_units', 510, 3],
  ['poh_vgm', 'vgm_units', 430, 4],
  ['poh_other_admin', 'other_admin_units', 360, 2],
  ['poh_customs_inspection', 'customs_inspection_count', 1015, 1],
  ['poh_port_area_transport', 'port_area_transport_units', 950, 5]
];

describe('P1: each Helsingborg optional service prices at an entered count', () => {
  it.each(HEL_SERVICES)('%s prices %s at the published rate: count x rate', (ruleId, field, rate, count) => {
    const r = run('helsingborg', { [field]: count } as Partial<CallInput>);
    const fired = lines(r, ruleId);
    expect(fired).toHaveLength(1);
    expect(fired[0].amount).toBe(rate * count);
    // The Grand Total moves by exactly the line: 8,750,057.40 + count x rate.
    expect(r.total).toBe(Math.round((8750057.4 + rate * count) * 100) / 100);
  });

  it('all five entered together: 3 x 510 + 4 x 430 + 2 x 360 + 1 x 1,015 + 5 x 950 = 9,735.00 SEK; 8,750,057.40 + 9,735.00 = 8,759,792.40', () => {
    const overrides = Object.fromEntries(HEL_SERVICES.map(([, field, , count]) => [field, count])) as Partial<CallInput>;
    const r = run('helsingborg', overrides);
    const sum = HEL_SERVICES.reduce((acc, [ruleId]) => acc + lines(r, ruleId)[0].amount, 0);
    expect(sum).toBe(9735);
    expect(r.total).toBe(8759792.4);
  });
});

describe('P2: blank never fires, and every default-call total is byte-identical', () => {
  it.each(HEL_SERVICES)('%s: blank, zero and negative fire nothing', (ruleId, field) => {
    expect(lines(run('helsingborg'), ruleId)).toHaveLength(0);
    expect(lines(run('helsingborg', { [field]: 0 } as Partial<CallInput>), ruleId)).toHaveLength(0);
    expect(lines(run('helsingborg', { [field]: -2 } as Partial<CallInput>), ruleId)).toHaveLength(0);
  });

  // Pre-pass baselines (v0.11.5, the default call at the fixed test date):
  // [total, total without estimates].
  const BASELINES: Record<string, [number, number]> = {
    aarhus: [6348361, 6348361],
    bremerhaven: [2199677.26, 2184677.26],
    gavle: [10306979.35, 10186979.35],
    gothenburg: [3275851.15, 3155851.15],
    hamburg: [2204910.9, 2189910.9],
    helsingborg: [8750057.4, 8630057.4],
    norrkoping: [8297772.5, 8177772.5],
    norvik: [11952324.05, 11832324.05],
    rotterdam: [133470.88, 133470.88]
  };
  it.each(PORT_IDS)('%s: the default-call total and total without estimates are byte-identical to v0.11.5', id => {
    const r = run(id);
    expect([r.total, r.total_without_estimates]).toEqual(BASELINES[id]);
  });

  it('the retired rules no longer exist and rendered no amount: their 0.00 lines are gone (removal stated, no total moves)', () => {
    const aarhus = run('aarhus');
    expect(lines(aarhus, 'apmt_aarhus_gate_move_truck')).toHaveLength(0);
    const got = run('gothenburg');
    for (const ruleId of ['sjofartsverket_cargo_fee_passengers', 'sjofartsverket_cargo_fee_private_vehicles', 'apm_terminals_handling_break_bulk']) {
      expect(lines(got, ruleId)).toHaveLength(0);
      expect(load('gothenburg').fee_rules.some(r => r.id === ruleId)).toBe(false);
    }
    expect(load('aarhus').fee_rules.some(r => r.id === 'apmt_aarhus_gate_move_truck')).toBe(false);
    // The gated break-bulk rule is unchanged: 54 SEK per 1,000 kg entered.
    expect(lines(run('gothenburg', { break_bulk_1000kg: 10 }), 'apm_terminals_handling_break_bulk_scrap')[0].amount).toBe(540);
  });
});
