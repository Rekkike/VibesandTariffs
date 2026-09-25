// Functional-aggregate and band-disclosure tests (spec v0.2.30).
//
// Pins:
//  - classification completeness: every rule in every port file has exactly
//    one functional class, so a future misclassification fails here rather
//    than silently changing an aggregate figure;
//  - the vessel-access aggregate composition per port as an exact rule-id
//    set (canonical default call);
//  - band-disclosure arithmetic: band rows sum to the fee total for the
//    progressive (Gothenburg) and composite-tranche (Hamburg) rules;
//  - effective-per-GT values for the canonical call at each port, including
//    a minimum-binding case (Hamburg port fee at its 43.56 EUR minimum);
//  - the comparability note content the UI renders wherever a cross-country
//    aggregate renders.

import { loadPortFromYaml } from '../src/loader';
import { calculatePortCallCost } from '../src/engine';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { classifyRule, FUNCTIONAL_CLASSES, FunctionalClass } from '../src/classification';
import * as path from 'path';

const DATA = path.join(__dirname, '../data');

function loadPort(file: string) {
  return loadPortFromYaml(path.join(DATA, file));
}

function roundTo2(x: number): number {
  return Math.round(x * 100) / 100;
}

function canonicalCall(portId: string) {
  return {
    vessel: { ...DEFAULT_VESSEL, nt: 30250 },
    call: defaultCall(portId)
  };
}

describe('Functional classification (spec v0.2.30)', () => {
  const files: [string, string][] = [
    ['gothenburg_2026.yaml', 'gothenburg'],
    ['hamburg_2026.yaml', 'hamburg'],
    ['helsingborg_2026.yaml', 'helsingborg']
  ];

  it('assigns exactly one known functional class to every rule in every port file', () => {
    for (const [file, portId] of files) {
      const port = loadPort(file);
      for (const rule of port.fee_rules) {
        const info = classifyRule(rule.id);
        expect(info).toBeDefined();
        expect(FUNCTIONAL_CLASSES).toContain(info!.functional_class);
      }
      expect(port.metadata.id).toBe(portId);
    }
  });

  it('classifies the Swedish national rules identically under both ports\' id prefixes', () => {
    for (const prefix of ['sjofartsverket', 'sfv']) {
      expect(classifyRule(`${prefix}_vessel_fee_class4_csi_a`)!.functional_class).toBe('waterway_fairway_access');
      expect(classifyRule(`${prefix}_readiness_fee_class4`)!.functional_class).toBe('readiness_safety_capacity');
      expect(classifyRule(`${prefix}_pilotage_class4_start`)!.functional_class).toBe('purchased_service');
      expect(classifyRule(`${prefix}_ordering_fee_4_5h`)!.functional_class).toBe('purchased_service');
    }
  });

  it('places the Hamburg Hafenfonds and tonnage dues by what the source documents fund', () => {
    // S4 §9.2.3: "Hafenfonds = port dues" surcharge on quay-tariff fees.
    expect(classifyRule('hhla_hafenfonds_surcharge')!.functional_class).toBe('berth_terminal_infrastructure');
    // S4 §1.2 + §9.1.1: vessel fee for the use of a quayside cargo
    // handling facility.
    expect(classifyRule('hhla_tonnage_dues')!.functional_class).toBe('berth_terminal_infrastructure');
    // S4 §1.4/§1.5: gangway supply and supervision are terminal services.
    expect(classifyRule('hhla_gangway')!.functional_class).toBe('purchased_service');
    expect(classifyRule('hhla_gangway_supervision')!.functional_class).toBe('purchased_service');
    // S4 §1.3.3: security charged per container handled — throughput levy.
    expect(classifyRule('hhla_security_charge')!.functional_class).toBe('cargo_throughput_levy');
  });

  it('classifies the godsavgift as waterway/fairway access — the cargo-based component of the national fairway due (spec v0.2.61)', () => {
    expect(classifyRule('sjofartsverket_godsavgift')!.functional_class).toBe('waterway_fairway_access');
    expect(classifyRule('sfv_godsavgift')!.functional_class).toBe('waterway_fairway_access');
    // The rule fires on the default call: derived cargo tonnes at the
    // planning weights price a real line (the v0.2.30 not-yet-encoded
    // marking is retired by the v0.2.61 encoding).
    const got = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(got, canonicalCall('gothenburg'));
    const godsLine = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'sjofartsverket_godsavgift');
    expect(godsLine).toBeDefined();
    expect(godsLine!.amount).toBeGreaterThan(0);
  });
});

