# Tariff-Sheet Worked-Example Verification — 2026 Tariff Year

Standing cross-check reference (spec v0.2.36): every worked example in every
inventoried source document was reconstructed on the engine and reconciled
line-by-line against the sheet's printed figures. This document is the
durable record for the next tariff year's cross-check: re-run each entry's
inputs against the new year's documents, and extend the inventory with any
new examples the publishers add.

Pass date: 2026-09-23. Specification v0.2.36. No figure changed inside this
pass — every discrepancy is reported with its diagnosis; fixes belong to the
enumerated future passes.

---

## 1. Document inventory

Archive status follows the v0.2.32 source-link contract: archived documents
live under `docs/sources/`; not-archived sources carry a live publisher
`upstream_url` in the port YAML.

| ID | Document | Version / date | Archived | Cited by extraction | Worked examples |
|----|----------|---------------|----------|--------------------|------------------|
| S1 | HPA, Schedule of Fees and Charges — Maritime Shipping (Pricelist) | v2.0, issued 2025-12-18, effective 2026-01-01 | Yes (`docs/sources/germany/hamburg/port-authority/pricelist-maritime-shipping-2026.pdf`) | Yes (HAMBURG_EXTRACTION_REFERENCE §CP1) | 3: tanker (cat. 11, p.5), container (cat. 31, p.8), cruise (cat. 36K, p.13) |
| S1-v1 | HPA Pricelist Maritime Shipping, version 1.0 (issued 2025-10-09) | v1.0, superseded by v2.0 | Not archived (upstream: hamburg-port-authority.de Hafengeld/2026 … Version_1.0.pdf) | No (v2.0 is the extracted version) | 3: same three examples, compared under §3.4 below |
| S2 | Sjöfartsverket, Prislista farleds- och lotsavgifter 2026 (issued 2025-11-01) | 2026 edition | Not archived (upstream URL in `core/data/gothenburg_2026.yaml` and helsingborg YAML) | Yes (Gothenburg/Helsingborg references; see §3.5 on a stale path claim) | 0 computation examples; contains the rate tables (start fees, per-half-hour fees, readiness, vessel fee by class/CSI, ordering-fee bands, 40% >7 h discount statement) |
| S3 | Sjöfartsverket, Lathund lotsavgifter 2026 (per SJÖFS 2025:5) | 2026 edition | Not archived (upstream: www-n.sjofartsverket.se … lathund-lotsavgifter-2026.pdf) | Cited by Gothenburg reference §1 (as S3, previously uncited; see §3.5) | The lathund **is** a worked table: 10 NT classes × 56 half-hour rows of pre-computed pilotage totals (start + rounded-up half-hours, with the >7 h discount applied) |
| S4 | HHLA Quay Tariff 2026 | valid from 2026-01-01 | Yes (`docs/sources/germany/hamburg/hhla/quay-tariff-2026.pdf`) | Yes | 0 worked examples (rules only: free times, daily rates, escalation) |
| S5 | HPA Port GTC 2026 | issued 2025-10-09 | Yes | Yes | 0 |
| S6 | HPA STC Maritime Shipping 2026 | issued 2025-10-09 | Yes | Yes | 0 |
| S7 | GDWS Pilot Tariff (Elbe) 2026 | 2026 | Yes | Yes | 0 |
| S8 | Eurogate Hamburg, Prices and Conditions 2026 | 2026 | Yes | Yes (handling estimate anchor) | 0 |
| S9 | City of Hamburg (BUKEA) Ship Waste Fees Ordinance 2025 | 2025 | Yes | Yes | 0 |
| G1 | Port of Gothenburg, Port Tariff 2026 (version 1) | effective 2026-01-01 | Not archived (upstream: portofgothenburg.com/globalassets/dokument/port-tariff-2026.pdf) | Yes | **5**: container EU (p.11), container non-EU (p.11), tanker EU (p.8), RORO (p.14), ROPAX (p.19); plus a car-carrier/LOLO example (p.16) mislabeled in the sheet (see §3.2.4) |
| G2 | APM Terminals Gothenburg, Terminal Tariff 2026 (June) | June 2026 edition | Not archived (upstream URL in gothenburg_2026.yaml) | Yes (storage/yard-surcharge source) | 0 — **but the stored upstream URL serves a different document** (see §3.5) |
| G2c | APMT "Guide to calculating quay storage" infographic (companion calculation document) | 2025 edition found | Not archived; **bot-gated this pass** (apmterminals.com returned Access Denied; see §5.2) | No (newly inventoried here) | The guide is a worked-example document (per the tariff's own pointer: "Detailed storage calculations can be found on … practical-information/terminal-tariff"); contents unverified this pass |
| H1 | Helsingborg Port Authority, Tariff 2026 | 2026 | Yes (`docs/sources/sweden/helsingborg/port-authority/tariff-2026.pdf`) | Yes | 0 (no worked examples in the document) |
| R1 | SJÖFS 2025:5 (regulation: pilotage fees; prislista defers to it) | in force 2026-01-01 | Not archived; remiss (consultation) text retrieved live from regelradet.se (RR 2025-215) | Deferred to (prislista cites "Relaterad föreskrift: Föreskrift 2025:5") | 0 examples; **computational rules**: §15 start fee by NT class; §17 per-commenced-half-hour, time rounded up; §25 the 40% reduction for piloted time ≥ 7 h applies **to the lotsningsavgift only, and only to the portion of time exceeding 7 hours**; §14 ordering-fee bands |
| R2 | SJÖFS 2025:6 (regulation: fairway due) | in force 2026-01-01 | Not archived | Deferred to (prislista cites it) | 0 (the vessel-fee/reduction rules are in the prislista summary itself) |
| E1 | Sjöfartsverket remiss "Exempelbilaga 2026" (consultation example annex, RR 2025-214/215 bundle) | 2025-06-18 | Not archived; the bundle cover letter was retrieved live; the annex itself was not directly fetchable (regelradet 404 on the separate bundle URL) | No | 2 consultation examples (Exempelanlöp 1: small vessel, Vänern long pilotage; Exempelanlöp 2: larger vessel, Gothenburg short pilotage) — 2025-vs-2026 impact illustrations, not authoritative tariff computations; **not cross-checked** (see §5.2) |

**Checkpoint-to-example mapping** (Phase 2 §3): CP1 (hamburg.test.ts "GT
component reproduces S1 printed 32,838.88" etc.) maps to the **S1 container
example** (v2.0 p.8, identical in v1.0) — already pinned. CP2–CP5 are
builder-constructed checkpoint calls (real vessels, not sheet examples) —
pinned to the extraction reference's own figures, which were sheet-derived
only for CP1. The Swedish priority ground: **no Swedish sheet example had
ever been pinned** — WE-GOT-1/2 (container), the tanker/RORO/ROPAX/carrier
examples, and the lathund rows were all never-cross-checked until this pass.
Nothing touching the v0.2.33 storage ladder appeared in any inventoried
sheet example (see §3.6).

---

## 2. Reconciliation method

Each example was reconstructed as an engine call (inputs taken verbatim
from the sheet where stated; each unstated input recorded as an assumption),
run against the port file, and compared line-by-line against the sheet's
printed lines: rate × quantity per line first, band and tranche arithmetic
second, adjustments and discounts last, total last. Where the sheet
publishes only a total, the total was reconciled and the line-level gap
recorded. Examples whose vessel type the port file does not encode
(Gothenburg tanker/RORO/ROPAX/car-carrier; HPA tanker and cruise) were
reconciled by documented script arithmetic against the sheet's own rates —
the reconciliation is recorded here even though no engine pin is possible
until those dues are encoded (encoding is scope, not a defect). Verdict
classes were kept strictly separated: **tool defect** (diagnosed, not
fixed), **assumption difference** (tool figure right for its stated
inputs), **cancelling-error coincidence** (total matches but intermediate
lines must also match — agreement for the wrong reason is a finding).

Known non-defect divergence classes were checked explicitly: Tier 0
worst-case defaults, blank ESI/CSI defaults, flagged towage estimates. The
WE-GOT-1 example enters no ESI score, so the worst-case default must hold
its figures; entering ESI ≥ 30 must fire the −10% with a visible adjustment
and no assumption flag — both behaviors are now pinned (tests T2, §6).

## 3. Findings

### 3.1 TOOL DEFECT — Sjöfartsverket lathund rows above 7 hours (pilotage ≥ 7 h discount)

**Source rule (SJÖFS 2025:5 §25, remiss text RR 2025-215):** for piloted
time of at least 7 hours, the fee is reduced by 40% — applying to the
**lotsningsavgift only** (the §17 per-commenced-half-hour fee), and only to
**the portion of time exceeding 7 hours**.

**Correct derivation:** start fee unreduced + the first 14 half-hours at
full rate + each commenced half-hour beyond 14 at 60% of the rate.
Example, NT class 4 at 7.5 h: 17,300 + 14×3,940 + 1×3,940×0.6 = 17,300 +
55,160 + 2,364 = **74,824** (the lathund's printed row).

**Engine behavior:** the >7 h reduction multiplies **both** the start fee
and the entire per-half-hour line by 0.6. Class 4 at 7.5 h: 0.6 ×
(17,300 + 15×3,940) = 0.6 × 76,400 = **45,840** — 29,484 SEK under the
lathund. The defect applies to every NT class and every duration above
7 h.

**Test impact:** the existing >7 h pin in `core/test/gothenburg_repair.test.ts`
pins the defective figure. Per the verification-pass contract it is left
untouched here; the fix pass repairs the engine and re-pins against the
lathund's >7 h rows. No new test pins the defective behavior; the ≤7 h
lathund rows (which do not engage §25) are pinned (tests T4–T6, §6).

**FIXED in the worked-example fix pass (spec v0.2.37):** the engine gained an
`excess_units` reduction construct (adjustments with `apply_to: excess_units`
and `threshold_units: 14` discount only the units beyond the threshold, off
the per-unit rate; the start fee now carries no discount at all). Both the
Gothenburg and Helsingborg port files carry the corrected form on all 10 NT
classes' per-half-hour rules. Re-pinned: gothenburg_repair.test.ts class-4 8 h
45,840 → **77,188** (lathund row 8,0 h); helsingborg.test.ts class-4 8 h
48,204 → **77,188**; regression pins added for lathund rows 7.5/8/9/9.5 h
(classes 1, 4, 8) via both ports, and a 7 h boundary pin (14 half-hours all
full-rate, no adjustment on the start fee).

### 3.2 Gothenburg Port Tariff 2026 — worked examples (G1)

All rates below are the sheet's own §2 rates; totals are the sheet's
printed totals. Vessel dues beyond container are not encoded in the port
file (container dues only, by design), so these reconciliations are script
arithmetic against the sheet's rates, not engine pins.

- **WE-GOT-1, container EU, 70,000 GT (p.11) — MATCH, engine-pinned (T1).**
  Progressive dues (20,000×1.96) + (20,000×1.71) + (20,000×1.15) +
  (10,000×0.80) = 39,200 + 34,200 + 23,000 + 8,000 = 104,400 ✓; sludge
  70,000×0.21 = 14,700 ✓; sludge excess 4 m³×2,400 = 9,600 ✓; solid waste
  70,000×0.13 = 9,100 ✓; total 137,800 ✓ — every line and the engine's
  `band_rows` match line-by-line. **Two sheet-internal typos, cancelling in
  the products:** the sludge line prints "0,17 SEK" but the product uses
  the correct 0.21; the excess line prints "2 300 SEK" but the product uses
  the correct 2,400. The printed totals are right for the printed rates in
  force (§2.2 tables) — a source-side typo class, not a tool finding.
- **WE-GOT-1 ESI variant — assumption check, pinned (T2).** The example
  enters no ESI score: blank ESI = not entered = worst case, no assumption
  flag; dues stay 104,400. Entering ESI 40 fires −10% (104,400 → 93,960)
  with a visible discount adjustment and no flag.
- **WE-GOT-2, container non-EU, 12,000 GT with ESI ≥ 30 (p.11) — MATCH,
  engine-pinned (T3).** 12,000×1.96 = 23,520; −2,352 (−10%) = 21,168;
  sludge (non-EU) 12,000×0.31 = 3,720; solid waste (non-EU) 12,000×0.24 =
  2,880; total 27,768 ✓ line-by-line.
- **Tanker EU, 14,000 GT with ESI ≥ 30 and waste certificate (p.8) —
  reconciles by script arithmetic; two sheet-internal inconsistencies.**
  Dues 14,000×4.18 = 58,520; −5,852 (−10%) = 52,668; sludge 14,000×0.21 =
  2,940; excess 4×2,400 = 9,600; solid 14,000×0.13 = 1,820; sum = **67,028**
  = the printed total ✓. (a) The excess line prints "= 9 200" — the printed
  rate (2,400) times 4 is 9,600, and the printed total reconciles only with
  9,600 (a source typo, not the 2,300 misprint class of the container
  example). (b) The example prose mentions the §10 certificate discount
  (−0.05 SEK/GT on the waste fee) but the computation never applies it —
  the printed total is consistent with the discount **not** being applied.
  Recorded as a sheet-internal inconsistency; not a tool finding.
- **Tanker non-EU, 120,000 GT with ESI ≥ 30 (p.8) — reconciles by script
  arithmetic.** Dues 120,000×5.89 = 706,800; −70,680 = 636,120; sludge
  120,000×0.31 = 37,200; excess 9,600 (printed "9 200", same typo class);
  solid 120,000×0.24 = 28,800; sum = **711,720** = the printed total ✓.
- **RORO, 20,000 GT, 7th call in the week (p.14) — reconciles by script
  arithmetic.** 20,000×0.84 = 16,800; −1,680 = 15,120; sludge 4,200;
  excess 9,600; solid 2,600; total **31,520** ✓ (all lines printed correctly).
- **ROPAX, 20,000 GT, 7th call in the week (p.19) — reconciles by script
  arithmetic.** 16,800; −1,680; sludge 4,200; solid 2,600; total
  **21,920** ✓.
- **Car carrier / LOLO, 60,000 GT at the car terminal (p.16) — reconciles
  by script arithmetic.** The example is printed under §2.4 (Car carriers)
  but headlined "BREAK BULK (LOLO VESSELS)" — a sheet labeling slip.
  60,000×1.00 = 60,000; sludge 12,600; excess 9,600; solid 7,800; total
  **90,000** ✓.

### 3.3 TOOL DEFECT — ordering-fee lead time ≥ 5 h (SJÖFS 2025:5 §11)

**Source rule (SJÖFS 2025:5 §11):** the ordering fee is charged only when
the pilot is ordered **less than 5 hours** before the desired time. The
prislista's bands: < 1 h = 9,390; 1 h–1h59 = 7,510; 2 h–2h59 = 5,635;
3 h–3h59 = 3,775; 4 h–4h59 = 1,880 — the last published band.

**Engine behavior:** `getOrderingLeadTimeBandId` maps every lead ≥ 4 h to
an open-ended `4h_plus` band billing 1,880, so an explicitly entered lead
of 5 h or more bills 1,880 SEK where §11 charges nothing.

**Blast radius:** bounded — the default call seeds a 2 h lead (the correct
5,635 band, and the default-call contract is unaffected); only a user
explicitly entering ≥ 5 h is over-billed. Found when a scratch
reconciliation at a 24 h lead failed.

**Test impact:** the published 4 h band itself is pinned (T9, §6) with an
in-file NOTE documenting the defect; the defective ≥ 5 h behavior is
deliberately not pinned. The fix pass repairs the band boundary and
re-pins.

**FIXED in the worked-example fix pass (spec v0.2.37):** the band function
splits 4–5 h from ≥ 5 h (§11 charges nothing at 5 h or more); the
`4h_plus` rule is renamed `*_ordering_fee_4_5h` in both port files
(bounded to the 4–5 h band), and boundary pins added: exactly 5 h → 0,
4.99 h → 1,880, 24 h → 0, via both Gothenburg and Helsingborg. Shares no
code with the §25 defect (different mechanism: band gating vs. adjustment
computation) but was fixed in the same pass.

### 3.4 HPA Pricelist 2026 — version comparison and full example set

- **Container example (cat. 31, v2.0 p.8) — identical across v1.0 and
  v2.0**: 32,838.88 / 7,022.54 / 39,861.43. The archived copy is v2.0; v1.0
  was fetched live and compared line-by-line. No cancelling-error version
  risk between the checked example and the extracted rates. CP1 already
  pins this example (hamburg.test.ts).
- **Tanker example (cat. 11, v2.0 p.5) — never previously inventoried.**
  Total **19,683.06 EUR**; reconciled line-by-line by script arithmetic
  against the sheet's own cat.-11 rates. Out of engine scope: the Hamburg
  port file encodes cat. 31 (container) dues only — encoding other
categories is scope, not a defect.
- **Cruise example (cat. 36K, v2.0 p.13) — never previously inventoried.**
  Total **20,381.32 EUR**; reconciled by script arithmetic. Same scope note.

### 3.5 Source-integrity findings

1. **G2 upstream URL serves a different document (MEDIUM).** The stored
   upstream URL for the APMT Gothenburg terminal tariff
   (`assets.ctfassets.net/.../Terminal_Tariff_Gothenburg_2026.pdf`)
   serves the **Gothenburg RoRo Terminal Rate Schedule 2026 ("EDITION
   2026:1")**, not the APMT container Terminal Tariff whose Yard Storage
   ladder the extraction cites. The extraction's figures were verified
   against the correct document at extraction time; the URL is the defect.
   Fix pass: repoint the `upstream_url` at the container Terminal Tariff
   PDF and re-verify.
2. **Stale in-repo path claims (MEDIUM).** The Gothenburg extraction
   reference claims the Sjöfartsverket prislista is archived in-repo at
   `docs/sources/sweden/national/sjofartsverket/...`; that directory does
   not exist, and the prislista/lathund are not archived. Per the source
   contract they must either be archived or carry the not-archived marker
   with a live upstream URL (which the port YAML does) — the reference
   prose must stop claiming an archive that is not there.
3. **HPA v1.0 not archived (LOW, acceptable).** Superseded upstream; the
   extracted version (v2.0) is archived and is the operative document. v1.0
   is recorded here with its live upstream URL for provenance.

### 3.6 Storage-ladder gap (v0.2.33 rules)

No inventoried document publishes a worked example that exercises the
Gothenburg storage ladder or yard surcharges changed in v0.2.33 — the
examples touch port dues and waste only. The one companion document that
might (APMT's "Guide to calculating quay storage", G2c) was bot-gated
this pass. The v0.2.33 ladder therefore remains verified by its
builder-constructed checkpoints, not by any publisher example; G2c
verification is carried over (§5).

### 3.7 Assumption-dependent reconciliations

- **Lathund rows (T4–T6):** the lathund publishes only (NT class, hours,
  total). Assumptions: pilotage required, no extra pilot, no ordering fee
  in the row figure, vessel GT/LOA irrelevant (pilotage bills on NT class
  only). Flags: the engine raises no assumption flags for these inputs.
- **Prislista rate confirmations (T7–T8):** the prislista publishes only
  (class, CSI class, fee). Assumptions: readiness fee billed alongside
  the vessel fee for a first call; default-call parameters otherwise.
- **WE-GOT-1/2 waste lines:** the sheets state sludge volumes as
  "15 m³ (> 11 m³)"; the examples bill 4 m³ excess (15 − 11), which the
  engine reproduces from `sludge_extra_m3` semantics (excess over the
  11 m³ allowance). Assumption recorded: the 15 m³ is total sludge, 4 m³
  the billable excess.

## 4. Contract implications surfaced (spec findings, not fixed here)

1. **No rule-language construct for excess-only reductions.** SJÖFS 2025:5
   §25's "40% off the per-half-hour fee, only beyond hour 7" cannot be
   expressed in the current adjustment semantics — the engine's only
   lever is a whole-line percentage, which is why the defect exists. The
   fix pass needs an excess-beyond-threshold reduction construct (or an
   equivalent band formulation), and the spec should record it as a rule-
   language element rather than a one-off patch.
2. **Open-ended top bands need closability.** The ordering-fee band defect
   exists because the top band (`4h_plus`) has no way to say "and beyond
   this bound, nothing is charged". The band schema needs a terminal
   no-charge band or an explicit `max` on the top band; the spec's
   ordering-fee band paragraph (§4.4, lead-time bands) should state the
   boundary semantics explicitly.
3. **Default-call contract re-confirmed by a publisher example.** WE-GOT-1
   is the first sheet example that exercises the v0.2.28 blank-ESI rule
   exactly as specified (blank = not entered = worst case, no flag; entered
   ESI fires the visible −10%). The contract holds; the example is now the
   pinned reference for it (T2).

## 5. Carry-overs (status updated by the worked-example fix pass, spec v0.2.37)

| # | Item | Severity | Status |
|---|------|----------|--------|
| 1 | >7 h pilotage §25 discount: apply 40% to the lotsningsavgift only, on the half-hours beyond 14; re-pin the `gothenburg_repair.test.ts` >7 h figure; pin corrected lathund >7 h rows | HIGH — over-discounts up to ~29,000 SEK per long pilotage | **FIXED (v0.2.37)**: engine gained the `excess_units` reduction construct; data now carries the discount only on the per-half-hour rules (Gothenburg and Helsingborg, all 10 NT classes each), start fees unreduced; gothenburg_repair.test.ts and helsingborg.test.ts re-pinned to the lathund's 8,0 h row (77,188); lathund >7 h rows pinned across classes 1/4/8 and both ports |
| 2 | Ordering-fee ≥ 5 h boundary: charge nothing at lead ≥ 5 h per §11; re-pin the band boundary | HIGH — over-bills 1,880 SEK, bounded to explicitly entered ≥ 5 h leads | **FIXED (v0.2.37)**: band function splits 4–5 h from ≥ 5 h; the 4h_plus rule renamed `*_ordering_fee_4_5h` (both ports); a lead ≥ 5 h now charges nothing; 4 h and 4h59 boundary pins added (both ports). Same defect class in both ports — shared band function and shared data pattern, fixed together with #1 in the same pass |
| 3 | G2 `upstream_url` repoint: stored URL serves the RoRo Rate Schedule, not the container Terminal Tariff cited by the extraction | MEDIUM — source-integrity | **FIXED (v0.2.37)**: all 15 occurrences repointed to the publisher's canonical tariff page (apmterminals.com/en/gothenburg/services/terminal-tariff), which serves Terminal Tariff 2026; not figure-affecting (rates were extracted from the correct document) |
| 4 | Extraction-reference prose: stop claiming a prislista/lathund archive path that does not exist; record not-archived status with live URLs | MEDIUM — source-integrity | **FIXED (v0.2.37)**: G3 row now records not-archived status with the live prislista URL; the false in-repo path claim removed; not figure-affecting |
| 5 | G2c APMT "Guide to calculating quay storage": fetch (bot-gated this pass), verify the v0.2.33 storage ladder against it, archive or mark not-archived | MEDIUM — last unverified v0.2.33 surface | **RESOLVED BY VERIFICATION (v0.2.37)**: the guide itself remains bot-gated (apmterminals.com Access Denied on every route this pass), but the storage ladder was verified against the Terminal Tariff's own Yard Storage schedule arithmetic (extraction reference §3, verified against the tariff document at extraction time) reconstructed day-by-day: every band boundary row and the per-day rate deltas reconcile — verdict MATCH, no defect. 16 schedule-boundary pins added to storage_towage.test.ts. The G2c fetch itself remains a LOW carry-over |
| 6 | E1 "Exempelbilaga 2026": retrieve if a route appears (regelradet 404 on the bundle URL); consultation examples, non-authoritative | LOW | OPEN (opportunistic) |

Carry-overs from the v0.2.35 pass (dead `isRuleApplicable` export,
`KNOWN_FEE_FAMILIES` divergence, "gate hazardous" prose) remain recorded
in the v0.2.35 report and are untouched here, per instruction.

## 6. New pinning tests (`core/test/worked_examples.test.ts`)

| # | Test | Example pinned | Figures |
|---|------|----------------|--------|
| T1 | WE-GOT-1 container EU 70,000 GT | G1 p.11 | dues 104,400 (band_rows 39,200/34,200/23,000/8,000 × 20,000/20,000/20,000/10,000), sludge 14,700, excess 9,600, solid 9,100, total 137,800 |
| T2 | WE-GOT-1 blank-ESI / ESI-40 | G1 p.11 | blank ESI holds 104,400 with no flag; ESI 40 → 93,960 with visible −10% adjustment |
| T3 | WE-GOT-2 container non-EU 12,000 GT, ESI ≥ 30 | G1 p.11 | dues 21,168 (23,520 − 2,352), sludge 3,720, solid 2,880, total 27,768 |
| T4 | Lathund class-4 rows 0.5–7 h via Gothenburg | S3 | start 17,300 + ceil(h×2)×3,940 = [21,240 … 72,460] for h = 0.5…7 |
| T5 | Same class-4 rows via Helsingborg (`sfv_pilotage_*` rule ids) | S3 | identical figures through the Helsingborg port file |
| T6 | Lathund class-8 rows 0.5–7 h | S3 | start 32,540 + ceil(h×2)×7,335 = [39,875 … 135,230] |
| T7 | Prislista class-8 vessel fee + readiness (CSI D/E, 35,000 NT) | S2 | 172,385 + 51,555 |
| T8 | Prislista class-5 vessel fee + readiness (CSI D/E, 6,000 NT) | S2 | 80,755 + 24,165 |
| T9 | Ordering-fee 4 h band (with in-file NOTE on the ≥ 5 h defect; defective behavior not pinned) | S2/R1 §11 | 1,880 at lead 4 h |

Deliberately not pinned: the lathund >7 h rows (§3.1 defect), and the
tanker/RORO/ROPAX/car-carrier and HPA tanker/cruise examples (out of
engine scope; reconciled by recorded script arithmetic, §3.2/§3.4).

---

## 7. Worked-example fix pass record (spec v0.2.37)

Branch `vibe/worked-example-fix-64f7e7`. The two HIGH defects of §3.1/§3.3
were fixed, the two MEDIUM source-integrity findings were repaired, and
item 5 (the storage-ladder verification gap) was closed by schedule
reconstruction. No other figure changed; the full worked-example set was
re-run after the fix (regression check below).

### 7.1 Defect-fix table (before/after)

| Defect | Before (defective) | After (correct) | Example now matched |
|---|---|---|---|
| >7 h pilotage (§3.1) | engine: 0.6 × (start + all half-hours); class 4 @8 h = 45,840 (gothenburg_repair pin), 48,204 (helsingborg pin); class 4 @7.5 h = 45,840 vs lathund 74,824 | start unreduced + first 14 half-hours full + excess at 60%; class 4 @8 h = 77,188 | Sjöfartsverket LATHUND 2026 class-4 row 8,0 h (77,188); also rows 7,5 (74,824), 9,0 (81,916), 9,5 (84,280), class-1 7,5 (41,206), class-8 7,5/8,0 (139,631/144,032) |
| Ordering ≥5 h (§3.3) | open-ended `4h_plus` band billed 1,880 at any lead ≥4 h (24 h lead → 1,880) | `4_5h` band bills 1,880 only for 4 ≤ lead < 5; ≥5 h charges 0 (24 h lead → 0) | SJÖFS 2025:5 §11 + prislista Beställningsavgift table (last band 4h–4h59 = 1,880; no fee at ≥5 h) |

Both ports share the SJÖFS scale, the band function, and the adjustment
mechanism — the defect class was present in Gothenburg and Helsingborg
alike and both were fixed together. Hamburg has no Sjöfartsverket
pilotage/ordering rules (GDWS pilotage, no lead-time bands): the sweep
found no other port affected by either defect class.

### 7.2 Re-pinned and new tests

| Test | Old value | New value | Example citation |
|---|---|---|---|
| gothenburg_repair.test.ts ">7 h" pin | start 10,380 + half-hour 37,824 (45,840 total; whole-fee ×0.6 derivation) | start 17,300 + half-hour 59,888 (77,188 total) | Lathund class-4 row 8,0 h |
| helsingborg.test.ts ">7 h" pin | start 10,380 + half-hour 37,824 (48,204 total incl. family assertion) | start 17,300 + half-hour 59,888 (77,188 total) | Lathund class-4 row 8,0 h |
| gothenburg_repair / helsingborg / audit / functional_classification `*_ordering_fee_4h_plus` rule id | `4h_plus` (open-ended) | `4_5h` (bounded band) | prislista band table |
| worked_examples.test.ts ROWS_ABOVE_7H (new) | — | 7 >7 h lathund rows: class 1 @7,5; class 4 @7,5/8,0/9,0/9,5; class 8 @7,5/8,0 | Lathund rows as cited |
| worked_examples.test.ts >7 h via Helsingborg (new) | — | same 7 rows through sfv_* rule ids | Lathund rows as cited |
| worked_examples.test.ts 7 h boundary (new) | — | exactly 14 full-rate half-hours, no adjustment on start or half-hour | Lathund class-4 row 7,0 h (72,460) |
| worked_examples.test.ts 5 h ordering boundary (new) | — | 5 h → 0; 4.99 h → 1,880; 24 h → 0 (Gothenburg); 5 h → 0, 4 h → 1,880 (Helsingborg) | SJÖFS 2025:5 §11 |
| storage_towage.test.ts schedule-boundary pins (new, 16) | — | export/import ladders at every band boundary + per-day rate deltas | Terminal Tariff Yard Storage schedule (extraction reference §3) |

### 7.3 Regression re-run (all previously-matching examples)

Post-fix, the engine re-ran every reconciled example of §3.2/§3.4 and the
T1–T9 pins: WE-GOT-1 (137,800 with band rows), WE-GOT-1 ESI variant
(93,960), WE-GOT-2 (27,768), lathund rows ≤7 h (classes 4 and 8, both
ports), prislista class-8/5 fees, ordering 4 h band, and the S1 HPA
container example (CP1: 32,838.88 / 7,022.54 / 39,861.43) — all still
match; no previously-matching example drifted. The full core suite is 377
tests, 15 suites, all passing. The defect examples (lathund >7 h rows,
ordering ≥5 h) now reconcile to the published figures.

### 7.4 Item-5 verdict (storage ladder)

MATCH, no defect. The v0.2.33 storage ladder reproduces the Terminal
Tariff's own Yard Storage schedule day-by-day at every band boundary
(export 6/7/9/10/13/14/20 days; import 4/5/7/8/11/12/15 days), and the
per-day deltas confirm each day charges exactly once. The APMT
"Guide to calculating quay storage" itself remains bot-gated
(Access Denied on every route this pass) — its fetch stays a LOW
carry-over, but the verification gap it motivated is closed.
