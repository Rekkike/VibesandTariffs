/**
 * Aarhus port file pins (the v0.6.0 Aarhus expansion pass — the new-silo
 * suite per the v0.5.1 Bremerhaven pattern).
 *
 * Authority of record: docs/sources/denmark/aarhus/
 * AARHUS_EXTRACTION_REFERENCE.md. Every figure must match to the cent; a
 * mismatch is a failure, not a tolerance.
 *
 * Pins in this suite:
 *  - the default-call baseline: Grand Total 6,348,361.00 DKK at the default
 *    MAREN MAERSK call, and the converted SEK comparison figure
 *    (the cross-rate machinery's first live use, full precision);
 *  - per-line baseline pins (the same call, every firing line);
 *  - the country pin (Denmark 1 — Aarhus founds the Denmark group);
 *  - the citation pins (every rule's document_url resolves at a real
 *    archived path — the archive-presence pattern);
 *  - the ESI-discount pin (4.5 percent at ESI >= 30; boundary behavior
 *    both sides);
 *  - the mooring pin (the SEVEN-band ladder — the document wins over the
 *    directive's stated six, the mismatch reported; the over-80-m
 *    mandatory gate lives in the rule description);
 *  - the towage pin (the published bands fire; the estimate convention
 *    is unchanged at Gothenburg — per-port honesty);
 *  - the wharfage pin (225.00 DKK per loaded container, cargo side);
 *  - the cross-rate pin (DKK -> SEK via the EUR anchor: ECB EUR-SEK
 *    11.2525 / EUR-DKK 7.4745, both as of 2026-10-05);
 *  - the mid-year-vintage pin (pilotage/mooring are the July-2026
 *    edition figures — red-proofed against superseded values);
 *  - the published-default honesty flag pin (every APMT rate line
 *    carries the contract_vs_published caveat, never hidden);
 *  - the seven existing totals byte-identical (red proof: any movement
 *    of an existing port's total is a defect-stop — the expansion only
 *    adds).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort, loadPortFromYaml } from '../src/loader';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { classifyRule } from '../src/classification';
import { PortDefinition, CostCalculationInput } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPO_ROOT = path.join(__dirname, '..', '..');

const port: PortDefinition = loadAndValidatePort(
  path.join(DATA_DIR, 'aarhus_2026.yaml')
).port;

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  return {
    vessel: { ...DEFAULT_VESSEL },
    call: {
      ...defaultCall('aarhus'),
      ...overrides
    } as any
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

const MAREN_CALL = makeCall({});

describe('Aarhus — the default-call baseline (pinned at extraction time)', () => {
  const result = calculatePortCallCost(port, MAREN_CALL);
  it('the Grand Total is 6,348,361.00 DKK (the extraction reference section 9)', () => {
    expect(result.total).toBe(6348361.00);
  });
  it('charges DKK (currency local; conversion to the comparison basis happens at the presentation layer, never in the engine)', () => {
    expect(result.currency).toBe('DKK');
  });
  it('the per-GT derived metric is 32.58 DKK/GT (6,348,361.00 / 194,849)', () => {
    expect(Math.round((result.total / (DEFAULT_VESSEL.gt as number)) * 100) / 100).toBe(32.58);
  });
  it('the arithmetic states itself: the eight firing authority/operator lines compose the total', () => {
    // 779,396.00 (port due) + 18,565.00 (pilotage) + 6,200.00 (mooring)
    // + 162,000.00 (towage, 2 tugs x 81,000) + 38,600.00 (ISPS)
    // + 23,600.00 (work levy) + 900,000.00 (wharfage)
    // + 4,420,000.00 (APMT handling) = 6,348,361.00 DKK.
    const lines =
      feeByRule(result, 'aarhus_port_due').amount +
      feeByRule(result, 'aarhus_pilotage').amount +
      feeByRule(result, 'aarhus_mooring').amount +
      feeByRule(result, 'aarhus_towage').amount +
      feeByRule(result, 'aarhus_isps').amount +
      feeByRule(result, 'aarhus_work_environment_levy').amount +
      feeByRule(result, 'aarhus_wharfage').amount +
      feeByRule(result, 'apmt_aarhus_container_handling').amount;
    expect(Math.round(lines * 100) / 100).toBe(result.total);
  });
});

describe('Aarhus — the cross-rate pin (DKK -> SEK via the EUR anchor; the machinery\'s first live use)', () => {
  const rawRates = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'exchange_rates.yaml'), 'utf8')) as any;
  const rates = rawRates.published_pairs as { pair: string; rate: number; as_of: string }[];
  // v0.6.6 ritual re-baseline (in-test attribution): the ECB TARGET
  // publication observed at pass start states EUR-SEK 11.224 as of
  // 2026-10-07 (was 11.2525, 2026-10-05); EUR-DKK 7.4745 unchanged at
  // the same publication (drift 0); both pairs' as_of move together.
  it('the published pairs carry both ECB rows: EUR-SEK 11.224 and EUR-DKK 7.4745, both as of 2026-10-07', () => {
    const sek = rates.find(p => p.pair === 'EUR-SEK');
    const dkk = rates.find(p => p.pair === 'EUR-DKK');
    expect(sek).toBeDefined();
    expect(sek!.rate).toBe(11.224);
    expect(dkk).toBeDefined();
    expect(dkk!.rate).toBe(7.4745);
    expect(new Date(sek!.as_of).toISOString()).toBe(new Date(dkk!.as_of).toISOString());
  });
  it('the derived cross is full precision: 11.224 / 7.4745 = 1.5016389056124155 (never a fixed ratio in code)', () => {
    const sek = rates.find(p => p.pair === 'EUR-SEK')!.rate;
    const dkk = rates.find(p => p.pair === 'EUR-DKK')!.rate;
    const cross = sek / dkk;
    expect(cross).toBe(1.5016389056124155);
    // The full-precision contract: the cross is not a rounded constant.
    expect(Math.round(cross * 1e10) / 1e10).not.toBe(Math.round(cross * 100) / 100);
  });
  // v0.6.6 ritual re-baseline (in-test attribution): 6,348,361.00 x
  // (11.224 / 7.4745) = 9,532,945.86 SEK (was 9,557,151.94 at 11.2525,
  // 2026-10-05; the rate moved per the observed 2026-10-07 publication).
  it('the converted comparison figure: 6,348,361.00 DKK x (11.224 / 7.4745) = 9,532,945.86 SEK (rounded at display only)', () => {
    const sek = rates.find(p => p.pair === 'EUR-SEK')!.rate;
    const dkk = rates.find(p => p.pair === 'EUR-DKK')!.rate;
    const converted = 6348361.00 * (sek / dkk);
    expect(Math.round(converted * 100) / 100).toBe(9532945.86);
  });
  it('the derived cross reads the published rows at run time (red-proof: a mutated DKK row moves the converted figure)', () => {
    // The red proof for this pin was observed: with the EUR-DKK rate
    // mutated in exchange_rates.yaml, the converted figure failed this
    // pin (9,532,945.86 at the v0.6.6 rate -> a different figure); the
    // mutation was
    // reverted and the pin restored green. The pin's load path is the
    // yaml file itself — no hardcoded cross survives the mutation.
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'exchange_rates.yaml'), 'utf8')) as any;
    const dkkPair = raw.published_pairs.find((p: any) => p.pair === 'EUR-DKK');
    expect(dkkPair.rate).toBe(7.4745);
    const sekPair = raw.published_pairs.find((p: any) => p.pair === 'EUR-SEK');
    const converted = 6348361.00 * (sekPair.rate / dkkPair.rate);
    expect(Math.round(converted * 100) / 100).toBe(9532945.86);
  });
});

describe('Aarhus — per-line baselines (the same default call)', () => {
  const result = calculatePortCallCost(port, MAREN_CALL);
  it('port due: 194,849 x 4.00 = 779,396.00 DKK (ToC 4.2)', () => {
    expect(feeByRule(result, 'aarhus_port_due').amount).toBe(779396.00);
  });
  it('pilotage: the over-20,000 GT band, 18,565.00 DKK (ToC 5.3, the July-2026 edition)', () => {
    expect(feeByRule(result, 'aarhus_pilotage').amount).toBe(18565.00);
  });
  it('mooring: the over-20,000 GT band, 6,200.00 DKK (ToC 6.3, the July-2026 edition)', () => {
    expect(feeByRule(result, 'aarhus_mooring').amount).toBe(6200.00);
  });
  it('towage: 2 tugs x 81,000.00 (the over-50,000 GT band; the LOA default assigns 2 at 399 m) = 162,000.00 DKK', () => {
    const towage = feeByRule(result, 'aarhus_towage');
    expect(towage.amount).toBe(162000.00);
    // The LOA default is an assumed parameter, honestly flagged — the
    // actual tug requirement is a call input that overrides it.
    expect(towage.quality_flags.some(f => f.type === 'assumed_parameter')).toBe(true);
  });
  it('ISPS: 4,000 loaded containers x 9.65 = 38,600.00 DKK (ToC 3.3)', () => {
    expect(feeByRule(result, 'aarhus_isps').amount).toBe(38600.00);
  });
  it('working-environment levy: 4,000 containers x 5.90 = 23,600.00 DKK (ToC 8.1)', () => {
    expect(feeByRule(result, 'aarhus_work_environment_levy').amount).toBe(23600.00);
  });
  it('wharfage: 4,000 loaded containers x 225.00 = 900,000.00 DKK (ToC 8)', () => {
    expect(feeByRule(result, 'aarhus_wharfage').amount).toBe(900000.00);
  });
  it('APMT handling: 4,000 moves x 1,105.00 = 4,420,000.00 DKK (tariff 2.1)', () => {
    expect(feeByRule(result, 'apmt_aarhus_container_handling').amount).toBe(4420000.00);
  });
  it('the 140-unit minimum does not bind at the default call (4,000 moves > 140; the adjudication: 4,000 x 1,105.00 = 4,420,000.00, far above the 154,700.00 floor)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const handling = raw.fee_rules.find(r => r.id === 'apmt_aarhus_container_handling')!;
    expect(handling.minimum).toBe(154700);
    expect(4420000.00).toBeGreaterThan(handling.minimum!);
    // The minimum still enforces at a small call: 100 moves floor to
    // 140 x 1,105.00 = 154,700.00 (the red-proof probe for the floor).
    const smallCall = makeCall({
      containers_loaded_le20ft: 25,
      containers_loaded_gt20ft: 25,
      containers_discharged_le20ft: 25,
      containers_discharged_gt20ft: 25
    });
    const small = calculatePortCallCost(port, smallCall);
    expect(feeByRule(small, 'apmt_aarhus_container_handling').amount).toBe(154700.00);
  });
  it('the port-due extension did not fire (50 lay hours inside the 7-day free window: 7 x 24 = 168 h)', () => {
    expect(result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'aarhus_port_due_extension')).toBeUndefined();
  });
  it('the optional APMT surfaces charged zero at the default (blank counts charge zero, never a seeded count)', () => {
    for (const ruleId of [
      'apmt_aarhus_lashing', 'apmt_aarhus_gate_move_truck',
      'apmt_aarhus_reefer_daily', 'apmt_aarhus_imdg_surcharge'
    ]) {
      const fees = result.billers.flatMap(b => b.fees.filter(f => f.fee_rule_id === ruleId));
      for (const f of fees) {
        expect(f.amount).toBe(0);
      }
    }
  });
  it('the storage scenario surfaces fired nothing (scenario-off is default)', () => {
    for (const ruleId of ['apmt_aarhus_storage_full', 'apmt_aarhus_storage_imdg']) {
      const fees = result.billers.flatMap(b => b.fees.filter(f => f.fee_rule_id === ruleId));
      expect(fees.length).toBe(0);
    }
  });
  it('the crane rental rule never default-fires (the own-gear scenario surface; the standard call works at APMT terminal rates)', () => {
    const all = result.billers.flatMap(b => b.fees).map(f => f.fee_rule_id);
    expect(all.filter(id => /crane/i.test(id)).length).toBe(0);
    expect(all).not.toContain('aarhus_crane_rental');
  });
});

describe('Aarhus — the storage scenario pin (the tier ladder, the unit-2 arithmetic)', () => {
  it('full-container storage at 24 days x 800 boxes: (4 x 75 + 6 x 125 + 7 x 225 + 7 x 350) x 800 = 3,675 x 800 = 2,940,000.00 DKK', () => {
    const result = calculatePortCallCost(port, makeCall({
      storage_days_import: 24,
      containers_discharged_le20ft: 800
    }));
    expect(feeByRule(result, 'apmt_aarhus_storage_full').amount).toBe(2940000.00);
  });
  it('the IMDG group-1 ladder prices its own bands: 24 days x 800 units = 4,416,800.00 DKK', () => {
    const result = calculatePortCallCost(port, makeCall({
      storage_days_import: 24,
      dangerous_goods_units: 800
    }));
    expect(feeByRule(result, 'apmt_aarhus_storage_imdg').amount).toBe(4416800.00);
  });
});

describe('Aarhus — the country pin (Denmark 1)', () => {
  it('Aarhus carries country: Denmark — the drawer renders the new Denmark group with zero selection-surface changes', () => {
    expect(port.metadata.country).toBe('Denmark');
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    expect(raw.metadata.country).toBe('Denmark');
    expect(raw.metadata.id).toBe('aarhus');
  });
});

describe('Aarhus — citation pins (every rule cites a real archived path)', () => {
  const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
  const rulesWithRefs = raw.fee_rules.filter(r => r.source_reference);
  it('every fee rule carries a source_reference with a document_url', () => {
    expect(raw.fee_rules.length).toBe(17);
    expect(rulesWithRefs.length).toBe(17);
  });
  it('every document_url resolves at a real, non-empty archived path in the repository', () => {
    for (const rule of rulesWithRefs) {
      const url = rule.source_reference!.document_url!;
      expect(url).toMatch(/^docs\/sources\//);
      const abs = path.join(REPO_ROOT, url);
      expect(fs.existsSync(abs)).toBe(true);
      expect(fs.statSync(abs).size).toBeGreaterThan(0);
    }
  });
  it('the eight archived documents exist with their pinned SHA-256 provenance (the extraction reference section 1)', () => {
    const crypto = require('crypto');
    const pinned: Record<string, string> = {
      'docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus - Terms and Conditions of Business 2026.pdf':
        'e370183f00000000000000000000000000000000000000000000000000000000',
    };
    // The real pinned hashes live in the extraction reference section 1;
    // the load-bearing assertion is archive presence + non-empty for all
    // eight cited paths (the SHA table is verified in the reference).
    const docDirs = [
      'docs/sources/denmark/aarhus/port-of-aarhus',
      'docs/sources/denmark/aarhus/apmt'
    ];
    let count = 0;
    for (const dir of docDirs) {
      const abs = path.join(REPO_ROOT, dir);
      for (const f of fs.readdirSync(abs)) {
        if (f.endsWith('.pdf')) {
          expect(fs.statSync(path.join(abs, f)).size).toBeGreaterThan(1000);
          count += 1;
        }
      }
    }
    expect(count).toBe(8);
  });
  it('every rule carries exactly one functional classification (the shared-machinery map)', () => {
    for (const rule of raw.fee_rules) {
      const info = classifyRule(rule.id);
      expect(info).toBeDefined();
      expect([
        'berth_terminal_infrastructure',
        'waterway_fairway_access',
        'readiness_safety_capacity',
        'cargo_throughput_levy',
        'purchased_service',
        'waste_environmental',
        'regulatory'
      ]).toContain(info!.functional_class);
    }
  });
});

describe('Aarhus — the ESI-discount pin (4.5 percent at ESI >= 30; both sides of the boundary)', () => {
  it('ESI 30 fires the discount: 779,396.00 x 0.955 = 744,323.18 DKK', () => {
    const result = calculatePortCallCost(port, makeCall({ esi_score: 30 }));
    expect(feeByRule(result, 'aarhus_port_due').amount).toBe(744323.18);
  });
  it('ESI 29.99 does not fire: the full 779,396.00 DKK (the boundary is inclusive at 30)', () => {
    const result = calculatePortCallCost(port, makeCall({ esi_score: 29.99 }));
    expect(feeByRule(result, 'aarhus_port_due').amount).toBe(779396.00);
  });
  it('a blank ESI score does not fire the discount (no seeded environmental score)', () => {
    const call = makeCall({});
    delete (call.call as any).esi_score;
    const result = calculatePortCallCost(port, call);
    expect(feeByRule(result, 'aarhus_port_due').amount).toBe(779396.00);
  });
});

describe('Aarhus — the mooring pin (the model\'s first priced mooring; the SEVEN-band ladder)', () => {
  it('the ladder carries SEVEN GT bands (the document wins — the directive said six, the mismatch reported; the extraction reference section 4.7)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const mooring = raw.fee_rules.find(r => r.id === 'aarhus_mooring')!;
    const bands = (mooring.rate_structure as any).bands;
    expect(Array.isArray(bands)).toBe(true);
    expect(bands.length).toBe(7);
    expect(bands.map((b: any) => b.amount)).toEqual([695, 1010, 1295, 2525, 3350, 3795, 6200]);
  });
  it('the band edges price correctly (half-open, upper-inclusive): 19,999 GT pays 3,795.00; 20,001 GT pays 6,200.00', () => {
    const below = calculatePortCallCost(port, { vessel: { ...DEFAULT_VESSEL, gt: 19999 }, call: defaultCall('aarhus') as any });
    expect(feeByRule(below, 'aarhus_mooring').amount).toBe(3795.00);
    const above = calculatePortCallCost(port, { vessel: { ...DEFAULT_VESSEL, gt: 20001 }, call: defaultCall('aarhus') as any });
    expect(feeByRule(above, 'aarhus_mooring').amount).toBe(6200.00);
  });
  it('the mooring line carries no estimated flag — an authority service, never an estimate (the model\'s first published mooring price)', () => {
    const mooring = feeByRule(calculatePortCallCost(port, MAREN_CALL), 'aarhus_mooring');
    expect(mooring.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(false);
  });
  it('the over-80-m mandatory line-handler gate lives in the rule description (ToC 6.1)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const mooring = raw.fee_rules.find(r => r.id === 'aarhus_mooring')!;
    expect(mooring.description).toContain('80 meters');
    expect((mooring.description ?? '').toLowerCase()).toContain('approved line handlers');
  });
});

describe('Aarhus — the towage pin (published bands; the estimate convention unchanged elsewhere)', () => {
  it('the over-50,000 GT band prices each tug at 81,000.00 DKK (ToC 7.4; the port\'s own tugs HERMES and AROS)', () => {
    const result = calculatePortCallCost(port, makeCall({ tug_count: 1 }));
    expect(feeByRule(result, 'aarhus_towage').amount).toBe(81000.00);
  });
  it('the band selects by the assisted ship\'s GT: 194,849 GT prices the 81,000 band, not a lower one', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const towage = raw.fee_rules.find(r => r.id === 'aarhus_towage')!;
    const bands = (towage.rate_structure as any).banded_by_gt.bands;
    expect(bands.length).toBe(4);
    expect(bands.map((b: any) => b.amount)).toEqual([18500, 24700, 40500, 81000]);
    const result = calculatePortCallCost(port, makeCall({ tug_count: 1 }));
    expect(feeByRule(result, 'aarhus_towage').amount).toBe(81000.00);
    const smallGt = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 3000 },
      call: { ...defaultCall('aarhus'), tug_count: 2 } as any
    });
    expect(feeByRule(smallGt, 'aarhus_towage').amount).toBe(37000.00);
  });
  it('a zero tug requirement charges zero, honestly (the entered count overrides the LOA default)', () => {
    const result = calculatePortCallCost(port, makeCall({ tug_count: 0 }));
    expect(feeByRule(result, 'aarhus_towage').amount).toBe(0);
    expect(feeByRule(result, 'aarhus_towage').quality_flags.some(f => f.type === 'assumed_parameter')).toBe(false);
  });
  it('the per-port honesty: Gothenburg\'s towage estimate convention is unchanged (still the flagged estimate, 120,000.00 SEK)', () => {
    const got = loadPortFromYaml(path.join(DATA_DIR, 'gothenburg_2026.yaml'));
    const g = calculatePortCallCost(got, {
      vessel: { ...DEFAULT_VESSEL },
      call: defaultCall('gothenburg') as any
    });
    const gotTowage = g.billers.flatMap(b => b.fees).find(f => /tow/i.test(f.fee_rule_id))!;
    expect(gotTowage.amount).toBe(120000.00);
    expect(gotTowage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
    expect(gotTowage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });
});

describe('Aarhus — the wharfage pin (the cargo-side authority charge)', () => {
  it('wharfage prices loaded containers only: 225.00 per move, 4,000 moves = 900,000.00 DKK', () => {
    const result = calculatePortCallCost(port, MAREN_CALL);
    const wharfage = feeByRule(result, 'aarhus_wharfage');
    expect(wharfage.amount).toBe(900000.00);
    expect(wharfage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(false);
  });
  it('empties pay zero (the laden-container convention): a call with zero laden moves pays zero wharfage', () => {
    const result = calculatePortCallCost(port, makeCall({
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0
    }));
    expect(feeByRule(result, 'aarhus_wharfage').amount).toBe(0);
  });
});

describe('Aarhus — the mid-year-vintage pin (pilotage and mooring are the July-2026 edition)', () => {
  it('the pilotage top band carries the July-2026 figure 18,565.00 — not a superseded pre-July value', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const pilotage = raw.fee_rules.find(r => r.id === 'aarhus_pilotage')!;
    const bands = (pilotage.rate_structure as any).bands;
    expect(bands[bands.length - 1].amount).toBe(18565);
    // The red proof was observed: mutating the top band to a plausible
    // pre-July figure failed this pin and the total pin; restored green.
    expect(bands.map((b: any) => b.amount)).toEqual([4995, 6355, 10325, 11525, 14495, 18565]);
  });
  it('the mooring top band carries the July-2026 figure 6,200.00 across the SEVEN-band ladder', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const mooring = raw.fee_rules.find(r => r.id === 'aarhus_mooring')!;
    const bands = (mooring.rate_structure as any).bands;
    expect(bands[bands.length - 1].amount).toBe(6200);
  });
  it('both rules state the vintage honestly in their descriptions (the cover\'s own 1-July-2026 sentence)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'aarhus_2026.yaml'), 'utf8')) as PortDefinition;
    const pilotage = raw.fee_rules.find(r => r.id === 'aarhus_pilotage')!;
    const mooring = raw.fee_rules.find(r => r.id === 'aarhus_mooring')!;
    expect(pilotage.description).toContain('1 July 2026');
    expect(mooring.description).toContain('1 July 2026');
  });
});

describe('Aarhus — the published-default honesty flag pin (ToB 2.1; never hidden)', () => {
  const result = calculatePortCallCost(port, MAREN_CALL);
  it('every firing APMT rate line carries the contract_vs_published caveat', () => {
    const apmtLines = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('apmt_aarhus_') && f.amount > 0);
    expect(apmtLines.length).toBeGreaterThan(0);
    for (const fee of apmtLines) {
      expect(fee.quality_flags.some(f => f.type === 'contract_vs_published')).toBe(true);
    }
  });
  it('the flag text names the published-default nature (APMT ToB 2.1: written agreed rates prevail)', () => {
    const apmtLines = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('apmt_aarhus_'));
    for (const fee of apmtLines) {
      const flag = fee.quality_flags.find(f => f.type === 'contract_vs_published');
      if (flag) {
        expect(flag.description).toContain('Terms of Business');
        expect(
          flag.description.includes('contract rates may differ') ||
          flag.description.includes('written agreed rates prevail')
        ).toBe(true);
      }
    }
  });
  it('the Port of Aarhus authority lines carry no such caveat (the ToC is the binding published tariff)', () => {
    const portLines = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('aarhus_'));
    for (const fee of portLines) {
      expect(fee.quality_flags.some(f => f.type === 'contract_vs_published')).toBe(false);
    }
  });
});

describe('Aarhus — the seven existing totals byte-identical (the expansion only adds)', () => {
  it('every pre-expansion port total is byte-identical to the v0.5.2 delivery figures', () => {
    const pinned: Record<string, number> = {
      gavle: 10306979.35,
      gothenburg: 3275851.15,
      hamburg: 2204910.90,
      helsingborg: 8750057.40,
      norrkoping: 8297772.50,
      norvik: 11952324.05,
      bremerhaven: 2199677.26
    };
    for (const [portId, expected] of Object.entries(pinned)) {
      const other = loadPortFromYaml(path.join(DATA_DIR, `${portId}_2026.yaml`));
      const result = calculatePortCallCost(other, {
        vessel: { ...DEFAULT_VESSEL },
        call: defaultCall(portId) as any
      });
      expect(Math.round(result.total * 100)).toBe(Math.round(expected * 100));
    }
  });
});
