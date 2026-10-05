# Model Health Audit Pass (v0.4.7)

Audit-first record for the model health audit pass — a read-mostly vehicle
prompted by five versions of fast machinery growth (condition types, the
shared-pattern extension, contract paragraphs, new pin families). Optimization
is explicitly out of scope: there is no demand signal, and the exclusion
verdict is a first-class deliverable of this pass. The subject is accumulated
hygiene and coherence debt. Findings are committed here before any repair;
repairs are limited to adjudicated items; the six native default totals move
under no finding.

Baseline at pass start: main at 70e6a49 (v0.4.6), ledger 649 core / 523 web,
both suites re-verified green at the exact delivered counts before any
inspection. Standing ritual: the Frankfurter mirror's latest TARGET
publication (verified at execution time, 2026-10-02) is 11.29 — identical to
the pinned rate; the YAML unchanged; drift 0. The product owner's Monday check
(11.29 / 2026-10-02) is confirmed by re-verification.

---

## 1. Branch hygiene (item 0.1)

Four stray remote branches existed at session start. Merge state verified per
branch with `git merge-base --is-ancestor` against main and a diff of each
branch against main for unmerged unique work:

| Branch | Merge state | Unmerged unique work | Classification |
|---|---|---|---|
| `vibe/healthcheck-carryover-64f7e7` (3097880) | merged into main (5bdd6c9, PR #2 lineage) | none — diff against main is empty | delete |
| `vibe/storage-towage-e148f7` (32e8602) | merged into main (0fecfd1, PR #1 lineage) | none | delete |
| `vibe/worked-example-fix-64f7e7` (11ff303) | merged into main (1ebcc44, PR #3 lineage) | none | delete |
| `vibe/worked-example-verification-64f7e7` (eb992f2) | merged into main (same lineage) | none | delete |

All four are the historical delivery branches of the v0.2.33-v0.2.37 passes,
delivered through merge PRs whose content is fully in main. Zero unmerged
unique work exists on any of them; nothing is silently discarded. The
adjudication is mechanical (branches die at delivery, the standing protocol);
no surprise was found. The four branches are deleted in this pass's repair
phase. Branch hygiene is a recorded protocol note, not a pin — branches are
not testable state.

## 2. Dead-rule inventory (item 0.2)

Sweep of every silo for rules that cannot fire on any call profile the model
supports. Method: script over all six YAML silos classifying (a) rate
structures whose every rate is zero, (b) rules whose conditions or unit
inputs reference call fields the model cannot express, and (c) the
engine-side resolution of each (observed, never assumed). The full result:

**Recorded dead data — kept with notices (the v0.4.6 §1.5 convention):**

| Rule | Port | Why it cannot fire | Classification |
|---|---|---|---|
| `gvh_karskar_recorded_notice` | GLE | zero-amount notice; the Karskär surface awaits a quay-selector input (recorded, v0.4.3) | recorded dead data |
| `gothenburg_mooring_notice` | GOT | zero-amount service-gap notice; the charge is separately billed, no published rate (v0.3.1) | recorded dead data |
| `gothenburg_mooring_charge` | GOT | flat 0 with an `amount_input`; fires only on a user-specified value (the blank-means-nothing contract) | recorded dead data (a live input, correctly blank-priced) |
| `pon_sludge_gap_notice` | NRK | zero-amount notice; the tariff announces sludge but publishes no figure | recorded dead data |
| `pon_linemen_notice` | NRK | zero-amount notice; outsourced linemen, no published rate | recorded dead data |
| `snv_hutchison_restow_quay` | NVK | flat 0 with a published rate recorded in the description; awaits a restow-count input | recorded dead data |
| `snv_hutchison_energy_surcharge_gap` | NVK | zero-amount notice; "Price on Application" | recorded dead data |
| `*_fueleu_notice` (6) | all | informative-zero regulatory notices (the annual-balance disclosure, v0.2.69) | recorded dead data by construction |
| `*_eu_ets_allowances` (6) | all | flat 0 with `ets_product`; prices only on user-specified emissions + allowance price (blank-means-nothing) | recorded dead data (a live input) |
| `sjofartsverket_cargo_fee_passengers` | GOT | unit_type `pax`; no passenger-count input exists in the call model; never fires on container calls (the v0.4.4 finding) | recorded dead data |
| `sjofartsverket_cargo_fee_private_vehicles` | GOT | unit_type `unit`; no private-vehicle input exists; same class | recorded dead data |
| storage ladders and zero-default-keyed rules (all ports) | — | **not dead**: the free-time bands and blank unit inputs are the zero-default contract (v0.4.1), live on entered days/units — verified live, not swept in | live (verified, not in the class) |

**Mis-encoded — a genuine defect, stop-and-report (the anchor-port rule):**

| Rule | Port | Defect | Money moved |
|---|---|---|---|
| `apm_terminals_handling_break_bulk` | GOT | a duplicate of the correct gated rule `apm_terminals_handling_break_bulk_scrap`; its unit_type `1000_kg` is handled by no engine case and matches no `CallInput` field (resolves to 0 through the per-unit default branch), and it carries no presence gate — so it renders a spurious zero line on every GOT call | none — the line renders 0.00; no total moves |

Per the directive's item 0.2, a mis-encoded rule stops at the report: the
finding is recorded here, the rule is **not** deleted and **not** repaired
this pass (no silent correction, no unadjudicated deletion — dead data kept
honestly is the convention). It is appended to the deferred queue for explicit
adjudication. The correct sibling rule (`..._scrap`, gated on
`break_bulk_1000kg: present`, unit_rate 54) prices the surface exactly.

**Siblings of the GOT passenger/private-vehicle class, elsewhere:** the
Helsingborg ancillary rules `poh_imo_transport`, `poh_vgm`,
`poh_other_admin`, `poh_customs_inspection`, `poh_port_area_transport` carry
unit_type values (`imo_transport_units`, `vgm_units`, `other_admin_units`,
`customs_inspection_count`, `port_area_transport_units`) that exist in no
`CallInput` field and no UI input — they resolve to 0 through the default
branch and render informative zero lines at every HEL call. Their data
descriptions say "Optional call input, default off" (recorded), but the fact
that **no input exists in the model** is unrecorded — the same no-input class
as GOT's godsavgift passenger component. Classification: recorded in the
data descriptions but the class-identity unrecorded — an input-coverage
finding (§5), recorded in the coverage matrix this pass; the rules themselves
stay, honest zero-rendering ancillary notices pending future inputs.

The inventory's value is the guarantee: nothing else hides in the class.
Every other always-zero rendering observed at the default calls is either a
correctly blank-priced live input (hatch covers, yard surcharges, storage —
keyed on inputs that exist and render), an informative notice, or the ETS
user-specified basis.

## 3. Pin-strength sweep (item 0.3)

The v0.4.6 lesson generalized: every pin in both suites examined for weak
matching — substring/proximity matching where element- or exact-matching is
meant; pins that pass under a plausible wrong implementation; redundant pins;
stale pins.

Method: script over all 30 core suites and all 45 web suites classifying
assertion shapes per test block (exact `toBe`/`toEqual`/`toHaveLength`,
content `toContain` with long unique strings, regex `toMatch`, and
presence-only `toBeTruthy`/`toBeDefined`/`toBeNull`), then adjudicating each
presence-only block against its sibling pins.

Findings — counts: **strong: all; repaired: 0; structural: 0.**

- The `structuralPresence` precedent (v0.2.54/55) is strong by construction:
  its pins assert DOM order, not presence alone, and every pin was proven red
  against a mutated surface before being trusted (the committed changelog
  record). Its siblings (cardSpacing, opsCardIsolation, zeroCollapse) follow
  the same DOM-order and classification discipline.
- Twelve test blocks use presence-only assertions as their primary shape. Each
  was adjudicated against its siblings; in every case a stronger pin guards
  the same invariant with exact content or exact count, and the presence-only
  block guards a *different* facet (shape completeness) that exact content
  cannot express:
  - `handlingBasis` ("every port carries its verbatim annotation") sits beside
    the verbatim-wording pin asserting the exact strings per port — a mutated
    annotation fails the sibling; the presence pin adds the six-port
    completeness sweep. Keep both; the stronger governs.
  - `portGeneralization` (profile presence) sits beside the exact
    operator-list `toEqual(['Eurogate','HHLA'])` pin and the source-contract
    regex pins.
  - `hamburg.test` source-reference completeness (`toBeTruthy` over the
    seven citation fields) is a per-line completeness sweep over every result
    line — exact content cannot express "every line"; the per-field truthiness
    plus the field-list enumeration is the stronger available form for that
    invariant (a missing field fails; a wrong value is caught by the figure
    and citation pins).
  - `cardSpacing`/`ntBoundaryNotice`/`conversion` presence pins assert
    structural nullness (an element is or is not rendered) — the correct shape
    for those invariants.
- Mutation-survival spot checks (would the pin survive a mutated rate? a
  swapped label? a moved rule?): the six default totals are pinned byte-exact
  in `comparisonDefaults`/`grandTotalPerGt`/`discountLine` and the core
  suites; stage placement is pinned by rule-id membership
  (`presentationNormalization`); a moved rule between stages fails the
  membership pins; a mutated rate fails the exact figures; a swapped label
  fails the verbatim strings. No pin passes under a plausible wrong
  implementation.
- Redundant pins: the presence-only blocks above are the only
  same-invariant pairs found; each pair is complementary (shape vs content),
  not redundant. No weaker duplicate was found whose deletion would lose
  nothing.
- Stale pins: none. Every pin family maps to a current contract (verified
  against the §4.2 paragraph inventory in §4 below); the superseded-behavior
  pins of past passes were re-pointed in their own passes with in-test
  attribution (the v0.4.1 storage re-baseline the precedent).

Verdict: no pin repairs; the structuralPresence fix has no weak siblings; the
exclusion verdict on optimization is recorded — no test-architecture change
is warranted by pin strength.

## 4. Spec coherence (item 0.4)

Cross-check of the specification's growth seams — §4.2.1-§4.2.17 contract
paragraphs, the §4.3.1 comparison-view contract, the §11 grading text —
against delivered behavior, plus the INTENDED_STATE sweep for the
prislista-path failure class (aspirational statements presented as existing
state).

**Contract → pin (every paragraph verified to have a corresponding pin
family; a contract without a pin is a finding):**

| Contract | Pin family |
|---|---|
| §4.2.1-4.2.10 (segmentation, energy, storage, godsavgift, frequency panel, comparison legibility, banded inputs, promotion, ETS) | core engine/storage_towage/godsavgift/frequencyPanel/euRegulatory suites; web counterparts |
| §4.2.11 NT convention | core nt_rederivation + web ntBoundaryNotice |
| §4.2.12 GOT mooring | web gotMooring |
| §4.2.13 rate-refresh (reversed v0.4.0) | web rateRefresh (re-homed rider pins) |
| §4.2.14 scenario layer | core+web scenarioLayer |
| §4.2.15 KYUNGMIN promotion | web kyungminObservation |
| §4.2.16 terminal layer/basis/toggle/NRK liner | web handlingBasis, terminalScope, sameRouteAttestation |
| §4.2.17 presentation normalization | web presentationNormalization |
| §4.3.1 comparison view | comparisonDefaults, structuralPresence, discountLine, grandTotalPerGt, conversion, opsFold |

No contract paragraph is unpinned. **Pin → contract:** every pin family maps
to a changelog row and its contract paragraph; no orphan pin family exists.
**§11 grading text** reads against delivered reality: the v0.4.x rows record
their grades correctly (patch for the audit-and-repair passes, minor for the
condition-type and expansion passes); this pass is patch-grade under §11
(audit-and-repair, no figure movement, no structural test-architecture
change — the minor trigger does not fire; confirmed).

**The two-way drift table (spec vs delivered reality):**

| Spec location | Stated | Delivered reality | Class | Repair |
|---|---|---|---|---|
| INTENDED_STATE §5 | "the default Maren Maersk call totals are pinned at GOT 3,007,051.15 SEK / HAM 2,313,489.31 EUR / HEL 8,481,257.40" | the pinned defaults since v0.2.61+ are GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40 (the godsavgift and NT movements superseded the old figures; the changelogs record the movements) | stale aspirational-as-state (the §5 prislista-path class) | corrected to describe reality, the old figures kept as the named historical checkpoints they are (§5 is the historical concordance — the panamax rows stay; the default-call sentence is corrected) |
| INTENDED_STATE §§1-2 | "three ports are live"; the repository-structure tree lists three port silos | six ports are live (Gävle, Norrköping, Norvik added at v0.4.0) | stale | corrected to the six-port reality |
| SPECIFICATION §8 | "REST API returning the same results as JSON (web UI built on it)" | no server exists in the repository; the deployed artifact is the static web bundle | aspiration presented as existing state | marked as an aspiration (the original sentence retained as the historical record with the marker appended — the spec's history is never rewritten) |
| SPECIFICATION §9 | "Initial Port Set: Gothenburg, Hamburg, Helsingborg, Gävle, Gdansk, Bremerhaven, Aarhus" | the delivered set is gavle, gothenburg, hamburg, helsingborg, norrkoping, norvik (Norrköping/Norvik landed instead of the Gdansk/Bremerhaven/Aarhus expansion) | stale aspiration-as-set | corrected to describe the delivered six; the expansion ports marked as the standing aspiration they are |
| SPECIFICATION §4.3.1 | reset_fields parenthetical "GOT 17, HAM 20, HEL 21, the union equal to the retired hand-kept array" | the v0.2.60 figures; the lists have since grown (GOT 20, HAM 57, HEL 23, and the three younger ports carry their own), recorded in the v0.3.3/v0.4.x rows | historical statement inside contract prose | annotated as the v0.2.60 state with the growth pointed to the changelog rows (chronology preserved) |

No contract-text conflict with delivered behavior was found beyond the
table; the spec's historical sections are the record and were not rewritten.

## 5. Cross-port input-coverage matrix (item 0.5)

The matrix is committed as `docs/INPUT_COVERAGE_MATRIX.md` — the audit
artifact. Method: the engine's `CallInput` inventory (the model's full input
vocabulary) cross-checked against (a) every rule's conditions/unit inputs per
port, and (b) the UI's rendered inputs per port (every
`handleCallChange`/`handleCallChanges`/`state.call` reference across the web
source). Every asymmetry classified:

**Known-and-recorded (verified against the deferred queue and extraction
references):** the Karskär quay-selector absence (GLE, recorded v0.4.3); the
Yilport operational surfaces awaiting scenario inputs (GLE, recorded);
the Yilport empty-container input 1,235/unit (recorded, not encoded); the
APMT VAS surfaces with no call input (recorded v0.4.6); the Yilport
empty-units input (queue item 8).

**Unrecorded asymmetries found (findings, now recorded in the matrix):**

1. **25 call inputs with no UI anywhere** (engine-pricable via the model
   input, never enterable at the UI): the HHLA container-services set
   (gassing 20/40 ft, reception, extra movement, admin toggle, VGM
   weighing/calculative, reefer connect/check, labelling, neutralization),
   the HHLA/Helsinki/Norvik storage size-class inputs (30/45-ft and empty
   classes, transshipment/hazardous day counts and units), and the Hamburg
   transshipment-unit input. The data descriptions record the rates; the
   absence of an input surface is unrecorded. Classification: recorded in
   this matrix; the rules stay (correctly blank-priced at the default);
   input surfaces are future work for a directive that orders them.
2. **Five HEL ancillary rules whose unit inputs do not exist in the call
   model at all** (§2 above) — the strongest form of the asymmetry: the
   engine cannot express the input even programmatically through `CallInput`.
3. The GOT break-bulk duplicate (§2, mis-encoded) also belongs here: the
   `1000_kg` unit_type has no input.

**Pinnability adjudication (item 2 of the directive):** a coherence check
that fails when a new asymmetry appears unrecorded would require a canonical
asymmetry registry the model does not carry — a test-architecture change
that this pass adjudicates as over-fitting risk against a document snapshot
(the matrix would drift with every new input and the pin would encode the
drift, not guard it). Adjudicated: not pinnable this pass; the matrix is the
committed artifact and the audit's guarantee. A future pass may add the
registry as data if the asymmetry class grows.

## 6. G1 archive (item 0.6) — archived

The Port of Gothenburg Port Tariff 2026 (G1, the last not-archived source)
was fetched from the primary route:
https://www.portofgothenburg.com/globalassets/dokument/port-tariff-2026.pdf
— the host serves plain clients (as the v0.4.5 research observed), no
fallback route needed.

**Identity verification:** issuer Göteborgs Hamn AB / Port of Gothenburg
(the document's own header, "PORT TARIFF 2026 — PORT OF GOTHENBURG", and the
publisher domain); title Port Tariff 2026; edition "VERSION 1 - Effective
from January 1, 2026 and valid until further notice"; structure verified
(the terms §1-§17 summary, then §2 port dues by vessel class, 13 subsections,
the table of contents matching); currency SEK ("The prices quoted below are
in SEK", §2 of the terms). Thirty-seven pages per the publisher's own
pagination; the fetched extraction reaches page 21.

**Recorded limitation (the binary-limitation class, the prislista
precedent):** the sandbox fetch tooling retrieves the PDF as a text
extraction with a body-size limit — the extraction truncates at page 21 of
37 (re-observed on three fetches, including with query parameters, identical
cut every time). The archived text is the verbatim extraction as fetched,
pages 1-21, never a fabricated archive; the full document remains at the
upstream URL. Critically, **every G1-cited encoded rule cites pages 9-13**
(the container-vessels section §2.2 and its waste/fresh-water/lay-up/OPS
schedules), all inside the archived range; the truncated pages (cruise
remainder, break bulk, inland waterways, yachts, archipelago, harbour, other
vessels, external quays) contain no container-call authority beyond the
cited pages.

**Figure verification (the extraction pre-dates the archive — verified, never
assumed; a contradiction would stop at this report):**

| Surface | Archive (verbatim) | Encoded | Verdict |
|---|---|---|---|
| Container infrastructure dues | §2.2 progressive "0-20 000 GT 1,96 / 20 001-40 000 1,71 / 40 001-60 000 1,15 / >60 001 0,80 SEK/GT" | `port_gothenburg_container_vessel_dues` bands 1.96/1.71/1.15/0.80 | match |
| Solid waste | "0,13 SEK/GT" (European) / "0,24" (non-European) / "- 0,05 SEK/GT" certificate discount | 0.13 / 0.24 / −0.05 adjustment | match |
| Sludge | "0,21 / 0,31 / 2 400 SEK/m³" | 0.21 / 0.31 / 2400 | match |
| Scrubber | "Administration fee 800 SEK" | flat 800 | match |
| Fresh water | "< 50m³ 0 SEK / > 50m³ 50 SEK/m³" | banded_flat 0 / 50 | match |
| OPS connection | "7 000 SEK" (tanker jetties) | flat 7000, tanker-gated | match |
| Lay-up | "45 SEK/m (LOA)" per commenced day | per_commenced_day 45/loa_m | match |
| Environmental discounts | "ESI score of 30 points or at least CSI-class 4... 10% discount"; fossil-free "additional 10%" | 10% additive + 10% additive | match |
| Frequency discount | "50% discount on port dues based on GT for the second call" (same route) | 50%, `got_same_route_second_call`-gated | match |

No contradiction; the anchor-port stop condition was not met; the figures
were verified at the original extraction and now verified against the
archive. The archive is the authority of record:
`docs/sources/sweden/gothenburg/port-authority/port-tariff-2026.txt`,
SHA-256 recorded in the extraction reference, provenance header carrying the
fetch date, the truncation limitation, and the upstream URL.

**Repairs (adjudicated, this pass):** the 10 port-authority rule citations
re-pointed from the never-existed `.pdf` path to the archived `.txt` (the
v0.4.5 citation-repair pattern; 10 `document_url` + 10 `document_name` pairs
— the port-authority block is the silo's citation set for G1); G1 leaves the
not-archived list (the list is now empty — the source_integrity re-baseline
with in-test attribution); the GOT extraction reference's G1 row and
not-archived paragraph updated; the archive-presence pin added with red
proofs; the web citation-string pins re-baselined with in-test attribution
(the discount citation renders the archived `.txt` filename).

## 7. The standing ritual (rate update)

Drift 0, verified at execution time: the Frankfurter mirror's latest TARGET
publication is 2026-10-02 at 11.29, identical to the pinned rate and as_of;
the YAML unchanged. No conversion-only movement; the six native totals
byte-identical (GLE 10,306,979.35 / NRK 8,297,772.50 / NVK 11,952,324.05 /
GOT 3,275,851.15 / HEL 8,750,057.40 / HAM 2,204,910.90 — verified against the
engine at the default calls during the audit).

## 8. Zero-drift pinned

This pass moves no money under any landing short of a G1 figure contradiction,
which did not occur (§6). The six native default totals are byte-identical,
verified: GLE 10,306,979.35 / NRK 8,297,772.50 / NVK 11,952,324.05 /
GOT 3,275,851.15 / HEL 8,750,057.40 / HAM 2,204,910.90.

## 9. Grade (§11)

Patch-grade confirmed: an audit-and-repair pass with no figure movement; the
repairs are citation bookkeeping, documentation coherence, one archive
presence pin, and branch deletion. No finding demanded structural test
architecture changes (the pin-strength sweep found no weak pins to repair;
the coverage-matrix coherence check was adjudicated unpinnable without
over-fitting). The minor trigger does not fire. v0.4.6 → v0.4.7.

## 10. Deferred queue (restated verbatim; findings appended)

1. Scrubber-waste actual-cost surfaces - deferred, unchanged.
2. Equipment-hire surface at Norvik - dropped per the product owner;
   recorded in the Hutchison extraction reference. Removed from the queue.
3. Pilotage-time assumption refinement per port - deferred, unchanged.
4. Gavle winter-surcharge calendar-window rule shape - deferred
   (engine does not support date-window conditions), unchanged.
   **Finding appended at v0.4.3 (recorded, not restated by later passes):**
   closed - the annual calendar-window condition type and the istillagg
   (docs/ANNUAL_WINDOW_CONDITION_AUDIT.md). The item stays listed verbatim
   as the historical record; it is not open work.
5. Handling-basis table now a verified artifact (TERMINAL_BASIS_COMPARABILITY
   audit SS2): future terminal-operator documents - APMT Terminals
   Gothenburg first (the GOT case-3 finding) - enter against it; the basis
   annotation family re-baselines per port as each operator document is
   archived and extracted. **Finding appended at v0.4.5:** the APMT
   container tariff was re-attempted this pass and every fetch route was
   refused (audit SS2.1 above); the item stays open on a document-delivery
   route. **Finding appended at v0.4.6:** the v0.4.2 basis audit's open
   finding closes - archived (the product-owner delivery, both documents),
   verified, basis unstated in the published document, the honest
   characterization recorded; the toggle's GOT participation remains "not
   published"; the remaining not-archived GOT sources G1/G2 stay the queue's
   bookkeeping item (G2's citation bookkeeping repaired to the archive this
   pass; G1 unchanged). **Finding appended at v0.4.7:** G1 archived (the
   health audit pass, §6 - the primary-route fetch served, the truncation
   limitation recorded, every encoded figure verified, the citations
   re-pointed, G1 leaves the not-archived list, which is now empty); the
   not-archived bookkeeping item closes.
6. Yilport operational surfaces (overtime SS2, out-of-window SS3.5, waiting
   time SS3.7, COPRAR-absence SS3.8, productivity compensation SS3.2) -
   recorded; encoded only when a future pass adds the scenario inputs.
7. Norrkoping liner criterion - deferred, unchanged.
8. Yilport empty-container input (1,235/unit) - recorded, not encoded.
9. **The prislista in-repo archive and the document_url bookkeeping repair
   (the v0.4.4 audit's deferred-queue finding) - closed at v0.4.5: the text
   extraction archived under docs/sources/sweden/national/ with its national
   extraction reference, every silo's national citation repaired to the real
   path; the binary PDF remains unarchived (the recorded limitation), a
   future binary-capable fetch may replace the text archive and re-verify.**

   **Findings appended at v0.4.7 (the health audit pass):**
   - **10. GOT break-bulk duplicate rule (`apm_terminals_handling_break_bulk`)
     - mis-encoded dead data, awaiting explicit adjudication** (audit §2):
     the unhandled `1000_kg` unit_type, no presence gate, a spurious
     zero line on every GOT call; moves no money. The correct gated sibling
     (`apm_terminals_handling_break_bulk_scrap`) prices the surface. Not
     deleted, not repaired - the adjudication (delete as a duplicate, or gate
     and re-point its unit_type) belongs to a future pass; a repair touches
     the silo's rule set and is never silent.
   - **11. Input-coverage asymmetries recorded** (audit §5,
     docs/INPUT_COVERAGE_MATRIX.md): 25 engine inputs with no UI anywhere
     (the HHLA container-services and storage size-class families; the
     Hamburg transshipment units), and five HEL ancillary rules whose unit
     inputs do not exist in `CallInput` at all - recorded in the matrix;
     input surfaces are future work; the rules stay, correctly
     blank-priced.
   - **12. INTENDED_STATE corrected to the six-port reality and the current
     default-call figures** (audit §4); the spec's §8 REST-API sentence and
     §9 initial-port set marked as aspirations/annotated (aspirations never
     rewritten as delivered - the historical record preserved).
   - **13. Branch-hygiene protocol note:** four merged delivery branches
     (`vibe/healthcheck-carryover-64f7e7`, `vibe/storage-towage-e148f7`,
     `vibe/worked-example-fix-64f7e7`,
     `vibe/worked-example-verification-64f7e7`) verified merged with zero
     unmerged unique work and deleted at v0.4.7 (branches die at delivery).
