/**
 * Engine repairs (spec v0.2.53).
 *
 * Two defects fixed in one pass:
 *
 * 1. flag_state handled-set repair. The v0.2.50 contract promised that a
 *    data rule still carrying the retired flag_state condition would be
 *    ignored with a visible warning ("the engine raises a visible warning
 *    if data ever re-carries it"). The implementation put flag_state in
 *    the generic-conditions handled set, so the warning branch below it
 *    was unreachable dead code: a hypothetical flag-gated rule would have
 *    been silently ignored by the generic matcher (or, worse, silently
 *    priced on the raw flag). The contract text was accurate; the
 *    implementation was not. flag_state is removed from the handled set so
 *    the warning branch actually fires (the rule is still never priced on
 *    the flag — it is skipped with the warning).
 *
 * 2. Explicit issc_valid handler (spec 4.4.2 least-favourable rule). The
 *    generic matcher priced a blank (not-entered) ISSC status silently as
 *    the doubled no-ISSC security fee. The explicit handler makes the
 *    three-state contract honest: blank prices the doubled fee with a
 *    visible fallback flag (the least favourable value, never silent);
 *    explicit false carries the SOLAS XI-2/ISPS consequence sentence
 *    (the user attested the absence; nothing was assumed, so it is an
 *    information flag, not a fallback); valid carries no flag at all.
 *
 * Also pins the cargo-due adjudication (audit-confirmed): Helsingborg's
 * Port Dues Cargo prices unitized container goods at 625.00 SEK per unit
 * — 4,000 units on the default call — so the HEL default total keeps its
 * 2,500,000 SEK cargo-due component and no figure moves.
 */
import { calculatePortCallCost } from '../src/engine';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { loadAndValidatePort } from '../src/loader';
import * as path from 'path';
import {
  CostCalculationInput,
  FeeResult,
  PortDefinition,
  VesselInput,
  CallInput
} from '../src/types';

const { port: helsingborg } = loadAndValidatePort(
  path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml')
);

const MAREN_GT = DEFAULT_VESSEL.gt; // 194,849

function makeHelCall(overrides: Record<string, any> = {}): CostCalculationInput['call'] {
  return {
    ...defaultCall('helsingborg'),
    ...overrides
  } as CostCalculationInput['call'];
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`rule ${ruleId} did not fire`);
}

function feesByFamily(result: ReturnType<typeof calculatePortCallCost>, family: string): FeeResult[] {
  return result.billers.flatMap(b => b.fees).filter(f => f.fee_family === family);
}

// ---- flag_state handled-set repair --------------------------------------

describe('flag_state warning branch reachability (spec v0.2.53 repair of the v0.2.50 contract)', () => {
  const makeFlagPort = (): PortDefinition => ({
    metadata: {
      id: 'test_flag_port',
      name: 'Test Flag Port',
      country: 'Test',
      currency: 'SEK',
      validity_start: '2026-01-01',
      validity_end: '2026-12-31'
    },
    billers: [{ id: 'pa', name: 'Port Authority', currency: 'SEK' }],
    // v0.2.59: the synthetic fixture carries the all-disabled OPS posture
    ops_speculative: {
      electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
      demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
      connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
      per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
    },
    fee_rules: [
      {
        id: 'retired_flag_rule',
        fee_family: 'waste',
        biller: 'Port Authority',
        name: 'Retired Flag-Gated Rule',
        applicable_conditions: { flag_state: 'EU' },
        rate_structure: { type: 'flat', amount: 1000 },
        source_reference: {
          document_name: 'Test Tariff',
          document_url: 'http://example.com/test',
          document_issued: '2026-01-01',
          page: 1,
          clause: '1.1',
          verified_on: '2026-01-01',
          verified_by: 'Test User'
        }
      } as any
    ]
  });

  it('a data rule re-carrying the retired flag_state condition is ignored with a visible warning (the v0.2.50-contracted branch actually fires)', () => {
    const input: CostCalculationInput = {
      vessel: { ...DEFAULT_VESSEL },
      call: {
        ...makeHelCall(),
        port_id: 'test_flag_port',
        flag_state: 'EU'
      } as CallInput
    };
    const result = calculatePortCallCost(makeFlagPort(), input);
    // Never priced on the flag: the retired condition is ignored and the
    // rule fires unconditionally (flag_state drives nothing, spec v0.2.50).
    expect(result.total).toBe(1000);
    // And visibly: the warning the v0.2.50 contract promised is raised.
    const warning = result.quality_flags.find(
      f => f.type === 'fallback_value' && f.description.includes('retired flag_state condition')
    );
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
    expect(warning!.description).toContain('flag-based gating was removed in spec v0.2.50');
  });

  it('the warning fires whether or not the call even carries a flag_state value (the branch is condition-reachable, not value-reachable)', () => {
    const input: CostCalculationInput = {
      vessel: { ...DEFAULT_VESSEL },
      call: {
        ...makeHelCall(),
        port_id: 'test_flag_port',
        flag_state: undefined
      } as unknown as CallInput
    };
    const result = calculatePortCallCost(makeFlagPort(), input);
    expect(result.total).toBe(1000);
    expect(result.quality_flags.some(f => f.description.includes('retired flag_state condition'))).toBe(true);
  });

  it('no shipped port file carries a flag_state condition (the warning branch is a guard, not a live path)', () => {
    const { port: gothenburg } = loadAndValidatePort(
      path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml')
    );
    const { port: hamburg } = loadAndValidatePort(
      path.join(__dirname, '..', 'data', 'hamburg_2026.yaml')
    );
    for (const port of [gothenburg, hamburg, helsingborg]) {
      const offenders = port.fee_rules.filter(r => (r.applicable_conditions as any)?.flag_state !== undefined);
      expect(offenders).toEqual([]);
    }
  });
});

