# GOT per-GT OPS fold — audit (v0.2.70, item 1; the committed seam)

Directive: fold Gothenburg's user-specified per-GT OPS component into the
port dues family with a full three-part decomposition disclosed on every
surface where the family's derived SEK/GT appears. Presentation pass, zero
figure drift. This document is the audit of record; the spec changelog row
and §4.2.4's fold paragraph are the contract text.

Baseline at audit time: `24889d3` (v0.2.69), clean tree; 531 core / 400 web
verified at baseline (GOT 3,275,851.15 SEK / 16.81; HAM 2,204,910.90 EUR /
11.32 / 127.59 SEK-GT; HEL 8,750,057.40 SEK / 44.91 — all byte-identical to
the pinned baselines, engine probe confirmed).

## Item 1.1 — the OPS surface map (every port)

**The engine layer (core).** The OPS speculative block is computed in
`calculatePortCallCost` (core/src/engine.ts:1875–1941) from the port's own
`ops_speculative` descriptor (data per port file, spec v0.2.59). Four
components, each enabled per port:

| Port | electricity | demand | connection | per_gt | currency |
|---|---|---|---|---|---|
| Gothenburg | enabled | enabled | disabled | **enabled** | SEK |
| Hamburg | enabled | disabled | enabled | **disabled** | EUR |
| Helsingborg | enabled | enabled | enabled | **enabled** | SEK |

The per-GT line (`ops_spec_per_gt`) fires on
`ops_per_gt_charge !== 0 && vessel.gt > 0`, amount = GT × rate, basis
string `"<GT> GT × <rate> SEK/GT (user-specified, not tariff-derived)"`.
The block rides `result.ops_speculative` (undefined when all inputs blank
— blank changes no total, renders nothing), and `result.total` already
includes it (`grandTotal = total + ops.amount`, engine.ts:1932).

**Directive premise correction (reported, adjudicated).** The directive
states "HAM and HEL OPS bases are not per-GT, and the fold applies only
where the user-specified charge shares the port dues' own GT basis."
Half of that premise is wrong: Helsingborg's descriptor carries
`per_gt: { enabled: true }` (helsingborg_2026.yaml:2754) — the HEL
workspace renders a per-GT OPS input, and a HEL entry prices a HEL
`ops_spec_per_gt` line exactly as GOT's does (probed: HEL 0.2 SEK/GT ×
194,849 GT = 38,969.80 SEK). The fold boundary is therefore NOT "GOT
only because only GOT has a per-GT component." The correct boundary is
adjudicated below (item 1.2) and is GOT-only — but for the
published/derived contract reason, not the descriptor's shape. HAM is
correctly excluded by the directive's own premise (per_gt disabled).

**The workspace surface (per port).** Three render sites consume
`ops_speculative`:

1. **The grand-total strip segmentation** (portWorkspace.tsx:492–499):
   when present, a strip line "user [badge] OPS user-specified: X
   (tariff-derived: total − X)". This is the v0.2.57 contract — the
   Grand Total distinguishes tariff-derived from user-specified
   contributions. The strip renders for ANY entered OPS component
   (electricity, demand, connection, per-GT alike).
2. **The OPS speculative block** (portWorkspace.tsx:930–946): the
   separated block "OPS (user-specified, not tariff-derived)" with each
   entered line (label / basis / amount) and the OPS subtotal. Below the
   biller fee tables; never interleaved with tariff lines.
3. **The fee tables**: nothing — the OPS block is deliberately outside
   the billers (the engine emits it beside `billers`, not inside), so no
   fee-family row carries it.

