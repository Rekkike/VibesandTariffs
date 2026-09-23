/**
 * v0.2.49 Hamburg terminal-scope and ship's-dues pins (diagnosis verdicts,
 * 2026-09-24). A Hamburg call is priced against a named terminal operator:
 * HHLA items only for HHLA calls (the reference default), Eurogate items
 * only for Eurogate calls. Verdicts established in the extraction reference
 * section 16 and grounded in S4 (HHLA Quay Tariff), S9 (Eurogate Prices and
 * Conditions), S5 (GTCCH), S6 (Kaibetriebsordnung):
 *  - verdict one: clause 1.2 tonnage dues apply to fully cellular container
 *    vessels; clause 1.1's parenthetical excludes them from weight dues only
 *  - verdict two: Eurogate bills ship's dues (ch. 2) separately from the
 *    5.1.1 lift charge - no lay-time bundling
 *  - verdict three: the HHLA-dues + Eurogate-anchored-handling hybrid is an
 *    estimate-basis disclosure, not a double count
 * Test vessel: Maren Maersk particulars (GT 194,849, built 2014) at the
 * seeded default call shape (50 h lay time, 800/1200/800/1200 moves).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadPortFromYaml } from '../src/loader';
import { defaultCall } from '../src/defaults';

const hamburg = loadPortFromYaml('data/hamburg_2026.yaml');

const MAREN = { gt: 194849, nt: 97000, loa_m: 399, vessel_type: 'container', built_year: 2014 } as any;

const baseCall = () => {
  const call: any = { ...defaultCall('hamburg') };
  call.lay_time_hours = 50;
  call.port_time_hours = 50;
  call.containers_loaded_le20ft = 800;
  call.containers_loaded_gt20ft = 1200;
  call.containers_discharged_le20ft = 800;
  call.containers_discharged_gt20ft = 1200;
  return call;
};

const feeLines = (result: any) => result.billers.flatMap((b: any) => b.fees);

describe('terminal scope a: default operator and fallback visibility', () => {
  it('an absent terminal operator defaults to HHLA with a visible fallback flag', () => {
    const call = baseCall();
    delete call.terminal_operator;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const flag = result.quality_flags.find((f: any) =>
      f.type === 'fallback_value' && /Terminal operator not selected/.test(f.description));
    expect(flag).toBeDefined();
    const tonnage = feeLines(result).find((f: any) => f.fee_rule_id === 'hhla_tonnage_dues');
    expect(tonnage).toBeDefined();
  });

  it('an unrecognized terminal operator falls back to HHLA with a visible flag', () => {
    const call = baseCall();
    call.terminal_operator = 'DP World';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const flag = result.quality_flags.find((f: any) =>
      f.type === 'fallback_value' && /DP World.*not recognized/.test(f.description));
    expect(flag).toBeDefined();
    const tonnage = feeLines(result).find((f: any) => f.fee_rule_id === 'hhla_tonnage_dues');
    expect(tonnage).toBeDefined();
  });

  it('an explicit HHLA selection prices identically to the seeded default, with no fallback flag', () => {
    const seeded = calculatePortCallCost(hamburg, { vessel: MAREN, call: baseCall() });
    const explicitCall = baseCall();
    explicitCall.terminal_operator = 'HHLA';
    const explicit = calculatePortCallCost(hamburg, { vessel: MAREN, call: explicitCall });
    expect(explicit.total).toBe(seeded.total);
    expect(explicit.total).toBe(2313489.31);
    const tonnage = feeLines(explicit).find((f: any) => f.fee_rule_id === 'hhla_tonnage_dues');
    expect(tonnage.amount).toBe(711198.85);
    expect(explicit.quality_flags.some((f: any) =>
      f.type === 'fallback_value' && /Terminal operator/.test(f.description))).toBe(false);
  });
});

describe('terminal scope b: Eurogate call suppresses HHLA items, keeps port-wide items', () => {
  it('an Eurogate call bills no HHLA line and fires the Eurogate structure', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const lines = feeLines(result);
    const hhlaLines = lines.filter((f: any) => /hhla_/.test(f.fee_rule_id ?? ''));
    expect(hhlaLines.length).toBe(0);
    const egIds = lines.map((f: any) => f.fee_rule_id).filter((id: any) => /eurogate_/.test(id)).sort();
    expect(egIds).toEqual(['eurogate_berthing_charge', 'eurogate_container_handling', 'eurogate_security_charge', 'eurogate_social_fund_surcharge']);
  });

  it('port-wide charges (HPA port fee, pilotage, BUKEA waste, towage) fire on an Eurogate call unchanged', () => {
    const hCall = baseCall();
    hCall.terminal_operator = 'HHLA';
    const hResult = calculatePortCallCost(hamburg, { vessel: MAREN, call: hCall });
    const eCall = baseCall();
    eCall.terminal_operator = 'Eurogate';
    const eResult = calculatePortCallCost(hamburg, { vessel: MAREN, call: eCall });
    const neutralIds = ['hpa_port_fee', 'gdws_pilotage_dues', 'bukea_waste_marpol_i', 'hamburg_towage_estimate'];
    for (const id of neutralIds) {
      const inH = feeLines(hResult).find((f: any) => f.fee_rule_id === id);
      const inE = feeLines(eResult).find((f: any) => f.fee_rule_id === id);
      expect(inH).toBeDefined();
      expect(inE).toBeDefined();
      expect(inE.amount).toBe(inH.amount);
    }
  });

  it('Eurogate berthing arithmetic at 50 h: 194,849 GT x (1.04 + 3 x 0.60) = 553,371.16 (S9 2.1.1-2.1.2)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const berthing = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_berthing_charge');
    expect(berthing.amount).toBe(553371.16);
  });

  it('Eurogate handling is a published rate (no estimated flag) and totals 4,000 x 358 (S9 5.1.1)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const handling = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_container_handling');
    expect(handling.amount).toBe(1432000.00);
    expect(handling.quality_flags.some((f: any) => f.type === 'estimated_parameter')).toBe(false);
  });

  it('Eurogate security 4,000 x 24.95 = 99,800 and the 1.5% social fund applies to the berthing charge (S9 13.1, 1.3.13)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const security = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_security_charge');
    expect(security.amount).toBe(99800.00);
    const fund = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_social_fund_surcharge');
    expect(fund).toBeDefined();
    expect(fund.amount).toBe(8300.57);
  });

  it('no mixed biller set exists for any operator value (HHLA, Eurogate, unknown)', () => {
    for (const op of ['HHLA', 'Eurogate', 'UnknownCo'] as const) {
      const call = baseCall();
      call.terminal_operator = op;
      const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
      const ids = new Set<string>(feeLines(result).map((f: any) => f.fee_rule_id as string));
      const hasHhla = [...ids].some(id => id.startsWith('hhla_'));
      const hasEg = [...ids].some(id => id.startsWith('eurogate_'));
      expect(hasHhla && hasEg).toBe(false);
    }
  });

  it('operator-neutral HPA demurrage fires past 120 h regardless of operator', () => {
    for (const op of ['HHLA', 'Eurogate'] as const) {
      const call = baseCall();
      call.terminal_operator = op;
      call.lay_time_hours = 130;
      call.port_time_hours = 130;
      const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
      const demurrage = feeLines(result).find((f: any) => f.fee_rule_id === 'hpa_demurrage');
      expect(demurrage).toBeDefined();
      expect(demurrage.amount).toBeGreaterThan(0);
    }
  });

  it('HPA berth fees stay scoped away from terminal berths for both operators (hpa_berth_usage false)', () => {
    for (const op of ['HHLA', 'Eurogate'] as const) {
      const call = baseCall();
      call.terminal_operator = op;
      const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
      const berth = feeLines(result).find((f: any) => f.fee_rule_id === 'hpa_berth_fee_quay');
      expect(berth).toBeUndefined();
    }
  });
});