describe('Vessel-access aggregate (spec v0.2.30)', () => {
  it('Gothenburg: aggregate is municipal port dues + national vessel fee + readiness fee, exact rule-id set', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(got, canonicalCall('gothenburg'));
    expect(res.vessel_access).toBeDefined();
    expect(res.vessel_access!.rule_ids.sort()).toEqual([
      'port_gothenburg_container_vessel_dues',
      'sjofartsverket_godsavgift',
      'sjofartsverket_readiness_fee_class8',
      'sjofartsverket_vessel_fee_class8_csi_e'
    ]);
    // Re-pinned for the v0.2.48 default vessel (deliberate change: Maren
    // Maersk 194,849 GT, NT overridden to 30,250 by canonicalCall so class 8
    // still fires; old pin 314,590 at 55,000 GT). Re-pinned again for the
    // v0.2.61 godsavgift promotion: the aggregate gains the waterway/
    // fairway-class godsavgift line (+268,800.00 SEK at the default call's
    // 80,000 derived cargo tonnes x 3.36 kr/t) — 428,219.20 → 697,019.20.
    expect(res.vessel_access!.amount).toBe(697019.20);
    expect(res.vessel_access!.effective_per_gt).toBe(3.58);
    expect(res.vessel_access!.classes.sort()).toEqual([
      'berth_terminal_infrastructure',
      'readiness_safety_capacity',
      'waterway_fairway_access'
    ]);
  });

  it('Hamburg: aggregate is the HPA port fee + HHLA tonnage dues + Hafenfonds surcharge, exact rule-id set', () => {
    const ham = loadPort('hamburg_2026.yaml');
    const res = calculatePortCallCost(ham, canonicalCall('hamburg'));
    expect(res.vessel_access).toBeDefined();
    expect(res.vessel_access!.rule_ids.sort()).toEqual([
      'hhla_hafenfonds_surcharge',
      'hhla_tonnage_dues',
      'hpa_port_fee'
    ]);
    // Hafenfonds is a surcharge on HHLA quay-tariff fees (including the
    // tonnage dues): berth/terminal infrastructure like the fee it uplifts.
    // Re-pinned for the v0.2.48 default vessel (deliberate change: Maren
    // Maersk — 62,030.41 (HPA) + 711,198.85 (tonnage) + 11,697.49
    // (Hafenfonds 1.5%) = 784,926.75; old pin 86,396.96 at 55,000 GT / 16 h).
    expect(res.vessel_access!.amount).toBe(784926.75);
    expect(res.vessel_access!.effective_per_gt).toBe(4.03);
    expect(res.vessel_access!.classes).toEqual(['berth_terminal_infrastructure']);
  });

  it('Helsingborg: aggregate is municipal port dues + national vessel fee + readiness fee, exact rule-id set', () => {
    const hbg = loadPort('helsingborg_2026.yaml');
    const res = calculatePortCallCost(hbg, canonicalCall('helsingborg'));
    expect(res.vessel_access).toBeDefined();
    expect(res.vessel_access!.rule_ids.sort()).toEqual([
      'poh_port_dues',
      'sfv_godsavgift',
      'sfv_readiness_fee_class8',
      'sfv_vessel_fee_class8_csi_e'
    ]);
    // Re-pinned for the v0.2.48 default vessel (deliberate change: Maren
    // Maersk, NT overridden to 30,250 by canonicalCall so class 8 still
    // fires; old pin 600,690 at 55,000 GT). Re-pinned again for the
    // v0.2.61 godsavgift promotion (+268,800.00 SEK):
    // 1,558,655.65 → 1,827,455.65.
    expect(res.vessel_access!.amount).toBe(1827455.65);
    expect(res.vessel_access!.effective_per_gt).toBe(9.38);
  });

  it('the aggregate nets the Sjöfartsverket frequency discount when it applies (6 calls this month)', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const input = canonicalCall('gothenburg');
    const res = calculatePortCallCost(got, {
      vessel: input.vessel,
      call: { ...input.call, calls_this_month: 6 }
    });
    // 6 calls: 0% of the national vessel + readiness fees payable — the
    // negative frequency-discount line nets them out of the aggregate —
    // and the municipal port dues carry their own 50% frequency discount,
    // so the aggregate is the halved municipal dues alone.
    expect(res.vessel_access!.rule_ids).toContain('sjofartsverket_frequency_discount');
    // The positive national lines remain in the set but are netted to zero
    // by the negative discount line, so the aggregate is the municipal dues
    // alone — themselves halved by the Gothenburg 50% frequency discount on
    // port dues. Re-pinned for the v0.2.48 default vessel (deliberate
    // change: 204,279.20 → 102,139.60; old pin 45,325 at 55,000 GT).
    // Re-pinned for the v0.2.61 godsavgift promotion: the godsavgift is
    // a cargo-based fairway due the frequency discount does not adjust
    // (it adjusts vessel_fee + readiness only), so the aggregate now nets
    // the halved municipal dues plus the undiscounted godsavgift line:
    // 102,139.60 + 268,800.00 = 370,939.60.
    expect(res.vessel_access!.amount).toBe(370939.60);
    const nationalSum = res.billers
      .flatMap(b => b.fees)
      .filter(f => [
        'sjofartsverket_vessel_fee_class8_csi_e',
        'sjofartsverket_readiness_fee_class8',
        'sjofartsverket_frequency_discount'
      ].includes(f.fee_rule_id))
      .reduce((s, f) => s + f.amount, 0);
    expect(nationalSum).toBe(0);
  });

  it('the aggregate basis notes state the per-call-by-NT-class basis for the Swedish national fees', () => {
    const hbg = loadPort('helsingborg_2026.yaml');
    const res = calculatePortCallCost(hbg, canonicalCall('helsingborg'));
    const notes = res.vessel_access!.basis_notes.join(' ');
    expect(notes).toContain('per-call by NT class, not per GT');
  });
});

