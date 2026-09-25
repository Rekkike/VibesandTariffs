// Godsavgift encoding (spec v0.2.61): the Sjöfartsverket cargo-based
// fairway due for the Swedish ports — its own transcription in each port
// file (port-silo principle), priced on cargo tonnes derived from the
// call's container counts and shared planning weights.
//
// Arithmetic contract (2026 price list p.5, effective 2026-01-01;
// Föreskrift 2025:6 om farledsavgift):
//   tonnes = 20ft boxes × avg-20 + 40ft boxes × avg-40 (whole-tonne rounding,
//   SJÖFS 16 §); international basis: loaded + discharged (both directions);
//   godsavgift = tonnes × (high share × 3.36 + low share × 1.67).
//
// Default call (Maren Maersk profile): 2,000 loaded + 2,000 discharged
// boxes split 60/40 forty/twenty per side → 1,600 20ft + 2,400 40ft over
// both directions; default weights 14 t / 24 t →
// 1,600 × 14 + 2,400 × 24 = 22,400 + 57,600 = 80,000 tonnes;
// default share 0% → 80,000 × 3.36 = 268,800.00 SEK.
import { loadPortFromYaml } from '../src/loader';
import { calculatePortCallCost } from '../src/engine';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import * as path from 'path';

const DATA = path.join(__dirname, '../data');

function loadPort(file: string) {
  return loadPortFromYaml(path.join(DATA, file));
}

function callWith(overrides: Record<string, unknown>) {
  return { ...defaultCall('gothenburg'), ...overrides } as any;
}

function godsLine(result: ReturnType<typeof calculatePortCallCost>, ruleId: string) {
  return result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === ruleId);
}

