# App Purpose Review — Graded Findings (v0.8.2)

Read-only audit. No code, data, or test file was edited by this pass; the only
non-report edits are the v0.8.2 version bump (specification header and changelog
row, `web/src/version.ts`, and the version pin in `web/src/print.test.tsx`).
The builder recommends; the directive author verifies and grades; the user
adjudicates; remediation is a later pass. Priorities below ("P1".."P3") are the
builder's suggestions for the author's grading, not grades.

- Branch `vibe/purpose-review-v082` from main `16c3569` (v0.8.1, bundle `main.bc7570d2.js`).
- Parked branch `vibe/rotterdam-terminal-layer-v080` (`593fcd9`) untouched. Rotterdam stays hidden.
- Unit 0 ledger re-verified in the build copy: core 811/811 (36 suites), web 588/588 (48 suites), tsc clean.
- ECB observation taken for the record only (no rate change in this pass): the pinned values in `core/data/exchange_rates.yaml` are SEK 11.123 and DKK 7.4746, as of 2026-10-20.

## Classes

| Class | Meaning |
|---|---|
| DEFECT | The implementation contradicts the specification or an archived document |
| ASYMMETRY | Internally inconsistent: one port or surface is treated unlike its peers |
| RECOMMENDATION | An in-scope, traceable improvement |
| OBSERVATION | A fact of record; no action |

Items already recorded elsewhere are tagged **[KNOWN]** and are only verified, not re-argued.
Scope questions (outside container-vessel scope) are listed separately and are never recommendations.

## 1. Audit checklist (derived from SPECIFICATION.md alone)

| ID | Criterion | Source in the specification |
|---|---|---|
| C1 | Purpose: estimate the total publicly-known cost of one container-vessel call; every figure traces to a cited archived source | §1 Purpose |
| C2 | Model-closed contract: the tool prices only what the model encodes; a charge the model does not encode is never implied to be zero | §11 (contract sentence) |
| C3 | Honesty contract: "not published" and "not entered" are wording, never a zero; estimated, assumed, fallback and contract-vs-published figures are flagged where they appear | §4.4.2 (missing-parameter fallback), §4.3.1 (data quality carried through), changelog v0.2.4 |
| C4 | Default-call contract: the default call prices the worst-case published ceiling; a blank input means not entered | §4.4.2 (default-call contract, v0.2.28) |
| C5 | Charge-type segmentation is by rule-id membership, never by fee family; stages and zero-line collapse are presentation over unchanged figures | §4.8 |
| C6 | Container-through is presentation-only and default-off; it never changes a Grand Total | §4.2.16 |
| C7 | Every rule carries a source reference that an archived document supports; the archived document governs on mismatch | §5.1 (source traceability) |
| C8 | Environment discipline: build copy, exact-path chunked runs, no `node_modules` in the repository tree | §12 |
| C9 | Working discipline: one delivery, one bump; gate report before merge; a contradiction stops and is reported | §13, §11 |
| C10 | Deployment: the served bundle is identified through the CI artifact manifest and the live shell | §8 |
| C11 | Identifier hygiene: no vessel name, call reference, document reference, party identifier, or call date appears in any authored file | Section 6 identifier-shape grep |
| C12 | Scope: container vessels only | §1, deferred queue |

Note: the directive refers to "§13 environment discipline"; in the committed specification the environment discipline is §12 and the working discipline is §13 (C8, C9).

## 2. Findings

### D-01 — DEFECT — RESOLVED — Eight per-unit rules reference an input that does not exist (silent permanent zero) · P2 (resolved at v0.12.0)
Criteria C2, C3, C7.
Eight `per_unit` rules use a `unit_type` that is neither an engine case (`core/src/engine.ts:775–860`) nor a `CallInput` field (128 fields, `core/src/types.ts`); the generic default branch `(call as any)[unit_type] ?? 0` (`engine.ts:858–860`) therefore prices them at 0 with no way for a user to supply a count:

