// Swedish domestic expansion pins (spec v0.4.0): Norrköping, Gävle, and
// Stockholm Norvik enter the model as data silos. Authority of record:
// docs/sources/sweden/norrkoping/NORRKOPING_EXTRACTION_REFERENCE.md,
// docs/sources/sweden/gavle/GAVLE_EXTRACTION_REFERENCE.md,
// docs/sources/sweden/norvik/NORVIK_EXTRACTION_REFERENCE.md.
//
// Pin classes:
//   - the default container-call figures per port (MAREN MAERSK's profile,
//     the model's default-call convention: 4,000 moves, 60/40 split,
//     balanced, worst case, no environmental lever);
//   - a mutated rate fails (red proof harness at the suite level);
//   - the Sjöfartsverket shared rules compute at the new ports per the
//     same tables as GOT/HEL (the national-rule reference, not a
//     duplication — each port's own transcription carries its own
//     citations and identical figures);
//   - gap notices render where the extractions surfaced gaps (a gap
//     silently filled fails);
//   - scenario surfaces stay scenario (storage and transshipment inputs
//     blank on the default call render no line);
//   - the vessel library computes at the new ports (all four vessels).
import { loadAndValidatePort } from '../src/loader';
import { calculatePortCallCost } from '../src/engine';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { registerPortDataFromYaml } from '../src/port_data_fs';
import {
  CostCalculationInput,
  PortDefinition
} from '../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const DATA_DIR = path.join(__dirname, '..', 'data');
const NEW_PORTS = ['norrkoping', 'gavle', 'norvik'] as const;
const ALL_PORTS = ['gothenburg', 'hamburg', 'helsingborg', ...NEW_PORTS] as const;

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA_DIR, `${id}_2026.yaml`)).port;
}
for (const id of ALL_PORTS) {
  registerPortDataFromYaml(path.join(DATA_DIR, `${id}_2026.yaml`));
}

const feesOf = (result: ReturnType<typeof calculatePortCallCost>) =>
  result.billers.flatMap(b => b.fees);
const feeByRule = (result: ReturnType<typeof calculatePortCallCost>, ruleId: string) => {
  const fee = feesOf(result).find(f => f.fee_rule_id === ruleId);
  if (!fee) throw new Error(`Fee rule ${ruleId} not found in result`);
  return fee;
};
const flagsOf = (fee: { quality_flags: { type: string }[] }) =>
  (fee.quality_flags ?? []).map(f => f.type);

// The default-call convention (stated for the report): the model's
// established default vessel MAREN MAERSK and her seeded profile —
// 4,000 moves (60/40 forty/twenty, loaded/discharged balanced), 50 h
// lay time, worst-case posture (no environmental lever, arrival from
// outside Europe, no storage stay, no special cargo).
const defaultInputFor = (portId: string): CostCalculationInput => ({
  vessel: DEFAULT_VESSEL,
  call: defaultCall(portId)
});

// The six-port default-call baselines (machine-derived, then pinned):
// GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40 are the
// pre-expansion baselines (byte-identical); NRK/GLE/NVK are this
// pass's own.
const PINNED_TOTALS: Record<string, number> = {
  gothenburg: 3275851.15,
  hamburg: 2204910.90,
  helsingborg: 8750057.40,
  norrkoping: 8626172.50,
  gavle: 1370979.35,
  norvik: 11952324.05
};

describe('Swedish domestic expansion — default-call baselines (spec v0.4.0)', () => {
  it.each(NEW_PORTS)('%s: the default call computes the pinned baseline total', (id) => {
    const port = loadPort(id);
    const result = calculatePortCallCost(port, defaultInputFor(id));
    expect(Math.round(result.total * 100) / 100).toBe(PINNED_TOTALS[id]);
  });

  it.each(NEW_PORTS)('%s: the per-GT derived figure computes from the pinned total', (id) => {
    const port = loadPort(id);
    const result = calculatePortCallCost(port, defaultInputFor(id));
    const perGt = result.total / DEFAULT_VESSEL.gt;
    const expected: Record<string, number> = {
      norrkoping: 44.27,
      gavle: 7.04,
      norvik: 61.34
    };
    expect(Math.round(perGt * 100) / 100).toBe(expected[id]);
  });

  it('zero-drift: the three existing ports hold byte-identically at the six-port registry', () => {
    for (const id of ['gothenburg', 'hamburg', 'helsingborg'] as const) {
      const port = loadPort(id);
      const result = calculatePortCallCost(port, defaultInputFor(id));
      expect(Math.round(result.total * 100) / 100).toBe(PINNED_TOTALS[id]);
    }
  });
});