// ---- explicit issc_valid handler ----------------------------------------

describe('ISSC three-state contract (spec 4.4.2 least-favourable rule; Helsingborg tariff p.6)', () => {
  it('a valid ISSC prices the single security fee (78.00 SEK/unit) with no fallback flag', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall({ issc_valid: true })
    });
    const fee = feeByRule(result, 'poh_security_fee');
    expect(fee.amount).toBe(312000); // 4,000 units x 78.00
    expect(fee.quality_flags.some(f => f.type === 'fallback_value')).toBe(false);
    expect(result.billers.flatMap(b => b.fees).some(f => f.fee_rule_id === 'poh_security_fee_no_issc')).toBe(false);
  });

  it('a blank (not-entered) ISSC status prices the doubled fee with a visible fallback flag (least favourable, never silent)', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall({ issc_valid: undefined })
    });
    const fee = feeByRule(result, 'poh_security_fee_no_issc');
    expect(fee.amount).toBe(624000); // 4,000 units x 156.00 (doubled)
    const fallback = fee.quality_flags.find(f => f.type === 'fallback_value');
    expect(fallback).toBeDefined();
    expect(fallback!.description).toContain('ISSC status not entered');
    expect(fallback!.description).toContain('doubled security fee');
    expect(fallback!.description).toContain('least favourable value');
    expect(fallback!.severity).toBe('info');
  });

  it('an explicit false carries the SOLAS XI-2/ISPS consequence sentence, not a fallback assumption', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall({ issc_valid: false })
    });
    const fee = feeByRule(result, 'poh_security_fee_no_issc');
    expect(fee.amount).toBe(624000);
    const flag = fee.quality_flags.find(f => f.description.includes('SOLAS XI-2/ISPS'));
    expect(flag).toBeDefined();
    expect(flag!.description).toContain('No valid ISSC attested');
    // The user attested the absence; the tool assumed nothing.
    expect(flag!.description).not.toContain('not entered');
    expect(fee.quality_flags.some(f => f.description.includes('ISSC status not entered'))).toBe(false);
  });

  it('exactly one security line fires per call (the valid and doubled rules are mutually exclusive)', () => {
    for (const issc of [true, false, undefined] as const) {
      const result = calculatePortCallCost(helsingborg, {
        vessel: { ...DEFAULT_VESSEL },
        call: makeHelCall({ issc_valid: issc })
      });
      expect(feesByFamily(result, 'security')).toHaveLength(1);
    }
  });

  it('the HEL default call keeps the valid-ISSC default and the 312,000.00 security line', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall()
    });
    const fee = feeByRule(result, 'poh_security_fee');
    expect(fee.amount).toBe(312000);
    expect(fee.quality_flags.some(f => f.type === 'fallback_value')).toBe(false);
    // v0.2.61 drift re-pin: the HEL default call now carries the sfv_godsavgift
    // line (+268,800.00 SEK; 80,000 t x 3.36 kr/t).
    expect(result.total).toBe(8750057.4);
  });
});

// ---- cargo-due adjudication (audit-confirmed; no figure moves) -----------

describe('Helsingborg cargo-due adjudication (audit-confirmed; spec v0.2.53 record)', () => {
  it('unitized container goods pay 625.00 SEK per unit — the default call keeps its 2,500,000 SEK cargo due', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall()
    });
    const fee = feeByRule(result, 'poh_cargo_due');
    expect(fee.amount).toBe(2500000); // 4,000 units x 625.00
    // v0.2.61 drift re-pin: the HEL default call now carries the sfv_godsavgift
    // line (+268,800.00 SEK; 80,000 t x 3.36 kr/t).
    expect(result.total).toBe(8750057.4);
  });

  it('the unit rate is 625.00 SEK per unit (rate honesty on the line)', () => {
    const result = calculatePortCallCost(helsingborg, {
      vessel: { ...DEFAULT_VESSEL },
      call: makeHelCall()
    });
    const fee = feeByRule(result, 'poh_cargo_due');
    expect(fee.rate_applied).toContain('625');
  });
});
