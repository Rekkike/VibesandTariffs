// Zero-line collapse classification tests (spec v0.2.27)
// Pins which example lines collapse and which informative zeros remain
// visible, and that the disclosure count equals the collapsed set.
import {
  isCollapsibleZeroLine,
  partitionFees
} from './zeroCollapse';
import type { FeeLike, RuleLike } from './zeroCollapse';

const fee = (overrides: Partial<FeeLike> = {}): FeeLike => ({
  fee_rule_id: 'some_rule',
  amount: 100,
  quality_flags: [],
  ...overrides
});

const rule = (overrides: Partial<RuleLike> = {}): RuleLike => ({
  ...overrides
});

describe('zero-line collapse (spec v0.2.27)', () => {
  it('non-zero lines never collapse', () => {
    expect(isCollapsibleZeroLine(fee({ amount: 1 }), rule())).toBe(false);
    expect(isCollapsibleZeroLine(fee({ amount: -1 }), rule())).toBe(false);
  });

  it('a plain unconditional zero line collapses (optional service not ordered)', () => {
    // e.g. hhla_container_service_reception with 0 units: no flags, no floor,
    // no conditions - carries no user-relevant information.
    expect(isCollapsibleZeroLine(fee({ amount: 0 }), rule())).toBe(true);
  });

  it('a zero line with any quality flag remains visible (estimated / contract-vs-published / fallback)', () => {
    expect(
      isCollapsibleZeroLine(fee({ amount: 0, quality_flags: [{ type: 'estimated_parameter' }] }), rule())
    ).toBe(false);
    expect(
      isCollapsibleZeroLine(fee({ amount: 0, quality_flags: [{ type: 'contract_vs_published' }] }), rule())
    ).toBe(false);
    expect(
      isCollapsibleZeroLine(fee({ amount: 0, quality_flags: [{ type: 'fallback_value' }] }), rule())
    ).toBe(false);
  });

  it('a zero line on a minimum-floor rule remains visible (floor did not bind)', () => {
    // e.g. hpa_berth_fee_quay: a minimum is declared, so a zero is information
    // about the charge even when the floor did not bind.
    expect(isCollapsibleZeroLine(fee({ amount: 0 }), rule({ minimum: 16.84 }))).toBe(false);
  });

  it('a zero line on a condition-gated rule remains visible (class variant / explicit user selection)', () => {
    // e.g. sjofartsverket_pilotage_class8_per_half_hour with pilotage hours 0:
    // the rule fired on the vessel's NT class; the zero is the user's own input
    // on an always-relevant nautical charge.
    expect(
      isCollapsibleZeroLine(
        fee({ amount: 0 }),
        rule({ applicable_conditions: { pilotage_required: true, nt_class: 8 } })
      )
    ).toBe(false);
    // ISSC-validity variant (poh_security_fee_no_issc)
    expect(
      isCollapsibleZeroLine(fee({ amount: 0 }), rule({ applicable_conditions: { issc_valid: false } }))
    ).toBe(false);
  });

  it('an empty condition object still collapses (no gate is no gate)', () => {
    expect(isCollapsibleZeroLine(fee({ amount: 0 }), rule({ applicable_conditions: {} }))).toBe(true);
  });

  it('an estimated-parameter or contract-marker rule never hides its zero line', () => {
    expect(
      isCollapsibleZeroLine(fee({ amount: 0 }), rule({ estimated_parameter: { description: 'est.' } }))
    ).toBe(false);
    expect(
      isCollapsibleZeroLine(fee({ amount: 0 }), rule({ contract_vs_published: { description: 'caveat' } }))
    ).toBe(false);
  });

  it('an unknown rule (no attributes) does not collapse - never hide what cannot be classified', () => {
    expect(isCollapsibleZeroLine(fee({ amount: 0 }), undefined)).toBe(false);
  });

  it('partitionFees: disclosure count equals the collapsed set; visible set keeps informative zeros', () => {
    const rules = new Map<string, RuleLike | undefined>([
      ['plain_optional', rule()],
      ['flagged_est', rule()],
      ['floored', rule({ minimum: 500 })],
      ['gated_class_variant', rule({ applicable_conditions: { nt_class: 4 } })],
      ['unknown_rule', undefined]
    ]);
    const fees: FeeLike[] = [
      fee({ fee_rule_id: 'plain_optional', amount: 0 }),
      fee({ fee_rule_id: 'flagged_est', amount: 0, quality_flags: [{ type: 'estimated_parameter' }] }),
      fee({ fee_rule_id: 'floored', amount: 0 }),
      fee({ fee_rule_id: 'gated_class_variant', amount: 0 }),
      fee({ fee_rule_id: 'unknown_rule', amount: 0 }),
      fee({ fee_rule_id: 'plain_optional', amount: 250 })
    ];
    const { visible, collapsed } = partitionFees(fees, rules);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].fee_rule_id).toBe('plain_optional');
    expect(visible.map(f => f.fee_rule_id)).toEqual([
      'flagged_est',
      'floored',
      'gated_class_variant',
      'unknown_rule',
      'plain_optional'
    ]);
  });
});