The per-GT OPS input itself is per-port state
(`ops_per_gt_charge` in every port's `reset_fields` — gothenburg:2836,
hamburg:2007, helsingborg:2782), its helper text carrying the v0.2.64
disclosures ("same GT basis as the port dues", "no published tariff
prices container-terminal OPS per GT"; pinned at discountLine.test.tsx:471).

**The comparison surface.** Four sites consume `ops_speculative`:

1. **The OPS row** (comparisonView.tsx:453–478, desktop; 304–311, mobile
   card): "OPS (user-specified, not tariff-derived) — included in the
   Grand Total", rendered inside the at-berth stage fragment before the
   Grand Total, per-port figures, em-dash for ports without values, no
   absence wording. Rendered when ANY port in the comparison carries an
   entered OPS value.
2. **The grand-total per-GT secondary** (`grandTotalPerGtCell`,
   comparisonCells.tsx:174–215): `total / GT` derived SEK/GT with the
   OPS-inclusion note; where the port's result carries a per-GT OPS
   line, the opsNote extends to the v0.2.64 same-GT-basis sentence
   ("the user-specified per-GT OPS charge uses the same GT basis as the
   port dues and flows into this derived metric").
3. **The port-dues family row** (comparisonModel.ts `buildRowsBySegment`):
   sums the `port_dues` fee family's visible fees per port; for the
   port-dues family only, computes `effective_per_gt = amount / vesselGt`
   (comparisonModel.ts:355–360). **This figure does NOT include OPS
   today** — the OPS amount rides `ops_speculative`, never the fee
   family. The family cell renders (v0.2.68) the published-flat-rate
   label when the family is one per-GT rule with no fired adjustments
   (`publishedPerGtForFees`), else the derived label.
4. **The stage sums**: computed from the rendered lines
   (charge-type + family rows) at comparisonView.tsx:386–412 (desktop)
   and 264–270 (mobile) — OPS is NOT in them (the OPS row renders after
   the stage sums, "included in the Grand Total" not in the stage);
   the stage sums plus the OPS row plus suppressed zeros equal the
   Grand Total (the reconciliation invariant the v0.2.64 pins assert).

**The vessel-access aggregate** (engine.ts:1865–1873): the sum of
berth_terminal_infrastructure / waterway_fairway_access /
readiness_safety_capacity classes — the OPS block is not a fee and
carries no functional class, so it is excluded by construction (the
v0.2.57/v0.2.30 contract; pinned in the eu_regulatory suite's
vessel-access exclusion pin pattern).

**Existing pins touching these surfaces** (the revision inventory):
opsSpeculative (6 sites), opsCardIsolation (3), discountLine (3),
grandTotalPerGt (2), perPortPersistence (2). Plus the publishedLabel
suite (GOT derived / HEL published / HAM derived) and the
structuralPresence stage-order pins. Every one of these must hold
green through the fold or be revised with its letter stated.

## Item 1.2 — the fold's exact sites and the boundary adjudication

**The fold site (workspace, GOT).** The per-GT OPS line must render as
part of the port dues family, not as its own line in the OPS block.
The workspace's port dues today: one rule
(`port_gothenburg_container_vessel_dues`, progressive bands by GT,
500 SEK minimum, ESI/frequency adjustments possible). The fee renders
inside the biller table (family group "port dues"), its derived
effective per-GT note (spec v0.2.30) rendering under the derivation
disclosure. The fold changes: with an entered per-GT OPS at GOT,
(a) the OPS block no longer renders the per-GT line (the other
components — electricity, demand — keep their lines; only the per-GT
line moves), and (b) the port dues family gains the three-part
decomposition on its per-GT note.

**The fold site (comparison, GOT).** The port-dues family row's cell
at GOT: the family amount stays the tariff-only sum (the fee family
never carries OPS), but the effective per-GT secondary figure —
which the family row computes as `amount / vesselGt` — gains the
three-part decomposition. The standalone OPS row keeps rendering at
GOT (see the no-double-count adjudication below: the family row's
decomposition carries the OPS INTO the per-GT metric only; the row's
AMOUNT does not change, so the OPS row is not double-counting in any
sum — it remains the only place the OPS AMOUNT appears, and its
removal would lose the amount from the stage-sum reconciliation).
The standalone row's label is unchanged.

Wait — that is not the directive's design. Re-reading item 2.4: "the
comparison's 'OPS — included in the Grand Total' row: adjudicate its
fate at GOT per the fold — if the OPS is now inside the port dues
family, the standalone row must not double-count." The directive
frames the fold as moving the OPS INTO the family. Two readings:

- **Reading A (family amount absorbs OPS at GOT):** the port-dues
  family row's amount would include the per-GT OPS. Rejected: the
  family amount is the sum of `fee` records (tariff lines); adding a
  user-specified amount to it would make a tariff-family total carry a
  user figure — exactly the masquerade the honesty contract (item 1.3)
  forbids. It would also change the stage sum "To reach the berth"
  (OPS currently sits in "At the berth" via the OPS row) — a figure
  move that violates the zero-drift guard ("any total, stage sum, or
  aggregate moving with the same inputs must fail a pin").

- **Reading B (the fold is on the per-GT metric only):** the family
  row keeps its tariff-only amount; the three-part decomposition
  renders on the family's per-GT secondary figure: (a) the
  tariff-portion SEK/GT (the family amount ÷ GT — today's figure),
  (b) the user-specified flat OPS SEK/GT (the entered rate, unbanded),
  (c) the combined derived SEK/GT ((a) + (b)) — which the family
  carries into the comparison metric. The standalone OPS row keeps
  rendering (its amount, the no-double-count contract being: the
  family's per-GT metric now includes the OPS rate; the OPS amount
  still appears exactly once as an amount — in the OPS row and the
  Grand Total, never in the family amount or any stage sum).

**Adjudication: Reading B.** Reading A moves figures (the stage sums
re-balance between stages; the family amount carries a user figure) —
the directive's own zero-drift guard forbids it ("the grand total and
every stage sum are byte-identical with any OPS entry — the fold moves
presentation, not arithmetic"). Reading B is the only design that
satisfies every constraint simultaneously: the family's derived SEK/GT
carries the OPS rate into the metric (the reader's settled design:
"(c) which the family carries into the comparison"), the amounts never
move, the standalone row keeps the amount honest, and the three-part
decomposition shows exactly how OPS affects the per-GT figure.

Hmm — but wait. If (c) is "which the family carries into the
comparison," what does the family's per-GT metric RENDER as — (a) or
(c)? The directive's item 2.2: "wherever the family's derived SEK/GT
appears (workspace and comparison at GOT), three figures render
together, each labeled." So at GOT with OPS entered, the family's
per-GT note renders all three figures (a), (b), (c) — not a single
figure. The single-figure rendering (today's `amount / GT`) becomes
the three-part decomposition. The (a) figure equals today's
`amount / GT` exactly (the tariff portion is the family amount ÷ GT —
pinned byte-identical); (c) = (a) + the entered rate (script-verified);
(b) is the entered rate.

And the Grand Total per-GT (`grandTotalPerGtCell`) already includes
OPS in its numerator (the total includes OPS), so (c) at the family
level and the Grand Total per-GT stay consistent — the Grand Total
per-GT = (c) + (all other families ÷ GT) + (non-per-GT OPS components
÷ GT).

**The boundary adjudication (why GOT only, corrected premise).** The
fold's honest application set: the family's per-GT metric folds the
user-specified per-GT OPS rate exactly where the per-GT OPS component
is enabled AND the port dues family is a GT-based family:

- **GOT: fold applies.** per_gt enabled; port dues = progressive
  per-GT bands (a genuinely GT-based family); the family figure is
  derived (v0.2.68: aggregating — bands + minimum + discounts); the
  entered rate is a flat user figure. The three-part decomposition
  is honest and the family stays derived-labeled (pinned).
- **HEL: fold does NOT apply — premise corrected.** HEL's descriptor
  DOES carry a per-GT component (contrary to the directive's premise),
  and a HEL entry prices a HEL OPS line. But HEL's port dues family is
  the v0.2.68 published-flat-rate case: one per-GT rule (6.85 SEK/GT),
  no banding, no fired adjustments — the family note renders
  "published flat rate, no banding (tariff-2026.pdf p.5)" (pinned,
  publishedLabel.test.tsx:71). Folding a user-specified flat rate into
  a published-flat-rate family would either (i) flip the label to
  derived (a rendered contract-string change at the default-with-OPS
  state, breaking the publishedLabel pin), or (ii) keep the published
  label while a user figure rides the metric — the masquerade (item
  1.3). Neither is honest. HEL's per-GT OPS stays in its own OPS line
  (its surfaces unchanged, pinned byte-identical), and the
  same-GT-basis opsNote continues to disclose the flow at HEL (the
  v0.2.64 sentence — unchanged).
- **HAM: fold does not apply (per_gt disabled — the directive's
  premise holds here).** No per-GT OPS component exists at HAM; its
  OPS lines (electricity, connection) are not GT-based; nothing folds.

**The classification decision (item 2's stage/charge-type
adjudication).** The folded OPS rate is a per-GT user-specified
addition to the port dues' own GT basis — it lands in the port-dues
family row (the "To reach the berth" stage), the same comparison line
the directive's item 2.2 names ("with the port dues in the
port-dues charge-type row — argue it"). Argued: the port dues at GOT
is a fee-family row, not one of the three charge-type lines (the
charge-type re-segmentation maps fairway/berth/cargo rules only;
`port_gothenburg_container_vessel_dues` carries no charge-type
mapping, so it stays on the family row). The three-part decomposition
renders on that family row's per-GT secondary. The OPS AMOUNT
(`ops_spec_per_gt`'s amount) remains in the at-berth OPS row per the
v0.2.64 stage placement (the amount's stage does not move — only the
per-GT metric folds; the amount's placement is a v0.2.64-pinned
contract this pass does not touch).

## Item 1.3 — the honesty contract check

**The v0.2.68 published/derived condition at GOT.** GOT's port dues
family is derived (aggregating: progressive bands, 500 minimum,
ESI/frequency discount potential). The fold must not flip the label:
with OPS entered, the family's per-GT note renders the three-part
decomposition, all three parts labeled — (a) "tariff portion,
derived", (b) "user-specified", (c) "combined, derived". The
published-flat condition (`publishedPerGtForFees`) reads the family's
fee records (never the OPS state), so it is structurally unaffected
by the fold: GOT stays derived with and without OPS (pinned). The
mislabel red proofs (item 3.2) cover the inversion cases.

**No masquerade.** The family AMOUNT never carries the user figure
(Reading B); the user rate appears only as the labeled (b) component
of the derived metric and in the OPS row/block where it already
carries the "user-specified, not tariff-derived" label. A user
figure never renders as a tariff rate anywhere.

**The disclosure move.** The v0.2.64 opsNote on the Grand Total
per-GT ("the user-specified per-GT OPS charge uses the same GT basis
as the port dues and flows into this derived metric") stays — the
Grand Total per-GT is a different metric (the whole call ÷ GT) and
its disclosure is already pinned (discountLine.test.tsx:438–440). The
fold moves the disclosure from footnote to the family line itself at
GOT: the family's per-GT note at GOT with OPS entered carries the
three labeled figures (the line-level disclosure the directive's
item 2.2 describes). The Grand Total per-GT note at GOT is unchanged
(the two disclosures coexist: the family-level decomposition and the
total-level inclusion note).

## Item 1.4 — the docs sweep findings (item 4)

1. **The v0.2.68 changelog row's "core" mislabel (the queued
   correction, item 4.1).** The v0.2.68 row (SPECIFICATION.md line 18)
   ends its new-pins sentence: "…web badgeMargins pin (source-level:
   the three sites use var(--space-1); no 6px badge-margin literal
   remains), core reset_fields union-semantics pin." The delivered
   union-semantics suite is the WEB resetFieldsUnion suite
   (web/src/resetFieldsUnion.test.tsx, 3 pins — the commit 3139114
   stat shows the web suite only, no core union suite exists); the
   v0.2.68 commit message states it correctly ("the web
   resetFieldsUnion suite (3 pins)"). The spec row's "core" is the
   mislabel. Correction (per the v0.2.61 docs-text-correction
   precedent — a post-delivery correction disclosed in this pass's
   changelog row): change "core reset_fields union-semantics pin"
   to "web resetFieldsUnion suite (3 pins)". The changelog rows are
   the record but the mislabel is a factual error about which suite
   was delivered; the correction is unambiguous and is made in this
   pass's vehicle, disclosed in the v0.2.70 row.
2. **Other docs-text drift noticed this audit:** none unambiguous. The
   §4.2.4 OPS section, §4.2.7 legibility section, §7 union sentence,
   and the CLEANUPS_AUDIT's verification-plan sentence all describe
   the delivered contracts correctly (CLEANUPS_AUDIT's
   "core: the reset_fields union-semantics pin" in its verification
   plan repeats the same mislabel and is corrected with the spec
   row — same precedent, same vehicle).

## The implementation site list (item 2's exact touch points)

1. `web/src/comparisonModel.ts` — the port-dues family entry gains the
   decomposition fields at GOT (data-derived: the port's own
   descriptor `per_gt.enabled` AND the family's fee basis being GT —
   never a port-id string check; the HEL exclusion comes from the
   published-flat condition itself, see below).
2. `web/src/comparisonCells.tsx` — `amountCell` renders the
   three-part decomposition on the port-dues family entry at GOT with
   OPS entered (a new per-family-entry field the model computes).
3. `web/src/portWorkspace.tsx` — the port dues fee's derived
   effective-rate note at GOT gains the three-part decomposition
   when the per-GT OPS is entered (rendered from a model-level helper
   the workspace computes from its own state; the engine is out of
   bounds).
4. `web/src/portWorkspace.tsx` — the OPS block at GOT no longer
   renders the per-GT line when it is folded (the other components
   keep their lines; the block renders when any component is entered).
5. `web/src/portWorkspaceInputs.tsx` — the GOT per-GT input's helper
   text gains the fold disclosure (the line-level statement that the
   entered rate folds into the port dues family's per-GT metric).
6. Pins: new web `opsFold` suite; revisions to opsSpeculative,
   opsCardIsolation, discountLine, grandTotalPerGt pins where their
   letters change (each stated).
7. Spec: §4.2.4's fold paragraph; the changelog row v0.2.70.

**The engine boundary.** The engine is untouched (scope guard: "no
engine rule changes"). The engine's `ops_spec_per_gt` line keeps
computing exactly as today; the fold is presentation: the workspace
and comparison compute the decomposition from the result's own
records (the family fee amounts and the OPS line's own basis), never
re-pricing anything.

## Design decisions recorded (the pin bases)

- **(a) figure:** the family's tariff amount ÷ vessel GT — today's
  `effective_per_gt` exactly (GOT default: 204,279.20 ÷ 194,849 =
  1.05 SEK/GT). The three-part note renders (a) with the "tariff
  portion, derived" label.
- **(b) figure:** the entered per-GT rate, rendered unbanded with the
  "user-specified" label (0.10 SEK/GT in the pinned case).
- **(c) figure:** (a) + (b) (1.15 SEK/GT in the pinned case),
  "combined, derived" label.
- **Blank OPS at GOT:** only (a) renders — today's surface,
  byte-identical (pinned).
- **HEL/HAM:** no decomposition at any input state (HEL: published
  flat-rate family; HAM: no per-GT component); their surfaces are
  pinned byte-identical with and without OPS entries.
- **The no-double-count contract:** the OPS AMOUNT appears exactly
  once as an amount (the OPS row / the OPS block); the family's
  per-GT METRIC carries the rate (a per-GT figure, not an amount);
  no stage sum, family amount, or aggregate moves at any input state.