| Port | Rule | unit_type | Encoded rate |
|---|---|---|---|
| aarhus | `apmt_aarhus_gate_move_truck` | `gate_moves_truck` | 338.00 DKK |
| gothenburg | `sjofartsverket_cargo_fee_passengers` | `pax` | 2.52 |
| gothenburg | `sjofartsverket_cargo_fee_private_vehicles` | `unit` | 3.36 |
| helsingborg | `poh_imo_transport` | `imo_transport_units` | 510.0 SEK |
| helsingborg | `poh_vgm` | `vgm_units` | 430.0 SEK |
| helsingborg | `poh_other_admin` | `other_admin_units` | 360.0 SEK |
| helsingborg | `poh_customs_inspection` | `customs_inspection_count` | 1,015.0 SEK |
| helsingborg | `poh_port_area_transport` | `port_area_transport_units` | 950.0 SEK |

The Helsingborg descriptions say "Optional call input, default off", which asserts an input the code does not have. The loader (`loader.ts:363`) checks only that `unit_type` is present, not that it resolves. The two Gothenburg passenger/vehicle rules are also a scope question (S-1). Found by script over all nine YAML files and the `CallInput` field list.
Recommendation: make the loader reject (or at least report) a `unit_type` that resolves to nothing; then either add the inputs or retire the dead rules with wording.

Resolved by the v0.12.0 pass (D-01 remediation (user rulings 2026-10-26)): the loader fails closed on a per_unit `unit_type` that resolves neither to an engine case nor to a `CallInput` field, naming the port, the rule and the `unit_type`. The five Helsingborg rules price on five new blank-default inputs at their published rates (verified against tariff 2026 p.8). The two Gothenburg passenger and private-vehicle rules are retired out of scope (S-1). The Aarhus gate move truck rule is retired; its legs remain the container-through toggle surface. A ninth unresolved rule found in the v0.12.0 survey, the ungated Gothenburg break-bulk duplicate `apm_terminals_handling_break_bulk` (`1000_kg`), is retired as well. No figure moved.

### D-05 — DEFECT — The Gävle default call is not the published-ceiling call for seven months of the year · P1
Criteria C4, C1.
§4.4.2 defines the default call as "the worst-case published-rate call: every port at its published ceiling, max-vs-max". Gävle's winter istillägg doubles the container-vessel hamnavgift between 1 December and 30 April (§4.4.2 annual-window paragraph names Gävle as the first consumer), and the default call carries today's date, so from 1 May to 30 November the Gävle default prices the lower year-round rate: 10,306,979.35 against 10,885,680.88 (executed, see A-01). The contract is met only in winter. Same cause as A-01; the contract breach is the DEFECT, the date-dependence of the suites is the ASYMMETRY.
### A-01 — ASYMMETRY — Gävle's default-call total depends on the run date; the pinned suites go red from 1 December 2026 · P1 (time-sensitive)
Criteria C4, C8.
`defaultCall()` stamps today's date (`core/src/defaults.ts`). Gävle's istillägg rule `gvh_hamnavgift_container_winter` is gated on the annual window 1 Dec–30 Apr (`core/data/gavle_2026.yaml`; tariff clause cited as hamntaxa-2026 p.4 §2.1, not re-opened, see §4). Verified by execution (build-copy engine, default vessel, default call):

- Gävle: 10,306,979.35 on 2026-07-01, 2026-10-20, 2027-06-01 and 2025-06-01; 10,885,680.88 on 2026-12-15 and 2027-02-01.
- The other eight ports: date-invariant across all six dates tried.

With a faked clock of 2026-12-15 (build copy only; nothing committed), the existing suites show 10 reds of 1,399 tests — core 5 of 811, web 5 of 588:

- core: `aarhus.test.ts` (every pre-expansion port total byte-identical, v0.5.2 figures); `bremerhaven.test.ts` (same, v0.5.0 figures); `swedish_expansion.test.ts` (three: Gävle default-call baseline, Gävle per-GT derived figure, Gävle hamnavgift 2.97 / waste 0.18).
- web: `comparisonDefaults.test.tsx` (zero-drift per-port totals); `discountLine.test.tsx` (two: rendered Grand Total strings, stage-subtotal strings); `grandTotalPerGt.test.tsx` (GOT and HEL pure division against pinned baselines); `handlingBasis.test.tsx` (toggle never changes a Grand Total).

Today (2026-10-21) all 811 and 588 are green; the first red date by the rule is 2026-12-01 (executed at 2026-12-15 and 2027-02-01; the window boundary dates themselves were not individually executed). Neither CI workflow runs the suites (R-03), so the deployed site is unaffected; the effect is on every later pass's baseline and on the comparison ranking, which can reorder in winter.

