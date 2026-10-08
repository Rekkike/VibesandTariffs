# Unit 2 Blueprint — Rotterdam expansion (v0.7.0 WIP)

This file is the single in-repo source of truth for Unit 2. A fresh session reads
this file plus its sub-unit task — no re-study of the engine, no re-reading of the
full reference unless a sub-unit needs a specific table. The design below was
verified against the published tariff documents in the prior sessions; the
figures are reproduced verbatim and must not be estimated, rounded early, or
changed without red-proof evidence.

## Scope

Two engine extensions, then the Rotterdam dues YAML, pin suites, and the
port-set enumeration drift check. Sub-units, one per session where possible:

- **2a** — engine extensions only: types + engine cases + loader validation +
  the extension test suite (7 pins with red proofs).
- **2b** — the Rotterdam dues YAML with a smoke check against both fixtures.
- **2c** — the Rotterdam pin suite (31 pins expected) with red proofs.
- **2d** — the two port-set enumeration pins (`source_integrity`,
  `country_metadata`, the ninth silo) and the chunked drift check
  (core 746, web 579, the eight existing totals byte-identical).

Commit and push the moment a sub-unit is green. A red tip is acceptable only
with a note telling the next session where it stands.

## Engine extension 1 — `flat_plus_per_gt` on FlatRate with `per_gt_maximum`

A flat component plus a per-GT component in one rule, with an optional ceiling
on the per-GT part.

```ts
// FlatRate additions:
// flat_plus_per_gt (spec v0.7.0, Rotterdam waste fee): a flat component plus a
// per-GT component in one rule — charged = flat_amount + min(GT × per_gt_rate,
// per_gt_maximum when present). The maximum caps the per-GT component only,
// never the flat part.
flat_plus_per_gt?: {
  per_gt_rate: number;   // EUR per GT
  per_gt_maximum?: number; // ceiling on the per-GT component
};
```

Engine behavior:

- `charged = min(flat_amount + GT × per_gt_rate, per_gt_maximum)` when
  `per_gt_maximum` is present, else `flat_amount + GT × per_gt_rate`. The
  maximum caps the **whole fee** (flat + per-GT), never the per-GT component
  alone — proven by the MAREN total arithmetic: 82,803.88 − 29,422.20 −
  13,054.88 − 38,326.80 = 2,000 exactly, which is the published maximum as
  the whole waste line, not 2,220.
- The composition steps render both components and, when capped, the cap line
  (uncapped figure, the maximum, and the applied minimum).
- `amount_input` is not used on `flat_plus_per_gt` rules; the extension owns
  the amount.
- Basis value GT comes from the existing vessel `gt` basis path; a missing GT
  renders null (blank-means-nothing), never a zero-GT charge.

First Rotterdam use — waste fee: flat 220 + 0.05 × GT, max 2,000 on the whole
fee. Break-even at (2,000 − 220) / 0.05 = 35,600 GT; anything above that pays
the 2,000 maximum. The verified MAREN fixture (194,849 GT) is capped by
design. An uncapped case needs a small vessel (GT < 35,600).

## Engine extension 2 — `gt_efficiency_cap` on PerUnitRate

A GT-basis efficiency ceiling on per-unit charges: the vessel's efficiency
(GT per unit) cannot exceed a published cap; the chargeable unit count is the
lesser of the entered count and the GT-implied capped count.

```ts
// PerUnitRate additions:
// gt_efficiency_cap (spec v0.7.0, Rotterdam cargo dues): the chargeable unit
// count is capped by the vessel's GT-implied capacity — charged = min(count ×
// unit_rate, GT × cap_pct × unit_rate). The discount (count − capped count ×
// cap_pct) is shown as a delta on the line, never a silent reduction.
gt_efficiency_cap?: {
  cap_pct: number;      // percent of GT that is chargeable (e.g. 35)
  description?: string; // rendered basis note
};
```

Engine behavior:

- `charged = min(tonnes × rate, GT × (cap_pct / 100) × rate)`.
- When the cap binds, the line shows the uncapped figure, the capped figure,
  and the delta as a discount (rounded up — ceil on discounts per the standing
  rounding design).
- The cap keys on the rule's own unit basis (cargo tonnes); the GT comes from
  the vessel basis.

First Rotterdam use — cargo dues: €0.562/t with the 35% cap
(`cap_pct: 35`). The verified MAREN fixture caps: cargo capped 38,326.80.

## The Rotterdam dues YAML shape

```yaml
port: rotterdam
country: netherlands
currency: EUR
# composite_tranche: vessel dues €0.151/GT + sustainability €0.067/GT,
# with ESI bands 5/10/60/80/100/120% as score_discount_pct_with_cap-style
# component adjustments keyed on the ESI input.
# per_unit cargo: €0.562/t with gt_efficiency_cap cap_pct 35.
# quay fee: €3.86/m/24h, gated on berth_type: 'quay' — never default-fired
#   (a condition gate, not a default; absent berth_type renders nothing).
# draught input: the rotterdam draught input (call input, used by the
#   draught-dependent lines as declared in the reference).
```

Component rates verbatim:

| Component        | Rate      | Basis | Cap / gate                       |
|------------------|-----------|-------|----------------------------------|
| Vessel dues      | €0.151/GT | GT    | —                                |
| Sustainability   | €0.067/GT | GT    | ESI discount bands 5/10/60/80/100/120% |
| Cargo dues       | €0.562/t  | tonnes | gt_efficiency_cap 35% of GT      |
| Quay fee         | €3.86/m/24h | metres × 24h periods | berth_type: 'quay' gate |
| Waste fee        | €220 flat + €0.05/GT | GT | per_gt_maximum 2,000 |

ESI bands (score → discount on the sustainability component): 5, 10, 60, 80,
100, 120 percent. The band thresholds and the ESI input field are per the
reference table; a sub-unit needing them reads that table only.

## Rounding design (verified)

- Half-up per printed step: every printed component figure rounds half-up to
  the cent at the step it is printed.
- Ceil on discounts: discount deltas round up (ceil) to the cent.
- The ESI discount lives in the display chain: it adjusts the printed
  sustainability component, and the printed components are summed for the
  total.
- Worked Example 3 → **€28,179.63 cent-exact**. This is the arithmetic proof
  of the rounding chain; any deviation means the chain is wrong, not the
  example.

## Verified fixtures

### MAREN (MAREN MAERSK, 194,849 GT)

- Port dues: 29,422.20 (vessel) + 13,054.88 (sustainability) = dues lines
- Cargo capped: 38,326.80
- Waste: 2,000 (capped by design at this GT)
- **Total: €82,803.88**

### Second fixture (small vessel — the uncapped cases)

- Waste fee uncapped: needs GT < 35,600 (break-even of the 2,000 maximum).
- Cargo cap: check whether the 35% GT cap binds at the fixture's GT; the
  prior session's cargo failures were fixture-side (wrong container/tonnage
  entries), not engine-side.

## Known test-fixture conventions (from the last session)

- The waste-fee uncapped case needs a small vessel (194,849 GT is capped by
  design).
- The cargo failures were fixture-side: container counts/weights must match
  the fixture sheet exactly, not the planning defaults.
- Fixtures live in the port test suite with in-test attribution of every
  figure to its source table.
- Red proofs: each pin is observed red by reverting the implementation (not
  the fixture), then restored green.

## Standing process rules (unchanged)

- Verification is chunked, always: per-chunk counts, never a single
  full-suite invocation. The web suite hangs in this environment — a known
  fact; chunk it.
- Push after every completed sub-unit. Never carry green work uncommitted.
- Every figure traceable to a source tariff document; no estimation, no
  early rounding.
