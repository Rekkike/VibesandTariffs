/**
 * Aarhus user-specified per-GT OPS input with minimum and maximum bounds
 * (spec v0.9.1, user ruling 2026-10-21). General, descriptor-gated machinery:
 * a per-GT descriptor that declares bounds prices clamp(rate x GT, minimum,
 * maximum); a blank rate prices no line whatever the bounds; a blank bound is
 * unbounded in that direction. The descriptor carries presence, currency,
 * unit and bounds presence only. The values below are fixture test values,
 * never defaults.
 *
 * Red proofs of record (build copy): per_gt.enabled reverted to false turns
 * the Aarhus pins red; the clamp removed turns the bounds pins red.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { opsComponentsForPort } from '../src/engine';
import { portResetFields } from '../src/port_data';
import { CallInput } from '../src/types';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const load = (file: string) => loadAndValidatePort(path.join(DATA, file)).port;
const aarhus = load('aarhus_2026.yaml');
const gothenburg = load('gothenburg_2026.yaml');
const priced = (port: typeof aarhus, extra: Partial<CallInput> = {}) =>
  calculatePortCallCost(port, {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(port.metadata.id) as unknown as CallInput), ...extra } as CallInput
  });
const GT = DEFAULT_VESSEL.gt;
const perGt = (r: ReturnType<typeof priced>) => r.ops_speculative?.lines.find(l => l.id === 'ops_spec_per_gt');
const base = priced(aarhus);

describe('Aarhus per-GT OPS input with bounds (spec v0.9.1)', () => {
  it('the descriptor is configuration only: presence, currency, unit and bounds presence - no rates', () => {
    const d = opsComponentsForPort('aarhus').per_gt;
    expect(d).toEqual({ enabled: true, currency: 'DKK', unit: 'DKK/GT', bounds: true });
    expect(Object.keys(d).sort()).toEqual(['bounds', 'currency', 'enabled', 'unit']);
  });
  it('the three reset fields are declared for Aarhus', () => {
    const fields = portResetFields('aarhus');
    for (const f of ['ops_per_gt_charge', 'ops_per_gt_min', 'ops_per_gt_max']) expect(fields).toContain(f);
  });
  it('blank rate produces no line, regardless of entered bounds; nothing moves', () => {
    expect(base.ops_speculative).toBeUndefined();
    const boundsOnly = priced(aarhus, { ops_per_gt_min: GT * 5, ops_per_gt_max: GT * 9 });
    expect(boundsOnly.ops_speculative).toBeUndefined();
    expect(boundsOnly.total).toBe(base.total);
  });
  it('rate x GT between the bounds: the plain product, no bound note', () => {
    const r = priced(aarhus, { ops_per_gt_charge: 3, ops_per_gt_min: GT, ops_per_gt_max: GT * 10 });
    expect(perGt(r)!.amount).toBe(Math.round(GT * 3 * 100) / 100);
    expect(perGt(r)!.basis).not.toContain('applied');
    expect(r.total).toBeCloseTo(base.total + GT * 3, 2);
  });
  it('minimum binds when the product falls below it', () => {
    const r = priced(aarhus, { ops_per_gt_charge: 0.5, ops_per_gt_min: GT * 2, ops_per_gt_max: GT * 10 });
    expect(perGt(r)!.amount).toBe(GT * 2);
    expect(perGt(r)!.basis).toContain('minimum');
    expect(perGt(r)!.basis).toContain('applied');
    expect(r.total).toBeCloseTo(base.total + GT * 2, 2);
  });
  it('maximum binds when the product rises above it', () => {
    const r = priced(aarhus, { ops_per_gt_charge: 20, ops_per_gt_min: GT, ops_per_gt_max: GT * 4 });
    expect(perGt(r)!.amount).toBe(GT * 4);
    expect(perGt(r)!.basis).toContain('maximum');
    expect(r.total).toBeCloseTo(base.total + GT * 4, 2);
  });
  it('a blank bound is unbounded in that direction', () => {
    const noMax = priced(aarhus, { ops_per_gt_charge: 20, ops_per_gt_min: GT });
    expect(perGt(noMax)!.amount).toBe(GT * 20);
    const noMin = priced(aarhus, { ops_per_gt_charge: 0.5, ops_per_gt_max: GT * 4 });
    expect(perGt(noMin)!.amount).toBe(Math.round(GT * 0.5 * 100) / 100);
    const neither = priced(aarhus, { ops_per_gt_charge: 7 });
    expect(perGt(neither)!.amount).toBe(GT * 7);
  });
  it('the line rides the ops_speculative block: user-specified class, its own basis, composed into the block amount', () => {
    const r = priced(aarhus, { ops_per_gt_charge: 0.5, ops_per_gt_min: GT * 2, ops_demand_charge: 1000 });
    const lines = r.ops_speculative!.lines;
    expect(lines.map(l => l.id)).toEqual(['ops_spec_demand', 'ops_spec_per_gt']);
    expect(perGt(r)!.label).toContain('(user-specified)');
    expect(perGt(r)!.basis).toContain('user-specified, not tariff-derived');
    expect(r.ops_speculative!.amount).toBeCloseTo(lines.reduce((s, l) => s + l.amount, 0), 2);
    expect(r.total).toBeCloseTo(base.total + r.ops_speculative!.amount, 2);
  });
  it('the existing Aarhus OPS inputs are unmoved by the new machinery', () => {
    const e = priced(aarhus, { ops_kwh_consumption: 1000, ops_electricity_price: 2, ops_demand_charge: 500, ops_connection_charge: 300 });
    expect(e.ops_speculative!.lines.map(l => l.amount)).toEqual([2000, 500, 300]);
  });
  it('zero drift: blank bounds leave every Aarhus figure unchanged, and ports without the bounds flag ignore the bound fields', () => {
    const gBase = priced(gothenburg, { ops_per_gt_charge: 0.1 });
    const gBounded = priced(gothenburg, { ops_per_gt_charge: 0.1, ops_per_gt_min: GT * 100, ops_per_gt_max: 1 });
    expect(gBounded.total).toBe(gBase.total);
    expect(perGt(gBounded)!.amount).toBe(perGt(gBase)!.amount);
    expect(perGt(gBounded)!.basis).toBe(perGt(gBase)!.basis);
  });
});
