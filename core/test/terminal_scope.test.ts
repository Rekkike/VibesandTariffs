/**
 * v0.2.49 Hamburg terminal-scope and ship's-dues pins (diagnosis verdicts,
 * 2026-09-24); re-pinned at v0.2.66 for the Eurogate terminal promotion
 * (extraction reference §17): the default and reference operator is now
 * EUROGATE Container Terminal Hamburg; HHLA remains a switchable terminal
 * variant whose rules and figures are unchanged. A Hamburg call is priced
 * against a named terminal operator: Eurogate items only for Eurogate calls
 * (the default), HHLA items only for HHLA calls (the variant). Verdicts
 * established in the extraction reference sections 16-17 and grounded in
 * S4 (HHLA Quay Tariff), S9 (Eurogate Prices and Conditions), S5 (GTCCH),
 * S6 (Kaibetriebsordnung):
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

const MAREN = { gt: 194849, nt: 97000, loa_m: 399, vessel_type: 'container', built_year: 2014, teu_capacity: 19076 } as any;

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
  it('an absent terminal operator defaults to Eurogate with a visible fallback flag (v0.2.66)', () => {
    const call = baseCall();
    delete call.terminal_operator;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const flag = result.quality_flags.find((f: any) =>
      f.type === 'fallback_value' && /Terminal operator not selected/.test(f.description));
    expect(flag).toBeDefined();
    const berthing = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_berthing_charge');
    expect(berthing).toBeDefined();
  });

  it('an unrecognized terminal operator falls back to Eurogate with a visible flag (v0.2.66)', () => {
    const call = baseCall();
    call.terminal_operator = 'DP World';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const flag = result.quality_flags.find((f: any) =>
      f.type === 'fallback_value' && /DP World.*not recognized/.test(f.description));
    expect(flag).toBeDefined();
    const berthing = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_berthing_charge');
    expect(berthing).toBeDefined();
  });

  it('an explicit HHLA selection prices the unchanged HHLA variant (2,313,489.31), with no fallback flag', () => {
    const explicitCall = baseCall();
    explicitCall.terminal_operator = 'HHLA';
    const explicit = calculatePortCallCost(hamburg, { vessel: MAREN, call: explicitCall });
    expect(explicit.total).toBe(2313489.31);
    const tonnage = feeLines(explicit).find((f: any) => f.fee_rule_id === 'hhla_tonnage_dues');
    expect(tonnage.amount).toBe(711198.85);
    expect(explicit.quality_flags.some((f: any) =>
      f.type === 'fallback_value' && /Terminal operator/.test(f.description))).toBe(false);
  });
  it('the seeded default is the Eurogate call: 2,204,910.90 with no fallback flag (v0.2.66 promotion)', () => {
    const seeded = calculatePortCallCost(hamburg, { vessel: MAREN, call: baseCall() });
    expect(seeded.total).toBe(2204910.90);
    expect(seeded.quality_flags.some((f: any) =>
      f.type === 'fallback_value' && /Terminal operator/.test(f.description))).toBe(false);
    const eCall = baseCall();
    eCall.terminal_operator = 'Eurogate';
    const explicit = calculatePortCallCost(hamburg, { vessel: MAREN, call: eCall });
    expect(explicit.total).toBe(seeded.total);
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
    // The per_unit optional services render zero-amount lines at the default
    // (blank count; same convention as the HHLA container services), while
    // the presence-gated rules (small-call minimum, lay-by, reefer days
    // beyond the first 24 h) render nothing at all.
    const egIds = lines.map((f: any) => f.fee_rule_id).filter((id: any) => /eurogate_/.test(id)).sort();
    expect(egIds).toEqual(['eurogate_berthing_charge', 'eurogate_container_handling',
      'eurogate_imo_surcharge', 'eurogate_lashing', 'eurogate_reefer_first_24h',
      'eurogate_security_charge', 'eurogate_social_fund_surcharge', 'eurogate_twistlocks']);
    for (const gid of ['eurogate_lashing', 'eurogate_twistlocks', 'eurogate_imo_surcharge',
      'eurogate_reefer_first_24h']) {
      expect(lines.find((f: any) => f.fee_rule_id === gid)!.amount).toBe(0);
    }
    for (const gid of ['eurogate_small_call_minimum', 'eurogate_layby_charge',
      'eurogate_reefer_subsequent_24h']) {
      expect(lines.find((f: any) => f.fee_rule_id === gid)).toBeUndefined();
    }
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

  it('Eurogate security 4,000 x 24.95 = 99,800; the 1.5% social fund covers berthing + handling, excluding security (S9 13.1, 1.3.13 - corrected base per §17.2 defect finding)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const security = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_security_charge');
    expect(security.amount).toBe(99800.00);
    const fund = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_social_fund_surcharge');
    expect(fund).toBeDefined();
    expect(fund.amount).toBe(29780.57);
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

/* v0.2.66 promotion pins: the Eurogate optional services (S9 5.2/5.3/5.4/
 * 2.1.4/9.1/9.2) - every rate script-computed from the archived text; the
 * gates verify blank-renders-nothing and the fired arithmetic. */