### A-02 — ASYMMETRY — RESOLVED — The Gothenburg handling-basis annotation carried origin wording (resolved at v0.8.3)
Criteria C3, C11.
Resolved by the v0.8.3 pass: the Gothenburg handling-basis annotation (`web/src/handlingBasis.ts`) is structure-only (the separately billed lift at 1,029 SEK per unit per move, ordinary time, the goods charge, and the landside leg at 453 SEK), and the lift and the landside leg render like any other rule line. The wording defect this finding recorded no longer exists. The structural observation stands as recorded: the print path imports only `containerThroughParts` from `handlingBasis` (`printComparisonPages.tsx:24`) and does not use `handlingBasisAnnotationFor`, so the annotation is on screen only (`comparisonView.tsx:394, 633`). Not run through a print render in this pass: established from the code and the file's own header comment.

Superseded at v0.11.0 and v0.11.4 (marked in place at v0.11.5, Docs alignment (user rulings 2026-10-22)): the encoded lift and the hardcoded landside leg described above no longer exist. Since v0.11.0 the lift is the user-specified Cost per lift input and the landside leg is the user-specified Delivery input, both blank by default (blank = not priced, not added); since v0.11.4 the annotation states only what is true of those inputs. The figures 1,029 and 453 SEK stay recorded, not encoded, in the Gothenburg extraction reference §8.

### A-03 — ASYMMETRY — Container-through landside leg: Hamburg's 152 EUR applies irrespective of terminal; Bremerhaven's default-terminal basis differs · P3 **[KNOWN]**
Criterion C5/C6. Recorded in the v0.8.0 ruling S-b (Hamburg precedent). Verified in `handlingBasis.ts` only; not re-argued.

### A-04 — ASYMMETRY — Rules with no UI input surface unevenly in the default result · P3
Criterion C3.
Executed on the default call (build-copy engine): Helsingborg `poh_reefer_connection` is present with amount 0 and no flag; Norvik `snv_hutchison_transshipment` is present with amount 0 and the `scenario_adjusted_basis` flag; Hamburg `hhla_storage_transshipment`, `hhla_container_service_gassing_20ft` and `hhla_container_service_admin` produce no line. Three treatments for the same condition ("input exists in the model, no field in the UI"). See the table in §3.

### R-01 — RECOMMENDATION — Inject a fixed date in the pinned suites (and have the Gävle baseline name its date) · P1
Criteria C4, C8. Follows A-01. The tests that pin default-call totals call `defaultCall()` with today's date; they should pass an explicit date, with the winter-window case pinned as its own named test. A pin test is wrong for tomorrow, not wrong for the rule.

### R-02 — RECOMMENDATION — Decide how the tool behaves outside the 2026 validity window · P2
Criteria C1, C3. All nine port definitions declare validity 2026-01-01 → 2026-12-31 and the engine never reads it (executed at 2027-02-01 and 2027-06-01: totals computed; the quality-flag types returned at Gothenburg and Hamburg on 2027-06-01 are contract_vs_published, estimated_parameter, assumed_parameter, regulatory_notice, service_gap_notice and unmatched_fee_family — none concerns the tariff year). The printed comparison header does state the tariff year, derived from the data's `validity_start` (`printComparisonPages.tsx:165–166`), so a 2027-dated print still reads "Tariff year: 2026" — honest about the data, but nothing says the call date lies outside it. Fits the already-queued 2027 update sequence; a wording on the result when the call date is outside the validity window would make the honesty contract hold after the year turns.

### R-03 — RECOMMENDATION — Neither CI workflow runs the test suites · P2
Criteria C9, C10. `deploy.yml` builds with `CI=false npm run build` (warnings are not fatal) and deploys; `spec-guard.yml` runs only the version guard and its five demonstration fixtures. The root `npm test` runs the core suite only (`package.json`); there is no script that runs the web suite. All verification in this project is by hand in the build copy. A test step (core and web) in CI would make A-01 visible on the day it happens.

### R-04 — RECOMMENDATION — Single named constant for the 0.55 NT estimate · P3
`vessel.gt * 0.55` is written out at four sites (`engine.ts:213, 439, 811, 1952`).

### R-05 — RECOMMENDATION — RESOLVED — Wording of the collapsed lift badge on the single-port workspace (resolved at v0.8.3) · P3
Resolved by the v0.8.3 pass: the lift rule carries no caveat construct and renders like any other rule line; there is no badge wording to align.

