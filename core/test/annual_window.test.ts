// Annual calendar-window condition (spec v0.4.3) — the engine vehicle and
// its first consumer, the Gävle istillägg. Audit-first:
// docs/ANNUAL_WINDOW_CONDITION_AUDIT.md is the committed seam.
//
// Pins in this suite:
// - The window predicate's exact boundaries: 30 April fires, 1 May does
//   not; 1 December fires, 30 November does not; 2 January fires (the
//   wrap case — a 1 December-30 April window crosses New Year);
//   31 October does not. The window's own endpoints are inclusive per the
//   tariff's "1 december till 30 april".
// - The Gävle winter call: the hamnavgift component doubles (2.97 x 2 =
//   5.94 SEK/GT) and every other component is byte-identical; the total is
//   pinned exact. The liggetidsavgift, waste, and electrical surfaces
//   stay outside the surcharge — a doubled non-eligible line fails red.
// - Zero-drift at the default date: the default total stays
//   10,306,979.35 SEK with an explicit non-winter date.
// - The mutated-window red proof: a window mutated to start 1 November
//   fails at a 15 November call and passes at 15 December.
// - The engine-generic contract: the condition prices a synthetic summer
//   window on a non-Gävle fixture — the machinery is not port-coupled.
// - The miljörabatt adjudication: recorded in the audit with the
//   tariff's verbatim citation; no rabatt rule is added by this pass
//   (pinned by the change set, asserted here as the pre-existing ESI
//   adjustment carrying the winter reading on the winter variant).
import * as path from 'path';
import {
  calculatePortCallCost,
  isDateWithinAnnualWindow,
  isDateOutsideAnnualWindow
} from '../src/engine';
import {
  PortDefinition,
  VesselInput,
  CallInput,
  CostCalculationInput,
  FeeRule
} from '../src/types';
import { loadAndValidatePort } from '../src/loader';
import { registerPortDataFromYaml } from '../src/port_data_fs';

const DATA_DIR = path.join(__dirname, '..', 'data');

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA_DIR, `${id}_2026.yaml`)).port;
}
for (const id of ['gavle']) {
  registerPortDataFromYaml(path.join(DATA_DIR, `${id}_2026.yaml`));
}

import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';

const defaultInputFor = (portId: string, date?: string): CostCalculationInput => ({
  vessel: DEFAULT_VESSEL,
  call: { ...defaultCall(portId), ...(date ? { date } : {}) }
});

const feesOf = (result: ReturnType<typeof calculatePortCallCost>) =>
  result.billers.flatMap(b => b.fees);
const feeByRule = (result: ReturnType<typeof calculatePortCallCost>, ruleId: string) => {
  const fee = feesOf(result).find(f => f.fee_rule_id === ruleId);
  if (!fee) throw new Error(`Fee rule ${ruleId} not found in result`);
  return fee;
};

const WINTER = { start_month: 12, start_day: 1, end_month: 4, end_day: 30 };

