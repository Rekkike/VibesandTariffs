/**
 * GOT lift and delivery user inputs (spec v0.11.0, user ruling 2026-10-21):
 * the vessel-side lift is a user-specified call input, blank by default and
 * fail-closed, replacing the encoded v0.8.0 rule; the section 1 goods charge
 * stays as reclassified at v0.8.0.
 *
 * The published ordinary-time rate (1,029 SEK per unit per move) and the
 * receiving/delivering rate (453 SEK per unit) stay recorded in
 * docs/sources/sweden/gothenburg/GOTHENBURG_EXTRACTION_REFERENCE.md
 * section 8 - recorded, never encoded. Declared movement: the default call
 * loses the 4,116,000 SEK lift - 7,391,851.15 -> 3,275,851.15, per-GT
 * 37.94 -> 16.81. The continuity bridge: an entered 1,029 reproduces the
 * v0.10.1 figures exactly.
 *
 * Attribution of record for these pins: GOT lift and delivery user inputs
 * (user ruling 2026-10-21).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort, validatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { classifyRule } from '../src/classification';
import { userSpecifiedRate } from '../src/user_specified_rates';
import { PortDefinition } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const REFERENCE = path.join(__dirname, '..', '..', 'docs', 'sources', 'sweden', 'gothenburg', 'GOTHENBURG_EXTRACTION_REFERENCE.md');

function loadPort(file: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA, file)).port;
}
const gothenburg = loadPort('gothenburg_2026.yaml');
const run = (extra: Record<string, unknown> = {}) =>
  calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: { ...defaultCall('gothenburg'), ...extra } as never });
const fee = (r: ReturnType<typeof run>, id: string) => r.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === id);

describe('GOT lift and delivery user inputs (spec v0.11.0)', () => {
  it('blank inputs never fire: the GOT default total is 3,275,851.15 with no lift line, per-GT 16.81, total without estimates 3,155,851.15', () => {
    const r = run();
    expect(fee(r, 'apm_terminals_lift')).toBeUndefined();
    expect(r.total).toBe(3275851.15);
    expect((r.total / DEFAULT_VESSEL.gt).toFixed(2)).toBe('16.81');
    expect(r.total_estimated_parameters).toBe(120000);
    expect(r.total_without_estimates).toBe(3155851.15);
    expect(r.vessel_access!.amount).toBe(735254.2);
    expect(defaultCall('gothenburg').got_lift_cost).toBeUndefined();
    expect(defaultCall('gothenburg').got_delivery_cost).toBeUndefined();
  });

  it('an entered lift fires on the moves basis: 1,029 x 4,000 = 4,116,000 SEK, terminal_handling, APM Terminals Gothenburg; total 7,391,851.15 (the continuity bridge)', () => {
    const r = run({ got_lift_cost: 1029 });
    const lift = fee(r, 'apm_terminals_lift');
    expect(lift).toBeDefined();
    expect(lift!.amount).toBe(4116000);
    expect(lift!.fee_family).toBe('terminal_handling');
    expect(lift!.biller).toBe('APM Terminals Gothenburg');
    expect(r.total).toBe(7391851.15);
    expect((r.total / DEFAULT_VESSEL.gt).toFixed(2)).toBe('37.94');
    // a user-specified call parameter, not an estimated parameter: no flag, no subtotal movement
    expect(lift!.quality_flags).toEqual([]);
    expect(r.total_estimated_parameters).toBe(120000);
    expect(r.total_without_estimates).toBe(7271851.15);
    // not a vessel-access service: unchanged
    expect(r.vessel_access!.amount).toBe(735254.2);
  });

  it('the lift line basis is the entered-rate disclosure: marker, entered rate and the arithmetic on the call\'s moves (GOT lift and delivery presentation patch, user ruling 2026-10-21)', () => {
    const lift = fee(run({ got_lift_cost: 1029 }), 'apm_terminals_lift')!;
    expect(lift.band_or_basis).toBe('user-specified Cost per lift, 1,029 SEK per unit per move (entered) — 1,029 x 4,000 = 4,116,000 SEK');
    expect(fee(run({ got_lift_cost: 1000.5 }), 'apm_terminals_lift')!.band_or_basis)
      .toBe('user-specified Cost per lift, 1,000.5 SEK per unit per move (entered) — 1,000.5 x 4,000 = 4,002,000 SEK');
    // presentation only: the amount is unchanged
    expect(lift.amount).toBe(4116000);
  });

  it('a zero entry is a valid value that fires nothing', () => {
    const r = run({ got_lift_cost: 0 });
    expect(userSpecifiedRate({ got_lift_cost: 0 }, 'got_lift_cost', 'Cost per lift').state).toBe('valid');
    expect(fee(r, 'apm_terminals_lift')).toBeUndefined();
    expect(r.total).toBe(3275851.15);
  });

  it('fail-closed: a negative, non-numeric or non-finite entry fires nothing and names the defect', () => {
    for (const bad of [-5, NaN, 'abc', Infinity]) {
      const r = run({ got_lift_cost: bad });
      expect(fee(r, 'apm_terminals_lift')).toBeUndefined();
      expect(r.total).toBe(3275851.15);
      const rate = userSpecifiedRate({ got_lift_cost: bad }, 'got_lift_cost', 'Cost per lift');
      expect(rate.state).toBe('invalid');
      expect(rate.error).toContain('Cost per lift');
    }
    expect(userSpecifiedRate({ got_lift_cost: -5 }, 'got_lift_cost', 'Cost per lift').error).toContain('must not be negative');
    expect(userSpecifiedRate({}, 'got_lift_cost', 'Cost per lift').state).toBe('blank');
    expect(userSpecifiedRate({ got_lift_cost: '' }, 'got_lift_cost', 'Cost per lift').state).toBe('blank');
  });

  it('the Delivery input is a container-through leg only: the engine never prices it (an entered 453 moves no engine total)', () => {
    const r = run({ got_delivery_cost: 453 });
    expect(r.total).toBe(3275851.15);
    const both = run({ got_lift_cost: 1029, got_delivery_cost: 453 });
    expect(both.total).toBe(7391851.15);
  });

  it('recorded, not encoded: the silo carries no lift rule and no encoded rate; the descriptor is configuration only; the extraction reference still records both rates', () => {
    const ids = gothenburg.fee_rules.map(r => r.id);
    expect(ids).not.toContain('apm_terminals_lift');
    const yaml = fs.readFileSync(path.join(DATA, 'gothenburg_2026.yaml'), 'utf8');
    expect(yaml).not.toMatch(/unit_rate:\s*1029\b/);
    expect(yaml).not.toMatch(/\b453\b/);
    const usi = gothenburg.user_specified_inputs!;
    expect(usi.lines!.map(l => l.input)).toEqual(['got_lift_cost']);
    expect(usi.legs!.map(l => l.input)).toEqual(['got_delivery_cost']);
    expect(usi.lines![0].label).toBe('Cost per lift');
    expect(usi.legs![0].label).toBe('Delivery');
    for (const entry of [...usi.lines!, ...usi.legs!]) {
      expect(Object.keys(entry)).not.toContain('rate');
      expect(Object.keys(entry)).not.toContain('unit_rate');
    }
    const reference = fs.readFileSync(REFERENCE, 'utf8');
    expect(reference).toContain('1,029 SEK per unit per move');
    expect(reference).toContain('453 SEK per unit');
  });

  it('the loader rejects a descriptor that carries a rate or omits its input', () => {
    const bad = JSON.parse(JSON.stringify(gothenburg)) as PortDefinition;
    (bad.user_specified_inputs!.lines![0] as unknown as Record<string, unknown>).unit_rate = 1029;
    expect(validatePort(bad).errors.some(e => (e.path ?? '').startsWith('user_specified_inputs'))).toBe(true);
    const missing = JSON.parse(JSON.stringify(gothenburg)) as PortDefinition;
    delete (missing.user_specified_inputs!.legs![0] as unknown as Record<string, unknown>).input;
    expect(validatePort(missing).errors.some(e => (e.path ?? '').startsWith('user_specified_inputs'))).toBe(true);
    expect(validatePort(gothenburg).errors.filter(e => (e.path ?? '').startsWith('user_specified_inputs'))).toEqual([]);
  });

  it('the goods charge is reclassified, figures unchanged: port_dues family, 377 x 1,600 = 603,200 and 535 x 2,400 = 1,284,000 SEK; the former IDs are gone', () => {
    const r = run();
    const le = fee(r, 'apm_terminals_goods_charge_le20ft');
    const gt = fee(r, 'apm_terminals_goods_charge_gt20ft');
    expect(le!.amount).toBe(603200);
    expect(gt!.amount).toBe(1284000);
    expect(le!.fee_family).toBe('port_dues');
    expect(gt!.fee_family).toBe('port_dues');
    const ids = gothenburg.fee_rules.map(x => x.id);
    expect(ids).not.toContain('apm_terminals_handling_le20ft');
    expect(ids).not.toContain('apm_terminals_handling_gt20ft');
  });

  it('the lift line is classed cargo_throughput_levy with its container-handling peers; the basis note states the class and the ordinary-time basis', () => {
    const info = classifyRule('apm_terminals_lift');
    expect(info).toBeDefined();
    expect(info!.functional_class).toBe('cargo_throughput_levy');
    expect(info!.basis_note).toContain('ordinary time');
    expect(fee(run({ got_lift_cost: 1029 }), 'apm_terminals_lift')!.functional_class).toBe('cargo_throughput_levy');
  });
});