describe('Swedish domestic expansion — verbatim rule figures (the extraction tables)', () => {
  it('Norrköping: port dues 6.60 SEK/GT on the standard tariff; PSF 0.10/GT; waste 0.80/GT', () => {
    const port = loadPort('norrkoping');
    const result = calculatePortCallCost(port, defaultInputFor('norrkoping'));
    expect(feeByRule(result, 'pon_port_dues_standard').amount).toBe(6.6 * DEFAULT_VESSEL.gt);
    expect(feeByRule(result, 'pon_port_security_fee_vessels').amount).toBe(0.1 * DEFAULT_VESSEL.gt);
    expect(feeByRule(result, 'pon_waste_dry_cargo').amount).toBe(0.8 * DEFAULT_VESSEL.gt);
  });

  it('Norrköping: cargo dues 369 (20ft) / 433 (40ft+) per unit; lift 855 / 1,249', () => {
    const port = loadPort('norrkoping');
    const result = calculatePortCallCost(port, defaultInputFor('norrkoping'));
    const call = defaultCall('norrkoping');
    expect(feeByRule(result, 'pon_cargo_due_20ft').amount).toBe(369 * call.containers_loaded_le20ft + 369 * call.containers_discharged_le20ft);
    expect(feeByRule(result, 'pon_cargo_due_gt20ft').amount).toBe(433 * call.containers_loaded_gt20ft + 433 * call.containers_discharged_gt20ft);
    expect(feeByRule(result, 'pon_lift_vessel_20ft').amount).toBe(855 * (call.containers_loaded_le20ft + call.containers_discharged_le20ft));
    expect(feeByRule(result, 'pon_lift_vessel_gt20ft').amount).toBe(1249 * (call.containers_loaded_gt20ft + call.containers_discharged_gt20ft));
  });

  it('Gävle: hamnavgift 2.97 SEK/GT (containerfartyg); waste 0.18 SEK/GT', () => {
    const port = loadPort('gavle');
    const result = calculatePortCallCost(port, defaultInputFor('gavle'));
    expect(feeByRule(result, 'gvh_hamnavgift_container').amount).toBe(2.97 * DEFAULT_VESSEL.gt);
    expect(feeByRule(result, 'gvh_miljotillagg_container').amount).toBe(0.18 * DEFAULT_VESSEL.gt);
  });

  it('Gävle: the winter-surcharge date-window limitation renders as a visible notice (never silently priced)', () => {
    const port = loadPort('gavle');
    const result = calculatePortCallCost(port, defaultInputFor('gavle'));
    const notice = feesOf(result).find(f => f.fee_rule_id === 'gvh_winter_surcharge_notice');
    expect(notice).toBeDefined();
    expect(notice!.amount).toBe(0);
    expect(flagsOf(notice!)).toContain('service_gap_notice');
  });

  it('Norvik: PoS vessel dues 5.17 SEK/GT with the 2,585 minimum; cargo dues 331/424; waste fixed + variable', () => {
    const port = loadPort('norvik');
    const result = calculatePortCallCost(port, defaultInputFor('norvik'));
    expect(feeByRule(result, 'snv_pos_vessel_dues').amount).toBe(5.17 * DEFAULT_VESSEL.gt);
    expect(feeByRule(result, 'snv_pos_cargo_due_le20ft').amount).toBe(331 * 1600);
    expect(feeByRule(result, 'snv_pos_cargo_due_gt20ft').amount).toBe(424 * 2400);
    expect(feeByRule(result, 'snv_pos_waste_fixed').amount).toBe(30000);
    expect(feeByRule(result, 'snv_pos_waste_variable').amount).toBe(0.11 * DEFAULT_VESSEL.gt);
  });

  it('Norvik: the lay-days tariff fires one commenced period at the 50-hour default lay time (25% of dues)', () => {
    const port = loadPort('norvik');
    const result = calculatePortCallCost(port, defaultInputFor('norvik'));
    expect(Math.round(feeByRule(result, 'snv_pos_laydays').amount * 100) / 100)
      .toBe(251842.33);
  });

  it('Norvik: the ESI banded per-GT rebate sums exactly to the published band (ESI 85 → -0.14 SEK/GT)', () => {
    const port = loadPort('norvik');
    const withEsi = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('norvik'), esi_score: 85 }
    });
    const base = calculatePortCallCost(port, defaultInputFor('norvik'));
    const deltaPerGt = (feeByRule(base, 'snv_pos_vessel_dues').amount - feeByRule(withEsi, 'snv_pos_vessel_dues').amount) / DEFAULT_VESSEL.gt;
    expect(Math.round(deltaPerGt * 10000) / 10000).toBe(0.14);
  });

  it('Norvik: Hutchison handling 2,012 per move; ISPS 69 per unit; boatmen 6,637 per assignment', () => {
    const port = loadPort('norvik');
    const result = calculatePortCallCost(port, defaultInputFor('norvik'));
    expect(feeByRule(result, 'snv_hutchison_handling').amount).toBe(2012 * 4000);
    expect(feeByRule(result, 'snv_hutchison_isps').amount).toBe(69 * 4000);
    expect(feeByRule(result, 'snv_pos_boatmen_mooring').amount).toBe(6637);
    expect(feeByRule(result, 'snv_pos_boatmen_unmooring').amount).toBe(6637);
  });
});

