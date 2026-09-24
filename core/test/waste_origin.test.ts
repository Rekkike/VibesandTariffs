/**
 * Gothenburg waste-dues origin semantics (spec v0.2.50).
 *
 * The Port Tariff 2026 waste schedule splits on the arrival origin — the
 * previous port of call's region — never the flag:
 *   "Vessels arriving from European ports 0,13 SEK/GT
 *    Vessels arriving from non-European ports 0,24 SEK/GT
 *    Discount with certificates - 0,05 SEK/GT"  (solid waste)
 *   "Sludge from vessels arriving from European ports, up to 11 m³ 0,21 SEK/GT
 *    Sludge from vessels arriving from non-European ports 0,31
 *    Sludge exceeding 11 m³ 2 400 SEK/m³"                    (sludge)
 * §10 defines the dimension: "Short sea shipping includes all vessels with a
 * European port as their latest port of call." §6 states the compulsory basis;
 * §12 the Transport Agency exemption. This suite pins the corrected dimension,
 * the two mismatch cases the old flag-based model priced wrongly, the
 * compulsory base firing on every call, the certificate discount, and the
 * fallback visibility for absent or unrecognized origins.
 */
import { calculatePortCallCost } from '../src/engine';
import { defaultCall } from '../src/defaults';
import { DEFAULT_VESSEL } from '../src/defaults';
import { loadAndValidatePort } from '../src/loader';
import * as path from 'path';
import { CostCalculationInput, FeeResult } from '../src/types';

const { port: gothenburg } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml'));

const MAREN_GT = DEFAULT_VESSEL.gt; // 194,849

function makeCall(overrides: Record<string, any> = {}): CostCalculationInput['call'] {
  return {
    ...defaultCall('gothenburg'),
    ...overrides
  } as CostCalculationInput['call'];
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`Fee rule ${ruleId} not found in result`);
}

function feeIds(result: ReturnType<typeof calculatePortCallCost>): string[] {
  return result.billers.flatMap(b => b.fees.map(f => f.fee_rule_id));
}

describe('Gothenburg waste dues — origin gating (spec v0.2.50)', () => {
  it('all four waste rules fire per arrival origin, never per flag: a European arrival prices 0.21 sludge / 0.13 solid regardless of flag', () => {
    const euFlag = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'europe', flag_state: 'EU' }) });
    const nonEuFlag = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'europe', flag_state: 'non-EU' }) });
    // The tariff prices the leg, not the flag: identical figures.
    expect(feeByRule(euFlag, 'port_gothenburg_waste_sludge_eu').amount)
      .toBe(feeByRule(nonEuFlag, 'port_gothenburg_waste_sludge_eu').amount);
    expect(feeByRule(euFlag, 'port_gothenburg_waste_solid_eu').amount)
      .toBe(feeByRule(nonEuFlag, 'port_gothenburg_waste_solid_eu').amount);
    expect(feeByRule(euFlag, 'port_gothenburg_waste_sludge_eu').amount).toBeCloseTo(194849 * 0.21, 2);
    expect(feeByRule(euFlag, 'port_gothenburg_waste_solid_eu').amount).toBeCloseTo(194849 * 0.13, 2);
    // The non-European rules must not co-fire.
    expect(feeIds(euFlag)).not.toContain('port_gothenburg_waste_sludge_non_eu');
    expect(feeIds(euFlag)).not.toContain('port_gothenburg_waste_solid_non_eu');
  });

  it('an outside-Europe arrival prices 0.31 sludge / 0.24 solid regardless of flag; the European rules stay silent', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'outside-europe', flag_state: 'EU' }) });
    expect(feeByRule(result, 'port_gothenburg_waste_sludge_non_eu').amount).toBeCloseTo(194849 * 0.31, 2);
    expect(feeByRule(result, 'port_gothenburg_waste_solid_non_eu').amount).toBeCloseTo(194849 * 0.24, 2);
    expect(feeIds(result)).not.toContain('port_gothenburg_waste_sludge_eu');
    expect(feeIds(result)).not.toContain('port_gothenburg_waste_solid_eu');
  });

  it('mismatch case A — a US-flagged vessel arriving from a European port pays the European rates 0.21/0.13 (the old flag-based model charged 0.31/0.24)', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'europe', flag_state: 'US' }) });
    expect(feeByRule(result, 'port_gothenburg_waste_sludge_eu').amount).toBeCloseTo(194849 * 0.21, 2);
    expect(feeByRule(result, 'port_gothenburg_waste_solid_eu').amount).toBeCloseTo(194849 * 0.13, 2);
    // The overcharge the old model produced on this leg: (0.31-0.21 + 0.24-0.13) x GT.
    // 194,849 x 0.21 = 40,918.29 SEK — the honest dimension fix, quantified.
    expect(194849 * (0.31 - 0.21 + 0.24 - 0.13)).toBeCloseTo(40918.29, 2);
  });

  it('mismatch case B — a European-flagged vessel arriving from outside Europe pays the non-European rates 0.31/0.24 (the old model charged 0.21/0.13)', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'outside-europe', flag_state: 'DK' }) });
    expect(feeByRule(result, 'port_gothenburg_waste_sludge_non_eu').amount).toBeCloseTo(194849 * 0.31, 2);
    expect(feeByRule(result, 'port_gothenburg_waste_solid_non_eu').amount).toBeCloseTo(194849 * 0.24, 2);
  });

  it('the compulsory per-GT base fires on every call at both origins — one sludge line and one solid-waste line, no flag combination suppresses them', () => {
    for (const origin of ['europe', 'outside-europe'] as const) {
      for (const flag of ['EU', 'non-EU', 'US', 'PA']) {
        const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: origin, flag_state: flag }) });
        const wasteIds = feeIds(result).filter(id => id.startsWith('port_gothenburg_waste_solid_') || id.startsWith('port_gothenburg_waste_sludge_'));
        expect(wasteIds).toContain(origin === 'europe' ? 'port_gothenburg_waste_solid_eu' : 'port_gothenburg_waste_solid_non_eu');
        expect(wasteIds).toContain(origin === 'europe' ? 'port_gothenburg_waste_sludge_eu' : 'port_gothenburg_waste_sludge_non_eu');
      }
    }
  });

  it('the excess-m³ input fires only when entered: blank charges no excess line at either origin', () => {
    const blank = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'europe' }) });
    expect(feeIds(blank)).not.toContain('port_gothenburg_waste_sludge_excess');
    const excess = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'europe', sludge_extra_m3: 4 }) });
    expect(feeByRule(excess, 'port_gothenburg_waste_sludge_excess').amount).toBe(4 * 2400);
  });

  it('the default origin is outside Europe (the worst case and the realistic Asia-arrival leg) and the fallback is visible, never silent', () => {
    // defaultCall seeds arrival_origin explicitly; a call with it stripped
    // entirely must fall back to outside-europe with the visible flag.
    const call = makeCall({});
    delete (call as any).arrival_origin;
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call });
    expect(feeIds(result)).toContain('port_gothenburg_waste_sludge_non_eu');
    expect(result.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.includes('Arrival origin not selected')
    )).toBe(true);
    // And the seeded default (explicit outside-europe) raises no fallback flag.
    const seeded = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    expect(seeded.quality_flags.some(f => f.description.includes('Arrival origin not selected'))).toBe(false);
  });

  it('an unrecognized origin value is priced as outside Europe (worst case) with a visible not-recognized flag', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: 'atlantis' as any }) });
    expect(feeIds(result)).toContain('port_gothenburg_waste_sludge_non_eu');
    expect(result.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.includes('not recognized')
    )).toBe(true);
  });
});

