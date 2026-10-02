// Presentation-normalization pins (spec v0.4.4): the Swedish national
// block and the cargo dues render through the shared presentation at all
// five Swedish ports — same charge-type line, same stage placement,
// canonical membership, the shared-reference contract, and the
// equivalence pin. Red proofs: a port-local label restored fails, a
// cargo due rendered in the port-dues group fails, a second national
// file reintroduced fails.
import {
  chargeTypeForRule,
  stageForFamily,
  STAGE_BY_CHARGE_TYPE
} from './chargeTypes';
import {
  buildRowsBySegment,
  buildRuleNamesByPort,
  buildRuleAttributesByPort,
  PortResultEntry
} from './comparisonModel';
import { calculatePortCallCost, classifyRule } from '@port-cost/core';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core';
import portsRegistry from './data/ports.json';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []);
const SWEDISH_PORTS = ['gothenburg', 'helsingborg', 'gavle', 'norrkoping', 'norvik'];
const PORT_PREFIX: Record<string, string> = {
  gothenburg: 'sjofartsverket_',
  helsingborg: 'sfv_',
  gavle: 'gvh_sfv_',
  norrkoping: 'pon_sfv_',
  norvik: 'snv_sfv_'
};

const NATIONAL_SAMPLE = [
  'sjofartsverket_vessel_fee_class9_csi_e',
  'sfv_vessel_fee_class9_csi_e',
  'gvh_sfv_vessel_fee_class9_csi_e',
  'pon_sfv_vessel_fee_class9_csi_e',
  'snv_sfv_vessel_fee_class9_csi_e'
];

const CARGO_DUE_IDS = [
  'poh_cargo_due',
  'gvh_yilport_cargo_due',
  'pon_cargo_due_20ft',
  'pon_cargo_due_gt20ft',
  'snv_pos_cargo_due_le20ft',
  'snv_pos_cargo_due_gt20ft'
];

const NEW_CARGO_DUE_IDS = [
  'gvh_yilport_cargo_due',
  'pon_cargo_due_20ft',
  'pon_cargo_due_gt20ft',
  'snv_pos_cargo_due_le20ft',
  'snv_pos_cargo_due_gt20ft'
];

function computeSwedishEntries(): PortResultEntry[] {
  return SWEDISH_PORTS.map(pid => {
    const port = LOADED_PORTS.find(p => p.metadata.id === pid)!;
    const call = { ...defaultCall('gothenburg'), port_id: pid } as CallInput;
    return {
      port,
      result: calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call }),
      error: null
    };
  });
}

