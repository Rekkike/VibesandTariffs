/**
 * Gothenburg OPS per-unit charges (spec v0.9.0, user commission 2026-10-21).
 *
 * Two user-specified amounts (SEK per non-empty 20 ft unit and per non-empty
 * 40 ft unit), applied to non-empty units per size. The basis counts default
 * to the call's handled per-size container counts and are overridable for
 * calls with empties; they are configuration, never rates. Blank amounts
 * render nothing - there is no default amount. Line structure: one line per
 * size, so each carries its own count-times-rate arithmetic.
 *
 * Red proofs of record (build copy): a forced default amount turns the blank
 * pin red; a forced all-units basis that ignores the non-empty counts turns
 * the reduced-basis pins red.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { opsComponentsForPort } from '../src/engine';
import { CallInput } from '../src/types';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const load = (file: string) => loadAndValidatePort(path.join(DATA, file)).port;
const gothenburg = load('gothenburg_2026.yaml');
const hamburg = load('hamburg_2026.yaml');
const priced = (port: typeof gothenburg, extra: Partial<CallInput> = {}) =>
  calculatePortCallCost(port, {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(port.metadata.id) as unknown as CallInput), ...extra } as CallInput
  });
const base = priced(gothenburg);
const lines = (r: ReturnType<typeof priced>) => r.ops_speculative?.lines ?? [];
// The default call's handled units per size class (loaded + discharged).
const call = defaultCall('gothenburg') as unknown as CallInput;
const H20 = (call.containers_loaded_le20ft || 0) + (call.containers_discharged_le20ft || 0);
const H40 = (call.containers_loaded_gt20ft || 0) + (call.containers_discharged_gt20ft || 0);

describe('Gothenburg OPS per-unit charges (spec v0.9.0)', () => {
  it('the descriptor is configuration only: presence, currency, unit - no rates; Gothenburg declares it, Hamburg does not', () => {
    expect(opsComponentsForPort('gothenburg').per_unit).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/unit' });
    expect(opsComponentsForPort('hamburg').per_unit).toBeUndefined();
  });

  it('blank rates render nothing: no line, no block, no flag, no movement (never a default amount)', () => {
    expect(base.ops_speculative).toBeUndefined();
    expect(base.total).toBe(7391851.15);
    expect(lines(base).some(l => l.id.startsWith('ops_spec_unit'))).toBe(false);
    // counts alone, with no amount entered, still price nothing
    const countsOnly = priced(gothenburg, { ops_nonempty_units_20ft: 500, ops_nonempty_units_40ft: 700 });
    expect(countsOnly.ops_speculative).toBeUndefined();
    expect(countsOnly.total).toBe(base.total);
  });

  it('entered rates with the default basis: rate x the call\'s handled units per size, one line per size, Grand Total moves by exactly their sum', () => {
    const r = priced(gothenburg, { ops_unit_charge_20ft: 10, ops_unit_charge_40ft: 20 });
    const byId = new Map(lines(r).map(l => [l.id, l]));
    expect(byId.get('ops_spec_unit_20ft')!.amount).toBe(10 * H20);
    expect(byId.get('ops_spec_unit_40ft')!.amount).toBe(20 * H40);
    expect(r.ops_speculative!.amount).toBe(10 * H20 + 20 * H40);
    expect(r.total).toBeCloseTo(base.total + 10 * H20 + 20 * H40, 2);
    expect(byId.get('ops_spec_unit_20ft')!.basis).toContain(`${H20.toLocaleString('en-US')} non-empty 20 ft units`);
  });

  it('entered rates with a reduced basis (the empties case): the non-empty counts replace the handled counts, per size', () => {
    const r = priced(gothenburg, {
      ops_unit_charge_20ft: 10,
      ops_unit_charge_40ft: 20,
      ops_nonempty_units_20ft: 1000,
      ops_nonempty_units_40ft: 1500
    });
    const byId = new Map(lines(r).map(l => [l.id, l]));
    expect(byId.get('ops_spec_unit_20ft')!.amount).toBe(10 * 1000);
    expect(byId.get('ops_spec_unit_40ft')!.amount).toBe(20 * 1500);
    expect(r.total).toBeCloseTo(base.total + 10 * 1000 + 20 * 1500, 2);
    expect(1000).toBeLessThan(H20);
    expect(1500).toBeLessThan(H40);
  });

  it('the sizes are independent: one rate prices only its own size', () => {
    const only20 = priced(gothenburg, { ops_unit_charge_20ft: 7 });
    expect(lines(only20).map(l => l.id)).toEqual(['ops_spec_unit_20ft']);
    const only40 = priced(gothenburg, { ops_unit_charge_40ft: 9 });
    expect(lines(only40).map(l => l.id)).toEqual(['ops_spec_unit_40ft']);
    const zeroBasis = priced(gothenburg, { ops_unit_charge_20ft: 7, ops_nonempty_units_20ft: 0 });
    expect(zeroBasis.ops_speculative).toBeUndefined();
  });

  it('the lines carry the user-specified class of the existing OPS inputs and stay outside the tariff families', () => {
    const r = priced(gothenburg, { ops_unit_charge_20ft: 10, ops_unit_charge_40ft: 20 });
    for (const l of lines(r)) {
      expect(l.label).toContain('(user-specified)');
      expect(l.basis).toContain('user-specified, not tariff-derived');
    }
    // never folded into a tariff family, never double-counted
    const tariffTotal = r.billers.reduce((s, b) => s + b.subtotal, 0);
    expect(tariffTotal).toBeCloseTo(base.total, 2);
    expect(r.total).toBeCloseTo(tariffTotal + r.ops_speculative!.amount, 2);
  });

  it('the existing OPS lines are unmoved by the pair and combine with it additively', () => {
    const existing = priced(gothenburg, { ops_kwh_consumption: 1250, ops_electricity_price: 2.5, ops_per_gt_charge: 0.1 });
    const both = priced(gothenburg, { ops_kwh_consumption: 1250, ops_electricity_price: 2.5, ops_per_gt_charge: 0.1, ops_unit_charge_20ft: 10 });
    expect(both.total).toBeCloseTo(existing.total + 10 * H20, 2);
    expect(lines(both).filter(l => !l.id.startsWith('ops_spec_unit')).map(l => l.amount))
      .toEqual(lines(existing).map(l => l.amount));
  });

  it('a port without the descriptor prices nothing from the pair (Hamburg)', () => {
    const baseH = priced(hamburg);
    const r = priced(hamburg, { ops_unit_charge_20ft: 10, ops_unit_charge_40ft: 20 } as Partial<CallInput>);
    expect(r.total).toBe(baseH.total);
    expect(r.ops_speculative).toBeUndefined();
  });
});