describe('Band disclosure (spec v0.2.30)', () => {
  it('Gothenburg progressive dues: band rows sum to the fee total', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(got, canonicalCall('gothenburg'));
    const dues = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'port_gothenburg_container_vessel_dues')!;
    expect(dues.band_rows).toBeDefined();
    // 194,849 GT (v0.2.48 default vessel) crosses Gothenburg's fourth dues
    // band: 20,000 × 1.96 + 20,000 × 1.71 + 20,000 × 1.15 + 134,849 × 0.80.
    expect(dues.band_rows!.length).toBe(4);
    const sum = dues.band_rows!.reduce((s, r) => s + r.amount, 0);
    expect(sum).toBe(dues.amount);
    expect(dues.band_rows![0].quantity).toBe(20000);
    expect(dues.band_rows![0].components[0].rate).toBe(1.96);
    expect(dues.band_rows![1].quantity).toBe(20000);
    expect(dues.band_rows![2].quantity).toBe(20000);
    expect(dues.band_rows![3].quantity).toBe(134849);
  });

  it('Hamburg composite-tranche port fee: per-tranche GT + env component rows compose the fee', () => {
    const ham = loadPort('hamburg_2026.yaml');
    const res = calculatePortCallCost(ham, canonicalCall('hamburg'));
    const fee = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_port_fee')!;
    expect(fee.band_rows).toBeDefined();
    // 55,000 GT: tranches A (0–20,000) and B (20,001–100,000) are charged;
    // tranche C never fires and renders no row.
    expect(fee.band_rows!.length).toBe(3);
    expect(fee.band_rows![0].quantity).toBe(20000);
    expect(fee.band_rows![1].quantity).toBe(80000);
    expect(fee.band_rows![2].quantity).toBe(94849);
    // Each tranche row carries both components with the published €/GT rates.
    expect(fee.band_rows![0].components.find(c => c.label.includes('GT'))!.rate).toBe(0.0856);
    expect(fee.band_rows![0].components.find(c => c.label.includes('Environmental'))!.rate).toBe(0.0214);
    expect(fee.band_rows![1].components.find(c => c.label.includes('GT'))!.rate).toBe(0.2981);
    expect(fee.band_rows![1].components.find(c => c.label.includes('Environmental'))!.rate).toBe(0.0746);
    expect(fee.band_rows![2].components.find(c => c.label.includes('GT'))!.rate).toBe(0.2485);
    expect(fee.band_rows![2].components.find(c => c.label.includes('Environmental'))!.rate).toBe(0.0621);
    // Band rows are pre-adjustment arithmetic (194,849 GT, v0.2.48 default
    // vessel): 20,000 × 0.0856 + 80,000 × 0.2981 + 94,849 × 0.2485 =
    // 49,129.98 GT; env 20,000 × 0.0214 + 80,000 × 0.0746 + 94,849 × 0.0621
    // = 12,286.12.
    const bandGt = fee.band_rows!.reduce((s, r) => s + (r.components.find(c => c.label.includes('GT'))?.amount ?? 0), 0);
    const bandEnv = fee.band_rows!.reduce((s, r) => s + (r.components.find(c => c.label.includes('Environmental'))?.amount ?? 0), 0);
    expect(bandGt).toBeCloseTo(49129.98, 2);
    expect(bandEnv).toBeCloseTo(12286.12, 2);
    const bandSum = fee.band_rows!.reduce((s, r) => s + r.amount, 0);
    expect(bandSum).toBe(61416.1);
    // The GT component is not Tier-adjusted; the environmental component
    // carries the inferred Tier II surcharge (+5%, from build year 2014 per
    // the v0.2.44 inference contract): 12,286.12 × 1.05.
    const compGt = fee.component_amounts!.find(c => c.label.includes('GT'))!.amount;
    const compEnv = fee.component_amounts!.find(c => c.label.includes('Environmental'))!.amount;
    expect(compGt).toBeCloseTo(bandGt, 2);
    expect(compEnv).toBe(roundTo2(bandEnv * 1.05));
    // Fee total = band sum + the Tier II surcharge on the environmental
    // band amounts: 61,416.10 + 614.31 = 62,030.41.
    expect(fee.amount).toBe(roundTo2(bandSum + bandEnv * 0.05));
    expect(fee.amount).toBe(62030.41);
  });

  it('band rows are pre-adjustment arithmetic: the Tier III discount reduces the fee total below the band sum', () => {
    const ham = loadPort('hamburg_2026.yaml');
    const res = calculatePortCallCost(ham, {
      vessel: { ...DEFAULT_VESSEL, nt: 30250 },
      call: { ...defaultCall('hamburg'), engine_tier: 'Tier III' }
    });
    const fee = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_port_fee')!;
    const bandSum = fee.band_rows!.reduce((s, r) => s + r.amount, 0);
    const bandEnv = fee.band_rows!.reduce((s, r) => s + (r.components.find(c => c.label.includes('Environmental'))?.amount ?? 0), 0);
    expect(bandSum).toBe(61416.1);
    // Tier III (−20%): the environmental component drops to 12,286.12 × 0.80
    // = 9,828.89 and the fee total is the band sum less the 2,457.23 discount
    // (re-pinned for the v0.2.48 default vessel: Maren Maersk's GT bands; old
    // pin 14,576.70 at 55,000 GT).
    expect(fee.component_amounts!.find(c => c.label.includes('Environmental'))!.amount).toBe(9828.89);
    // The float band sum drifts a cent here; the fee total follows the
    // engine's own rounding (bandSum − discount rounded half-up).
    expect(fee.amount).toBe(58958.87);
  });
});