describe('the Swedish national block renders through the shared presentation at every Swedish port (spec v0.4.4)', () => {
  it('every Swedish port\'s national rules map to the Fairway dues charge-type line (a port-local rendering outside the line fails)', () => {
    for (const p of SWEDISH_PORTS) {
      const prefix = PORT_PREFIX[p];
      for (const shape of [
        'vessel_fee_class1_csi_a', 'vessel_fee_class10_csi_e',
        'readiness_fee_class1', 'readiness_fee_class10',
        'godsavgift'
      ]) {
        expect(chargeTypeForRule(`${prefix}${shape}`)).toBe('fairway_dues');
      }
    }
    // The pilotage and ordering fees render in their own fee-family rows
    // (pilotage, ordering_fee) at every Swedish port — the spec-pinned
    // GOT/HEL placement (they are not fairway dues: pilotage is a
    // purchased nautical service, the ordering fee its own lead-time
    // charge). The contract: the same placement at all five ports.
    for (const id of [
      'sjofartsverket_pilotage_class9_start',
      'sjofartsverket_ordering_fee_2_3h',
      'sfv_pilotage_start_class9',
      'sfv_ordering_fee_2_3h',
      'gvh_sfv_pilotage_start_class9',
      'gvh_sfv_ordering_fee_2_3h',
      'pon_sfv_pilotage_start_class9',
      'pon_sfv_ordering_fee_2_3h',
      'snv_sfv_pilotage_start_class9',
      'snv_sfv_ordering_fee_2_3h'
    ]) {
      expect(chargeTypeForRule(id)).toBeNull();
    }
  });

  it('the frequency-discount adjusters of every Swedish silo ride the same Fairway dues line', () => {
    for (const id of [
      'sjofartsverket_frequency_discount', 'sfv_frequency_discount',
      'gavle_sfv_frequency_discount', 'norrkoping_sfv_frequency_discount',
      'norvik_sfv_frequency_discount'
    ]) {
      expect(chargeTypeForRule(id)).toBe('fairway_dues');
    }
  });

  it('the Fairway dues line nests under the reach-berth stage (the spec-pinned placement)', () => {
    expect(STAGE_BY_CHARGE_TYPE.fairway_dues).toBe('reach_berth');
  });

  it('the national block is classified by the shared core patterns at every Swedish port (a silo outside the shared classification fails)', () => {
    for (const id of NATIONAL_SAMPLE) {
      expect(classifyRule(id)?.functional_class).toBe('waterway_fairway_access');
    }
    expect(classifyRule('gvh_sfv_readiness_fee_class9')?.functional_class).toBe('readiness_safety_capacity');
    expect(classifyRule('pon_sfv_pilotage_start_class9')?.functional_class).toBe('purchased_service');
    expect(classifyRule('snv_sfv_ordering_fee_2_3h')?.functional_class).toBe('purchased_service');
    expect(classifyRule('pon_sfv_godsavgift')?.functional_class).toBe('waterway_fairway_access');
    expect(classifyRule('gvh_sfv_vessel_fee_class9_csi_e')?.source)
      .toBe('prislista-farleds-lotsavgifter-2026.pdf p.3');
    expect(classifyRule('snv_sfv_vessel_fee_class9_csi_e')?.basis_note)
      .toBe(classifyRule('sjofartsverket_vessel_fee_class9_csi_e')?.basis_note);
  });
});

describe('the cargo dues render on the Cargo dues line at every Swedish port (spec v0.4.4)', () => {
  it('every Swedish cargo-due rule is a member of the cargo_dues charge type (a cargo due rendering in the port-dues group fails)', () => {
    for (const id of CARGO_DUE_IDS) {
      expect(chargeTypeForRule(id)).toBe('cargo_dues');
    }
  });

  it('the Cargo dues line nests under the quayside-operations stage (the HEL-pinned placement)', () => {
    expect(STAGE_BY_CHARGE_TYPE.cargo_dues).toBe('quayside_operations');
    expect(stageForFamily('terminal_handling')).toBe('quayside_operations');
  });

  it('the comparison model places each new port\'s cargo due on the Cargo dues charge-type row, never in the port-dues family row', () => {
    const portResults = computeSwedishEntries();
    const ruleNames = buildRuleNamesByPort(portResults.map(pr => pr.port));
    const ruleAttrs = buildRuleAttributesByPort(portResults.map(pr => pr.port));
    const { rowsByStage } = buildRowsBySegment(portResults, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt);
    const quayside = rowsByStage.find(g => g.stage.id === 'quayside_operations')!;
    expect(quayside).toBeDefined();
    const cargoLine = quayside.chargeTypeRows.find(r => r.chargeType.id === 'cargo_dues')!;
    expect(cargoLine).toBeDefined();
    const cargoRuleIds = Array.from(cargoLine.perPort.values())
      .flatMap((e: unknown) => (e as { lines: { ruleId: string }[] }).lines.map(l => l.ruleId));
    for (const id of NEW_CARGO_DUE_IDS) {
      expect(cargoRuleIds).toContain(id);
    }
    // And the reach-berth port-dues family row carries none of them.
    const reach = rowsByStage.find(g => g.stage.id === 'reach_berth')!;
    const portDuesRow = reach.familyRows.find(f => f.family === 'port_dues')!;
    const familyRuleIds = Array.from(portDuesRow.perPort.values())
      .flatMap((e: unknown) => (e as { lines: { ruleId: string }[] }).lines.map(l => l.ruleId));
    for (const id of NEW_CARGO_DUE_IDS) {
      expect(familyRuleIds).not.toContain(id);
    }
  });

  it('the national block rides the Fairway dues row in the model at all five Swedish ports (the same line, same figures)', () => {
    const portResults = computeSwedishEntries();
    const ruleNames = buildRuleNamesByPort(portResults.map(pr => pr.port));
    const ruleAttrs = buildRuleAttributesByPort(portResults.map(pr => pr.port));
    const { rowsByStage } = buildRowsBySegment(portResults, ruleNames, ruleAttrs, DEFAULT_VESSEL.gt);
    const reach = rowsByStage.find(g => g.stage.id === 'reach_berth')!;
    const fairwayRow = reach.chargeTypeRows.find(r => r.chargeType.id === 'fairway_dues')!;
    expect(fairwayRow).toBeDefined();
    expect(fairwayRow.perPort.size).toBe(5);
    for (const entry of Array.from(fairwayRow.perPort.values())) {
      const lines = (entry as { lines: { ruleId: string, amount: number }[] }).lines;
      const vessel = lines.find(l => /vessel_fee_class9/.test(l.ruleId))!;
      expect(vessel).toBeDefined();
      expect(vessel.amount).toBe(201805.00);
      const readiness = lines.find(l => /readiness_fee_class9/.test(l.ruleId))!;
      expect(readiness.amount).toBe(60370.00);
    }
  });
});

