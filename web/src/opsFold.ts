// GOT per-GT OPS fold (spec v0.2.70): the three-part decomposition of the
// port dues family's derived per-GT figure at a port whose user-specified
// per-GT OPS component shares the port dues' own GT basis.
//
// The fold is presentation-only (zero figure drift): the family AMOUNT
// never carries the user figure; no stage sum, family amount, or aggregate
// moves at any input state. What folds is the per-GT METRIC and the
// per-GT component's line placement: where the port dues family's derived
// per-GT figure renders, and the port carries an entered per-GT OPS
// charge on the same GT basis, three labeled figures render together per
// the settled design:
//   (a) the banded-tariff-derived per-GT — the family's tariff amount
//       alone ÷ vessel GT (today's figure, byte-identical at blank);
//   (b) the user-specified flat OPS per-GT — the entered rate, unbanded;
//   (c) the resulting combined derived per-GT — (a) + (b), which the
//       family carries into the comparison.
//
// Boundary (audited, docs/GOT_OPS_FOLD_AUDIT.md): the fold applies exactly
// where the port's OPS descriptor enables the per-GT component AND the
// port dues family's tariff portion is genuinely banded (a progressive or
// composite-tranche rate structure) — the condition is data-derived from
// the port file, never a port-id string. Helsingborg carries a per-GT OPS
// component (a directive-premise correction: its descriptor enables it),
// but its port dues are a single published flat per-GT rate (6.85 SEK/GT,
// no banding); folding a user flat rate into a published-flat family is
// the masquerade the honesty contract forbids, so HEL does not fold and
// its per-GT OPS line keeps rendering as its own line. Hamburg has no
// per-GT component at all (descriptor disabled). The fold is therefore
// Gothenburg-only today by condition rather than by name: a future port
// with banded port dues and a per-GT OPS component folds automatically,
// and a published-flat-rate port never does.

import type { CostCalculationResult, PortDefinition } from '@port-cost/core';

export interface OpsFoldParts {
  // (a) the tariff portion: the family's tariff amount ÷ vessel GT
  tariffPortionPerGt: number;
  // (b) the user-specified flat rate as entered (unbanded)
  userFlatPerGt: number;
  // (c) (a) + (b), the combined derived figure
  combinedPerGt: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// The entered per-GT OPS line on a result, or null when the call carries
// none (the engine emits ops_spec_per_gt only when the port's descriptor
// enables the component, a rate is entered, and GT > 0 — the engine's own
// gate, read from the result rather than re-derived).
export const opsPerGtLineFor = (
  result: CostCalculationResult | null
): { id: string; label: string; basis: string; amount: number } | null => {
  const line = result?.ops_speculative?.lines.find(l => l.id === 'ops_spec_per_gt');
  return line ?? null;
};

// The fold's family-level condition (spec v0.2.70 against the v0.2.68
// contract): the port dues family's figure must NOT be the published flat
// rate — folding a user flat rate into a published-flat family is the
// masquerade the honesty contract forbids (either the label flips or a
// user figure rides a "published" metric). The comparison layer passes
// its own v0.2.68 condition (published_per_gt undefined — the family
// figure aggregates); the workspace layer passes the equivalent
// single-per-GT-rule/no-adjustment condition over the family's fees.
// The banded-ness itself is read from the port's data (progressive or
// composite-tranche port dues — the tariff portion genuinely aggregates
// through bands and discounts), so the condition is data-derived, never
// a port-id string.
export const portDuesBanded = (port: PortDefinition): boolean =>
  (port.fee_rules ?? []).some(
    rule =>
      rule.fee_family === 'port_dues' &&
      (rule.rate_structure as { type?: string } | undefined)?.type !== undefined &&
      ['progressive', 'composite_tranche'].includes(
        (rule.rate_structure as { type?: string } | undefined)?.type ?? ''
      )
  );

// The fold's applicability at a port: an entered per-GT OPS line exists
// AND the port dues family's tariff basis is genuinely banded. Pure;
// reads the result's own records and the port's own data.
export const opsFoldActive = (
  port: PortDefinition,
  result: CostCalculationResult | null
): boolean => opsPerGtLineFor(result) !== null && portDuesBanded(port);

// The three-part decomposition (spec v0.2.70 item 2.2) for a port-dues
// tariff amount. Pure; renders nothing, moves nothing. The (b) component
// is the entered rate recovered from the engine's own line record
// (amount ÷ GT — the line's basis string carries the same arithmetic);
// (c) is (a) + (b) as the directive defines it, so the rendered figures
// satisfy the legibility arithmetic by construction.
export const opsFoldParts = (
  tariffPortionAmount: number,
  opsLineAmount: number,
  vesselGt: number
): OpsFoldParts | null => {
  if (!vesselGt || vesselGt <= 0) return null;
  const tariffPortionPerGt = round2(tariffPortionAmount / vesselGt);
  const userFlatPerGt = round2(opsLineAmount / vesselGt);
  return {
    tariffPortionPerGt,
    userFlatPerGt,
    combinedPerGt: round2(tariffPortionPerGt + userFlatPerGt)
  };
};
