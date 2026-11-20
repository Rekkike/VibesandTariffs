// Share-of-total composition (spec v0.22.0, user rulings of 2026-11-20):
// the comparison's optional per-view disclosure "Show share of total"
// (default OFF) gains each port's Grand Total ONE compact composition
// strip. Presentation-model layer only - a pure derivation from the
// figures the view already renders; the engine is never touched.
//
// Contract:
//   - ONE BASIS ONLY: the Grand Total exactly as presented (result.total).
//   - Components: the three stage shares (the existing stage labels and
//     the stage sums the view already renders - the same rowsBySegment
//     aggregation, so a suppressed all-zero line contributes zero), the
//     OPS share when an OPS contribution is present (labeled
//     user-specified; this percentage answers the additive OPS question),
//     and the Discounts received share as a SIGNED component when the
//     discount sum is nonzero (percent of the NET total - the v0.2.64
//     line keeps its own "x.xx% of gross (pre-discount) charges" basis;
//     the two labels keep the bases distinct).
//   - The tariff discounts are netted inside the fee amounts the stage
//     sums render, so for the signed discount component to compose the
//     presented total exactly, each negative adjustment step (the
//     engine's own derivation record on its fee) is folded back into
//     the stage that fee renders in (the same charge-type/family ->
//     stage mapping the view uses) - per-fee, never pro-rata, never
//     estimated. The displayed components then sum to the Grand Total
//     exactly before rounding.
//   - LARGEST-REMAINDER ROUNDING at one decimal so the displayed figures
//     themselves sum to exactly 100.0; the strip carries the derived
//     convention ("derived, not a published tariff figure").
//   - A total of zero or negative renders nothing (no division artifact,
//     the grand-total-per-GT precedent); a port with no result renders no
//     strip. No inclusion toggle of any kind: the shares follow the
//     presented total; changing the inputs re-derives them.
import React from 'react';
import { Box } from '@mui/material';
import type { CostCalculationResult } from '@port-cost/core';
import { COMPARISON_STAGES, STAGE_BY_CHARGE_TYPE, chargeTypeForRule, stageForFamily } from './chargeTypes';
import type { ComparisonStageId } from './chargeTypes';

export interface ShareComponent {
  label: string;
  amount: number;
  percent: string;
}

export interface ShareOfTotal {
  total: number;
  components: ShareComponent[];
}

// The rowsBySegment stage groups, structurally (the view passes
// rowsBySegment.rowsByStage straight in).
export interface RowsByStageLike {
  stage: { id: string; label: string };
  chargeTypeRows: { perPort: Map<string, { amount: number }> }[];
  familyRows: { perPort: Map<string, { amount: number }> }[];
}

const roundToCent = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

// Largest-remainder rounding at one decimal: the returned strings are the
// one-decimal percentages of `total` whose values sum to exactly 100.0.
// Ties in the fractional remainder break by component order (stable).
export const largestRemainderPercents = (amounts: number[], total: number): string[] => {
  const tenths = amounts.map(a => (a / total) * 1000);
  const floors = tenths.map(t => Math.floor(t + 1e-9));
  const residual = Math.round(1000 - floors.reduce((s, f) => s + f, 0));
  const order = amounts
    .map((_, i) => i)
    .sort((a, b) => (tenths[b] - floors[b]) - (tenths[a] - floors[a]) || a - b);
  for (let k = 0; k < residual; k++) floors[order[k % order.length]] += 1;
  return floors.map(f => (f / 10).toFixed(1));
};

const stageLabelFor = (id: string): string =>
  COMPARISON_STAGES.find(s => s.id === id)?.label ?? id;

export const buildShareOfTotal = (
  portId: string,
  result: CostCalculationResult | null,
  rowsByStage: RowsByStageLike[]
): ShareOfTotal | null => {
  if (!result || !(result.total > 0)) return null;
  const total = result.total;
  const stageAmounts = new Map<string, number>();
  const stageLabels = new Map<string, string>();
  for (const { stage, chargeTypeRows, familyRows } of rowsByStage) {
    const amount =
      chargeTypeRows.reduce((s, r) => s + (r.perPort.get(portId)?.amount ?? 0), 0) +
      familyRows.reduce((s, r) => s + (r.perPort.get(portId)?.amount ?? 0), 0);
    stageAmounts.set(stage.id, amount);
    stageLabels.set(stage.id, stage.label);
  }
  let discountSum = 0;
  for (const biller of result.billers) {
    for (const fee of biller.fees) {
      for (const step of fee.derivation?.steps ?? []) {
        if (step.kind !== 'adjustment' || typeof step.amount !== 'number' || step.amount >= 0) continue;
        const abs = roundToCent(Math.abs(step.amount));
        discountSum = roundToCent(discountSum + abs);
        const ct = chargeTypeForRule(fee.fee_rule_id);
        const stageId = (ct ? STAGE_BY_CHARGE_TYPE[ct] : stageForFamily(fee.fee_family)) as ComparisonStageId;
        if (!stageLabels.has(stageId)) {
          stageLabels.set(stageId, stageLabelFor(stageId));
          stageAmounts.set(stageId, 0);
        }
        stageAmounts.set(stageId, roundToCent((stageAmounts.get(stageId) ?? 0) + abs));
      }
    }
  }
  const raw: { label: string; amount: number }[] = [];
  for (const stage of COMPARISON_STAGES) {
    if (!stageLabels.has(stage.id)) continue;
    raw.push({ label: stageLabels.get(stage.id)!, amount: stageAmounts.get(stage.id) ?? 0 });
  }
  if (result.ops_speculative) {
    raw.push({ label: 'OPS (user-specified)', amount: result.ops_speculative.amount });
  }
  if (discountSum !== 0) {
    raw.push({ label: 'Discounts received', amount: -discountSum });
  }
  if (raw.length === 0) return null;
  const percents = largestRemainderPercents(raw.map(c => c.amount), total);
  return {
    total,
    components: raw.map((c, i) => ({ label: c.label, amount: c.amount, percent: percents[i] }))
  };
};

// The strip itself: one compact line of "label p.p%" components joined by
// the middot rhythm, plus the derived-convention line. Screen only - the
// print pages never render it (printComparisonPages.tsx is untouched).
export const ShareOfTotalStripView: React.FC<{ strip: ShareOfTotal; testId: string }> = ({ strip, testId }) => (
  <Box
    component="span"
    className="comparison-secondary comparison-share-of-total"
    data-testid={testId}
    sx={{ display: 'block', fontSize: '0.75rem' }}
  >
    <span className="comparison-share-of-total-components" data-testid={`${testId}-components`}>
      {strip.components.map(c => `${c.label} ${c.percent}%`).join(' · ')}
    </span>
    <Box component="span" className="comparison-share-of-total-convention" sx={{ display: 'block' }}>
      share of Grand Total, derived, not a published tariff figure — displayed shares sum to 100%
    </Box>
  </Box>
);