describe('terminal scope c: Eurogate optional services (v0.2.66, S9 chs. 2/5/9)', () => {
  it('lashing 4,000 x 47.00 = 188,000.00 (S9 5.2.1)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.lashing_containers = 4000;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const line = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_lashing');
    expect(line.amount).toBe(188000.00);
  });
  it('twistlocks 4,000 x 24.00 = 96,000.00 (S9 5.2.2)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.twistlock_containers = 4000;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const line = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_twistlocks');
    expect(line.amount).toBe(96000.00);
  });
  it('IMO surcharge 40 x 87.00 = 3,480.00 (S9 5.3)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.imo_containers = 40;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const line = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_imo_surcharge');
    expect(line.amount).toBe(3480.00);
  });
  it('small-call minimum: exactly 20 handled containers bills 3,308.00; 21 bills the 0.00 band (S9 5.4 boundary)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.small_call_containers = 20;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const line = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_small_call_minimum');
    expect(line.amount).toBe(3308.00);
    const call21 = baseCall();
    call21.terminal_operator = 'Eurogate';
    call21.small_call_containers = 21;
    const result21 = calculatePortCallCost(hamburg, { vessel: MAREN, call: call21 });
    const line21 = feeLines(result21).find((f: any) => f.fee_rule_id === 'eurogate_small_call_minimum');
    expect(line21.amount).toBe(0.00);
  });
  it('lay-by charge: 30 h = 2 commenced 24-h periods x 19,076 TEU x 1.34 = 51,123.68 (S9 2.1.4)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.layby_hours = 30;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const line = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_layby_charge');
    expect(line.amount).toBe(51123.68);
  });
  it('reefer: first 24 h 100 x 181.50 = 18,150.00; 3 subsequent days 100 x 3 x 144.50 = 43,350.00 (S9 9.1/9.2)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.reefer_units = 100;
    call.reefer_extra_days = 3;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const first = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_reefer_first_24h');
    expect(first.amount).toBe(18150.00);
    const subsequent = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_reefer_subsequent_24h');
    expect(subsequent.amount).toBe(43350.00);
  });
  it('the social fund covers the optional services too: lashing + twistlocks + IMO at the default moves -> 1.5% of the expanded base (S9 1.3.13)', () => {
    const call = baseCall();
    call.terminal_operator = 'Eurogate';
    call.lashing_containers = 4000;
    call.twistlock_containers = 4000;
    call.imo_containers = 40;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const fund = feeLines(result).find((f: any) => f.fee_rule_id === 'eurogate_social_fund_surcharge');
    // base = 553,371.16 + 1,432,000 + 188,000 + 96,000 + 3,480 = 2,272,851.16; 1.5% = 34,092.77
    expect(fund.amount).toBe(34092.77);
  });
  it('HHLA calls fire none of the Eurogate optional services even with counts entered (variant isolation)', () => {
    const call = baseCall();
    call.terminal_operator = 'HHLA';
    call.lashing_containers = 4000;
    call.twistlock_containers = 4000;
    call.imo_containers = 40;
    call.reefer_units = 100;
    call.reefer_extra_days = 3;
    call.layby_hours = 30;
    call.small_call_containers = 10;
    const result = calculatePortCallCost(hamburg, { vessel: MAREN, call });
    const egIds = feeLines(result).map((f: any) => f.fee_rule_id).filter((id: any) => /eurogate_/.test(id));
    expect(egIds.length).toBe(0);
  });
});
