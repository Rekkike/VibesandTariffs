# Banded-Input Audit — Phase A Report (spec v0.2.65 directive pass)

Baseline: e57a4a8 (v0.2.64), clean tree, 487 core / 350 web green before any edit.
Method: every band below is read from the port files' own adjustment data and verified
against the archived tariff texts (the STC PDF and the Helsingborg tariff PDF were
re-extracted this session; the Gothenburg port tariff is not archived in-repo — its
bands are carried by the port file's own transcription with citations, per the v0.2.32
source-link contract). Engine boundary operators were verified from
`core/src/engine.ts`, never assumed.

## 1. Banded-input inventory per port

### 1.1 HAM quantum (quantum_prior_year_gt) — VERDICT: band-select warranted

- Bands (hamburg_2026.yaml `hpa_port_fee` → `component_adjustments.gt` →
  `pct_discount_banded`, input `quantum_prior_year_gt`):
  `{ min: 1500000, max: 10000000, pct: 2.5 }`,
  `{ min: 10000000, max: 25000000, pct: 5.0 }`,
  `{ min: 25000000, max: null, pct: 7.5 }`.
- Source text (STC 4.1.2.11, special tariff 280, re-extracted verbatim this session,
  stc-maritime-shipping-2026.pdf p.13): cat. 31 step table —
  "> 1.5 million GT and ≤ 10 million GT → 2.5%",
  "> 10 million GT and ≤ 25 million GT → 5.0%",
  "> 25 million GT → 7.5%". The operators are lower-exclusive / upper-inclusive.
- Engine consumption (engine.ts `pct_discount_banded`):
  `prior > b.min && (b.max === null || prior <= b.max)` — matches the STC exactly
  (1,500,000 fires nothing; 10,000,000 fires 2.5%; 10,000,001 fires 5.0%;
  25,000,000 fires 5.0%; 25,000,001 fires 7.5% — all re-derived this session,
  see §4).
- Current control: free numeric TextField ("Quantum: prior-year paid GT") in the
  Hamburg workspace, helper ">1.5m → 2.5%, >10m → 5%, >25m → 7.5%; 0 = no discount".
- Verdict: band-select warranted. Four tariff-defined tiers exist; the engine consumes
  a single numeric with the tariff's own operators.

### 1.2 HAM ESI air (esi_score) — VERDICT: band-select warranted

- Bands (hamburg_2026.yaml `hpa_port_fee` → `component_adjustments.env` →
  `score_discount_pct_with_cap`, input `esi_score`, description "ESI air"):
  `{ min: 20, max: 25, pct: 0.35, cap: 175 }`,
  `{ min: 25, max: 35, pct: 0.7, cap: 350 }`,
  `{ min: 35, max: 50, pct: 3.5, cap: 700 }`,
  `{ min: 50, max: null, pct: 7, cap: 1050 }`.
- Source text (STC 4.1.1.1, special tariff 140, p.11, verbatim): "ESI air score
  20 up to < 25 = 0.35% discount, maximally € 175; 25 up to < 35 = 0.7%, max € 350;
  35 up to < 50 = 3.5%, max € 700; ≥ 50 = 7%, max € 1,050." Lower-inclusive /
  upper-exclusive.
- Engine consumption (`score_discount_pct_with_cap`):
  `score >= b.min && (b.max === null || score < b.max)` — matches (20 fires 0.35%,
  25 fires 0.7%, 35 fires 3.5%, 50 fires 7%; re-derived this session, §4).
- Current control: free numeric TextField ("ESI Air Score (0–100)", HAM workspace)
  plus the same field rendered in the Swedish workspaces (see 1.6 — the Swedish
  ESI is a threshold, not a band).
- Verdict: band-select warranted at Hamburg. Bands with caps are tariff tiers.

### 1.3 HAM ESI noise (esi_noise_score) — VERDICT: band-select warranted (adjudicated)

- Bands (hamburg_2026.yaml, `score_discount_pct_with_cap`, input `esi_noise_score`,
  description "ESI noise"):
  `{ min: 40, max: 45, pct: 0.15, cap: 75 }`,
  `{ min: 45, max: 55, pct: 0.3, cap: 150 }`,
  `{ min: 55, max: 70, pct: 1.5, cap: 300 }`,
  `{ min: 70, max: null, pct: 3, cap: 450 }`.
