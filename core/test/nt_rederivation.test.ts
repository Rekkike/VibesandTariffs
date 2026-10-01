/**
 * NT-convention re-derivation pins (spec v0.3.0 — the model-closed pass).
 *
 * The pass re-derived the NT basis of every Sjöfartsverket fee at both
 * Swedish ports (audit: docs/NT_REDERIVATION_AUDIT.md, the committed seam).
 * These pins hold the re-derivation's every contract:
 *   - the class-boundary exact-value semantics (the "lowest nettodrag"
 *     rule: the class is the lowest class whose threshold the NT meets or
 *     exceeds — 3,000 exactly is Class 4, from the class tables' own
 *     "3,000+" notation);
 *   - the registry-citation and masquerade-guard pins (a confirmed NT
 *     renders with its citation and retires the flag; an estimate keeps
 *     its flag and its "NT estimated" note marker);
 *   - the re-derived class-keyed arithmetic per vessel per port
 *     (script-computed, the drift classified in-test);
 *   - the HAM isolation (a library mutation touching Hamburg figures
 *     fails — Hamburg is GT-keyed, verified: zero nt_class conditions);
 *   - the red-proof bases for the drift pins (the old figures asserted
 *     and rejected).
 */
import { calculatePortCallCost, getNetTonnageClass } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL } from '../src/defaults';
import { PortDefinition, CostCalculationInput } from '../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const hel = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml')
).port;
const got = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml')
).port;
const ham = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'hamburg_2026.yaml')
).port;

const library = yaml.load(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'vessel_library.yaml'), 'utf8')
) as { vessels: any[] };

function makeCall(port: PortDefinition, vessel: any, extra: Record<string, unknown> = {}): CostCalculationInput {
  return {
    vessel,
    call: {
      port_id: port.metadata.id,
      date: '2026-09-30',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      csi_class: 'E',
      issc_valid: true,
      pilotage_required: true,
      pilotage_hours: 3,
      pilotage_ordering_lead_time_hours: 4,
      ...extra
    } as any
  };
}

function familyTotal(result: any, family: string): number {
  return result.billers
    .flatMap((b: any) => b.fees)
    .filter((f: any) => f.fee_family === family)
    .reduce((s: number, f: any) => s + f.amount, 0);
}

describe('NT class-boundary exact-value pins (the "lowest nettodrag" semantics, v0.3.0 item 4.1)', () => {
  it('a vessel exactly at a class boundary lands in the higher class (lower-inclusive thresholds)', () => {
    // The class tables' own notation ("3,000+") is the boundary rule: the
    // threshold value itself belongs to the class it names. 3,000 exactly
    // is Class 4, not Class 3.
    expect(getNetTonnageClass(3000)).toBe(4);
    expect(getNetTonnageClass(2999)).toBe(3);
    // Every boundary, both sides:
    expect(getNetTonnageClass(0)).toBe(1);
    expect(getNetTonnageClass(1000)).toBe(2);
    expect(getNetTonnageClass(2000)).toBe(3);
    expect(getNetTonnageClass(6000)).toBe(5);
    expect(getNetTonnageClass(10000)).toBe(6);
    expect(getNetTonnageClass(15000)).toBe(7);
    expect(getNetTonnageClass(30000)).toBe(8);
    expect(getNetTonnageClass(60000)).toBe(9);
    expect(getNetTonnageClass(100000)).toBe(10);
  });

  it('the boundary set is the archived price list\'s: ten classes, no 5,000 boundary (the authority of record)', () => {
    // The HEL extraction reference §4.1 reproduces the thresholds:
    // 0+/1,000+/2,000+/3,000+/6,000+/10,000+/15,000+/30,000+/60,000+/100,000+.
    // There is no 5,000 boundary: 5,000 sits inside the Class 4 band
    // (3,000-5,999); Class 5 starts at 6,000. A 5,000 boundary (the
    // directive's listing) would have made 5,000 the Class 5 threshold.
    expect(getNetTonnageClass(5000)).toBe(4);
    expect(getNetTonnageClass(5999)).toBe(4);
    expect(getNetTonnageClass(6000)).toBe(5);
  });

  it('the class-keyed fee at the exact boundary follows the class function (Class 4 fee at NT exactly 3,000)', () => {
    const v = { gt: 12000, nt: 3000, loa_m: 140, vessel_type: 'container' } as any;
    const r = calculatePortCallCost(hel, makeCall(hel, v));
    expect(familyTotal(r, 'vessel_fee')).toBe(43975.00); // Class 4, CSI E
    expect(familyTotal(r, 'readiness_fee')).toBe(13155.00);
    const r3 = calculatePortCallCost(hel, makeCall(hel, { ...v, nt: 2999 }));
    expect(familyTotal(r3, 'vessel_fee')).toBe(27580.00); // Class 3, CSI E
  });
});