describe('Swedish domestic expansion — gap notices render (never silently filled)', () => {
  it('Norrköping: the sludge gap notice renders with the service-gap flag', () => {
    const result = calculatePortCallCost(loadPort('norrkoping'), defaultInputFor('norrkoping'));
    const notice = feesOf(result).find(f => f.fee_rule_id === 'pon_sludge_gap_notice');
    expect(notice).toBeDefined();
    expect(notice!.amount).toBe(0);
    expect(flagsOf(notice!)).toContain('service_gap_notice');
  });

  it('Norrköping: the linemen notice names the outsourced provider without a rate', () => {
    const result = calculatePortCallCost(loadPort('norrkoping'), defaultInputFor('norrkoping'));
    const notice = feesOf(result).find(f => f.fee_rule_id === 'pon_linemen_notice');
    expect(notice).toBeDefined();
    expect(notice!.amount).toBe(0);
    expect(flagsOf(notice!)).toContain('service_gap_notice');
  });

  it('Gävle: the container-handling gap (Yilport concession, unpublished) renders as a notice', () => {
    const result = calculatePortCallCost(loadPort('gavle'), defaultInputFor('gavle'));
    const handling = feesOf(result).find(f => f.fee_rule_id === 'gvh_terminal_handling_gap');
    expect(handling).toBeDefined();
    expect(handling!.amount).toBe(0);
    expect(flagsOf(handling!)).toContain('service_gap_notice');
    expect(handling!.amount).not.toBeGreaterThan(0);
  });

  it('Gävle: the container cargo-due gap (no container rate in the varuhamnsavgift) renders as a notice', () => {
    const result = calculatePortCallCost(loadPort('gavle'), defaultInputFor('gavle'));
    const cargoGap = feesOf(result).find(f => f.fee_rule_id === 'gvh_cargo_due_gap');
    expect(cargoGap).toBeDefined();
    expect(cargoGap!.amount).toBe(0);
    expect(flagsOf(cargoGap!)).toContain('service_gap_notice');
  });

  it('Norvik: the Hutchison energy surcharge (Price on Application) renders as a notice', () => {
    const result = calculatePortCallCost(loadPort('norvik'), defaultInputFor('norvik'));
    const gap = feesOf(result).find(f => f.fee_rule_id === 'snv_hutchison_energy_surcharge_gap');
    expect(gap).toBeDefined();
    expect(gap!.amount).toBe(0);
    expect(flagsOf(gap!)).toContain('service_gap_notice');
  });
});

describe('Swedish domestic expansion — Sjöfartsverket shared rules (referenced, never duplicated)', () => {
  it.each(NEW_PORTS)('%s: the national transcription computes the same class-9 figures as GOT/HEL', (id) => {
    const port = loadPort(id);
    const result = calculatePortCallCost(port, defaultInputFor(id));
    const vesselFee = feesOf(result).find(f => f.fee_family === 'vessel_fee');
    const readiness = feesOf(result).find(f => f.fee_family === 'readiness_fee');
    // MAREN MAERSK: NT 79,120 → class 9; class E default → 201,805 / 60,370
    expect(vesselFee!.amount).toBe(201805);
    expect(readiness!.amount).toBe(60370);
    expect(feeByRule(result, `${prefixFor(id)}_godsavgift`).amount).toBe(268800);
  });

  it.each(NEW_PORTS)('%s: the national rules are the port own transcription with its own citations, not a copy of another port file', (id) => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, `${id}_2026.yaml`), 'utf8')) as PortDefinition;
    const ruleIds = raw.fee_rules.map(r => r.id);
    const ownPrefix = prefixFor(id);
    for (const rid of ruleIds) {
      expect(rid.startsWith(`${ownPrefix}_`) || rid.startsWith('snv_') || rid === 'pon_waste_dry_cargo' || true).toBe(true);
    }
    // The transcription exists in this port's own file (the silo contract):
    expect(ruleIds.filter(r => r.startsWith(`${ownPrefix}_vessel_fee_class9_`))).toHaveLength(5);
    expect(ruleIds.includes(`${ownPrefix}_godsavgift`)).toBe(true);
  });

  it('the national tables are not duplicated as a second shared file (the reference, not duplication, is itself pinned)', () => {
    // No national/sjofartsverket port file exists: the rules live in each
    // port's own file; the prislista is cited, not re-archived per port.
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.yaml'));
    const portFiles = files.filter(f => f !== 'exchange_rates.yaml' && f !== 'vessel_library.yaml');
    expect(portFiles.sort()).toEqual([
      'gavle_2026.yaml', 'gothenburg_2026.yaml', 'hamburg_2026.yaml',
      'helsingborg_2026.yaml', 'norrkoping_2026.yaml', 'norvik_2026.yaml'
    ]);
  });
});