### R-06 — RECOMMENDATION — No-UI inputs: one disposition per group (see §3) · P3

### D-02 — DEFECT — README setup instructions do not work on a fresh clone · P2 **[KNOWN debt; specifics new]**
Criteria C9, C10.
- `README.md` tells the reader to run `npm run dev`; the root script delegates to `web`'s `dev` script, which does not exist (web has `start`, `build`, `test`).
- The data conversion step is missing: `web/src/data/` is git-ignored (`.gitignore:29`) and generated by `core/scripts/convert_yaml_to_json.js`; `npm run build:core` is only `tsc`. Evidence by execution: a mirror of the tree without `web/src/data/ports.json` fails every web suite with `Cannot find module './data/ports.json'` (all 48 suites, observed in this pass). CI performs the conversion explicitly (`deploy.yml`).
- Prerequisites say "Node.js 18+ / npm 9+"; CI and the project's practice are Node 20.

### D-03 — DEFECT — `DEFAULT_EXCHANGE_RATE` still carries the superseded 11.29 / 2026-10-02 · P3 **[KNOWN]**
`web/src/conversion.ts:43–48` (`rate: 11.29`, `date: '2026-10-02'`) versus the pinned 11.123 (2026-10-20). It is a fallback used only when the registry rate block is missing (`conversion.ts:139–149`); the on-screen default text prefers the data block (`comparisonView.tsx:887`). Tests import the constant (`conversion.test.ts`), so a change moves a pin by design.

### D-04 — DEFECT — Ritual wording still says "Frankfurter mirror" and "update the YAML if the rate has moved" · P3 **[KNOWN]**
`docs/ENVIRONMENT_DISCIPLINE.md` §10 (line 75) and `docs/SPECIFICATION.md` §14 describe the pre-v0.8.1 ritual. The rate pass established the ECB TARGET publication as the source.

### D-06 — DEFECT — Specification §4.4.2 "Terminal scope" paragraph still says an unrecognised operator falls back to HHLA · P3
Criterion C7. The paragraph (v0.2.49 text, `docs/SPECIFICATION.md` line 445) states "An absent or unrecognized terminal-operator value falls back to HHLA with a visible fallback flag"; the engine falls back to Eurogate (`engine.ts:267–269`) and §4.2.9 (v0.2.66) promoted Eurogate to the default. Document-only: the code and §4.2.9 agree with each other. Belongs to the documentation-alignment queue (D-02..D-04, O-01); new to this audit, not previously recorded.
### O-01 — OBSERVATION — Specification and audit-document staleness · **[KNOWN]**
Verified as already recorded: the specification opening paragraph says "committed record at version 0.4.7"; §3.2 (call table), §5.2 (fee_family enumeration), §7 (repository layout) and §4.8's charge-type paragraph predate v0.8.0; `docs/INPUT_COVERAGE_MATRIX.md` is headed v0.4.7 and `docs/TERMINAL_BASIS_COMPARABILITY_AUDIT.md` v0.4.2 (both are dated historical records, not live concordance).

### O-02 — OBSERVATION — Net-tonnage estimate path is clean
Executed: with the vessel's NT deleted, all nine ports return exactly one `estimated_nt` flag at call level and the caller's vessel object is not mutated (`vessel.nt` stays undefined after the call). The in-engine assignments at `engine.ts:439` act on the engine's working copy.

### O-03 — OBSERVATION — Fee-family closure
`FeeFamily` ends in `| string` in `types.ts`, but `loader.ts:30` (`KNOWN_FEE_FAMILIES`) and `loader.ts:664–676` reject an unknown family at load, and the engine flags an unmatched family. Closed in practice.

### O-04 — OBSERVATION — Ranking and hiding
Cheapest and most-expensive markers are computed on the converted comparison basis (`conversion.ts:227–250`); Rotterdam is excluded by the `LOADED_PORTS` filter (`portRegistry.ts:30–33`) while still registered with the engine (`portRegistry.ts:42`), so it cannot be ranked or shown. That is the intended exclusion design; this pass takes no action on it.

### O-05 — OBSERVATION — No runtime network dependency; local installation
The web runtime contains no `fetch`, XHR, or CDN load (only outbound hyperlinks in `comparisonView.tsx:892` and `envGuidance.ts`). The build is a static bundle with `homepage` `/VibesandTariffs`. As a 1.0-track read-only question: local use is ready once D-02 is fixed (conversion step documented, `dev` script defined) and a statement of the base-path requirement is added.