describe('Godsavgift — the Swedish national cargo-based fairway due (spec v0.2.61)', () => {
  it('GOT and HEL each carry their own godsavgift rule with the price-list citations (silo discipline)', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const hel = loadPort('helsingborg_2026.yaml');
    const gotRule = got.fee_rules.find(r => r.id === 'sjofartsverket_godsavgift')!;
    const helRule = hel.fee_rules.find(r => r.id === 'sfv_godsavgift')!;
    expect(gotRule).toBeDefined();
    expect(helRule).toBeDefined();
    // Rates per the 2026 price list p.5: high 3.36, low 1.67 kr/tonne.
    expect((gotRule.rate_structure as any).unit_rate).toBe(3.36);
    expect((gotRule.rate_structure as any).value_blend.low_value_rate).toBe(1.67);
    expect((helRule.rate_structure as any).unit_rate).toBe(3.36);
    expect((helRule.rate_structure as any).value_blend.low_value_rate).toBe(1.67);
    // Each port's citation names the price list and the regulation.
    for (const rule of [gotRule, helRule]) {
      expect(rule.source_reference!.document_name).toBe('prislista-farleds-lotsavgifter-2026.pdf');
      expect(rule.source_reference!.page).toBe(5);
      expect((rule.rate_structure as any).value_blend.basis_note).toContain('Föreskrift 2025:6');
    }
  });

  it('the default call derives 80,000 cargo tonnes and prices 268,800.00 SEK at each Swedish port (the new baselines)', () => {
    for (const [file, id, ruleId] of [
      ['gothenburg_2026.yaml', 'gothenburg', 'sjofartsverket_godsavgift'],
      ['helsingborg_2026.yaml', 'helsingborg', 'sfv_godsavgift']
    ] as const) {
      const port = loadPort(file);
      const res = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      const line = godsLine(res, ruleId);
      expect(line).toBeDefined();
      // 1,600 × 14 + 2,400 × 24 = 80,000 tonnes; × 3.36 kr/t = 268,800.00.
      expect(line!.amount).toBe(268800.00);
      expect(line!.band_or_basis).toContain('cargo tonnes=80000');
      expect(line!.band_or_basis).toContain('1600 x 20ft x 14 t');
      expect(line!.band_or_basis).toContain('2400 x 40ft x 24 t');
      expect(line!.band_or_basis).toContain('international basis: loaded + discharged');
    }
  });

  it('the Grand Totals reconcile to the new baselines: GOT 3,275,851.15 / HAM 2,313,489.31 / HEL 8,750,057.40', () => {
    const got = calculatePortCallCost(loadPort('gothenburg_2026.yaml'), { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    const ham = calculatePortCallCost(loadPort('hamburg_2026.yaml'), { vessel: DEFAULT_VESSEL, call: defaultCall('hamburg') });
    const hel = calculatePortCallCost(loadPort('helsingborg_2026.yaml'), { vessel: DEFAULT_VESSEL, call: defaultCall('helsingborg') });
    // Drift classification (expected, per the directive): GOT and HEL each
    // gain exactly the 268,800.00 godsavgift line; HAM is untouched.
    expect(got.total).toBe(3007051.15 + 268800.00);
    expect(hel.total).toBe(8481257.40 + 268800.00);
    expect(ham.total).toBe(2313489.31);
    expect(got.total).toBe(3275851.15);
    expect(hel.total).toBe(8750057.40);
  });

  it('the low-value share drives the blended rate and the amount: 25% low → 2.9375 kr/t → 235,000.00 SEK', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ cargo_low_value_share: 25 })
    });
    const line = godsLine(res, 'sjofartsverket_godsavgift')!;
    // Blend: 3.36 × 0.75 + 1.67 × 0.25 = 2.9375 kr/t;
    // 80,000 × 2.9375 = 235,000.00.
    expect(line.amount).toBe(235000.00);
    expect(line.rate_applied).toContain('2.9375 blended');
    expect(line.rate_applied).toContain('low 1.67 kr/t x 25.00%');
  });

  it('100% low-value: 80,000 × 1.67 = 133,600.00 SEK (the pure low rate)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ cargo_low_value_share: 100 })
    });
    expect(godsLine(res, 'sjofartsverket_godsavgift')!.amount).toBe(133600.00);
  });

  it('the weight inputs change the tonnes and the amount: 20 t / 34 t → 113,600 t → 381,696.00 SEK', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({ cargo_weight_per_20ft: 20, cargo_weight_per_40ft: 34 })
    });
    const line = godsLine(res, 'sjofartsverket_godsavgift')!;
    // 1,600 × 20 + 2,400 × 34 = 32,000 + 81,600 = 113,600 t; × 3.36.
    expect(line.amount).toBe(381696.00);
    expect(line.band_or_basis).toContain('cargo tonnes=113600');
  });

  it('fractional tonnes round to the nearest whole tonne (SJÖFS 16 §): 53.5 t raw → 54 t', () => {
    const port = loadPort('gothenburg_2026.yaml');
    // A whole raw sum prices unrounded: 1 × 14.5 + 1 × 24.5 = 39.0 t;
    // 39 × 3.36 = 131.04.
    const res = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({
        containers_loaded_le20ft: 1, containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 0, containers_discharged_gt20ft: 1,
        cargo_weight_per_20ft: 14.5, cargo_weight_per_40ft: 24.5
      })
    });
    expect(godsLine(res, 'sjofartsverket_godsavgift')!.amount).toBe(131.04);
    // A fractional raw sum rounds to the nearest whole tonne:
    // 2 × 14.5 + 1 × 24.5 = 53.5 → 54; 54 × 3.36 = 181.44.
    const res2 = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({
        containers_loaded_le20ft: 2, containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 0, containers_discharged_gt20ft: 1,
        cargo_weight_per_20ft: 14.5, cargo_weight_per_40ft: 24.5
      })
    });
    expect(godsLine(res2, 'sjofartsverket_godsavgift')!.amount).toBe(181.44);
    expect(godsLine(res2, 'sjofartsverket_godsavgift')!.band_or_basis).toContain('cargo tonnes=54');
  });

  it('zero container counts render no line at all — no zero-tonne line, no division artifacts', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: callWith({
        containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0,
        containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0
      })
    });
    expect(godsLine(res, 'sjofartsverket_godsavgift')).toBeUndefined();
    // Helsingborg too.
    const hel = loadPort('helsingborg_2026.yaml');
    const resHel = calculatePortCallCost(hel, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('helsingborg'), containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0, containers_discharged_le20ft: 0, containers_discharged_gt20ft: 0 } as any
    });
    expect(godsLine(resHel, 'sfv_godsavgift')).toBeUndefined();
  });

  it('Hamburg levies no godsavgift and no cargo-tonnage input group (the descriptor absence)', () => {
    const ham = loadPort('hamburg_2026.yaml');
    expect(ham.fee_rules.some(r => r.id.includes('godsavgift'))).toBe(false);
    const res = calculatePortCallCost(ham, { vessel: DEFAULT_VESSEL, call: defaultCall('hamburg') });
    expect(res.billers.flatMap(b => b.fees).some(f => f.fee_rule_id.includes('godsavgift'))).toBe(false);
  });

  it('the shared planning inputs default in the core call: 14 t / 24 t / 0% (never tariff data)', () => {
    const call = defaultCall('gothenburg');
    expect(call.cargo_weight_per_20ft).toBe(14);
    expect(call.cargo_weight_per_40ft).toBe(24);
    expect(call.cargo_low_value_share).toBe(0);
    // Shared semantics: not in any port's reset_fields (kWh-like).
    const got = loadPort('gothenburg_2026.yaml');
    const hel = loadPort('helsingborg_2026.yaml');
    for (const port of [got, hel]) {
      const resets = (port.input_profile as any)?.reset_fields as string[] | undefined;
      expect(resets).toBeDefined();
      expect(resets!.some(f => f.startsWith('cargo_'))).toBe(false);
    }
  });

  it('the godsavgift line carries the derived effective per-GT with the cargo-basis note (fairway-dues family)', () => {
    const port = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') });
    const line = godsLine(res, 'sjofartsverket_godsavgift')!;
    expect(line.fee_family).toBe('fairway_dues');
    // 268,800 / 194,849 = 1.38 per GT, derived.
    expect(line.effective_rate!.effective_per_gt).toBe(1.38);
    // The basis string discloses the international assumption and the
    // transit limitation (never silently assumed).
    expect(line.band_or_basis).toContain('international basis assumed');
    expect(line.band_or_basis).toContain('transit cargo exempt');
  });

  it('stacks with the Port-of-Helsingborg cargo due at HEL: separate charges, both fire', () => {
    const hel = loadPort('helsingborg_2026.yaml');
    const res = calculatePortCallCost(hel, { vessel: DEFAULT_VESSEL, call: defaultCall('helsingborg') });
    const poh = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'poh_cargo_due')!;
    const gods = godsLine(res, 'sfv_godsavgift')!;
    expect(poh.amount).toBe(2500000.00);
    expect(gods.amount).toBe(268800.00);
  });
});

// Red-proof contract (the pins exist to detect exactly the drift of a
// godsavgift rule removed or mispriced): every figure above is
// script-computed from the engine at the default call — remove the rule,
// break the blend, or break the tonnage derivation and these pins fail.