describe('Registry-citation and masquerade-guard pins (v0.3.0 item 4.2)', () => {
  const byName = new Map(library.vessels.map(v => [v.name, v]));

  it('VISTULA MAERSK: NT confirmed with citations; the estimated flag retires for nt', () => {
    const v = byName.get('VISTULA MAERSK')!;
    expect(v.nt).toBe(16947);
    expect(v.estimated_fields).not.toContain('nt');
    // The citation sentence is the confirmation's provenance:
    expect(v.source_note).toContain('NT confirmed: 16,947');
    expect(v.source_note).toContain('Marine MAN');
    // Masquerade guard, red basis: a confirmed value must not claim to be
    // an estimate.
    expect(v.source_note).not.toMatch(/NT estimated/);
  });

  it('HELGAFELL and MAREN MAERSK: observed single-source values keep the estimate flag and the note marker', () => {
    const h = byName.get('HELGAFELL')!;
    expect(h.nt).toBe(3783);
    expect(h.estimated_fields).toContain('nt');
    // The note must surface the estimate (never a registry measurement):
    expect(h.source_note.toLowerCase()).toContain('nt estimated');
    expect(h.source_note).toContain('Marine MAN');
    const m = byName.get('MAREN MAERSK')!;
    expect(m.nt).toBe(79120);
    expect(m.estimated_fields).toContain('nt');
    expect(m.source_note.toLowerCase()).toContain('nt estimated');
    // The reliability caveat is recorded (the defective TEU on the page):
    expect(m.source_note).toContain('reliability caveat');
  });

  it('MSC KYUNGMIN: the v0.3.4 promotion — the observed figure is the model NT, flagged, with the observed band disclosed', () => {
    const k = byName.get('MSC KYUNGMIN')!;
    // v0.3.4 promotion (re-baselined, attributed): 9,654 — the Flexport
    // Atlas aggregator observation (fetched 2026-10-01) corroborating the
    // Marine MAN v0.3.0-era figure; the placement basis is the observation,
    // so the observed band (±10 percent: 8,689–10,619) is the honest band.
    expect(k.nt).toBe(9654);
    expect(k.estimated_fields).toContain('nt');
    expect(k.source_note).toContain('observed, not registry-confirmed');
    // The observed band and the boundary risk are in the note:
    expect(k.source_note).toContain('±10 percent');
    expect(k.source_note).toContain('Class 6 boundary');
  });

  it('the stale class-claim prose is corrected (MAREN Class 9, MSC KYUNGMIN Class 5)', () => {
    const m = byName.get('MAREN MAERSK')!;
    expect(m.source_note).toContain('Class 9');
    expect(m.source_note).not.toContain('Class 7 (15,000+ NT) — the estimate is far above');
    const k = byName.get('MSC KYUNGMIN')!;
    expect(k.source_note).toContain('Class 5');
  });

  it('DEFAULT_VESSEL follows the library (the MAREN NT flows into every default-call figure)', () => {
    const m = byName.get('MAREN MAERSK')!;
    expect(DEFAULT_VESSEL.nt).toBe(m.nt);
    expect(DEFAULT_VESSEL.nt).toBe(79120);
  });
});

describe('The re-derived class-keyed arithmetic per vessel per port (v0.3.0 item 3, script-computed)', () => {
  it('VISTULA at HEL (Class 7, CSI E): the drift figures, classified', () => {
    const v = { gt: 34882, nt: 16947, loa_m: 200, vessel_type: 'container' } as any;
    const r = calculatePortCallCost(hel, makeCall(hel, v));
    // Class drift (was Class 6 at the 13,000 estimate):
    expect(familyTotal(r, 'vessel_fee')).toBe(150310.00); // was 117,385.00 (+32,925)
    expect(familyTotal(r, 'readiness_fee')).toBe(44965.00); // was 35,100.00 (+9,865)
    // Pilotage class 7: start 29,730 + 6 half-hours x 6,735; ordering 1,880:
    expect(familyTotal(r, 'pilotage')).toBe(29730 + 6 * 6735);
    expect(familyTotal(r, 'vessel_fee') + familyTotal(r, 'readiness_fee')).toBe(195275.00);
  });

  it('VISTULA at GOT (Class 7, CSI E): the same national rates through the GOT silo', () => {
    const v = { gt: 34882, nt: 16947, loa_m: 200, vessel_type: 'container', built_year: 2018 } as any;
    const r = calculatePortCallCost(got, makeCall(got, v, { flag_state: 'non-EU' }));
    expect(familyTotal(r, 'vessel_fee')).toBe(150310.00);
    expect(familyTotal(r, 'readiness_fee')).toBe(44965.00);
    expect(familyTotal(r, 'pilotage')).toBe(29730 + 6 * 6735);
  });

  it('HELGAFELL (observed 3,783) stays Class 4 at both ports — value drift, class zero-drift', () => {
    const v = { gt: 8890, nt: 3783, loa_m: 137, vessel_type: 'container', built_year: 2005 } as any;
    for (const p of [got, hel]) {
      const r = calculatePortCallCost(p, makeCall(p, v, p.metadata.id === 'gothenburg' ? { flag_state: 'non-EU' } : {}));
      expect(familyTotal(r, 'vessel_fee')).toBe(43975.00);
      expect(familyTotal(r, 'readiness_fee')).toBe(13155.00);
    }
  });

  it('MAREN (observed 79,120) stays Class 9 at both ports — value drift, class zero-drift', () => {
    const v = { gt: 194849, nt: 79120, loa_m: 399, vessel_type: 'container', built_year: 2014 } as any;
    for (const p of [got, hel]) {
      const r = calculatePortCallCost(p, makeCall(p, v, p.metadata.id === 'gothenburg' ? { flag_state: 'non-EU' } : {}));
      expect(familyTotal(r, 'vessel_fee')).toBe(201805.00);
      expect(familyTotal(r, 'readiness_fee')).toBe(60370.00);
    }
  });

  it('MSC KYUNGMIN (observed 9,654, Class 5 — the v0.3.4 promotion; both 8,000 and 9,654 are Class 5, no dues movement) — the honest class used, the boundary notice a web-layer contract', () => {
    const v = { gt: 21979, nt: 9654, loa_m: 171.92, vessel_type: 'container', built_year: 2024 } as any;
    const r = calculatePortCallCost(hel, makeCall(hel, v));
    expect(familyTotal(r, 'vessel_fee')).toBe(80755.00); // Class 5 used
    // The alternative class (6) is disclosed by the web notice, never billed:
    expect(familyTotal(r, 'vessel_fee')).not.toBe(117385.00);
  });
});

