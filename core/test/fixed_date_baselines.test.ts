/**
 * Fixed-date test baselines and the Gavle winter window (spec v0.11.3;
 * fixed-date baselines and Gavle winter window disclosure, user ruling
 * 2026-10-22).
 *
 * The production defaultCall() stamps the call date from the clock; the
 * Gavle winter surcharge (the istillaegg, 1 December to 30 April, +100
 * percent on the vessel-side hamnavgift) reads that date, so every pinned
 * baseline would turn red from 1 December. The suites anchor calendar today
 * at FIXED_TEST_DATE (test/fixed_clock.ts); these pins hold the anchor, the
 * window boundary in both engine states, and the winter-state figures of
 * record at an in-window date.
 *
 * Red proofs of record (build copy): the anchor constant moved into the
 * window turns the anchor and boundary pins red; the winter rule's rate
 * mutated turns the winter-figure pins red.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { CallInput } from '../src/types';
import { FIXED_TEST_DATE } from './fixed_clock';
import * as path from 'path';

const DATA = path.join(__dirname, '..', 'data');
const load = (file: string) => loadAndValidatePort(path.join(DATA, file)).port;
const gavle = load('gavle_2026.yaml');
const norvik = load('norvik_2026.yaml');
const priced = (port: typeof gavle, date: string) =>
  calculatePortCallCost(port, {
    vessel: DEFAULT_VESSEL,
    call: { ...(defaultCall(port.metadata.id) as unknown as CallInput), date } as CallInput
  });
const fees = (r: ReturnType<typeof priced>) => new Map(r.billers.flatMap(b => b.fees).map(f => [f.fee_rule_id, f.amount]));
const GT = DEFAULT_VESSEL.gt;
const WINTER_DATE = '2026-12-15'; // inside the winter window and the 2026 tariff validity

describe('fixed-date test baselines - the anchor (spec v0.11.3)', () => {
  it('the baseline call\'s date is the fixed date: 2026-06-15, inside the tariff validity and outside every date window', () => {
    expect(FIXED_TEST_DATE).toBe('2026-06-15');
    expect((defaultCall('gavle') as unknown as CallInput).date).toBe(FIXED_TEST_DATE);
    expect(new Date().toISOString().split('T')[0]).toBe(FIXED_TEST_DATE);
    // outside the Gavle window (1 December to 30 April), inside the 2026 validity
    const month = Number(FIXED_TEST_DATE.slice(5, 7));
    expect(month).toBeGreaterThanOrEqual(5);
    expect(month).toBeLessThanOrEqual(11);
    expect(FIXED_TEST_DATE.startsWith('2026-')).toBe(true);
  });
});

describe('fixed-date test baselines - the window boundary in both engine states (spec v0.11.3)', () => {
  const winterFires = (date: string) => {
    const f = fees(priced(gavle, date));
    return { summer: f.has('gvh_hamnavgift_container'), winter: f.has('gvh_hamnavgift_container_winter') };
  };
  it('at the fixed date the base rule fires and the winter rule does not', () => {
    expect(winterFires(FIXED_TEST_DATE)).toEqual({ summer: true, winter: false });
  });
  it('at an in-window date the winter rule fires and the base rule does not', () => {
    expect(winterFires(WINTER_DATE)).toEqual({ summer: false, winter: true });
  });
  it('the boundaries are inclusive: 30 April and 1 December are in the window; 1 May and 30 November are out', () => {
    expect(winterFires('2026-04-30').winter).toBe(true);
    expect(winterFires('2026-05-01').winter).toBe(false);
    expect(winterFires('2026-11-30').winter).toBe(false);
    expect(winterFires('2026-12-01').winter).toBe(true);
    expect(winterFires('2026-12-31').winter).toBe(true);
    expect(winterFires('2026-01-01').winter).toBe(true);
  });
});

describe('Gavle winter-state figures of record at an in-window date (spec v0.11.3)', () => {
  const summer = priced(gavle, FIXED_TEST_DATE);
  const winter = priced(gavle, WINTER_DATE);
  it('the winter hamnavgift line is 194,849 GT x 5.94 = 1,157,403.06 SEK, exactly 578,701.53 (194,849 x 2.97) above the summer line', () => {
    expect(GT).toBe(194849);
    const s = fees(summer).get('gvh_hamnavgift_container')!;
    const w = fees(winter).get('gvh_hamnavgift_container_winter')!;
    expect(w).toBe(1157403.06);
    expect(Math.round((w - s) * 100) / 100).toBe(578701.53);
    expect(s).toBe(578701.53);
  });
  it('the winter total is 10,885,680.88 SEK against the summer 10,306,979.35; per-GT 55.8673 (55.87) against 52.8973 (52.90)', () => {
    expect(summer.total).toBe(10306979.35);
    expect(winter.total).toBe(10885680.88);
    expect(Math.round((winter.total / GT) * 10000) / 10000).toBe(55.8673);
    expect(Math.round((summer.total / GT) * 10000) / 10000).toBe(52.8973);
    expect((winter.total / GT).toFixed(2)).toBe('55.87');
    expect((summer.total / GT).toFixed(2)).toBe('52.90');
  });
  it('the doubling is confined to the hamnavgift: every other line is byte-identical between the two states, and winter Gavle stays below Norvik', () => {
    const s = fees(summer);
    const w = fees(winter);
    for (const [id, amount] of s) {
      if (id === 'gvh_hamnavgift_container') continue;
      expect(w.get(id)).toBe(amount);
    }
    for (const id of w.keys()) {
      if (id === 'gvh_hamnavgift_container_winter') continue;
      expect(s.has(id)).toBe(true);
    }
    expect(winter.total).toBeLessThan(priced(norvik, WINTER_DATE).total);
    expect(winter.total).toBeLessThan(priced(norvik, FIXED_TEST_DATE).total);
  });
});
