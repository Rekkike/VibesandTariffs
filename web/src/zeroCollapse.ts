// Zero-line collapse classification (spec v0.2.27 Presentation Principles).
// Presentation only: amounts, subtotals, and the engine output contract are
// untouched — this module only decides line VISIBILITY in the results views.
//
// A zero-amount fee line collapses out of the main itemization when it carries
// no user-relevant information. A zero line is INFORMATIVE and must remain
// visible when any of the following hold (the deciding rule attributes):
//   1. it carries any quality flag (estimated parameter, contract-vs-published,
//      not-yet-encoded, least-favourable fallback) — transparency survives
//      density (spec v0.2.25 estimate badges);
//   2. its rule declares a minimum-fee floor — a floor that did not bind is
//      information about the charge (the computed amount stands on quantity);
//   3. its rule is condition-gated (applicable_conditions) — it fired on an
//      explicit user selection: a class-variant rule chosen by the vessel's
//      NT class, an ISSC-validity variant, or a present-marked input. This
//      includes the always-relevant nautical charges with user-provided zero
//      inputs (e.g. pilotage hours = 0 with pilotage required): the zero is
//      the user's own input on a charge the call cannot skip;
//   4. its rule carries an estimated-parameter or contract-vs-published marker
//      block (never rendered as verified data, never hidden).
// Otherwise — a plain per-unit/per-day rule, zero quantity, no flags, no
// conditions, no floor — the line carries no user-relevant information and
// collapses into the "charges not applicable" disclosure.

// Structural views of the core types (FeeResult / fee rule); kept local so the
// classifier is dependency-free and unit-testable without the core harness.
export interface FeeLike {
  fee_rule_id: string;
  amount: number;
  quality_flags: unknown[];
}

export interface RuleLike {
  id?: string;
  minimum?: number;
  applicable_conditions?: Record<string, unknown>;
  estimated_parameter?: unknown;
  contract_vs_published?: unknown;
}

export function isCollapsibleZeroLine(
  fee: FeeLike,
  rule: RuleLike | undefined
): boolean {
  if (fee.amount !== 0) return false;
  if (fee.quality_flags.length > 0) return false;
  if (!rule) return false;
  if (rule.minimum !== undefined && rule.minimum !== null) return false;
  if (
    rule.applicable_conditions &&
    Object.keys(rule.applicable_conditions).length > 0
  ) {
    return false;
  }
  if (rule.estimated_parameter) return false;
  if (rule.contract_vs_published) return false;
  return true;
}

// Partition a fee list into the visible lines and the collapsed zero lines.
// The disclosure count always equals the collapsed set (spec v0.2.27 tests).
export function partitionFees<T extends FeeLike>(
  fees: T[],
  ruleById: Map<string, RuleLike | undefined>
): { visible: T[]; collapsed: T[] } {
  const visible: T[] = [];
  const collapsed: T[] = [];
  for (const fee of fees) {
    if (isCollapsibleZeroLine(fee, ruleById.get(fee.fee_rule_id))) {
      collapsed.push(fee);
    } else {
      visible.push(fee);
    }
  }
  return { visible, collapsed };
}