describe('Annual calendar-window condition (spec v0.4.3)', () => {
  describe('The predicate — exact boundaries, the wrap case', () => {
    it.each([
      ['2025-12-01', true],   // 1 December — the window's own start, inclusive
      ['2026-11-30', false],  // 30 November — the day before, outside
      ['2026-01-02', true],   // 2 January — the wrap case: the window crosses New Year
      ['2026-04-30', true],   // 30 April — the window's own end, inclusive
      ['2026-05-01', false],  // 1 May — the day after, outside
      ['2026-10-31', false],  // 31 October — never in the window
      ['2026-12-24', true],   // mid-December, the winter side
      ['2026-02-28', true],   // the January-April side of the wrap
      [undefined as any, false] // a missing date matches no window
    ])('%s: within=%s', (date, expected) => {
      expect(isDateWithinAnnualWindow(date, WINTER)).toBe(expected);
    });

    it('the complement predicate mirrors the window exactly (exactly one of the pair fires)', () => {
      for (const date of ['2025-12-01', '2026-01-02', '2026-04-30', '2026-11-30', '2026-05-01', '2026-10-31']) {
        expect(isDateWithinAnnualWindow(date, WINTER)).not.toBe(isDateOutsideAnnualWindow(date, WINTER));
      }
    });

    it('a same-year window (no wrap): 1 June - 31 August, endpoints inclusive', () => {
      const summer = { start_month: 6, start_day: 1, end_month: 8, end_day: 31 };
      expect(isDateWithinAnnualWindow('2026-06-01', summer)).toBe(true);
      expect(isDateWithinAnnualWindow('2026-08-31', summer)).toBe(true);
      expect(isDateWithinAnnualWindow('2026-05-31', summer)).toBe(false);
      expect(isDateWithinAnnualWindow('2026-09-01', summer)).toBe(false);
    });
  });

  describe('The Gävle istillägg — the first consumer', () => {
    it('a winter call doubles the hamnavgift component only: 2.97 x 2 = 5.94 SEK/GT, the total pinned exact', () => {
      const port = loadPort('gavle');
      const winterResult = calculatePortCallCost(port, defaultInputFor('gavle', '2026-01-15'));
      const summerResult = calculatePortCallCost(port, defaultInputFor('gavle', '2026-10-02'));
      // The hamnavgift line doubles; every other component is byte-identical.
      expect(feeByRule(winterResult, 'gvh_hamnavgift_container_winter').amount)
        .toBe(5.94 * DEFAULT_VESSEL.gt);
      expect(feesOf(winterResult).find(f => f.fee_rule_id === 'gvh_hamnavgift_container')).toBeUndefined();
      // The winter total is exactly the summer total plus the doubled line's
      // increment: 2.97 x GT (the base amount) added once more.
      expect(Math.round(winterResult.total * 100) / 100)
        .toBe(Math.round((summerResult.total + 2.97 * DEFAULT_VESSEL.gt) * 100) / 100);
    });

    it('RED PROOF: a doubled non-eligible line fails (the liggetidsavgift, waste, and electrical surfaces stay outside the surcharge)', () => {
      const port = loadPort('gavle');
      const winterResult = calculatePortCallCost(port, defaultInputFor('gavle', '2026-01-15'));
      const summerResult = calculatePortCallCost(port, defaultInputFor('gavle', '2026-10-02'));
      // The waste line (0.18/GT) is identical at both dates.
      expect(feeByRule(winterResult, 'gvh_miljotillagg_container').amount)
        .toBe(feeByRule(summerResult, 'gvh_miljotillagg_container').amount);
      // The liggetidsavgift prices zero idle days at both dates (outside the
      // surcharge and unseeded by the window).
      const winterLigg = feesOf(winterResult).find(f => f.fee_rule_id === 'gvh_liggetidsavgift');
      const summerLigg = feesOf(summerResult).find(f => f.fee_rule_id === 'gvh_liggetidsavgft' as any);
      // The red proof of the scope boundary: the doubled total minus the
      // doubled hamnavgift line equals the summer total — i.e. exactly one
      // component moved. A doubled waste or liggetidsavgift line would make
      // this identity fail.
      const winterSum = feesOf(winterResult)
        .filter(f => f.fee_rule_id !== 'gvh_hamnavgift_container_winter')
        .reduce((s, f) => s + f.amount, 0);
      const summerSum = feesOf(summerResult)
        .filter(f => f.fee_rule_id !== 'gvh_hamnavgift_container')
        .reduce((s, f) => s + f.amount, 0);
      expect(Math.round(winterSum * 100) / 100).toBe(Math.round(summerSum * 100) / 100);
    });

    it('zero-drift at the default date: the Gävle default total stays 10,306,979.35 SEK at a non-winter date', () => {
      const port = loadPort('gavle');
      const result = calculatePortCallCost(port, defaultInputFor('gavle', '2026-10-02'));
      expect(Math.round(result.total * 100) / 100).toBe(10306979.35);
    });

    it('the window is live, not decorative: a winter date prices the doubled call where the summer date does not', () => {
      const port = loadPort('gavle');
      const winter = calculatePortCallCost(port, defaultInputFor('gavle', '2026-02-01'));
      const summer = calculatePortCallCost(port, defaultInputFor('gavle', '2026-07-01'));
      expect(feesOf(winter).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(true);
      expect(feesOf(summer).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(false);
    });

    it('RED PROOF: the mutated window (start 1 November) fails at a 15 November call and passes at 15 December', () => {
      // A window mutated to 1 November - 30 April must fire on 15 November
      // (the real window does not) and still fire on 15 December.
      const mutated = { start_month: 11, start_day: 1, end_month: 4, end_day: 30 };
      expect(isDateWithinAnnualWindow('2026-11-15', mutated)).toBe(true);
      expect(isDateWithinAnnualWindow('2026-11-15', WINTER)).toBe(false);
      expect(isDateWithinAnnualWindow('2026-12-15', mutated)).toBe(true);
      expect(isDateWithinAnnualWindow('2026-12-15', WINTER)).toBe(true);
    });

    it('RED PROOF: the boundary semantics — 30 April fires and 1 May does not at the priced surface', () => {
      const port = loadPort('gavle');
      const apr30 = calculatePortCallCost(port, defaultInputFor('gavle', '2026-04-30'));
      const may1 = calculatePortCallCost(port, defaultInputFor('gavle', '2026-05-01'));
      expect(feesOf(apr30).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(true);
      expect(feesOf(may1).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(false);
      const dec1 = calculatePortCallCost(port, defaultInputFor('gavle', '2026-12-01'));
      const nov30 = calculatePortCallCost(port, defaultInputFor('gavle', '2026-11-30'));
      const jan2 = calculatePortCallCost(port, defaultInputFor('gavle', '2026-01-02'));
      expect(feesOf(dec1).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(true);
      expect(feesOf(nov30).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(false);
      expect(feesOf(jan2).some(f => f.fee_rule_id === 'gvh_hamnavgift_container_winter')).toBe(true);
    });

    it('the winter call carries the same ESI miljörabatt shape on the doubled fee (audit §3 adjudication, recorded; no rabatt rule added by this pass)', () => {
      const port = loadPort('gavle');
      const input = {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall('gavle'), date: '2026-01-15', esi_score: 40 } as CallInput
      };
      const result = calculatePortCallCost(port, input);
      const line = feeByRule(result, 'gvh_hamnavgift_container_winter');
      // The rabatt applies to the doubled fee: 5.94 x GT x 0.9 — the audit's
      // adjudicated reading (the fartygsavgift as charged is the doubled
      // fee), carried as the pre-existing ESI adjustment on the variant.
      expect(Math.round(line.amount * 100) / 100).toBe(Math.round(5.94 * DEFAULT_VESSEL.gt * 0.9 * 100) / 100);
    });
  });

  describe('The engine-generic contract — a synthetic rule in a non-Gävle fixture', () => {
    const syntheticPort = (): PortDefinition => {
      const rule = (id: string, rate: number, within: boolean): FeeRule => ({
        id,
        fee_family: 'port_dues',
        biller: 'Synthetic Port Authority',
        name: `Synthetic dues ${id}`,
        rate_structure: { type: 'per_unit', unit_type: 'gt', unit_rate: rate },
        applicable_conditions: within
          ? { date_within_annual_window: { start_month: 6, start_day: 1, end_month: 8, end_day: 31 } }
          : { date_outside_annual_window: { start_month: 6, start_day: 1, end_month: 8, end_day: 31 } },
        source_reference: {
          document_name: 'Synthetic Tariff',
          document_url: 'http://example.com/test',
          document_issued: '2026-01-01',
          page: 1,
          clause: '1.1',
          verified_on: '2026-01-01',
          verified_by: 'test'
        }
      });
      return {
        metadata: {
          id: 'synthetic_port',
          name: 'Synthetic Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [{ id: 'synthetic_port_authority', name: 'Synthetic Port Authority', currency: 'SEK' }],
        fee_rules: [rule('syn_summer', 10, true), rule('syn_year_round', 5, false)],
        ops_speculative: {
          electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
          demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
        }
      } as PortDefinition;
    };

    const synthInput = (date: string): CostCalculationInput => ({
      vessel: { gt: 1000 } as VesselInput,
      call: {
        port_id: 'synthetic_port',
        date,
        containers_loaded_le20ft: 0,
        containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 0,
        containers_discharged_gt20ft: 0,
        calls_this_month: 1,
        flag_state: 'EU'
      } as CallInput
    });

    it('a summer window on a synthetic non-Gävle fixture prices the gated rule in-window and its sibling outside', () => {
      const port = syntheticPort();
      const july = calculatePortCallCost(port, synthInput('2026-07-15'));
      const january = calculatePortCallCost(port, synthInput('2026-01-15'));
      expect(feeByRule(july, 'syn_summer').amount).toBe(10 * 1000);
      expect(feesOf(july).find(f => f.fee_rule_id === 'syn_year_round')).toBeUndefined();
      expect(feeByRule(january, 'syn_year_round').amount).toBe(5 * 1000);
      expect(feesOf(january).find(f => f.fee_rule_id === 'syn_summer')).toBeUndefined();
    });

    it('the machinery is calendar-generic: no port identifier enters the condition path', () => {
      // The synthetic fixture carries a summer window (June-August) — a
      // completely different window than Gävle's. A Gävle-hardcoded path (a
      // December-April literal in the engine) would fail this fixture by
      // its absence: the summer rule would never fire.
      const port = syntheticPort();
      const result = calculatePortCallCost(port, synthInput('2026-06-15'));
      expect(feesOf(result).some(f => f.fee_rule_id === 'syn_summer')).toBe(true);
    });
  });
});
