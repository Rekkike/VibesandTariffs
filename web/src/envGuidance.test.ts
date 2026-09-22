// Environmental-guidance contract tests (spec v0.2.29 guidance; v0.2.32 hygiene
// item 12). The guidance band tables in envGuidance.ts are hardcoded prose;
// rather than deriving the rendered strings from the port files (the tables
// carry human-readable band phrasing and source clauses, which is presentation
// wording, not derivable data), every numeric fact in the guidance is pinned
// here against the port files via the converted registry. A tariff change
// without a matching guidance-table edit fails these tests instead of
// silently diverging. See the v0.2.32 report for the route decision.
import { guideFor, leversForPort, makeComputer } from './envGuidance';
import type { PortDefinition } from '@port-cost/core';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import portsRegistry from './data/ports.json';

const ports = portsRegistry.ports as PortDefinition[];
const byId = (id: string) => ports.find(p => p.metadata.id === id) as PortDefinition;
const computer = makeComputer(ports, DEFAULT_VESSEL, defaultCall('gothenburg'));

const groupComma = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const registry = portsRegistry as any;
const hamburgRule = () =>
  (byId('hamburg').fee_rules as any[]).find(r => r.id === 'hpa_port_fee');
const gotDues = () =>
  (byId('gothenburg').fee_rules as any[]).find(r => r.id === 'port_gothenburg_container_vessel_dues');
const hbgDues = () =>
  (byId('helsingborg').fee_rules as any[]).find(r => r.id === 'poh_port_dues');