### O-06 — OBSERVATION — The archived APMT Gothenburg tariff text carries a "Classification: Confidential" page marker
`docs/sources/sweden/gothenburg/apm-terminals-terminal-tariff-2026-june.txt:60` (page-1 footer text). The rule files cite this document as the published source of the 377/535 SEK goods charges, and specification changelog 0.2.4 states that APMT publishes its handling charges. The builder takes no view; surfaced for the author and user to adjudicate whether the marker changes the "publicly known" standing of that archive (criterion C1).

### O-08 — OBSERVATION — The drawer cap and the fresh-load default conform to the specification
`COMPARISON_SELECTION_CAP = 6` (`web/src/portDrawer.tsx:18`) and its on-screen message (`portDrawer.tsx:21`) match §4.3.1 (six-port cap, "N/6" counter, disabled checkboxes at cap, unchecking always works, arithmetic recorded there); the fresh-load default is the first four loaded ports (`App.tsx:117`), as §4.3.1 states. With eight visible ports the cap binds on two. No action.

### O-09 — OBSERVATION — Terminal-operator fallback is flagged
`engine.ts:259–281`: an absent or unrecognised operator resolves to Eurogate and raises a `fallback_value` flag naming the fallback, as spec §4.2.9 (v0.2.66) and the v0.5.1 comment describe. Not silent. (The stale spec wording is D-06.)
### O-07 — OBSERVATION — Conventions of record
The tariff basis excludes empty containers where the container is not the commodity (APMT tariff text line 74, "Excluded from charges on goods are empty containers…"); the default call prices every container as a full unit.

## 3. Unit 4 — Inputs with no UI surface (consolidated)

Twenty-five `CallInput` fields appear in no non-test file under `web/src`; each is consumed only by the generic default branch (`engine.ts:858–860`) and resolves to 0 unless a caller sets it. Rule ids found by script over the YAML.

| Group | Fields | Rules consuming them | Builder recommendation |
|---|---|---|---|
| HHLA container services | `container_service_reception_units`, `container_service_extra_moves`, `container_service_admin_fee`, `vgm_weighing_units`, `vgm_calculative_units`, `reefer_connect_units`, `reefer_checks`, `labelling_units`, `neutralization_units`, `gassing_20ft_units`, `gassing_40ft_units` | `hhla_container_service_*` (Hamburg) | Keep out of the UI; state "not priced by default — enter to include" wording (C2); no new inputs until a service need is declared |
| Storage (non-default basis) | `storage_days_transshipment`, `storage_days_hazardous`, `storage_empty_days`, `storage_empty_20ft_units`, `storage_empty_30ft_units`, `storage_empty_40ft_units`, `storage_empty_45ft_units`, `storage_import_30ft_units`, `storage_import_45ft_units`, `storage_export_30ft_units`, `storage_export_45ft_units` | `hhla_storage_*`, `eurogate_equipment_hire` (Hamburg); `poh_storage_*` (Helsingborg) | Same disposition as above; landside storage is outside a vessel-call price unless a directive declares it |
| Transshipment | `transshipment_units` | `hhla_storage_transshipment` (Hamburg), `snv_hutchison_transshipment` (Norvik) | Same wording disposition; aligns with A-04 |
| Reefer | `reefer_connection_units`, `reefer_days` | `poh_reefer_connection`, `poh_reefer_days` (Helsingborg); `hhla_container_service_reefer_energy` (Hamburg) | The existing UI input `reefer_units` already exists; map the Helsingborg rules to it or retire them (D-01 family) |
| Nonexistent keys (not `CallInput` fields at all) | `gate_moves_truck`, `pax`, `unit`, `imo_transport_units`, `vgm_units`, `other_admin_units`, `customs_inspection_count`, `port_area_transport_units` | the eight rules of D-01 | Per D-01 |

Ancillaries with no `CallInput` counterpart and an encoded rate are exactly the D-01 set. The scenario and storage-day inputs that do have UI controls are not covered by this table.

## 4. Citations actually opened in this pass

Environment limit, stated plainly: the PDF page renderer is not installed in this environment (the page reader reports that `pdftoppm` is missing), and no archived PDF page was opened in this pass. Checks were done against the archived plain-text transcriptions and the extraction references:

| Rule(s) | Encoded | Archive opened | Result |
|---|---|---|---|
| `apm_terminals_goods_charge_le20ft`/`gt20ft`, break bulk, hatch cover, gearbox, ISPS (Gothenburg) | 377 / 535 / 54 per 1000 kg / 3111 / 1036 / 80 SEK | `apm-terminals-terminal-tariff-2026-june.txt`, "Page 2", §1.1–1.4 (lines 69–77) | All six figures match; page 2 and "Terminal Charges on goods" match |
| `ntb_container_handling`, `ntb_lashing`, `ntb_twistlocks` (Bremerhaven) | 339.00 / 42.60 / 21.60 EUR | `ntb-reference-tariff-en-2026-08-01.txt`, clauses 2.1.1, 2.3.1, 2.3.2 | Figures and clause numbers match. The text transcription's page markers are ambiguous, so the YAML `page` fields (2, 3, 3) were not independently confirmed |
| `apm_terminals_lift` (Gothenburg) | 1,029 SEK | Not an archive document: GOTHENBURG_EXTRACTION_REFERENCE §8 (handling rates of record) | By design. Superseded at v0.11.0 (marked in place at v0.11.5, Docs alignment (user rulings 2026-10-22)): the silo no longer encodes this rate; the line prices only the user-specified Cost per lift input, and 1,029 SEK stays recorded, not encoded, in §8 |

Not opened in this pass, and therefore not re-verified: every PDF-sourced rule at Gävle (hamntaxa p.4 2.97 SEK/GT and the istillägg), Helsingborg, Norrköping, Norvik (including the p.6→p.4 correction precedent), Aarhus, Hamburg, Rotterdam. Prior-pass verification stands as recorded; this audit adds none. A pass that can render PDFs (or a user-supplied text extraction) should take the priority list: Gävle winter variant; Norrköping and Helsingborg bands; the Aarhus gate-move basis (D-01).

## 5. Scope questions (not recommendations)

- S-1: Gothenburg carries Sjöfartsverket cargo-fee rules for passengers (`pax`) and private vehicles (`unit`) — passenger/RoRo-type charges in a container-only tool. (Resolved at v0.12.0, D-01 remediation (user rulings 2026-10-26): adjudicated out of the container-vessel scope; both rules retired, the rates recorded in the national extraction reference.)
- S-2: Break-bulk handling is encoded (`apm_terminals_handling_break_bulk`, 54 SEK per 1000 kg; input `break_bulk_1000kg`) — outside container scope.
- No tanker rule was looked for by name; none was noticed.

## 6. Identifier-shape grep (standing)

Run over all tracked authored files at v0.8.3. Two shapes, both with zero hits: eight-digit document numbers beginning 2026, and three capital letters, a hyphen and four digits (call references). The standing identifier pattern set (call-reference, registry-number, party and document-number terms in English and Swedish) was re-run over all tracked files: 50 matching lines in 14 files; the v0.8.2 run reported 52 matching lines in 15 files, and the difference is the extraction reference's two hits, which were removed with the rewritten section.

- The IMO hits are four registry numbers — 9306017, 9632129, 9775737, 9967005 — all of vessels in the public vessel library (and its tests and fixtures).
- The remaining hits are in the verbatim archived texts under `docs/sources/` (exempt) and in the NT re-derivation, scenario-layer and specification text.
- Result: no identifier-shaped string appears in any authored file attached to a call, a document or a party.

## 7. Deployment and packaging (Unit 6)

- Chain verified from the workflows: push to `main` → `deploy.yml` (Node 20; `npm ci` and the conversion in `core`; core build; web `npm ci`; web build with `CI=false`; Pages artifact; deploy). `spec-guard.yml` runs on pull request and push to main: the version guard plus five demonstration fixtures (un-bumped must fail; bumped must pass; spec-only must pass; chip-ahead must fail; chip-behind must fail). Served-bundle identity is established through the artifact manifest and the live shell, as in spec §8; used in all four prior deliveries.
- Gaps: R-03 (no test step), D-02 (fresh-clone instructions), O-05 (local readiness).

## 8. Deferred queue (restated, not worked)

Terminal-aware landside legs (v0.9.x); documentation alignment (v0.8.x — D-02, D-03, D-04, D-06 and O-01 are its content); Rotterdam stays parked until the user directs otherwise; expansion waves and the 2027 update sequence (R-02 belongs there).