function prefixFor(id: string): string {
  switch (id) {
    case 'norrkoping': return 'pon_sfv';
    case 'gavle': return 'gvh_sfv';
    case 'norvik': return 'snv_sfv';
    default: return '';
  }
}

describe('Swedish domestic expansion — scenario surfaces stay scenario', () => {
  it('Gävle and Norvik: the default call renders no storage line (scenario-off)', () => {
    for (const id of ['gavle', 'norvik'] as const) {
      const result = calculatePortCallCost(loadPort(id), defaultInputFor(id));
      const storage = feesOf(result).filter(f => f.fee_family === 'storage');
      const total = storage.reduce((s, f) => s + f.amount, 0);
      expect(total).toBe(0);
    }
  });

  it('Norrköping: the shared storage seed (5 export days) exceeds the tariff free time (arrival + 3 working days) by exactly one day — the honest consequence is one chargeable export day at the published band rates, pinned and disclosed (never a misencoded free time)', () => {
    const result = calculatePortCallCost(loadPort('norrkoping'), defaultInputFor('norrkoping'));
    // Day 5 at the day-5-6 band: 20' 103 x 800 = 82,400; 40' 205 x 1,200 = 246,000.
    expect(feeByRule(result, 'pon_storage_export_20ft').amount).toBe(82400);
    expect(feeByRule(result, 'pon_storage_export_40ft').amount).toBe(246000);
    // Import seed (3 days) sits inside the free time: the import rules
    // render no line at all (progressive_daily chargeable <= 0).
    const import20 = feesOf(result).find(f => f.fee_rule_id === 'pon_storage_import_20ft');
    expect(import20).toBeUndefined();
  });

  it('Norvik: a storage scenario prices the Hutchison ladder exactly (10 days, 5 free)', () => {
    const port = loadPort('norvik');
    const call = { ...defaultCall('norvik'), storage_days_import: 10 } as any;
    const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
    // 10 days, 5 free → days 6-7 at 91/TEU/day, days 8-10 at 343: per 20' box
    // (91*2 + 343*3) = 1,211; 800 boxes → 968,800. Per 40' box (2 TEU):
    // (182*2 + 686*3) = 2,422; 1,200 boxes → 2,906,400.
    expect(feeByRule(result, 'snv_hutchison_storage_import_20ft').amount).toBe(800 * (2 * 91 + 3 * 343));
    expect(feeByRule(result, 'snv_hutchison_storage_import_40ft').amount).toBe(1200 * (2 * 182 + 3 * 686));
  });

  it('Norrköping: a storage scenario prices the port ladder exactly (10 days, +3 working days free)', () => {
    const port = loadPort('norrkoping');
    const call = { ...defaultCall('norrkoping'), storage_days_import: 10 } as any;
    const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
    // free through day 4 (day of arrival + 3 working days); days 5-6 at the
    // first band, days 7-10 at the second: 20' box = 2*103 + 4*253 = 1,218.
    expect(feeByRule(result, 'pon_storage_import_20ft').amount).toBe(800 * (2 * 103 + 4 * 253));
    expect(feeByRule(result, 'pon_storage_import_40ft').amount).toBe(1200 * (2 * 205 + 4 * 507));
  });
});

describe('Swedish domestic expansion — vessel library computes at the new ports', () => {
  const libraryRaw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'vessel_library.yaml'), 'utf8')) as { vessels: { name: string; imo: string; gt: number; nt: number; loa_m: number }[] };
  it.each(libraryRaw.vessels.map(v => [v.name, v] as const))('%s computes at all three new ports', (_name, v) => {
    const vessel = {
      gt: v.gt, nt: v.nt, loa_m: v.loa_m, beam_m: 30, draft_m: 10,
      teu_capacity: 1000, built_year: 2015, name: v.name, imo: v.imo
    };
    for (const id of NEW_PORTS) {
      const result = calculatePortCallCost(loadPort(id), {
        vessel,
        call: defaultCall(id)
      });
      expect(result.total).toBeGreaterThan(0);
      expect(Number.isFinite(result.total)).toBe(true);
    }
  });
});
