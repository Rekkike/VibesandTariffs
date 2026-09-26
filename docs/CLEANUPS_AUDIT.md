# Cleanups batch audit (v0.2.68) — the committed seam

Audit-first per the working discipline: this document is reported before any
implementation and committed to the WIP branch as the seam. Six items, each
individually minor, batched per the godsavgift precedent. No engine rule
changes, no figure changes of any kind; presentation, contract text, and
tooling only. The expected test delta: 514 core / 371 web at the 0baef80
baseline, plus the new pins named below.

## Item 3 — HEL flat-rate labeling: the survey and verdict table

The defect surface (reader-reported): the comparison's port-dues family note
renders "6.85 SEK/GT effective — derived, not a published rate" (the family
effective_per_gt secondary line in web/src/comparisonCells.tsx amountCell,
spec v0.2.30's derived-metric convention). HEL's port dues are a published
flat per-GT rate (tariff-2026.pdf p.5, 6.85 SEK/GT, no banding — extraction
reference 3.1), so the "derived" label makes a true statement carry a false
implicature.

The labeling condition (settled in the directive): a family's effective
per-GT figure flips to published labeling when the family's figure is a
single per-GT rule with no adjustments firing (the tariff basis itself is
per-GT); when the figure aggregates multiple rules, combines with
adjustments, or derives from a non-per-GT basis, the derived label stays.

Survey method: the per-GT-figure sites enumerated — the comparison's
port-dues family entry (comparisonCells amountCell, the only family the
comparison layer computes effective_per_gt for, per comparisonModel.ts),
the per-port workspace's fee-line "Effective rate for this call"
(portWorkspace.tsx, engine-emitted effective_rate), and the two aggregate
bridges (vessel-access totals, Grand Total per-GT), which are sums over
multiple families and can never be a single published rate.

Verdict table (the default call; the label applies per-figure, so a discount
entry moves the family back to derived — the condition, not the port, is
pinned):

| Figure | Port | Basis | Verdict |
|---|---|---|---|
| Port-dues family effective_per_gt | HEL | poh_port_dues alone: per_unit gt x 6.85, no banding, no floor/cap; the long-stay dues rule (per_commenced_period, LOA basis) is a separate sibling that only fires above 96 h — at the default call the family is the single per-GT rule; the ESI/CSI and fossil-free discounts are adjustments but do not fire at the worst-case default | Published flat rate — "6.85 SEK/GT — published flat rate, no banding (tariff-2026.pdf p.5)" |
| Port-dues family effective_per_gt | GOT | port_gothenburg_container_vessel_dues: progressive GT bands (1.96/1.71/1.15/0.80) + a 500 minimum + discount adjustments | Stays derived — the effective per-GT genuinely aggregates bands (and any firing discount); pinned against flattening |
| Port-dues family effective_per_gt | HAM | hpa_port_fee: composite_tranche (GT + env components, GT cap, Tier surcharge) | Stays derived — composite, non-flat basis |
| Per-port fee-line effective_rate (all ports) | GOT/HEL | engine-emitted per rule | Stays derived unconditionally for this pass — the engine is out of bounds (no engine change); the published-label rendering is the comparison family-note site the reader reported, where the aggregation state is computable from the comparison model's own line data. The HEL workspace per-line note therefore remains "derived" — recorded here as a disclosed boundary: the per-line figure is the engine's per-rule metric |
| Vessel-access aggregate per-GT | all | sum over families | Stays derived — multi-family sum, never a published rate |
| Grand Total per-GT | all | total / GT | Stays derived — aggregate |

GOT stays derived (pinned): the fix must not flatten the distinction — a
family that aggregates must never render the published label.

Design: the condition is computed in the comparison model layer
(web/src/comparisonModel.ts) where the family entry already holds its line
list; the entry gains an optional published_per_gt field (rate, citation)
set exactly when the family's lines reduce to one rule, that rule's rate
structure is per_unit with unit_type 'gt', no floor/cap binds, and no
adjustment fired on the line (read from the engine result's own
adjustments_applied through the existing per-fee data). The renderer
(amountCell) renders the published label with citation when the field is
present, the derived label otherwise. Zero-drift: the figure itself and
every other character of the cell are unchanged; only the label sentence
moves. The GOT/HAM cells render byte-identically (pinned).

## Item 4 — reset_fields union semantics: expressibility

The sentence (spec 7 data-contract addition): the union rule, what it means
for shared inputs across port switches, and that adding an input to a
port's reset_fields is a data-contract change requiring pin updates.

Pin expressibility verdict: expressible — the v0.2.62 structural finding
(a field removed from one port's reset_fields alone turns the
opsCardIsolation classification pin red, because PER_PORT_CALL_FIELDS is
the union) is itself the mutation class; the pin is written as a core
port_generalization-class test asserting the union mechanics: a fixture
port declaring a field in its reset_fields routes that field per-port at
every port (union membership, not per-port declaration, governs the
split), and the App's splitCallByPersistence follows the union exactly.
Red proof: the union-implementing split mutated to per-port declaration
(only fields declared by the editing port's own port) turns the pin red.

## Item 5 — the v0.2.56 findings

1. Mobile derivation always-visible: already always-visible — the audit of
   the current behavior (web/src/comparisonView.tsx mobile card path) shows
   amountCell is invoked with true (showDerivation hard-on) at both the
   charge-type lines and the family lines, and the responsive suite pins
   "mobile cards keep derivations visible by default, no disclosure
   required" with the disclosure's absence asserted
   (responsive.test.tsx:369). The derivation disclosure exists only on the
   desktop table. The finding is closed: no change; the settled direction
   (always-visible on mobile cards) is the current, pinned behavior.
2. The 6px badge margins: the finding no longer applies at one site and
   applies at three. Audit of every inline 6px badge margin at the current
   tree:
   - web/src/comparisonCells.tsx (the est.-badge in amountCell) —
     already tokenized to var(--space-1) by v0.2.60; no action. (The same
     file's flags badge at line 61 carried a fourth 6px literal the audit
     missed; the badgeMargins red-proof pin found it and it is tokenized
     with the rest — the pin did the audit's completeness check.)
   - web/src/comparisonView.tsx:540 (the est.-badge before "Estimated
     parameters subtotal", marginRight 6px) — literal 6px remains.
   - web/src/comparisonView.tsx:570 (the "derived metric" badge,
     marginLeft 6px) — literal 6px remains.
   - web/src/portWorkspace.tsx:861 (the effective-rate note badge,
     marginLeft 6px) — literal 6px remains.
   The v0.2.60 deferral reason ("normalizing to 4/8px moves rendered
   spacing") applies to a value change; the 4px scale has no 6px token, so
   the decision is: normalize the three remaining literals to var(--space-1)
   (4px), disclose the 2px rendered delta (badge-separation reading purpose
   survives it; the theme-token discipline wins), and pin the corrected
   values — a source pin asserting the three sites use the token and no 6px
   badge-margin literal remains.

## Item 1 — the version chip and the guard extension

The version derives from a single web-layer constant (web/src/version.ts,
APP_VERSION); the chip renders beside the theme toggle in the header, styled
with the header/theme-toggle conventions and the spacing tokens (no new
literals; the item-5 6px work is in the same area — the two items do not
fight: the chip uses tokens only). The guard
(core/scripts/check_spec_version.js) gains the cross-check: the constant
must equal the spec header version — a chip ahead of the spec (constant
bumped, spec not) fails; a chip behind (spec bumped, constant not) fails.
The bump ritual: spec header, changelog row, and the constant, all in the
same change. The guard reads the constant at both refs (git show) in git
mode and reads the files directly in --state mode; the --fixture mode
cannot see the constant (fixture directories carry no web source), so the
cross-check is skipped there with an explicit pass-through note — the CI
demonstration job gains two state-mode fixtures (constant ahead, constant
behind) that must fail.

## Item 2 — the versioning contract (spec section; summarized here, recorded
in the spec)

New spec section recording: the 0.2.x convention (pre-1.0
unstable-in-progress; infrastructure and features alike shipped as patch
increments — a disclosed abuse the contract corrects going forward); the
SemVer mapping (patch = fixes, re-pins, presentation, no change to what
the model computes or the user-facing feature set; minor = added
non-breaking functionality; major = breaking the model's contract — results
mean something different, saved inputs no longer validate); the 0.3.0 gate
(the EU ETS/FuelEU block and the NT-convention re-derivation both landed =
"the tariff model is closed for the container-call domain"; everything
after accumulates through 0.3.x as minor/patch per the mapping, port
expansion waves may honestly take minors); the 1.0 gates (candidates
recorded, not commitments: real persistence beyond session state,
deployment hardening beyond GitHub Pages, the five-to-eight-port expansion
proving generalization, a full external audit of the tariff data by someone
who did not transcribe it, packaging — a standalone installable implying an
offline desktop shell or self-hostable container, a genuine architecture
decision recorded as such); the NT-before-persistence ordering note (the
re-derivation changes computed results without adding a feature; under
strict semver it breaks every published figure; it must land before any
real persistence exists, so saved scenarios are never created against
figures that will then move).

## Item 6 — build determinism and environment resilience

1. package-lock.json: already committed at the repo root (tracked at the
   0baef80 baseline). The finding for this pass is therefore not "commit a
   lockfile" but "the lockfile is present and CI must enforce it": the
   deploy workflow uses npm install (lockfile-respecting but not
   lockfile-enforcing). Change: npm install -> npm ci in
   .github/workflows/deploy.yml so local and CI builds resolve the
   identical dependency tree; the guard/CI suites are verified against the
   npm ci tree locally. The lockfile itself needs no new commit; the
   effect on the build (bundle hash may change under npm ci vs npm
   install) is expected and disclosed — zero-drift refers to figures and
   rendered contract strings, not the bundle hash.
2. GitHub token-format resilience (spec 8 note, no code): GitHub App
   installation tokens are moving to a new stateless format (ghs_..., ~520
   chars); apps with hardcoded length assumptions may break. This repo
   consumes no tokens at runtime; builder sessions store credentials via
   git credential helpers and the sandbox proxy, never parsing token
   structure. Standing rule: on any mid-pass authentication failure (push,
   API, gh), checkpoint first, then diagnose (proxy path, credential
   helper, unauthenticated fallbacks) — never lose work to an auth
   surprise. Recorded in spec 8.

## Verification plan

514 core / 371 web plus the new pins (web: the version-chip suite, the
published/derived labeling suite, the badge-margin token pin; core: the
reset_fields union-semantics pin). Red proofs per item: item 1 — mutate the
constant without the spec (guard fails), bump the spec without the constant
(guard fails); item 3 — swapping the condition to published-default fails
the GOT pin; forcing HEL derived fails the HEL pin; item 4 — the split
mutated to per-port declaration turns the union pin red; item 5 —
re-introducing a 6px badge literal turns the token pin red. Zero-drift:
every figure and contract-string pin byte-identical (GOT 3,275,851.15 SEK /
16.81; HAM 2,204,910.90 EUR / 11.32; HEL 8,750,057.40 SEK / 44.91).