- Source text (STC 4.1.1.2, special tariff 141, p.11, verbatim): "ESI noise score
  40 up to < 45 = 0.15 % discount, maximally € 75; 45 up to < 55 = 0.3 %, max
  € 150; 55 up to < 70 = 1.5 %, max € 300; ≥ 70 = 3 %, max € 450."
- Engine consumption: same `score >= b.min && score < b.max` form — matches.
- Current control: free numeric TextField ("ESI Noise Score (0–100)").
- Verdict: band-select warranted. The adjudication: like ESI air, this is a genuine
  four-tier tariff schedule on a 0–100 score; the free field stays (scores are
  continuous), but the tier select gives the bands affordance. The two scales
  differ (air vs noise) and the select must carry each's own bands.

### 1.4 GOT/HEL CSI class (csi_class, Sjöfartsverket A–E) — VERDICT: already a select (verify only)

- Current control: a Select with options A, B, C, D, "E (Not Registered)", "None"
  (portWorkspaceInputs.tsx). It is already a tier control; the bands are the
  per-class vessel-fee rate tables in each port file
  (`rate_structure.csi_class` gating on the vessel-fee rules, A–E where E is
  the not-registered rate).
- The A–E scale is not a banded numeric — the tariff keys on discrete classes.
- Verdict: verify only — no change. The select exists and is data-consistent with
  the port files' own csi_class-gated rules. (Note: this is the Sjöfartsverket
  environmental class, distinct from the Clean Shipping Index 1–5 scale below.)

### 1.5 GOT/HEL Clean Shipping Index class (clean_shipping_index_class) — VERDICT: already a select (verify only)

- Current control: a Select ("Clean Shipping Index Class (port discount)") with
  options 1–5, "4 (10% port-dues discount)" labeled, rendered where the port's
  input_profile fields include `clean_shipping_index` (both Swedish ports).
- Source: HEL tariff-2026.pdf (re-extracted verbatim this session): "Vessels with a
  minimum Environmental Ship Index (ESI) score of 30 points or at least Clean
  Shipping Index (CSI)-class 4 will be granted a 10 percent discount on port
  dues, based on gross tonnage (GT)." GOT port file transcription (§2.1 condition
  `esi_score >= 30 || clean_shipping_index_class == '4'`) carries the same rule.
- Engine consumption: `clean_shipping_index_class == '4'` — a discrete class match,
  not a band over a numeric.
- Verdict: verify only — the select already affords the classes; class 4 is the
  only discount-bearing class, already labeled with its discount.

### 1.6 GOT/HEL ESI score (esi_score, Swedish threshold) — VERDICT: stays free

- The Swedish ESI rule is a single threshold (ESI ≥ 30 → 10% port-dues discount),
  not a band: HEL tariff-2026.pdf verbatim (§ above) and GOT port file condition
  `esi_score >= 30 || clean_shipping_index_class == '4'`.
- Engine consumption: `esi_score >= 30` — one threshold, one percentage.
- A band select over a two-outcome threshold (below 30 / 30+) adds no tier
  information the helper text does not already carry.
- Verdict: stays free — threshold, not a band.

### 1.7 GOT/HEL fossil-free fuel percentage (fossil_free_fuel_percentage) — VERDICT: stays free (adjudicated: threshold, not a band)

- The rule is a single threshold: GOT condition `fossil_free_fuel_percentage >= 30`
  → +10% additive; HEL tariff-2026.pdf verbatim: "Vessels that bunker a minimum of
  30 percent fossil-free fuel of their annual consumption get an additional
  10 percent discount."
- Engine consumption: `fossil_free_fuel_percentage >= 30` — binary outcome
  (verified this session: 29.9 → no adjustment at either port; 30 → −10% at both).
- Adjudication: the directive asks "band vs. free". This is a threshold with one
  discount step, not a schedule of bands. A two-option select ("below 30% (no
  discount)" / "≥ 30% (+10% additive)") would add no information beyond the
  existing helper ("Blank = not entered (no discount); discount needs ≥ 30%"),
  and the free percentage field is needed for the documentation the tariff itself
  requires (bunkered amount vs annual consumption). A continuous input with a
  single threshold is a free input.
- Verdict: stays free, with reason recorded. (The select affordance would be
  hollow: one threshold, one outcome.)

### 1.8 HAM waste-reduction fields — VERDICT: stays free (adjudicated: booleans, not bands)

- The three fields (`waste_short_sea_reduction`, `waste_alternative_fuel_reduction`,
  `waste_sustainable_waste_reduction`) are application-based booleans
  (ship-waste-fees-ordinance-2025.pdf; port file conditions are bare call-boolean
  fields — −90% short-sea, −2% MARPOL V sustainable-waste; the MARPOL I
  alternative-fuel reduction is ordinance-gated).