describe('Effective per-GT derived metrics (spec v0.2.30)', () => {
  it('every dues-type line carries an effective per-GT labeled as derived', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(got, canonicalCall('gothenburg'));
    const dues = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'port_gothenburg_container_vessel_dues')!;
    expect(dues.effective_rate).toBeDefined();
    // Re-pinned for the v0.2.48 default vessel (deliberate change):
    // 204,279.20 SEK / 194,849 GT = 1.05 SEK/GT (old pin 1.65 at 55,000 GT).
    expect(dues.effective_rate!.effective_per_gt).toBe(1.05);
  });

  it('Swedish per-call class fees carry the per-call-by-NT-class distorting note', () => {
    const hbg = loadPort('helsingborg_2026.yaml');
    const res = calculatePortCallCost(hbg, canonicalCall('helsingborg'));
    const vesselFee = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'sfv_vessel_fee_class8_csi_e')!;
    expect(vesselFee.effective_rate).toBeDefined();
    expect(vesselFee.effective_rate!.note).toContain('per-call fee by NT class, not per GT');
  });

  it('minimum-binding case: a small vessel at Hamburg pays the 43.56 EUR port-fee minimum, with the note naming the floor', () => {
    const ham = loadPort('hamburg_2026.yaml');
    const res = calculatePortCallCost(ham, {
      vessel: { gt: 50, nt: 30 },
      call: defaultCall('hamburg')
    });
    const fee = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_port_fee')!;
    expect(fee.amount).toBe(43.56);
    expect(fee.effective_rate!.note).toContain('minimum');
    expect(fee.effective_rate!.effective_per_gt).toBe(0.87);
  });

  it('the Gothenburg 500 SEK minimum binds for a small vessel, with the note', () => {
    const got = loadPort('gothenburg_2026.yaml');
    const res = calculatePortCallCost(got, {
      vessel: { gt: 50, nt: 30 },
      call: defaultCall('gothenburg')
    });
    const dues = res.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'port_gothenburg_container_vessel_dues')!;
    expect(dues.amount).toBe(500);
    expect(dues.effective_rate!.note).toContain('minimum');
  });
});

describe('Comparability note (spec v0.2.30)', () => {
  it('the aggregate renders with basis notes naming which functions each country covers', () => {
    const ports = [
      loadPort('gothenburg_2026.yaml'),
      loadPort('hamburg_2026.yaml'),
      loadPort('helsingborg_2026.yaml')
    ];
    const aggregates = ports.map(p => calculatePortCallCost(p, canonicalCall(p.metadata.id)).vessel_access!);
    // Swedish ports: municipal (berth) + national fairway + national
    // readiness. Hamburg: berth/terminal infrastructure only — the national
    // waterway and readiness functions are funded from general taxation, not
    // levied on the call.
    for (const agg of [aggregates[0], aggregates[2]]) {
      expect(agg.classes).toContain('waterway_fairway_access');
      expect(agg.classes).toContain('readiness_safety_capacity');
    }
    expect(aggregates[1].classes).toEqual(['berth_terminal_infrastructure']);
  });
});