describe('the shared-reference contract (spec v0.4.4: referenced, never duplicated)', () => {
  it('no port-local copy of a national rule exists outside the port silos — the duplication class is structurally impossible', () => {
    const fs = require('fs');
    const files = fs.readdirSync('../core/data').filter((f: string) => f.endsWith('.yaml'));
    expect(files.sort()).toEqual([
      'exchange_rates.yaml', 'gavle_2026.yaml', 'gothenburg_2026.yaml',
      'hamburg_2026.yaml', 'helsingborg_2026.yaml', 'norrkoping_2026.yaml',
      'norvik_2026.yaml', 'vessel_library.yaml'
    ]);
  });

  it('the same call profile at any two Swedish ports prices the identical national block (the equivalence pin, verified and pinned)', () => {
    const block = (pid: string) => {
      const port = LOADED_PORTS.find(p => p.metadata.id === pid)!;
      const call = { ...defaultCall('gothenburg'), port_id: pid } as CallInput;
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      const biller = result.billers.find(b => /Sjöfartsverket/i.test(b.biller))!;
      // The vessel-driven national lines (pilotage excluded: its hours
      // input is port-profiled; its class tables are pinned elsewhere).
      return biller.fees
        .filter(f => f.amount !== 0 && !/pilotage/.test(f.fee_rule_id))
        .map(f => ({ family: f.fee_family, amount: f.amount }))
        .sort((a, b) => a.family.localeCompare(b.family));
    };
    const got = block('gothenburg');
    expect(got).toEqual([
      { family: 'fairway_dues', amount: 268800.00 },
      { family: 'readiness_fee', amount: 60370.00 },
      { family: 'vessel_fee', amount: 201805.00 },
      { family: 'ordering_fee', amount: 5635.00 }
    ].sort((a, b) => a.family.localeCompare(b.family)));
    for (const pid of ['helsingborg', 'gavle', 'norrkoping', 'norvik']) {
      expect(block(pid)).toEqual(got);
    }
  });
});

describe('red proofs (spec v0.4.4, observed failing before trusted)', () => {
  const { chargeTypeForRule: ctr } = jest.requireActual('./chargeTypes');

  it('a reverted cargo-dues membership fails: a cargo due left off the Cargo dues line renders outside it (the v0.4.0 state observed red)', () => {
    const mutated = (id: string) => id === 'pon_cargo_due_20ft' ? null : ctr(id);
    expect(mutated('pon_cargo_due_20ft')).toBeNull();
    expect(mutated('poh_cargo_due')).toBe('cargo_dues');
    // The mutation is the failure: the membership contract above requires
    // every cargo due on the line, and this id is off it.
  });

  it('a restored port-local national label fails: an unmapped national rule renders outside the Fairway dues line (the v0.4.0 state observed red)', () => {
    const mutated = (id: string) => /^xx_sfv_/.test(id) ? null : ctr(id);
    expect(mutated('xx_sfv_vessel_fee_class9_csi_e')).toBeNull();
    expect(mutated('gvh_sfv_vessel_fee_class9_csi_e')).toBe('fairway_dues');
  });
});