describe('HAM isolation (v0.3.0 item 4.4 — red proof: a library mutation touching HAM figures fails)', () => {
  it('Hamburg carries zero NT-keyed rules (the GT-keyed re-verification)', () => {
    const ntKeyed = (ham.fee_rules ?? []).filter(
      r => (r.applicable_conditions as any)?.nt_class !== undefined
    );
    expect(ntKeyed).toHaveLength(0);
  });

  it('the NT change is invisible at Hamburg: the library mutation red basis', () => {
    // The v0.3.0 library change (three NT values moved) must not move any
    // Hamburg figure. The engine computes HAM from GT (its vessel_fee
    // family exists - HHLA tonnage dues, Eurogate berthing - but keys on
    // GT and lay time, never NT); the red proof mutates the library NT and
    // asserts the HAM total is byte-identically unchanged.
    const call = {
      port_id: 'hamburg',
      date: '2026-09-30',
      vessel_type: 'container',
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 0,
      containers_discharged_gt20ft: 0,
      calls_this_month: 1,
      engine_tier: 'Tier II',
      pilotage_required: true,
      pilotage_hours: 4,
      pilotage_segment_pct: 100,
      issc_valid: true,
      lay_time_hours: 50,
      port_time_hours: 50,
      gangway_class: 'overseas',
      gangway_count: 1,
      gangway_supervision_hours: 0,
      towage_amount: 15000,
      handling_rate_per_move: 358
    } as any;
    const withNewNt = calculatePortCallCost(ham, { vessel: { ...DEFAULT_VESSEL }, call });
    // The mutation (red basis): the pre-pass MAREN NT (70,000) and an
    // arbitrary NT both produce the byte-identical HAM total.
    const withOldNt = calculatePortCallCost(ham, { vessel: { ...DEFAULT_VESSEL, nt: 70000 }, call });
    const withOtherNt = calculatePortCallCost(ham, { vessel: { ...DEFAULT_VESSEL, nt: 120000 }, call });
    expect(withNewNt.total).toBe(withOldNt.total);
    expect(withNewNt.total).toBe(withOtherNt.total);
    // And the pre-pass default-call baseline figure holds (the web suites
    // pin the exact rendered figure; the core red proof is the invariance).
    expect(withNewNt.total).toBe(withOldNt.total);
  });
});

describe('Drift-pin red bases (v0.3.0 item 4.5 — the old figures must fail, the new pass)', () => {
  it('the old VISTULA class-6 figures are rejected at the re-derived NT', () => {
    const v = { gt: 34882, nt: 16947, loa_m: 200, vessel_type: 'container' } as any;
    const r = calculatePortCallCost(hel, makeCall(hel, v));
    expect(familyTotal(r, 'vessel_fee')).not.toBe(117385.00); // the old pin, now red
    expect(familyTotal(r, 'readiness_fee')).not.toBe(35100.00);
    expect(familyTotal(r, 'vessel_fee')).toBe(150310.00); // the new pin, green
  });

  it('the old estimated NT values are rejected by the library pins', () => {
    const byName = new Map(library.vessels.map(x => [x.name, x]));
    expect(byName.get('VISTULA MAERSK')!.nt).not.toBe(13000);
    expect(byName.get('HELGAFELL')!.nt).not.toBe(3200);
    expect(byName.get('MAREN MAERSK')!.nt).not.toBe(70000);
  });
});
