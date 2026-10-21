/**
 * Empty/full percentage split (spec v0.10.0; user rulings 2026-10-19 and
 * 2026-10-21). One shared pair for the whole call; both blank is the
 * all-loaded convention (zero drift on every port); a valid pair (whole
 * numbers 0-100 summing to exactly 100) derives per size laden = round-half-up
 * (handled x full%) and empty = handled - laden; any other combination is
 * fail-closed (no charge responds). Rules respond only through the
 * data-authored container_basis marker: laden_basis / empty_basis. A charge
 * whose published basis does not distinguish empties is never split.
 *
 * Red proofs of record (build copy): the AAR wharfage marker removed; the
 * sum-to-100 validation removed; floor instead of round-half-up; the new GLE
 * empty-handling rule removed; the OPS non-empty default not derived.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort, validateFeeRule } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { containerSplit, roundHalfUpShare } from '../src/container_split';
import { CallInput, FeeRule } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const PORT_FILES: Record<string, string> = {
  aarhus: 'aarhus_2026.yaml', bremerhaven: 'bremerhaven_2026.yaml', gavle: 'gavle_2026.yaml',
  gothenburg: 'gothenburg_2026.yaml', hamburg: 'hamburg_2026.yaml', helsingborg: 'helsingborg_2026.yaml',
  norrkoping: 'norrkoping_2026.yaml', norvik: 'norvik_2026.yaml', rotterdam: 'rotterdam_2026.yaml'
};
const PORTS = Object.fromEntries(Object.entries(PORT_FILES).map(([id, f]) => [id, loadAndValidatePort(path.join(DATA, f)).port]));
const priced = (id: string, extra: Partial<CallInput> = {}) =>
  calculatePortCallCost(PORTS[id], {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(id) as unknown as CallInput), ...extra } as CallInput
  });
const feeMap = (r: ReturnType<typeof priced>) => new Map(r.billers.flatMap(b => b.fees).map(f => [f.fee_rule_id, f.amount]));
const PAIR = { container_empty_pct: 30, container_full_pct: 70 } as Partial<CallInput>;
// The default call's handled units per size (loaded + discharged).
const call0 = defaultCall('gothenburg') as unknown as CallInput;
const H20 = (call0.containers_loaded_le20ft || 0) + (call0.containers_discharged_le20ft || 0);
const H40 = (call0.containers_loaded_gt20ft || 0) + (call0.containers_discharged_gt20ft || 0);
const L20 = roundHalfUpShare(H20, 70);
const L40 = roundHalfUpShare(H40, 70);
const GODSAVGIFT_IDS = ['sjofartsverket_godsavgift', 'gvh_sfv_godsavgift', 'pon_sfv_godsavgift', 'snv_sfv_godsavgift', 'sfv_godsavgift'];
const MARKED = [
  'aarhus_wharfage', 'aarhus_isps', 'snv_pos_cargo_due_le20ft', 'snv_pos_cargo_due_gt20ft', 'snv_hutchison_isps',
  'apm_terminals_isps', 'gvh_yilport_handling_full', 'gvh_yilport_handling_empty', 'gvh_yilport_cargo_due', 'gvh_yilport_isps',
  ...GODSAVGIFT_IDS
];

describe('container split - the derivation and the validation (spec v0.10.0)', () => {
  it('both blank is the all-loaded convention: state blank, every handled unit laden, none empty', () => {
    const s = containerSplit(call0);
    expect(s.state).toBe('blank');
    expect([s.le20.laden, s.le20.empty, s.gt20.laden, s.gt20.empty]).toEqual([H20, 0, H40, 0]);
  });
  it('a valid pair derives per size, whole call: laden = round-half-up(handled x full%), empty = handled - laden', () => {
    const s = containerSplit({ ...call0, ...PAIR });
    expect(s.state).toBe('valid');
    expect(s.le20).toEqual({ handled: H20, laden: L20, empty: H20 - L20 });
    expect(s.gt20).toEqual({ handled: H40, laden: L40, empty: H40 - L40 });
    expect(s.le20.laden + s.le20.empty).toBe(H20);
  });
  it('rounding is round-half-up to the nearest whole unit, in exact integer arithmetic', () => {
    expect(roundHalfUpShare(5, 50)).toBe(3);   // 2.5 -> 3
    expect(roundHalfUpShare(1, 50)).toBe(1);   // 0.5 -> 1
    expect(roundHalfUpShare(3, 50)).toBe(2);   // 1.5 -> 2
    expect(roundHalfUpShare(7, 10)).toBe(1);   // 0.7 -> 1
    expect(roundHalfUpShare(4, 10)).toBe(0);   // 0.4 -> 0
    expect(roundHalfUpShare(0, 70)).toBe(0);
    expect(roundHalfUpShare(1600, 70)).toBe(1120);
  });
  it('a call-level tie rounds half up per size: 5 handled 20 ft and 1 handled 40 ft at 50/50 derive 3 + 2 and 1 + 0', () => {
    const s = containerSplit({
      ...call0,
      containers_loaded_le20ft: 3, containers_discharged_le20ft: 2,
      containers_loaded_gt20ft: 1, containers_discharged_gt20ft: 0,
      container_empty_pct: 50, container_full_pct: 50
    });
    expect(s.le20).toEqual({ handled: 5, laden: 3, empty: 2 });
    expect(s.gt20).toEqual({ handled: 1, laden: 1, empty: 0 });
  });
  it('the boundary pairs 0/100 and 100/0 are valid', () => {
    expect(containerSplit({ ...call0, container_empty_pct: 0, container_full_pct: 100 }).gt20.empty).toBe(0);
    const allEmpty = containerSplit({ ...call0, container_empty_pct: 100, container_full_pct: 0 });
    expect(allEmpty.state).toBe('valid');
    expect(allEmpty.le20.laden).toBe(0);
    expect(allEmpty.le20.empty).toBe(H20);
  });
  it('one box alone is invalid (fail-closed) and names the defect', () => {
    for (const p of [{ container_empty_pct: 30 }, { container_full_pct: 70 }] as Partial<CallInput>[]) {
      const s = containerSplit({ ...call0, ...p });
      expect(s.state).toBe('invalid');
      expect(s.error).toMatch(/both Empty containers % and Full containers %/);
      expect(s.le20.empty).toBe(0);
    }
  });
  it('a pair not summing to 100 is invalid and names the sum', () => {
    const s = containerSplit({ ...call0, container_empty_pct: 30, container_full_pct: 60 });
    expect(s.state).toBe('invalid');
    expect(s.error).toMatch(/sum to exactly 100 \(entered 30 \+ 60 = 90\)/);
  });
  it('non-integers and out-of-range values are invalid', () => {
    for (const [e, f] of [[30.5, 69.5], [-10, 110], [101, -1], [Number.NaN, 100]]) {
      const s = containerSplit({ ...call0, container_empty_pct: e, container_full_pct: f });
      expect(s.state).toBe('invalid');
      expect(s.error).toMatch(/whole numbers from 0 to 100/);
    }
  });
  it('an invalid pair derives nothing: the counts stay the all-loaded convention', () => {
    const s = containerSplit({ ...call0, container_empty_pct: 40, container_full_pct: 40 });
    expect([s.le20.laden, s.le20.empty, s.gt20.laden, s.gt20.empty]).toEqual([H20, 0, H40, 0]);
  });
});

describe('container split - zero drift and fail-closed on every port (spec v0.10.0)', () => {
  it('blank pair: every port\'s priced fees are exactly the pre-split values, and the new empty-handling line does not exist', () => {
    for (const id of Object.keys(PORTS)) {
      const base = priced(id);
      const explicit = priced(id, { container_empty_pct: undefined, container_full_pct: undefined });
      expect(explicit.total).toBe(base.total);
      expect([...feeMap(explicit)]).toEqual([...feeMap(base)]);
    }
    expect(feeMap(priced('gavle')).has('gvh_yilport_handling_empty')).toBe(false);
    expect(priced('gothenburg').total).toBe(7391851.15);
  });
  it('fail-closed: every invalid combination prices byte-identically to the blank pair at every port', () => {
    const invalid: Partial<CallInput>[] = [
      { container_empty_pct: 30 }, { container_full_pct: 70 },
      { container_empty_pct: 30, container_full_pct: 60 }, { container_empty_pct: 50.5, container_full_pct: 49.5 }
    ];
    for (const id of Object.keys(PORTS)) {
      const base = priced(id);
      for (const inv of invalid) {
        const r = priced(id, inv);
        expect(r.total).toBe(base.total);
        expect([...feeMap(r)]).toEqual([...feeMap(base)]);
      }
    }
  });
  it('a valid pair moves only the marked rules: every unmarked line at every port is byte-identical (the no-invention guard)', () => {
    for (const id of Object.keys(PORTS)) {
      const base = feeMap(priced(id));
      const split = feeMap(priced(id, PAIR));
      for (const [ruleId, amount] of base) {
        if (MARKED.includes(ruleId)) continue;
        expect(split.get(ruleId)).toBe(amount);
      }
    }
  });
});

describe('container split - the applicable set at a worked percentage, 30 empty / 70 full (spec v0.10.0)', () => {
  it('Aarhus: wharfage 225 and ISPS 9.65 price the laden units only', () => {
    const f = feeMap(priced('aarhus', PAIR));
    expect(f.get('aarhus_wharfage')).toBe(225 * (L20 + L40));
    expect(f.get('aarhus_isps')).toBeCloseTo(9.65 * (L20 + L40), 2);
    expect(feeMap(priced('aarhus')).get('aarhus_wharfage')).toBe(225 * (H20 + H40));
  });
  it('Norvik: the Ports of Stockholm cargo dues price laden units per size, and the Hutchison ISPS 69 the laden total', () => {
    const f = feeMap(priced('norvik', PAIR));
    expect(f.get('snv_pos_cargo_due_le20ft')).toBe(331 * L20);
    expect(f.get('snv_pos_cargo_due_gt20ft')).toBe(424 * L40);
    expect(f.get('snv_hutchison_isps')).toBe(69 * (L20 + L40));
  });
  it('Gothenburg: the ISPS 80 full-units-only pattern is encoded; the rate is unchanged', () => {
    expect(feeMap(priced('gothenburg', PAIR)).get('apm_terminals_isps')).toBe(80 * (L20 + L40));
    expect(feeMap(priced('gothenburg')).get('apm_terminals_isps')).toBe(80 * (H20 + H40));
  });
  it('Gävle: cargo due 482, ISPS 73 and full handling 1,679 price the laden units; the new empty handling 1,235 prices the derived empties', () => {
    const f = feeMap(priced('gavle', PAIR));
    const laden = L20 + L40;
    const empty = (H20 - L20) + (H40 - L40);
    expect(f.get('gvh_yilport_cargo_due')).toBe(482 * laden);
    expect(f.get('gvh_yilport_isps')).toBe(73 * laden);
    expect(f.get('gvh_yilport_handling_full')).toBe(1679 * laden);
    expect(f.get('gvh_yilport_handling_empty')).toBe(1235 * empty);
    expect(empty).toBeGreaterThan(0);
  });
  it('Gävle: a 100 percent full pair derives zero empties, so the empty-handling line prices nothing (the engine\'s ordinary zero-count line; the views collapse it)', () => {
    const f = feeMap(priced('gavle', { container_empty_pct: 0, container_full_pct: 100 }));
    expect(f.get('gvh_yilport_handling_empty') ?? 0).toBe(0);
    expect(f.get('gvh_yilport_handling_full')).toBe(1679 * (H20 + H40));
  });
  it('godsavgift at all five Swedish silos keys on the laden counts: equal to the all-loaded derivation run on the laden counts', () => {
    const ladenCall = {
      containers_loaded_le20ft: Math.round(L20 / 2), containers_discharged_le20ft: L20 - Math.round(L20 / 2),
      containers_loaded_gt20ft: Math.round(L40 / 2), containers_discharged_gt20ft: L40 - Math.round(L40 / 2)
    } as Partial<CallInput>;
    const silos: [string, string][] = [['gothenburg', 'sjofartsverket_godsavgift'], ['gavle', 'gvh_sfv_godsavgift'], ['norrkoping', 'pon_sfv_godsavgift'], ['norvik', 'snv_sfv_godsavgift'], ['helsingborg', 'sfv_godsavgift']];
    for (const [id, rule] of silos) {
      const viaSplit = feeMap(priced(id, PAIR)).get(rule)!;
      const viaCounts = feeMap(priced(id, ladenCall)).get(rule)!;
      const allLoaded = feeMap(priced(id)).get(rule)!;
      expect(viaSplit).toBe(viaCounts);
      expect(viaSplit).toBeLessThan(allLoaded);
    }
  });
  it('Rotterdam\'s cargo dues (entered-tonnes basis) do not respond', () => {
    expect(feeMap(priced('rotterdam', PAIR)).get('rotterdam_cargo_dues')).toBe(feeMap(priced('rotterdam')).get('rotterdam_cargo_dues'));
  });
  it('the derived counts are disclosed in the godsavgift line basis (the rounding is never silent)', () => {
    const line = priced('gothenburg', PAIR).billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'sjofartsverket_godsavgift')!;
    expect(JSON.stringify(line)).toContain(`${L20} x 20ft`);
  });
});

describe('container split - the explicit not-applicable set does not respond (spec v0.10.0)', () => {
  const NOT_APPLICABLE: Record<string, string[]> = {
    gothenburg: ['apm_terminals_lift', 'apm_terminals_goods_charge_le20ft', 'apm_terminals_goods_charge_gt20ft'],
    aarhus: ['apmt_aarhus_container_handling', 'aarhus_work_environment_levy'],
    helsingborg: ['poh_lolo_handling', 'poh_cargo_due', 'poh_security_fee', 'poh_ees'],
    hamburg: ['eurogate_container_handling', 'eurogate_security_charge', 'hhla_container_handling', 'hhla_security_charge'],
    bremerhaven: ['eurogate_ctb_container_handling', 'eurogate_ctb_security_charge', 'ntb_container_handling', 'ntb_security_charge'],
    norvik: ['snv_hutchison_handling'],
    norrkoping: ['pon_cargo_due_20ft', 'pon_cargo_due_gt20ft', 'pon_lift_vessel_20ft', 'pon_lift_vessel_gt20ft'],
    rotterdam: ['rotterdam_cargo_dues']
  };
  for (const [id, rules] of Object.entries(NOT_APPLICABLE)) {
    it(`${id}: ${rules.join(', ')} are unchanged under a valid pair`, () => {
      const base = feeMap(priced(id));
      const split = feeMap(priced(id, PAIR));
      for (const r of rules) {
        if (!base.has(r)) continue; // a variant rule that does not fire on the default call
        expect(split.get(r)).toBe(base.get(r));
      }
      expect(rules.some(r => base.has(r))).toBe(true);
    });
  }
  it('storage lines (the scenario layer) do not respond', () => {
    for (const id of Object.keys(PORTS)) {
      const base = [...feeMap(priced(id))].filter(([r]) => /storage/.test(r));
      for (const [r, amount] of base) expect(feeMap(priced(id, PAIR)).get(r)).toBe(amount);
    }
  });
  it('the marker set is exactly the applicable set (no rule outside it carries a marker)', () => {
    const marked = Object.values(PORTS).flatMap(p => p.fee_rules.filter(r => r.container_basis).map(r => r.id)).sort();
    expect(marked).toEqual([...MARKED].sort());
  });
});

describe('container split - the OPS non-empty default (spec v0.10.0)', () => {
  const gotUnit = (extra: Partial<CallInput>) => {
    const r = priced('gothenburg', { ops_unit_charge_20ft: 10, ops_unit_charge_40ft: 20, ...extra });
    const lines = new Map(r.ops_speculative!.lines.map(l => [l.id, l.amount]));
    return { u20: lines.get('ops_spec_unit_20ft'), u40: lines.get('ops_spec_unit_40ft') };
  };
  it('blank pair: the basis defaults to the handled counts (unchanged); a valid pair defaults it to the derived laden counts', () => {
    expect(gotUnit({})).toEqual({ u20: 10 * H20, u40: 20 * H40 });
    expect(gotUnit(PAIR)).toEqual({ u20: 10 * L20, u40: 20 * L40 });
  });
  it('entered non-empty counts always win over the derived default', () => {
    expect(gotUnit({ ...PAIR, ops_nonempty_units_20ft: 1000, ops_nonempty_units_40ft: 1500 })).toEqual({ u20: 10 * 1000, u40: 20 * 1500 });
  });
});

describe('container split - the marker is validated by the loader (spec v0.10.0)', () => {
  const rule = (extra: Partial<FeeRule> & { rate_structure?: unknown }): FeeRule => ({
    id: 't', fee_family: 'security', biller: 'B', name: 'N',
    rate_structure: { type: 'per_unit', unit_type: 'container_total', unit_rate: 1 },
    source_reference: { document_name: 'd', page: 1, clause: 'c', verified_on: '2026-01-01', verified_by: 'x' } as never,
    ...extra
  } as FeeRule);
  it('accepts laden_basis and empty_basis on a container-count rule', () => {
    expect(validateFeeRule(rule({ container_basis: 'laden_basis' })).filter(e => e.path === 'container_basis')).toEqual([]);
    expect(validateFeeRule(rule({ container_basis: 'empty_basis' })).filter(e => e.path === 'container_basis')).toEqual([]);
  });
  it('rejects an unknown marker value', () => {
    const errs = validateFeeRule(rule({ container_basis: 'full_basis' as never })).filter(e => e.path === 'container_basis');
    expect(errs.length).toBe(1);
    expect(errs[0].message).toMatch(/laden_basis or empty_basis/);
  });
  it('rejects a marker on a rule whose unit is not a container count (and empty_basis on a tonnage rule)', () => {
    expect(validateFeeRule(rule({ container_basis: 'laden_basis', rate_structure: { type: 'per_unit', unit_type: 'gt', unit_rate: 1 } as never })).some(e => e.path === 'container_basis')).toBe(true);
    expect(validateFeeRule(rule({ container_basis: 'empty_basis', rate_structure: { type: 'per_unit', unit_type: 'cargo_tonnage_from_containers', unit_rate: 1 } as never })).some(e => e.path === 'container_basis')).toBe(true);
  });
});