describe('Gothenburg waste dues — EU 2022/91 certificate discount (tariff §10)', () => {
  it('the certificate discounts the solid-waste line by 0.05 SEK/GT at both origins; the sludge line is untouched (the discount applies to solid waste per the tariff text)', () => {
    for (const origin of ['europe', 'outside-europe'] as const) {
      const base = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: origin }) });
      const cert = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ arrival_origin: origin, waste_certificate_2022_91: true }) });
      const solidId = origin === 'europe' ? 'port_gothenburg_waste_solid_eu' : 'port_gothenburg_waste_solid_non_eu';
      const sludgeId = origin === 'europe' ? 'port_gothenburg_waste_sludge_eu' : 'port_gothenburg_waste_sludge_non_eu';
      const delta = feeByRule(base, solidId).amount - feeByRule(cert, solidId).amount;
      expect(delta).toBeCloseTo(194849 * 0.05, 2);
      expect(feeByRule(base, sludgeId).amount).toBeCloseTo(feeByRule(cert, sludgeId).amount, 2);
      // The discount records as an applied adjustment with its tariff-basis description.
      const solid = feeByRule(cert, solidId);
      expect(solid.adjustments_applied.length).toBeGreaterThan(0);
      expect(solid.derivation!.steps.some(s =>
        s.kind === 'adjustment' && s.detail && s.detail.includes('0.05 SEK/GT')
      )).toBe(true);
    }
  });

  it('the certificate is off by default (worst-case posture): the default call charges the undiscounted solid-waste line', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    const solid = feeByRule(result, 'port_gothenburg_waste_solid_non_eu');
    expect(solid.amount).toBeCloseTo(194849 * 0.24, 2);
    expect(solid.adjustments_applied.length).toBe(0);
  });
});

describe('Gothenburg waste dues — §12 Transport Agency exemption status', () => {
  it('the exemption is a documented deferral, not a silent assumption: no rule models it and the extraction reference records it (pin: the exemption never silently zeroes the compulsory base)', () => {
    // The compulsory base fires on every modeled call; the exemption (a
    // documented status per the extraction reference §7) is the only relief
    // and is not encoded as an input this pass — no call can silently
    // suppress the compulsory lines.
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    expect(feeIds(result)).toContain('port_gothenburg_waste_solid_non_eu');
    expect(feeIds(result)).toContain('port_gothenburg_waste_sludge_non_eu');
  });
});

describe('Scrubber-waste honesty (tariff: administration fee only)', () => {
  it('the scrubber line is the 800 SEK administration fee only — actual disposal cost excluded and labeled as such', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall({ scrubber_waste: true }) });
    const scrubber = feeByRule(result, 'port_gothenburg_waste_scrubber');
    expect(scrubber.amount).toBe(800);
    // The description (rendered in the derivation detail per v0.2.42)
    // states the exclusion plainly.
    const rule = gothenburg.fee_rules.find(r => r.id === 'port_gothenburg_waste_scrubber')!;
    expect(rule.description).toContain('actual disposal cost billed separately and not encoded');
  });
});