- Current control: three Checkboxes in the Hamburg workspace.
- Adjudication: these are on/off attestations, not banded numerics. A tier select
  has nothing to afford.
- Verdict: stays free (boolean attestation inputs; unchanged).

### 1.9 Out of scope (per the directive, item 2 — restated)

Free-count and free-value inputs — container counts, hours, tugs, kWh, prices,
weights, calls per month — do not change. No select is added to any of them.

## 2. Verdict summary

| Input | Port(s) | Verdict |
|---|---|---|
| quantum_prior_year_gt | HAM | band-select warranted (dual-mode) |
| esi_score (STC 4.1.1.1 bands) | HAM | band-select warranted (dual-mode) |
| esi_noise_score (STC 4.1.1.2 bands) | HAM | band-select warranted (dual-mode) |
| csi_class (Sjöfartsverket A–E) | GOT, HEL | already a select — verify only |
| clean_shipping_index_class | GOT, HEL | already a select — verify only |
| esi_score (Swedish ≥ 30 threshold) | GOT, HEL | stays free — threshold, not a band |
| fossil_free_fuel_percentage | GOT, HEL | stays free — single threshold, one outcome |
| waste_*_reduction | HAM | stays free — boolean attestations |

## 3. Data provenance for the selects (Phase B contract, item 4)

The band data derives from the same data the engine applies — the adjustment
rules' band definitions in each port file (`component_adjustments` on
`hpa_port_fee`), which already flow into ports.json via
convert_yaml_to_json.js (they are part of the port definition object). No second
hand-kept copy will be created: the select reads the bands from the loaded
`PortDefinition` (the same registry the engine prices from). No new data section
is required — the bands are already in the port file and already emitted to
ports.json. This is a web-rendering change only; a new port shipping bands gets
the control for free (the select derives from whatever its port file carries).
Verified this session: `web/src/data/ports.json` already contains
`component_adjustments` with the exact band arrays cited above.

Citations per option: the STC 4.1.1.1/4.1.1.2/4.1.2.11 text with the special
tariff numbers (140/141/280), carried per the established notice conventions
(option label = range + percentage; citation in the select's helper text).

## 4. Fired-discount arithmetic (script-computed this session, /tmp/audit_math.js)

Consistency references re-derived at this baseline (agreement with the v0.2.64
audit — no discrepancy):

- HAM quantum 2,000,000 GT → GT component −1,228.25 EUR ("2000000 prior-year GT:
  −2.5%"), engine derivation step, matches 2,313,489.31 − 1,228.25 = 2,312,261.06.
- GOT ESI 50 → port dues −20,427.92 SEK ("−10% additive"), matches
  3,275,851.15 − 20,427.92 = 3,255,423.23.

Band-edge derivations (all engine-observed this session, Maren Maersk default
vessel, GT component after OPS rebate; env component after Tier II +5%):

- Quantum: 1,500,000 → no discount; 1,500,001 → −1,228.25 (2.5%);
  10,000,000 → −1,228.25 (2.5%); 10,000,001 → −2,456.50 (5.0%);
  25,000,000 → −2,456.50 (5.0%); 25,000,001 → −3,684.75 (7.5%).
- ESI air (env after tier 12,904.54): 20 → −45.16; 25 → −90.31; 35 → −451.52;
  50 → −903.04. (Below 20: no discount.)
- ESI noise (same env basis): 40 → −19.36; 45 → −38.71; 55 → −193.51;
  70 → −387.02.

Boundary-operator verification: exactly 1.5m lands in NO band (lower bound is
strict ">"), exactly 10m lands in the 2.5% band (upper "≤"), exactly 25m lands
in the 5.0% band — each verified against the STC's own step table and the
engine's `pct_discount_banded` predicate; the select's threshold-value
population and its "none" boundary must reproduce these operators exactly.

## 5. Session-stability note

The sandbox filesystem reset once before any code or data change (mid-baseline
web test run; the environment note in the v0.2.63 commit describes the same
class). The repository was re-cloned from origin at e57a4a8 (verified identical
HEAD, clean tree), dependencies reinstalled, ports.json regenerated via the
repo's own convert_yaml_to_json.js, and both baseline suites re-verified green
(487 core / 350 web) before the audit. Per the amended protocol, Phase B
continues in this same session from this report (the report is committed to
wip/banded-inputs as the seam).
