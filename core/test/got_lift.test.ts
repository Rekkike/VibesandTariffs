/**
 * GOT handling layer (spec v0.8.0, Units 1-2): the ordinary-time vessel-side
 * lift and the reclassified section 1 goods charge.
 *
 * The lift rate is recorded in
 * docs/sources/sweden/gothenburg/GOTHENBURG_EXTRACTION_REFERENCE.md
 * section 8. Declared movement: the default call gains 4,000 moves x 1,029 =
 * 4,116,000 SEK - 3,275,851.15 -> 7,391,851.15, per-GT 16.81 -> 37.94.
 * Red proof of record: the lift rule removed in the build copy turns these
 * pins red.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { classifyRule } from '../src/classification';
import { PortDefinition } from '../src/types';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');

function loadPort(file: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA, file)).port;
}
const gothenburg = loadPort('gothenburg_2026.yaml');
const result = () => calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as never });
const fee = (id: string) => result().billers.flatMap(b => b.fees).find(f => f.fee_rule_id === id);

describe('GOT handling layer - the ordinary-time lift (spec v0.8.0)', () => {
  it('the lift fires on every move at the default call: 4,000 moves x 1,029 = 4,116,000 SEK, terminal_handling, APM Terminals Gothenburg', () => {
    const lift = fee('apm_terminals_lift');
    expect(lift).toBeDefined();
    expect(lift!.amount).toBe(4116000);
    expect(lift!.fee_family).toBe('terminal_handling');
    expect(lift!.biller).toBe('APM Terminals Gothenburg');
  });

  it('the lift renders like any other rule line: no contract_vs_published flag and a plain rule description', () => {
    // Re-baselined at v0.8.3 origin-wording scrub (user ruling 2026-10-21).
    const lift = fee('apm_terminals_lift')!;
    expect(lift.quality_flags.find(f => f.type === 'contract_vs_published')).toBeUndefined();
    const rule = gothenburg.fee_rules.find(r => r.id === 'apm_terminals_lift')!;
    expect(rule.description).toBe('Vessel-side lift per unit per move, ordinary time, discharging and loading alike');
    expect(rule.contract_vs_published).toBeUndefined();
    expect(rule.source_reference.clause).toBe('Vessel-side lift, ordinary time');
    expect(rule.source_reference.verified_by).toBe('Port Cost Analyzer Team');
  });

  it('the goods charge is reclassified, figures unchanged: port_dues family, 377 x 1,600 = 603,200 and 535 x 2,400 = 1,284,000 SEK; the former IDs are gone', () => {
    const le = fee('apm_terminals_goods_charge_le20ft');
    const gt = fee('apm_terminals_goods_charge_gt20ft');
    expect(le!.amount).toBe(603200);
    expect(gt!.amount).toBe(1284000);
    expect(le!.fee_family).toBe('port_dues');
    expect(gt!.fee_family).toBe('port_dues');
    const ids = gothenburg.fee_rules.map(r => r.id);
    expect(ids).not.toContain('apm_terminals_handling_le20ft');
    expect(ids).not.toContain('apm_terminals_handling_gt20ft');
  });

  it('the declared movement: GOT total 7,391,851.15 SEK (3,275,851.15 + 4,116,000), per-GT 37.94', () => {
    const r = result();
    expect(r.total).toBe(7391851.15);
    expect(Math.round((r.total - 4116000) * 100) / 100).toBe(3275851.15);
    expect((r.total / DEFAULT_VESSEL.gt).toFixed(2)).toBe('37.94');
  });

  it('the lift is classed cargo_throughput_levy with its container-handling peers; the basis note states the class and the ordinary-time basis', () => {
    const info = classifyRule('apm_terminals_lift');
    expect(info).toBeDefined();
    expect(info!.functional_class).toBe('cargo_throughput_levy');
    expect(info!.basis_note).toContain('ordinary time');
    // v0.8.3 origin-wording scrub (user ruling 2026-10-21): the note is the plain class and basis statement.
    expect(info!.basis_note).toBe('Vessel-side container lift per unit per move, ordinary time (the like-for-like basis; overtime, OOG and premium variants recorded, not encoded)');
  });
});
