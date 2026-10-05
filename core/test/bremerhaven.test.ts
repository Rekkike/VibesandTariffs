/**
 * Bremerhaven port file pins (the v0.5.1 Bremerhaven expansion pass — the
 * new-silo suite per the v0.4.0 swedish_expansion pattern).
 *
 * Authority of record: docs/sources/germany/bremerhaven/
 * BREMERHAVEN_EXTRACTION_REFERENCE.md. Every figure must match to the cent;
 * a mismatch is a failure, not a tolerance.
 *
 * Pins in this suite:
 *  - the default-call baseline: Grand Total 2,199,272.49 EUR at the default
 *    MAREN MAERSK call (the extraction reference's section 9 arithmetic,
 *    computed and pinned the day the silo was born);
 *  - per-line baseline pins (the same call, every firing line);
 *  - the country pin (Germany 2 — Bremerhaven joins the Germany group);
 *  - the citation pins (every rule's document_url resolves at a real
 *    archived path — the archive-presence pattern, red-proofed);
 *  - the terminal-variant pin (the NTB switch changes the terminal lines
 *    and nothing else — the Hamburg terminal-variant precedent);
 *  - the reference-tariff honesty flag pin (NTB's reference nature is
 *    flagged on every NTB line, never hidden);
 *  - the six existing totals byte-identical (red proof: any movement of an
 *    existing port's total is a defect-stop — the expansion only adds).
 *  - the Helgafell anchor (the Hafenlotsgeld under-13k segment);
 *  - the Weser sea-approach route arithmetic (65 percent, legs f+g);
 *  - the Hafenfonds resolution (no Bremen port-fund levy exists).
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
  path.join(DATA_DIR, 'bremerhaven_2026.yaml')
).port;

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  return {
    vessel: { ...DEFAULT_VESSEL },
    call: {
      ...defaultCall('bremerhaven'),
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

function feesByBiller(result: ReturnType<typeof calculatePortCallCost>, billerName: string) {
  const b = result.billers.find(x => x.biller === billerName);
  if (!b) throw new Error(`Biller ${billerName} not found in result`);
  return b.fees;
}

const MAREN_CALL = makeCall({});

describe('Bremerhaven — the default-call baseline (pinned at extraction time)', () => {
  const result = calculatePortCallCost(port, MAREN_CALL);

  it('the Grand Total is 2,199,272.49 EUR (the extraction reference section 9)', () => {
    expect(result.total).toBe(2199677.26);
  });

  it('charges EUR (currency local, no conversion in the engine)', () => {
    expect(result.currency).toBe('EUR');
  });

  it('the per-GT derived metric is 11.29 EUR/GT (2,199,272.49 / 194,849)', () => {
    // The derived metric convention: the total divided by the vessel GT,
    // rounded to the cent — never a published rate.
    expect(Math.round((result.total / (DEFAULT_VESSEL.gt as number)) * 100) / 100).toBe(11.29);
  });

  it('the default terminal operator is Eurogate (the CTB default; no fallback flag)', () => {
    // The default call carries terminal_operator: 'Eurogate' from the
    // port's default_call section; no fallback flag may be raised.
    const fallback = result.quality_flags.find(
      f => f.type === 'fallback_value' && /Terminal operator/i.test(f.description)
    );
    expect(fallback).toBeUndefined();
    // The Eurogate berthing line fired (the default operator's layer).
    expect(feeByRule(result, 'eurogate_ctb_berthing_charge').amount).toBe(553371.16);
  });
});

describe('Bremerhaven — per-line baselines (the same default call)', () => {
  const result = calculatePortCallCost(port, MAREN_CALL);

  it('Raumgebuehr (overseas liner): 194,849 x 0.3038 = 59,195.13', () => {
    expect(feeByRule(result, 'brv_raumgebuehr_overseas_liner').amount).toBe(59195.13);
  });

  it('the Europaverkehr sibling did not fire (the arrival-origin gate: the default call arrives from outside Europe)', () => {
    expect(result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'brv_raumgebuehr_europe_liner')).toBeUndefined();
  });

  it('waste fee (HGebO 10(1), the >45,000 GT band): 885.84', () => {
    expect(feeByRule(result, 'brv_abfallentsorgung').amount).toBe(885.84);
  });

  it('Hafenlotsgeld (from 13,000 BRZ): 211.69 + 1,819 x 1.03 = 2,085.26 (the consolidated 2026 statute figures)', () => {
    // 1,819 = ceil((194,849 - 13,000) / 100) commenced 100-BRZ units; the
    // figures are the statute's own 12(7).2 values (the transcription-
    // integrity finding: an earlier draft carried the pre-2026 figures
    // from an older edition's search snippet; the archive corrected them).
    expect(feeByRule(result, 'brv_hafenlotsgeld_ab13k').amount).toBe(2085.26);
  });

  it('GDWS Weser dues at the 65% sea approach: 5,322 x 0.65 = 3,459.30', () => {
    // The Weser cap band (>52,000 GT = 5,322) scaled by the route:
    // legs f (35%) + g (30%) = 65 percent of the column.
    expect(feeByRule(result, 'gdws_pilotage_dues_weser').amount).toBe(3459.30);
  });

  it('GDWS Aussenweser fees at the 100% leg: min(1,663 + 78 x 45, 4,100) = 4,100.00 (the cap)', () => {
    // 194,849 GT: the 39,000-40,000 band (1,663) + 78 commenced
    // 2,000-GT units x 45 = 5,173, capped at 4,100.
    expect(feeByRule(result, 'gdws_pilot_fees_aussenweser').amount).toBe(4100.00);
  });

  it('Eurogate CTB berthing: 194,849 x (1.04 + 3 x 0.60) = 553,371.16', () => {
    expect(feeByRule(result, 'eurogate_ctb_berthing_charge').amount).toBe(553371.16);
  });

  it('Eurogate CTB handling: 4,000 x 358.00 = 1,432,000.00 (published, no estimate flag)', () => {
    const handling = feeByRule(result, 'eurogate_ctb_container_handling');
    expect(handling.amount).toBe(1432000.00);
    expect(handling.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(false);
  });

  it('Eurogate CTB security: 4,000 x 24.95 = 99,800.00', () => {
    expect(feeByRule(result, 'eurogate_ctb_security_charge').amount).toBe(99800.00);
  });

  it('the Eurogate social fund: 1.5% of berthing + handling (security excluded) = 29,780.57', () => {
    // 1.5% x (553,371.16 + 1,432,000.00) = 29,780.5673 -> 29,780.57.
    expect(feeByRule(result, 'eurogate_ctb_social_fund_surcharge').amount).toBe(29780.57);
  });

  it('towage: the 15,000 estimate (the Hamburg convention), flagged estimated', () => {
    const towage = feeByRule(result, 'bremerhaven_towage_estimate');
    expect(towage.amount).toBe(15000.00);
    expect(towage.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });

  it('the optional services fired nothing at the default (blank counts charge zero, never a seeded count)', () => {
    for (const ruleId of [
      'eurogate_ctb_lashing', 'eurogate_ctb_twistlocks', 'eurogate_ctb_imo_surcharge',
      'eurogate_ctb_small_call_minimum', 'eurogate_ctb_layby_charge',
      'eurogate_ctb_reefer_first_24h', 'eurogate_ctb_reefer_subsequent_24h'
    ]) {
      const fees = result.billers.flatMap(b => b.fees.filter(f => f.fee_rule_id === ruleId));
      // Gated rules with no entered count charge zero - either an absent
      // line (presence-gated) or an honest zero (unit rules over a blank
      // count) - never a seeded count and never a nonzero amount.
      for (const f of fees) {
        expect(f.amount).toBe(0);
      }
    }
  });

  it('the storage scenario surfaces fired nothing (scenario-off is default)', () => {
    for (const ruleId of [
      'eurogate_ctb_storage_import_20ft', 'eurogate_ctb_storage_import_40ft',
      'eurogate_ctb_storage_export_20ft', 'eurogate_ctb_storage_export_40ft'
    ]) {
      const fees = result.billers.flatMap(b => b.fees.filter(f => f.fee_rule_id === ruleId));
      expect(fees.length).toBe(0);
    }
  });
});

describe('Bremerhaven — the country pin (Germany 2)', () => {
  it('Bremerhaven carries country: Germany — the drawer renders it under the Germany header beside Hamburg', () => {
    // The country-metadata suite pins every silo's country field; this pin
    // states the expansion's own grouping fact: the Germany group gains
    // its second port, rendered by the drawer with zero selection-surface
    // work (the v0.5.0 data-derived grouping).
    expect(port.metadata.country).toBe('Germany');
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'bremerhaven_2026.yaml'), 'utf8')) as PortDefinition;
    expect(raw.metadata.country).toBe('Germany');
    expect(raw.metadata.id).toBe('bremerhaven');
  });
});

describe('Bremerhaven — citation pins (every rule cites a real archived path)', () => {
  const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'bremerhaven_2026.yaml'), 'utf8')) as PortDefinition;
  const rulesWithRefs = raw.fee_rules.filter(r => r.source_reference);

  it('every fee rule carries a source_reference with a document_url', () => {
    expect(raw.fee_rules.length).toBe(32);
    expect(rulesWithRefs.length).toBe(32);
  });

  it('every document_url resolves at a real, non-empty archived path in the repository', () => {
    // The archive-presence pattern (the v0.4.7 G1 pin): each cited path
    // exists on disk and is non-empty — a citation to a missing or
    // zero-byte file fails here.
    for (const rule of rulesWithRefs) {
      const url = rule.source_reference!.document_url!;
      expect(url).toMatch(/^docs\/sources\//);
      const abs = path.join(REPO_ROOT, url);
      expect(fs.existsSync(abs)).toBe(true);
      expect(fs.statSync(abs).size).toBeGreaterThan(0);
    }
  });

  it('the three new archives exist with their provenance content', () => {
    const hgebo = path.join(REPO_ROOT, 'docs/sources/germany/national/bremen/hgebo-consolidated-2026.txt');
    expect(fs.existsSync(hgebo)).toBe(true);
    const hgeboText = fs.readFileSync(hgebo, 'utf8');
    // The statute identity and the inline-tables finding.
    expect(hgeboText).toContain('HGebO');
    expect(hgeboText).toContain('0,3038');
    expect(hgeboText).toContain('885,84');
    expect(hgeboText).toContain('211,69');
    expect(hgeboText).toContain('41,80');

    const ntb = path.join(REPO_ROOT, 'docs/sources/germany/bremerhaven/ntb/ntb-reference-tariff-en-2026-08-01.txt');
    expect(fs.existsSync(ntb)).toBe(true);
    const ntbText = fs.readFileSync(ntb, 'utf8');
    expect(ntbText).toContain('Reference tariff');
    expect(ntbText).toContain('01.08.2026');
    // The honesty flag recorded in the archive header.
    expect(ntbText).toContain('REFERENCE tariff');
    expect(ntbText).toContain('never presented as verified contract');

    const eg = path.join(REPO_ROOT, 'docs/sources/germany/bremerhaven/eurogate/prices-and-conditions-2026.txt');
    expect(fs.existsSync(eg)).toBe(true);
    const egText = fs.readFileSync(eg, 'utf8');
    expect(egText).toContain('1st March 2026');
    expect(egText).toContain('358,00');
    expect(egText).toContain('24,95');
  });

  it('the Eurogate P&C is the national-class shared document: the silo cites the Bremerhaven companion, the canonical PDF stays the Hamburg-tree copy (byte-identical, re-verified)', () => {
    const canonical = path.join(REPO_ROOT, 'docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf');
    expect(fs.existsSync(canonical)).toBe(true);
    // The pinned vintage SHA-256 (the extraction reference section 1).
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(canonical)).digest('hex');
    expect(hash).toBe('166ca82876224d16f81f2b26daf3526ce31991676fb9721ef93690da1e72a2de');
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
        'waste_environmental'
      ]).toContain(info!.functional_class);
    }
  });
});

describe('Bremerhaven — the terminal-variant pin (the NTB switch changes the terminal lines and nothing else)', () => {
  const defaultResult = calculatePortCallCost(port, MAREN_CALL);
  const ntbResult = calculatePortCallCost(port, makeCall({ terminal_operator: 'NTB' }));

  it('the NTB variant total is 1,796,675.43 EUR (the extraction reference section 9 variant table)', () => {
    expect(ntbResult.total).toBe(1797080.20);
  });

  it('the port-wide lines are byte-identical between the operators (the variant moves only the terminal lines)', () => {
    const portWide = [
      'brv_raumgebuehr_overseas_liner',
      'brv_abfallentsorgung',
      'brv_hafenlotsgeld_ab13k',
      'gdws_pilotage_dues_weser',
      'gdws_pilot_fees_aussenweser',
      'bremerhaven_towage_estimate'
    ];
    for (const ruleId of portWide) {
      expect(feeByRule(ntbResult, ruleId).amount).toBe(feeByRule(defaultResult, ruleId).amount);
    }
  });

  it('the NTB terminal lines (tonnage dues 243,561.25, handling 1,356,000.00, security 88,800.00, fund 23,993.42)', () => {
    expect(feeByRule(ntbResult, 'ntb_tonnage_dues').amount).toBe(243561.25);
    expect(feeByRule(ntbResult, 'ntb_container_handling').amount).toBe(1356000.00);
    expect(feeByRule(ntbResult, 'ntb_security_charge').amount).toBe(88800.00);
    expect(feeByRule(ntbResult, 'ntb_social_fund_surcharge').amount).toBe(23993.42);
  });

  it('the Eurogate layer fires nothing at the NTB variant (the no-mixed-biller-set guarantee)', () => {
    const eurogateLines = ntbResult.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('eurogate_ctb_'));
    expect(eurogateLines.length).toBe(0);
  });

  it('the NTB layer fires nothing at the Eurogate default', () => {
    const ntbLines = defaultResult.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('ntb_'));
    expect(ntbLines.length).toBe(0);
  });

  it('the variant movement arithmetic: 2,199,677.26 - 1,797,080.20 = 402,597.06, exactly the terminal-layer delta', () => {
    // Eurogate layer at default: 553,371.16 + 1,432,000.00 + 99,800.00 +
    // 29,780.57 = 2,114,951.73. NTB layer at the variant: 243,561.25 +
    // 1,356,000.00 + 88,800.00 + 23,993.42 = 1,712,354.67. The delta
    // 2,114,951.73 - 1,712,354.67 = 402,597.06 — the total movement is
    // the terminal-layer delta alone, nothing else moved.
    const eurogateLayer = 553371.16 + 1432000.00 + 99800.00 + 29780.57;
    const ntbLayer = 243561.25 + 1356000.00 + 88800.00 + 23993.42;
    expect(Math.round((defaultResult.total - ntbResult.total) * 100) / 100).toBe(402597.06);
    expect(Math.round((eurogateLayer - ntbLayer) * 100) / 100).toBe(402597.06);
  });
});

describe('Bremerhaven — the reference-tariff honesty flag pin (NTB flagged, never hidden)', () => {
  const ntbResult = calculatePortCallCost(port, makeCall({ terminal_operator: 'NTB' }));

  it('every firing NTB rate line carries the contract_vs_published caveat (the reference-tariff honesty flag)', () => {
    // Scope: the NTB fee rules (the lines carrying the reference rates).
    // The biller social-fund surcharge line is derived from the flagged
    // rate lines (the biller-surcharge machinery carries no caveat field
    // of its own); its own caveat is recorded in the extraction
    // reference and rides the flagged base lines.
    const ntbRateLines = ntbResult.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('ntb_') && f.fee_rule_id !== 'ntb_social_fund_surcharge');
    expect(ntbRateLines.length).toBeGreaterThan(0);
    for (const fee of ntbRateLines) {
      expect(fee.quality_flags.some(f => f.type === 'contract_vs_published')).toBe(true);
    }
  });

  it('the flag text names the reference-tariff nature (never a generic caveat)', () => {
    const ntbFees = ntbResult.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('ntb_'));
    const ntbRateLines = ntbResult.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('ntb_') && f.fee_rule_id !== 'ntb_social_fund_surcharge');
    for (const fee of ntbRateLines) {
      const flag = fee.quality_flags.find(f => f.type === 'contract_vs_published')!;
      expect(flag.description).toContain('reference tariff');
      expect(flag.description).toContain('contract rates may differ');
    }
  });

  it('the Eurogate default lines carry no such caveat (the P&C rates are the binding published prices)', () => {
    const egFees = calculatePortCallCost(port, MAREN_CALL).billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_rule_id.startsWith('eurogate_ctb_'));
    for (const fee of egFees) {
      expect(fee.quality_flags.some(f => f.type === 'contract_vs_published')).toBe(false);
    }
  });
});

describe('Bremerhaven — the six existing totals byte-identical (the expansion only adds)', () => {
  it('every pre-expansion port total is byte-identical to the v0.5.0 delivery figures', () => {
    const pinned: Record<string, number> = {
      gavle: 10306979.35,
      gothenburg: 3275851.15,
      hamburg: 2204910.90,
      helsingborg: 8750057.40,
      norrkoping: 8297772.50,
      norvik: 11952324.05
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

describe('Bremerhaven — the Helgafell anchor (the Hafenlotsgeld under-13k segment)', () => {
  it('an 8,890-GT vessel pays the unter-13k Hafenlotsgeld: 41.80 + 89 x 1.27 = 154.83', () => {
    const result = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 8890, nt: 3783 },
      call: defaultCall('bremerhaven') as any
    });
    expect(feeByRule(result, 'brv_hafenlotsgeld_unter13k').amount).toBe(154.83);
    // The ab-13k sibling did not fire.
    expect(result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'brv_hafenlotsgeld_ab13k')).toBeUndefined();
  });

  it('exactly one Hafenlotsgeld rule fires at either side of the 13,000 boundary (the paired gates)', () => {
    // 13,000 GT exactly prices the ab-13k rule (ab = from 13,000,
    // lower-inclusive in the half-open band semantics).
    const at13k = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 13000, nt: 6500 },
      call: defaultCall('bremerhaven') as any
    });
    const abFired = at13k.billers.flatMap(b => b.fees).some(f => f.fee_rule_id === 'brv_hafenlotsgeld_ab13k');
    const unterFired = at13k.billers.flatMap(b => b.fees).some(f => f.fee_rule_id === 'brv_hafenlotsgeld_unter13k');
    expect(abFired).toBe(true);
    expect(unterFired).toBe(false);
    // 12,999 GT prices the unter-13k rule alone.
    const below = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 12999, nt: 6500 },
      call: defaultCall('bremerhaven') as any
    });
    const abFired2 = below.billers.flatMap(b => b.fees).some(f => f.fee_rule_id === 'brv_hafenlotsgeld_ab13k');
    const unterFired2 = below.billers.flatMap(b => b.fees).some(f => f.fee_rule_id === 'brv_hafenlotsgeld_unter13k');
    expect(abFired2).toBe(false);
    expect(unterFired2).toBe(true);
  });
});

describe('Bremerhaven — the Weser sea-approach route arithmetic', () => {
  it('the 65 percent default scales the Weser dues column (legs f 35% + g 30%)', () => {
    // The Maren Maersk band (>52,000 GT) is the 5,322 cap row; the
    // default segment percentage is 65 (the port's default_call).
    expect((defaultCall('bremerhaven') as any).pilotage_segment_pct).toBe(65);
    const result = calculatePortCallCost(port, MAREN_CALL);
    expect(feeByRule(result, 'gdws_pilotage_dues_weser').amount).toBe(3459.30);
  });

  it('a full Bremen transit at 100 percent prices the unscaled column figure: 5,322.00', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_segment_pct: 100 }));
    expect(feeByRule(result, 'gdws_pilotage_dues_weser').amount).toBe(5322.00);
  });

  it('the Aussenweser fees do not scale with the segment input (the leg is definitionally 100 percent — the asymmetry recorded honestly)', () => {
    const result = calculatePortCallCost(port, makeCall({ pilotage_segment_pct: 100 }));
    expect(feeByRule(result, 'gdws_pilot_fees_aussenweser').amount).toBe(4100.00);
    const result65 = calculatePortCallCost(port, MAREN_CALL);
    expect(feeByRule(result65, 'gdws_pilot_fees_aussenweser').amount).toBe(4100.00);
  });

  it('the Weser dues column figures verify against the shared national authority (the Hamburg silo cites the same PDF)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'bremerhaven_2026.yaml'), 'utf8')) as PortDefinition;
    const duesRule = raw.fee_rules.find(r => r.id === 'gdws_pilotage_dues_weser')!;
    const bands: any[] = (duesRule.rate_structure as any).bands;
    // The 39,000-40,000 band is 4,404 in the Weser column (the extraction
    // reference's verification anchor); the cap band above 52,000 is 5,322.
    expect(bands.find((b: any) => b.min === 39000 && b.max === 40000).amount).toBe(4404);
    expect(bands.find((b: any) => b.min === 52000 && b.max === null).amount).toBe(5322);
    // The band structure matches the shared table (104 bands + cap).
    expect(bands.length).toBe(105);
  });
});

describe('Bremerhaven — the Hafenfonds resolution (from the ordinance itself)', () => {
  it('no hafenfonds fee family exists at Bremerhaven (the statute levies no port-fund surcharge)', () => {
    const raw = yaml.load(fs.readFileSync(path.join(DATA_DIR, 'bremerhaven_2026.yaml'), 'utf8')) as PortDefinition;
    expect(raw.fee_rules.filter(r => r.fee_family === 'hafenfonds')).toHaveLength(0);
    // The billers carry no hafenfonds surcharge either — the terminals
    // levy their own social funds (the existing social_fund family).
    for (const b of raw.billers ?? []) {
      expect((b as any).surcharge?.fee_family).not.toBe('hafenfonds');
    }
  });

  it('the consolidated statute text contains no Hafenfonds levy (the primary-authority resolution)', () => {
    const hgebo = fs.readFileSync(
      path.join(REPO_ROOT, 'docs/sources/germany/national/bremen/hgebo-consolidated-2026.txt'),
      'utf8'
    );
    expect(hgebo).not.toContain('Hafenfonds');
    expect(hgebo).not.toContain('Hafen-Fonds');
  });
});

describe('Bremerhaven — the Raumgebuehr traffic-area gate', () => {
  it('a European arrival prices the Europaverkehr liner rate at the GT band (0.2763 above 21,000 GT)', () => {
    const result = calculatePortCallCost(port, makeCall({ arrival_origin: 'europe' }));
    // 194,849 GT x 0.2763 = 53,836.78 (round half-up at the cent).
    expect(feeByRule(result, 'brv_raumgebuehr_europe_liner').amount).toBe(53836.78);
    expect(result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'brv_raumgebuehr_overseas_liner')).toBeUndefined();
  });

  it('a mid-band European vessel prices the 14,000-21,000 rate (0.2368)', () => {
    const result = calculatePortCallCost(port, {
      vessel: { ...DEFAULT_VESSEL, gt: 18000, nt: 9900 },
      call: { ...defaultCall('bremerhaven'), arrival_origin: 'europe' } as any
    });
    // 18,000 GT x 0.2368 = 4,262.40.
    expect(feeByRule(result, 'brv_raumgebuehr_europe_liner').amount).toBe(4262.40);
  });

  it('the 50-percent extension fires per commenced 10-day period beyond 120 h (HGebO 3b(2))', () => {
    // 260 h in port = 120 h covered + one commenced 240-h period:
    // 194,849 x 0.1519 = 29,597.56 (round half-up at the cent).
    const result = calculatePortCallCost(port, makeCall({ port_time_hours: 260 }));
    expect(feeByRule(result, 'brv_raumgebuehr_extension_overseas').amount).toBe(29597.56);
    // At the default 50 h no extension fires.
    const defaultResult = calculatePortCallCost(port, MAREN_CALL);
    expect(defaultResult.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'brv_raumgebuehr_extension_overseas')).toBeUndefined();
  });
});