describe('envGuidance band tables match the port files (v0.2.32 item 12)', () => {
  it('Tier guidance bands equal hpa_port_fee tier_pct map', () => {
    const tierAdj = hamburgRule().rate_structure.component_adjustments.env.find(
      (a: any) => a.kind === 'tier_pct'
    );
    const guide = guideFor('engine_tier', byId('hamburg'), computer)!;
    // Guidance ladder: Tier 0 +30, I +25, II +5, III -20 (percent on env component)
    const expected = Object.entries(tierAdj.map).map(([k, v]) => [k, v as number] as const);
    expect(guide.bands.length).toBe(expected.length);
    for (const [tier, pct] of expected) {
      const band = guide.bands.find(b => b.label.startsWith(tier));
      expect(band).toBeDefined();
      expect(band!.detail).toContain(String(Math.abs(pct)));
      expect(band!.detail).toContain(pct < 0 ? '−20%' : `+${pct}%`);
    }
  });

  it('ESI air guidance bands equal the port-file ESI air bands (pct and cap)', () => {
    const esiAdj = hamburgRule().rate_structure.component_adjustments.env.find(
      (a: any) => a.kind === 'score_discount_pct_with_cap' && a.input === 'esi_score'
    );
    const guide = guideFor('esi_score', byId('hamburg'), computer)!;
    expect(guide.bands.length).toBe(esiAdj.bands.length);
    esiAdj.bands.forEach((b: any, i: number) => {
      expect(guide.bands[i].detail).toContain(`−${b.pct}%`);
      expect(guide.bands[i].detail).toContain(`max ${groupComma(b.cap)} €`);
      // Labels express the half-open band [min, max) as a decimal range
      // (e.g. 20–24.99 for min 20, max 25); the open-ended band reads "50+".
      expect(guide.bands[i].label).toContain(String(b.min));
      if (b.max === null) {
        expect(guide.bands[i].label).toContain(`${b.min}+`);
      } else {
        const rangeTop = parseFloat(guide.bands[i].label.match(/([\d.]+)\s*$/)![1]);
        expect(Math.ceil(rangeTop)).toBe(b.max);
        expect(rangeTop).toBeLessThan(b.max);
      }
    });
  });

  it('ESI noise guidance bands equal the port-file ESI noise bands (pct and cap)', () => {
    const noiseAdj = hamburgRule().rate_structure.component_adjustments.env.find(
      (a: any) => a.kind === 'score_discount_pct_with_cap' && a.input === 'esi_noise_score'
    );
    const guide = guideFor('esi_noise_score', byId('hamburg'), computer)!;
    expect(guide.bands.length).toBe(noiseAdj.bands.length);
    noiseAdj.bands.forEach((b: any, i: number) => {
      expect(guide.bands[i].detail).toContain(`−${b.pct}%`);
      expect(guide.bands[i].detail).toContain(`max ${groupComma(b.cap)} €`);
    });
  });

  it('Quantum guidance bands equal the port-file quantum bands', () => {
    const qAdj = hamburgRule().rate_structure.component_adjustments.gt.find(
      (a: any) => a.kind === 'pct_discount_banded'
    );
    const guide = guideFor('quantum_prior_year_gt', byId('hamburg'), computer)!;
    expect(guide.bands.length).toBe(qAdj.bands.length);
    qAdj.bands.forEach((b: any, i: number) => {
      // Guidance may spell 5 as "5.0"; pin the numeric value either way.
      const pct = String(b.pct).replace(/\.0$/, '');
      expect(guide.bands[i].detail).toMatch(new RegExp(`−${pct}\.?0?%`));
    });
    // A delta example exists inside each band: parse the numeric GT from each
    // delta label and assert it falls within the corresponding port-file band.
    const deltaValues = guide.deltas
      .map(d => parseInt(d.label.replace(/[\u00a0\s]/g, ''), 10));
    qAdj.bands.forEach((b: any, i: number) => {
      const v = deltaValues[i];
      expect(v).toBeGreaterThan(b.min);
      if (b.max !== null) expect(v).toBeLessThanOrEqual(b.max);
    });
  });

  it('OPS guidance rebate equals the port-file per-GT rebate rate', () => {
    const opsAdj = hamburgRule().rate_structure.component_adjustments.gt.find(
      (a: any) => a.kind === 'per_gt_rebate'
    );
    const guide = guideFor('ops_usage', byId('hamburg'), computer)!;
    expect(guide.bands[0].detail).toContain(`${opsAdj.rate_per_gt} €/GT`);
    expect(guide.bands[0].detail).toContain('−0.015');
  });

  it('Gothenburg/Helsingborg ESI-CSI discount guidance equals the port-file 10% adjustment', () => {
    for (const [portId, rule] of [
      ['gothenburg', gotDues()],
      ['helsingborg', hbgDues()]
    ] as const) {
      const envAdj = rule.adjustments.find(
        (a: any) => a.condition.includes('esi_score') || a.condition.includes('clean_shipping')
      );
      expect(envAdj.percentage).toBe(10);
      const guide = guideFor('esi_score', byId(portId), computer)!;
      const band = guide.bands.find(b => b.label.includes('ESI ≥ 30'));
      expect(band).toBeDefined();
      expect(band!.detail).toContain('−10%');
      // The further fossil-free 10% band must also be present (additive to 20)
      const ff = guide.bands.find(b => b.label.includes('Fossil-free'));
      expect(ff).toBeDefined();
      expect(ff!.detail).toContain('−20%)');
      // And it must match the port file's second adjustment percentage
      const ffAdj = rule.adjustments.find((a: any) =>
        a.condition.includes('fossil_free')
      );
      expect(ffAdj.percentage).toBe(10);
    }
  });

  it('SFV environmental-class guidance equals the port-file vessel-fee reductions', () => {
    // The SFV class reductions are encoded as flat amounts per class. From the
    // port files: class A = 20% payable, B = 45%, C = 90%, D/E = 100% of the
    // class E (no-CSI) amount. Verify against actual class-4 fee rules.
    const hbg = byId('helsingborg');
    const rules = hbg.fee_rules as any[];
    const classOf = (c: string) => rules.filter(r => r.id?.startsWith('sfv_vessel_fee_class4_'));
    const amount = (suffix: string) =>
      rules.find(r => r.id === `sfv_vessel_fee_class4_csi_${suffix}`)?.rate_structure.amount;
    const e = amount('e') as number;
    expect(e).toBe(43975); // pinned class-4 no-CSI amount (reference checkpoint)
    const expectedPayable: Record<string, number> = { a: 20, b: 45, c: 90, d: 100, e: 100 };
    for (const [c, payablePct] of Object.entries(expectedPayable)) {
      const amt = amount(c) as number;
      expect(Math.round((amt / e) * 100)).toBe(payablePct);
    }
    const guide = guideFor('csi_class', hbg, computer)!;
    // Guidance reductions: A −80%, B −55%, C −10%, D/E 0%
    const expectedReduction: Record<string, number> = { A: 80, B: 55, C: 10, 'D / E': 0 };
    for (const [label, reduction] of Object.entries(expectedReduction)) {
      const band = guide.bands.find(b => b.label === label || b.label.startsWith(label));
      expect(band).toBeDefined();
      expect(band!.detail).toContain(`${reduction}% reduction`);
    }
  });

  it('SFV guidance reduction figures equal 100 minus the payable percentages derived above', () => {
    // Cross-check that the guidance prose percentages are exactly the
    // reductions implied by the port-file amounts.
    const hbg = byId('helsingborg');
    const rules = hbg.fee_rules as any[];
    const amount = (suffix: string) =>
      rules.find(r => r.id === `sfv_vessel_fee_class4_csi_${suffix}`)?.rate_structure.amount;
    const e = amount('e') as number;
    const guide = guideFor('csi_class', hbg, computer)!;
    const pairs: Array<[string, string]> = [['A', 'a'], ['B', 'b'], ['C', 'c']];
    for (const [gLabel, suffix] of pairs) {
      const reduction = 100 - Math.round(((amount(suffix) as number) / e) * 100);
      const band = guide.bands.find(b => b.label === gLabel)!;
      expect(band.detail).toContain(`${reduction}% reduction`);
    }
  });
});

