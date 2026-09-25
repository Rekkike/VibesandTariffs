// Discount-line model (spec v0.2.64, comparison-legibility pass): the
// tariff-derived discount inventory behind the comparison's "Discounts
// received" line. Presentation-layer only - the amounts are the engine's
// own derivation adjustment deltas, recomputed by nothing here.
//
// Contract:
//   - Tariff-derived only. Every component is a negative
//     derivation-transparency adjustment step (spec v0.2.42) recorded by the
//     engine on a fee the tariff produced - rule-level adjustments
//     (discounts with conditions, additive discount stacks, per-GT
//     rebates), component adjustments (Tier, ESI air/noise, Quantum, the
//     HPA OPS rebate), and the per-biller frequency-discount line. The
//     speculation inputs never enter: OPS amounts live outside the fee
//     results (the ops_speculative block carries no derivation steps and
//     no fee), and the frequency what-if panel (spec v0.2.63) never feeds
//     the engine, so it can contribute no adjustment step at any call
//     count. Exclusion is structural, not filtered.
//   - The sum is the absolute value of the negative deltas - the total
//     price reduction the tariff granted on this call.
//   - Gross (pre-discount) charges = tariff-derived net charges +
//     the discount sum; the percentage is currency-neutral (sum / gross),
//     never converted.
//   - Each itemization component carries its citation from the engine's
//     own source_reference on the fee the adjustment adjusted.
import type { CostCalculationResult } from '@port-cost/core';

export interface DiscountComponent {
  label: string;
  detail: string;
  amount: number;
  citation: string;
}

export interface DiscountLine {
  sum: number;
  components: DiscountComponent[];
  grossCharges: number;
  percentage: number;
}

const roundToCent = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const buildDiscountLine = (result: CostCalculationResult): DiscountLine => {
  const components: DiscountComponent[] = [];
  for (const biller of result.billers) {
    for (const fee of biller.fees) {
      const steps = fee.derivation?.steps ?? [];
      for (const step of steps) {
        if (step.kind !== 'adjustment') continue;
        if (typeof step.amount !== 'number' || step.amount >= 0) continue;
        const ref = fee.source_reference;
        components.push({
          label: step.label,
          detail: step.detail ?? '',
          amount: roundToCent(Math.abs(step.amount)),
          citation: `${ref.document_name} (p. ${ref.page}, ${ref.clause})`
        });
      }
    }
  }
  const sum = roundToCent(components.reduce((s, c) => s + c.amount, 0));
  // Tariff-derived net charges: the Grand Total minus the user-specified
  // OPS block when entered (the block is outside the tariff-traceability
  // contract; the discounts adjusted tariff lines only, so the gross
  // basis excludes it).
  const tariffDerivedNet = roundToCent(result.total - (result.ops_speculative?.amount ?? 0));
  const grossCharges = roundToCent(tariffDerivedNet + sum);
  const percentage = grossCharges > 0 ? (sum / grossCharges) * 100 : 0;
  return { sum, components, grossCharges, percentage };
};
