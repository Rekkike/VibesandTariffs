/**
 * Frozen-2027 Hamburg suite (dual-year accumulation, user ruling of
 * 2026-11-23, v0.23.0). Pins every updated HPA rule of the tree-inert fork
 * core/data/hamburg_2027.yaml at the 2027 published values, the ESI-noise
 * retirement (absence pin), and the Green Award recorded-not-encoded note.
 * Every pin carries in-test attribution: the user's dual-year ruling of
 * 2026-11-23 and the document citations (pricelist-maritime-shipping-2027.pdf,
 * stc-maritime-shipping-2027.pdf, port-gtc-2027.pdf - all as of 01.01.2027,
 * issued 14.10.2026, sha256-verified in the extraction reference's 2027
 * section). The 2026 file (hamburg_2026.yaml) stays FROZEN and byte-identical;
 * the app stays on the 2026 year constant - this fork never enters ports.json
 * (the vessels: [] sentinel keeps the converter on its vessel branch).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { calculatePortCallCost, roundToCent } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition, CostCalculationInput } from '../src/types';

const FILE = path.join(__dirname, '..', 'data', 'hamburg_2027.yaml');
const RAW = yaml.load(fs.readFileSync(FILE, 'utf8')) as any;
const port: PortDefinition = loadAndValidatePort(FILE).port;
const FROZEN_2026 = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'hamburg_2026.yaml'), 'utf8')
) as any;

function rule(id: string): any {
  return port.fee_rules.find(r => r.id === id)!;
}

function makeCall(overrides: Record<string, unknown>): CostCalculationInput {
  const { gt, built_year, ...callOverrides } = overrides;
  return {
    vessel: { gt: (gt as number) ?? 0, built_year: built_year as number | undefined },
    call: {
      port_id: 'hamburg',
      terminal_operator: 'HHLA',
      date: '2027-06-01',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      flag_state: 'non-EU',
      ops_usage: false,
      pilotage_required: true,
      ...callOverrides
    }
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

describe('frozen-2027 fork shape (user ruling 2026-11-23; 2027 documents issued 2026-10-14)', () => {
  it('loads and validates as a port; metadata carries the 2027 validity window', () => {
    expect(port.metadata.id).toBe('hamburg');
    expect(port.metadata.validity_start).toBe('2027-01-01');
    expect(port.metadata.validity_end).toBe('2027-12-31');
  });

  it('carries the tree-inert sentinel: an empty vessels array keeps the converter off the port branch while the year constant is 2026', () => {
    // Mechanism pin for "the 2027 yaml never enters the build": the converter's
    // first branch (Array.isArray(data.vessels)) classifies this file as an
    // empty vessel-library file, so ports.json stays byte-identical
    // (sha256 6a04579c8f63b25b63cf755644dfcd5c125cb908aaea708010f1d85a4d9f3544).
    expect(RAW.vessels).toEqual([]);
  });

  it('the four non-HPA billers are byte-carried: every non-HPA fee rule is identical to the frozen 2026 file', () => {
    const hpaIds = new Set(['hpa_port_fee', 'hpa_demurrage', 'hpa_berth_fee_quay', 'hpa_berth_fee_dolphins']);
    const carried27 = RAW.fee_rules.filter((r: any) => !hpaIds.has(r.id));
    const carried26 = FROZEN_2026.fee_rules.filter((r: any) => !hpaIds.has(r.id));
    expect(carried27).toEqual(carried26);
    expect(carried27.length).toBe(RAW.fee_rules.length - 4);
  });

  it('the per-port configuration sections are byte-carried (the esi_noise_score input surface stays for the flip pass)', () => {
    expect(RAW.default_call).toEqual(FROZEN_2026.default_call);
    expect(RAW.input_profile).toEqual(FROZEN_2026.input_profile);
    expect(RAW.ops_speculative).toEqual(FROZEN_2026.ops_speculative);
    expect(RAW.input_profile.reset_fields).toContain('esi_noise_score');
  });
});

describe('hpa_port_fee at the 2027 published values (pricelist 2027 p. 6, cat. 31 item A; user ruling 2026-11-23)', () => {
  const rs = rule('hpa_port_fee').rate_structure;

  it('tranches A/B/C at 0.0882|0.0220 / 0.3070|0.0768 / 0.2560|0.0640 EUR per GT (rate-index drift)', () => {
    expect(rs.tranches).toEqual([
      { min: null, max: 20000, components: { gt: 0.0882, env: 0.0220 } },
      { min: 20000, max: 100000, components: { gt: 0.3070, env: 0.0768 } },
      { min: 100000, max: null, components: { gt: 0.2560, env: 0.0640 } },
    ]);
  });

  it('cap (item 210) structural: 230,000 GT - no port fee for GT in excess (was 225,000)', () => {
    expect(rs.gt_cap).toBe(230000);
  });

  it('minimum 44.87 EUR per chargeable call (was 43.56)', () => {
    expect(rule('hpa_port_fee').minimum).toBe(44.87);
  });

  it('tier map (item 115) unchanged: 30 / 25 / 5 / -20', () => {
    const tier = rs.component_adjustments.env.find((a: any) => a.kind === 'tier_pct');
    expect(tier.map).toEqual({ 'Tier 0': 30, 'Tier I': 25, 'Tier II': 5, 'Tier III': -20 });
  });

  it('ESI Core (item 140, STC 2027 4.1.1.1): renamed from ESI air, three bands 10-<20: 0.7% cap 350; 20-<35: 3.5% cap 700; >=35: 7.0% cap 1400 (structural restructure, was four bands)', () => {
    const esi = rs.component_adjustments.env.filter((a: any) => a.kind === 'score_discount_pct_with_cap');
    expect(esi.length).toBe(1);
    expect(esi[0].input).toBe('esi_score');
    expect(esi[0].description).toBe('ESI Core');
    expect(esi[0].bands).toEqual([
      { min: 10, max: 20, pct: 0.7, cap: 350 },
      { min: 20, max: 35, pct: 3.5, cap: 700 },
      { min: 35, max: null, pct: 7.0, cap: 1400 },
    ]);
  });

  it('ESI noise RETIRED: absence pin - no adjustment anywhere in the 2027 file consumes esi_noise_score (user ruling 2026-11-23; "noise" appears nowhere in either 2027 document)', () => {
    const consumers = RAW.fee_rules.flatMap((r: any) =>
      (r.rate_structure?.component_adjustments
        ? [...Object.values(r.rate_structure.component_adjustments).flat() as any[]]
        : []).concat(r.adjustments ?? [])
    ).filter((a: any) => a && (a.input === 'esi_noise_score' || /noise/i.test(String(a.description ?? ''))));
    expect(consumers).toEqual([]);
    const esiNoiseRule = RAW.fee_rules.filter((r: any) => /noise/i.test(JSON.stringify(r.rate_structure ?? {})));
    expect(esiNoiseRule).toEqual([]);
  });

  it('OPS rebate (item 217, STC 2027 4.1.2.4): rate_per_gt 0.0125 (was 0.0150, -16.67%); >= 10 MWh shore power per call; time-limited to calls up to and including 31 December 2027; boolean ops_usage input unchanged', () => {
    const ops = rs.component_adjustments.gt.find((a: any) => a.kind === 'per_gt_rebate');
    expect(ops.rate_per_gt).toBe(0.0125);
    expect(ops.condition_input).toBe('ops_usage');
    expect(ops.description).toContain('10 MWh');
    expect(ops.description).toContain('31 December 2027');
  });

  it('Quantum discount (item 280, STC 2027 4.1.2.11): 3.0 / 6.0 / 9.0 percent (was 2.5 / 5.0 / 7.5); band boundaries unchanged (> 1.5 mn, > 10 mn, > 25 mn prior-year GT per beneficiary per calendar year)', () => {
    const q = rs.component_adjustments.gt.find((a: any) => a.kind === 'pct_discount_banded');
    expect(q.input).toBe('quantum_prior_year_gt');
    expect(q.bands).toEqual([
      { min: 1500000, max: 10000000, pct: 3.0 },
      { min: 10000000, max: 25000000, pct: 6.0 },
      { min: 25000000, max: null, pct: 9.0 },
    ]);
  });

  it('source_reference re-points at the archived 2027 pricelist, issued 2026-10-14', () => {
    const sr = rule('hpa_port_fee').source_reference;
    expect(sr.document_name).toBe('pricelist-maritime-shipping-2027.pdf');
    expect(sr.document_url).toBe('docs/sources/germany/hamburg/port-authority/pricelist-maritime-shipping-2027.pdf');
    expect(sr.document_issued).toBe('2026-10-14');
    expect(sr.verified_on).toBe('2026-11-23');
  });
});

describe('hpa_demurrage / berth fees at the 2027 published values (pricelist 2027 p. 7, cat. 31 items B/C; user ruling 2026-11-23)', () => {
  it('demurrage Li 311/312: 0.0170 and 0.0263 EUR/GT per commenced 12 h (was 0.0165/0.0255); minimum 45.71 (was 44.38); structure unchanged (120 h coverage, 120 h excess boundary)', () => {
    const r = rule('hpa_demurrage');
    expect(r.minimum).toBe(45.71);
    expect(r.rate_structure.free_hours).toBe(120);
    expect(r.rate_structure.period_hours).toBe(12);
    expect(r.rate_structure.tiers).toEqual([
      { up_to_excess_hours: 120, rate_per_period_per_basis: 0.0170 },
      { up_to_excess_hours: null, rate_per_period_per_basis: 0.0263 },
    ]);
    expect(r.source_reference.document_name).toBe('pricelist-maritime-shipping-2027.pdf');
    expect(r.source_reference.document_issued).toBe('2026-10-14');
  });

  it('berth fee quay (ALGS 1): 0.0157 EUR/GT per commenced 6 h (was 0.0152); minimum 17.35 (was 16.84), per docking per 6 h', () => {
    const r = rule('hpa_berth_fee_quay');
    expect(r.rate_structure.tiers[0].rate_per_period_per_basis).toBe(0.0157);
    expect(r.rate_structure.minimum_per_period).toBe(17.35);
    expect(r.minimum).toBe(17.35);
    expect(r.rate_structure.period_hours).toBe(6);
  });

  it('berth fee dolphins (ALGS 2): 0.0054 EUR/GT per commenced 6 h (was 0.0052); the 2027 pricelist minimum 17.35 applies to both ALGS items', () => {
    const r = rule('hpa_berth_fee_dolphins');
    expect(r.rate_structure.tiers[0].rate_per_period_per_basis).toBe(0.0054);
    expect(r.rate_structure.minimum_per_period).toBe(17.35);
    expect(r.minimum).toBe(17.35);
  });

  it('all four HPA source_references point at the archived 2027 pricelist', () => {
    for (const id of ['hpa_port_fee', 'hpa_demurrage', 'hpa_berth_fee_quay', 'hpa_berth_fee_dolphins']) {
      const sr = rule(id).source_reference;
      expect(sr.document_url).toBe('docs/sources/germany/hamburg/port-authority/pricelist-maritime-shipping-2027.pdf');
      expect(sr.document_issued).toBe('2026-10-14');
    }
  });
});

describe('Green Award recorded-not-encoded (STC 2027 4.1.1.2 / pricelist 2027 item 145; user ruling 2026-11-23)', () => {
  it('absence pin: the 2027 cat-31 silo encodes no Green Award rule (-3% env, price categories 11/12 only, certificate required) - recorded in the extraction reference only', () => {
    const text = fs.readFileSync(FILE, 'utf8');
    const encoded = RAW.fee_rules.filter((r: any) => /green\s*award/i.test(JSON.stringify(r)));
    expect(encoded).toEqual([]);
    // the note lives in the port-fee comment, never as a rule
    expect(text).toMatch(/Green Award/);
  });
});

describe('engine pins at the 2027 values (user ruling 2026-11-23; pricelist 2027 sample calculation p. 8)', () => {
  it('worked example: 149,000 GT, Tier III, ESI Core 80, OPS (50 MWh), quantum 26 mn GT -> GT 33,675.00 / env 7,231.68 / total 40,906.69 (printed figures verbatim)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 149000,
      engine_tier: 'Tier III',
      engine_tier_estimated: false,
      esi_score: 80,
      ops_usage: true,
      quantum_prior_year_gt: 26000000
    }));
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    expect(gt.amount).toBe(33675.00);
    expect(env.amount).toBe(7231.68);
    expect(portFee.amount).toBe(40906.69);
  });

  it('cap pin: GT 240,000 bills at 230,000 (item 210) - GT component tranches at the cap, Tier 0 +30% env', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 240000,
      built_year: 1990, // Tier 0 +30%
      lay_time_hours: 16
    }));
    const portFee = feeByRule(result, 'hpa_port_fee');
    const gt = portFee.component_amounts!.find(c => c.label === 'GT component')!;
    const env = portFee.component_amounts!.find(c => c.label === 'Environmental component')!;
    // GT: 20,000*0.0882 + 80,000*0.3070 + 130,000*0.2560 = 1,764 + 24,560 + 33,280 = 59,604.00
    expect(gt.amount).toBe(59604.00);
    // env: (440 + 6,144 + 8,320) = 14,904.00 x 1.30 = 19,375.20
    expect(env.amount).toBe(19375.20);
  });

  it('OPS rebate pin: ops_usage true deducts 0.0125 x capped GT; false deducts nothing', () => {
    const on = calculatePortCallCost(port, makeCall({
      gt: 149000, engine_tier: 'Tier III', engine_tier_estimated: false, ops_usage: true
    }));
    const off = calculatePortCallCost(port, makeCall({
      gt: 149000, engine_tier: 'Tier III', engine_tier_estimated: false, ops_usage: false
    }));
    const delta = roundToCent(feeByRule(off, 'hpa_port_fee').amount - feeByRule(on, 'hpa_port_fee').amount);
    expect(delta).toBe(1862.50); // 149,000 x 0.0125
  });

  it('ESI Core band boundaries: score < 10 no discount; 10-<20 0.7%; 20-<35 3.5%; >= 35 7.0% (caps 350/700/1400 pinned structurally above)', () => {
    const envAt = (esi: number) => {
      const result = calculatePortCallCost(port, makeCall({
        gt: 8890, engine_tier: 'Tier I', engine_tier_estimated: false, esi_score: esi
      }));
      return feeByRule(result, 'hpa_port_fee').component_amounts!.find(c => c.label === 'Environmental component')!.amount;
    };
    // env base 8,890 x 0.0220 = 195.58; Tier I +25% -> 244.48 (disp)
    const base = envAt(0); // no band below 10 -> 244.48
    expect(base).toBe(244.48);
    // 0.7% of 244.48 = 1.71136 -> ceil 1.72
    expect(envAt(15)).toBe(242.76);
    // 3.5% of 244.48 = 8.5568 -> ceil 8.56
    expect(envAt(30)).toBe(235.92);
    // 7.0% of 244.48 = 17.1136 -> ceil 17.12
    expect(envAt(40)).toBe(227.36);
    // boundary: 20 belongs to the 3.5% band, 35 to the 7.0% band
    expect(envAt(20)).toBe(envAt(30));
    expect(envAt(35)).toBe(envAt(40));
    expect(envAt(9)).toBe(base);
  });

  it('quantum levels on the GT component: 2 mn -> -3.0%, 12 mn -> -6.0%, 26 mn -> -9.0% (STC 2027 4.1.2.11 steps 1/2/3)', () => {
    const pctAt = (qgt: number) => {
      const result = calculatePortCallCost(port, makeCall({
        gt: 149000, engine_tier: 'Tier III', engine_tier_estimated: false,
        ops_usage: true, quantum_prior_year_gt: qgt
      }));
      const fee = feeByRule(result, 'hpa_port_fee');
      const step = (fee.derivation?.steps ?? [])
        .find((s: any) => /prior-year GT/.test(String(s.detail ?? '')));
      return String(step?.detail);
    };
    expect(pctAt(2000000)).toContain('-3%');
    expect(pctAt(12000000)).toContain('-6%');
    expect(pctAt(26000000)).toContain('-9%');
  });

  it('demurrage pin: 132 h port time -> 12 h excess -> one commenced 12 h at 0.0170 x GT (Li 311)', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 8890, built_year: 2024, port_time_hours: 132, lay_time_hours: 132
    }));
    // 8,890 x 0.0170 = 151.13 (above the 45.71 minimum)
    expect(feeByRule(result, 'hpa_demurrage').amount).toBe(151.13);
  });

  it('demurrage minimum pin: tiny excess bills the 45.71 minimum', () => {
    const result = calculatePortCallCost(port, makeCall({
      gt: 100, built_year: 2024, port_time_hours: 121, lay_time_hours: 121
    }));
    // 100 x 0.0170 = 1.70 < 45.71 minimum
    expect(feeByRule(result, 'hpa_demurrage').amount).toBe(45.71);
  });

  it('berth fee pins: quay 7 h -> 2 commenced 6 h at 0.0157 x GT; dolphins at 0.0054 x GT; 17.35 minimum per period', () => {
    const quay = calculatePortCallCost(port, makeCall({
      gt: 8890, built_year: 2024, hpa_berth_usage: true, berth_type: 'quay', berth_hours: 7
    }));
    // 2 periods x 0.0157 x 8,890 = 279.146 -> 279.15 (raw unrounded until the total)
    expect(feeByRule(quay, 'hpa_berth_fee_quay').amount).toBe(279.15);
    const dolphins = calculatePortCallCost(port, makeCall({
      gt: 8890, built_year: 2024, hpa_berth_usage: true, berth_type: 'dolphins', berth_hours: 7
    }));
    // 2 x 0.0054 x 8,890 = 96.012 -> 96.01
    expect(feeByRule(dolphins, 'hpa_berth_fee_dolphins').amount).toBe(96.01);
    const tiny = calculatePortCallCost(port, makeCall({
      gt: 100, built_year: 2024, hpa_berth_usage: true, berth_type: 'quay', berth_hours: 1
    }));
    // 100 x 0.0157 = 1.57 < 17.35 per-period minimum
    expect(feeByRule(tiny, 'hpa_berth_fee_quay').amount).toBe(17.35);
  });
});