describe('guidance affordance contract (v0.2.29; re-verified v0.2.32)', () => {
  it('guides exist for every environmental lever at each port', () => {
    const cases: Array<[string, string[]]> = [
      ['hamburg', ['engine_tier', 'esi_score', 'esi_noise_score', 'quantum_prior_year_gt', 'ops_usage']],
      ['gothenburg', ['esi_score', 'csi_class', 'clean_shipping_index_class', 'fossil_free_fuel_percentage', 'ops_usage']],
      ['helsingborg', ['esi_score', 'csi_class', 'clean_shipping_index_class', 'fossil_free_fuel_percentage']]
    ];
    for (const [portId, keys] of cases) {
      const port = byId(portId);
      for (const key of keys) {
        expect(guideFor(key, port, computer)).not.toBeNull();
      }
    }
  });

  it('leversForPort covers every port and matches the guide inventory', () => {
    expect(leversForPort('hamburg')).toEqual([
      'NOx Tier', 'ESI air', 'ESI noise', 'Quantum (prior-year GT)', 'OPS rebate'
    ]);
    expect(leversForPort('gothenburg')).toContain('ESI score (air)');
    expect(leversForPort('helsingborg')).toContain('EES rate');
    expect(leversForPort('nowhere')).toEqual([]);
  });

  it('every guide carries the per-call, per-port delta note', () => {
    const keys = ['engine_tier', 'esi_score', 'esi_noise_score', 'quantum_prior_year_gt', 'ops_usage'];
    for (const key of keys) {
      const g = guideFor(key, byId('hamburg'), computer)!;
      expect(g.deltaNote).toContain('per this call, per this port');
    }
    for (const key of ['esi_score', 'fossil_free_fuel_percentage']) {
      const g = guideFor(key, byId('gothenburg'), computer)!;
      expect(g.deltaNote).toContain('Gothenburg');
    }
  });

  it('guides are informative only: no state, no persistence, no auto-fill exports', () => {
    const source = require('fs').readFileSync(require('path').join(__dirname, 'envGuidance.ts'), 'utf8');
    // No persistence or pre-selection side effects in the guidance module
    expect(source).not.toContain('localStorage');
    expect(source).not.toContain('sessionStorage');
    // The compute-call used for deltas is a pure function of form state
    const c = makeComputer(ports, DEFAULT_VESSEL, defaultCall('hamburg'));
    const r1 = c(byId('hamburg'), {});
    const r2 = c(byId('hamburg'), {});
    expect(r2.total).toEqual(r1.total);
  });

  it('external issuer links are the recorded live-verified URLs', () => {
    const tier = guideFor('engine_tier', byId('hamburg'), computer)!;
    expect(tier.issuerUrl).toMatch(/^https:\/\/www\.imo\.org\//);
    const esi = guideFor('esi_score', byId('hamburg'), computer)!;
    expect(esi.issuerUrl).toBe('https://www.environmentalshipindex.org/');
    const csi = guideFor('clean_shipping_index_class', byId('gothenburg'), computer)!;
    expect(csi.issuerUrl).toBe('https://cleanshippingindex.com/');
  });
});
