# NT-Convention Re-derivation Audit (v0.3.0 pass)

This document is the committed audit seam for the NT-convention re-derivation pass
(the last model-completion pass; with the EU ETS/FuelEU block of v0.2.69 it opens
the 0.3.0 gate of spec §11). It is written and committed before any
re-derivation is applied. The extraction references under docs/sources/ are the
authorities of record and prevail over this document on extraction semantics;
this document governs the audit record: the NT consumer inventory, the
class-placement risk assessment, the registry-confirmation attempt with
citations, and the estimation-convention adjudication.

## 1. Consumer inventory — every place NT or an NT-derived value flows today

### 1.1 The vessel library (core/data/vessel_library.yaml)

Four entries, all with `nt` listed in `estimated_fields`:

| Vessel | IMO | GT | NT (estimated) | source_note's class claim |
|---|---|---|---|---|
| HELGAFELL | 9306017 | 8,890 | 3,200 | "Class 4 (3,000+ NT) — estimate sits mid-class, low sensitivity" |
| VISTULA MAERSK | 9775737 | 34,882 | 13,000 | "Class 6 (10,000+ NT) with a borderline risk of Class 7 (15,000+) if the true NT is higher — this entry most needs registry confirmation" |
| MAREN MAERSK | 9632129 | 194,849 | 70,000 | "Class 7 (15,000+ NT) — the estimate is far above the threshold, so class placement is robust" (note: 70,000 NT is actually Class 9 per the corrected boundaries — the note's class claim is stale, corrected in this pass) |
| MSC KYUNGMIN | 9967005 | 21,979 | 8,000 | "Class 6 (10,000+ NT) — estimate sits below the Class 6 threshold; verify before relying on class placement" (note: 8,000 NT is actually Class 5 per the corrected boundaries — the note's class claim is stale, corrected in this pass) |

Both stale class-claim notes are disclosed as findings of this audit: the
library's own source_notes mis-classified two entries against the engine's
boundary set (MAREN 70,000 → claimed "Class 7", actual Class 9; MSC KYUNGMIN
8,000 → claimed "Class 6", actual Class 5). The computed fees were never wrong —
the engine classifies from the boundaries, not the note — but the notes' prose
claims did not match the boundary arithmetic.

### 1.2 The engine's fee-class derivation (core/src/engine.ts, getNetTonnageClass)

The class boundaries, verified against the archived sources and the prior
sessions' orientation finding:

```
Class 1: 0+        Class 2: 1,000+   Class 3: 2,000+   Class 4: 3,000+
Class 5: 6,000+    Class 6: 10,000+  Class 7: 15,000+  Class 8: 30,000+
Class 9: 60,000+   Class 10: 100,000+
```

Re-verification against the authorities of record: the HEL extraction
reference §4.1 reproduces the vessel-fee table with NT thresholds
"0+ / 1,000+ / 2,000+ / 3,000+ / 6,000+ / 10,000+ / 15,000+ / 30,000+ /
60,000+ / 100,000+" (docs/sources/sweden/helsingborg/HELSINGBORG_EXTRACTION_REFERENCE.md
§4.1) — ten classes, no 5,000 boundary. The engine's `getNetTonnageClass`
implements exactly this set. The prior sessions' finding is confirmed: there is
no 5,000 boundary in the sources, and the engine correctly omits it. The
directive's boundary listing ("0/1,000/2,000/3,000/5,000/…") is
deviation-resolved-in-favor-of-the-sources: the authority of record says 6,000,
and the engine already implements 6,000. No engine boundary change is required.

Boundary semantics: lower-inclusive (the threshold value itself belongs to the
higher class). A vessel at exactly 3,000 NT is Class 4 ("3,000+"); the class
tables' own threshold notation ("3,000+") is the boundary rule, and the engine's
`nt >= 3000 → 4` implements it. This is the "lowest nettodragt" semantics of
the price list: the class is the lowest class whose threshold the NT meets or
exceeds.

### 1.3 NT-keyed fee rules (the class-keyed fee inventory)

Both Swedish port files carry per-silo transcriptions of the same national
Sjöfartsverket rate tables (the silo discipline: each port carries its own
rules with its own citations; the rates are national and therefore identical
between the transcriptions — verified this pass by script over both files):

| Family | Rules | Keying |
|---|---|---|
| vessel_fee (fartygsavgift) | 50 per port (10 NT classes × 5 CSI classes A–E) | nt_class × csi_class |
| readiness_fee (beredskapsavgift) | 10 per port | nt_class |
| pilotage (lotsavgift) | 20 per port (10 classes × start/per-half-hour) | nt_class × pilotage_required |
| ordering fee | per-port bands | ordering_lead_time (NOT NT-keyed) |
| frequency_discount | per-port | calls_this_month (NOT NT-keyed; discounts the vessel fee + readiness fee amounts) |

At GOT: rule ids `sjofartsverket_vessel_fee_class{N}_csi_{X}`, `sjofartsverket_readiness_fee_class{N}`,
`sjofartsverket_pilotage_class{N}_start`, `sjofartsverket_pilotage_class{N}_per_half_hour`.
At HEL: `sfv_vessel_fee_class{N}_csi_{X}`, `sfv_readiness_fee_class{N}`,
`sfv_pilotage_start_class{N}`, `sfv_pilotage_half_hour_class{N}`.

The class-E vessel fee per NT class (SEK, identical at both ports, national
table): 1: 3,685 / 2: 14,045 / 3: 27,580 / 4: 43,975 / 5: 80,755 / 6: 117,385 /
7: 150,310 / 8: 172,385 / 9: 201,805 / 10: 238,430.
The readiness fee per NT class (SEK): 1: 11,110 / 2: 4,200* / 3: 8,260 / 4:
13,155 / 5: 24,165 / 6: 35,100 / 7: 44,965 / 8: 51,555 / 9: 60,370 / 10: 71,305
(*2: 4,200 as transcribed; the reference's own sequence is 1,110 / 4,200 /
8,260 / … and both port files carry 4,200 — the transcription stands, out of
scope for this pass). The pilotage start fee per class (SEK): 4: 17,300 /
5: 19,305 / 6: 26,105 / 7: 29,730 / 8: 32,540 / 9: 35,755; per-half-hour:
4: 3,940 / 5: 4,400 / 6: 5,865 / 7: 6,735 / 8: 7,335 / 9: 8,105.

Any NT-keyed environmental class does not exist: the Sjöfartsverket
environmental dimension is the CSI class A–E (an input select), which composes
WITH the NT class (the vessel fee's two-dimensional key), never derived from
NT. No rule keys on an NT-derived environmental class. Verified by inventory
over both port files: the only `nt_class` consumers are vessel_fee,
readiness_fee, and pilotage (80 `nt_class` conditions per port file: 50 vessel
fee + 10 readiness + 20 pilotage).

### 1.4 The per-GT comparison metrics

The per-GT metrics (SEK/GT at GOT and HEL, EUR/GT at HAM, and the combined
SEK-GT comparison metric) divide by GT, never NT — unaffected by any NT change.
The class-keyed fees are in the numerators, so the per-GT figures move by
exactly the fee deltas when classes move. The boundary (NT class) is reported in
the NT input's helper text (`NT class ${getNetTonnageClass(nt)}`) — the helper
string renders the class actually used; it moves with the data.

### 1.5 The engine's missing-NT fallback

When a vessel carries no NT at all, the engine estimates NT as 0.55 × GT
(flagged `estimated_nt`, spec §10 open item 6 records the convention). This
pass changes the LIBRARY's per-vessel NT data, not the fallback: the fallback
is a market-level default for vessels outside the library, re-adjudicated
below (§4).

### 1.6 The web surfaces

- `web/src/vesselOptions.ts` — the library registry type (nt a required field
  of the JSON registry; `estimated_fields` optional).
- `web/src/portWorkspace.tsx` — on library selection, `setEstimatedFields(selected.estimated_fields ?? [])`
  seeds the estimate-flag state; the vessel card's NT field renders the "est."
  label when `estimated_fields` includes `nt`
  (`web/src/portWorkspaceInputs.tsx`), with the helper text "Estimated value
  from the vessel library (see source note) — editable · NT class N".
- `web/src/data/vessel_library.json` — the generated registry (regenerated by
  the build's convert step; gitignored per the data workflow).
- `core/src/defaults.ts` `DEFAULT_VESSEL` — the MAREN MAERSK default call
  carries `nt: 70000` (the default vessel's NT flows into every default-call
  figure at the Swedish ports; a change to MAREN's NT moves the default-call
  baselines).

### 1.7 The pin inventory (tests that will move with the data)

- `core/test/vessel_library.test.ts` — pins all four NT values and the
  estimated_fields lists.
- `core/test/audit.test.ts` — the tri-port sanity check carries the four
  library vessels' NT in `LIBRARY_VESSELS` (GOT/HEL class-keyed expectations
  inside; HAM checkpoint totals unaffected by NT — HAM is GT-keyed, verified:
  zero `nt_class` conditions in hamburg_2026.yaml).
- `core/test/helsingborg.test.ts` — CP1–CP4 class-keyed fee pins (vessel fee,
  readiness fee, pilotage) at the current NT values; CP4's describe title
  records "NT 70,000 class 9".
- `core/test/eu_regulatory.test.ts` — vessel applicability fixtures carry the
  current NT values (applicability keys on GT, not NT; only the fixtures'
  literal values, no behavior).
- `core/test/engine.test.ts` — the `getNetTonnageClass` boundary pins (exact
  boundary values 0/500/999/1,000/…/100,000/200,000 → classes; unchanged by
  this pass — the boundaries are already correct).
- `web/src/comparisonDefaults.test.tsx` — the zero-drift baselines (GOT
  3,275,851.15 / HEL 8,750,057.40 SEK; HAM 2,204,910.90 EUR pinned
  byte-identical in multiple suites) — these MOVE with MAREN's NT (the default
  vessel): every GOT/HEL baseline pin in the web suite re-points this pass.
- `web/src/summaryTheme.test.tsx` — pins the NT-class helper string's presence
  in the module source (the class number is computed, not pinned; the pin
  survives data changes).

## 2. Class-placement risk assessment, per vessel

Against the corrected boundary set (§1.2). "Distance to boundary" is NT minus
the nearest threshold; the risk classification per the directive's bands
(robust = far from any boundary; sensitive = mid-band; boundary-critical =
within the error band of a boundary).

| Vessel | NT (est.) | Class | Nearest boundaries (distances) | Risk | Fee exposure per class step (class E) |
|---|---|---|---|---|---|
| HELGAFELL | 3,200 | 4 | 3,000 (+200); 6,000 (−2,800) | **boundary-critical** | vessel fee 43,975 → 80,755 (Class 5 step +36,780); readiness 13,155 → 24,165 (+11,010); pilotage start 17,300 → 19,305 (+2,005), per-half-hour 3,940 → 4,400 (+460/half-hour) |
| VISTULA MAERSK | 13,000 | 6 | 10,000 (+3,000); 15,000 (−2,000) | **sensitive** | vessel fee 117,385 → 150,310 (Class 7 step +32,925); readiness 35,100 → 44,965 (+9,865); pilotage start 26,105 → 29,730 (+3,625), per-half-hour 5,865 → 6,735 (+870/half-hour) |
| MAREN MAERSK | 70,000 | 9 | 60,000 (+10,000); 100,000 (−30,000) | **robust** | vessel fee 201,805 → 238,430 (Class 10 step +36,625); readiness 60,370 → 71,305 (+10,935); pilotage start 35,755 (Class 10 pilotage absent from the table — see below) |
| MSC KYUNGMIN | 8,000 | 5 | 6,000 (+2,000); 10,000 (−2,000) | **sensitive** (the library note's own warning) | vessel fee 80,755 → 117,385 (Class 6 step +36,630); readiness 24,165 → 35,100 (+10,935); pilotage start 19,305 → 26,105 (+6,800), per-half-hour 4,400 → 5,865 (+1,465/half-hour) |

Per-class-step exposure (the class-E vessel fee deltas between adjacent
classes at the relevant boundary): +36,780 (4→5), +36,630 (5→6), +32,925
(6→7), +22,075 (7→8), +29,420 (8→9), +36,625 (9→10). Readiness steps:
+11,010, +10,935, +9,865, +6,655, +8,415, +10,935. A one-class move at any of
the four vessels' positions moves the GOT/HEL totals by the sum of the vessel
fee and readiness fee steps (pilotage moves only when the class actually
changes; at MAREN's position a Class 10 move is arithmetically impossible
under the IMO floor: NT ≥ 0.30 × GT = 58,455 for 194,849 GT — the Class 10
threshold of 100,000 exceeds the vessel's maximum plausible NT; the library's
Class 9 placement is arithmetically forced for any NT in [60,000, 100,000),
and the observed evidence in §3 places the true NT at 79,120, inside the same
class).

Which vessels' fees can move under any plausible NT:
- HELGAFELL: yes — the plausible band (see §4) spans the 3,000 and 6,000
  boundaries; Classes 4–5 are both plausible pre-confirmation (the confirmed
  3,783 lands Class 4).
- VISTULA MAERSK: yes — Classes 6–7 both plausible pre-confirmation (the
  confirmed 16,947 lands Class 7).
- MAREN MAERSK: no — Class 9 is forced for any plausible NT (the IMO floor
  and the ship-type band both exclude Class 8 and Class 10).
- MSC KYUNGMIN: yes — Classes 5–6 both plausible pre-confirmation (no
  confirming source obtained; the estimate stays, with the band).

## 3. The registry-confirmation attempt (under the fetch rule)

Method: mine the repo's own evidence first, then the web, short timeouts,
never waiting on a hung fetch. Maritime-connector: unreachable, skipped per
the standing rule (two prior sessions died on it). Each source below either
responded or is recorded as unreachable; no fetch was waited on.

### 3.1 Repo-internal evidence (mined first)

The spec's own §10 open item 6 records observed NT values (the v0.2.35
evidence review): Vistula Maersk 34,882 GT / 16,947 NT ≈ 49% — an observed
value already in the repo's own evidence base. Also recorded: Ever Given
220,940 GT / 99,155 NT ≈ 45%; Clementine Maersk 91,921 GT / 53,625 NT ≈ 58%;
the IMO 1969 Tonnage Convention floor NT ≥ 0.30 × GT.

### 3.2 Web attempts, per vessel

**VISTULA MAERSK (IMO 9775737) — CONFIRMED, NT 16,947.**
- Marine MAN fleet-data aggregator (ships.jobmarineman.com, vessel page
  IMO 9775737): GT 34,882, NT 16,947, DWT 40,000, TEU 3,596 — responded,
  fetched, value read from the page.
- Corroboration: the repo's own §10 evidence review records the same value
  (16,947) from a prior observation — two independent records agree exactly.
- Ratio: 16,947 / 34,882 ≈ 48.6% — consistent with the spec's own container
  band (~45–58%).
- The estimate (13,000, 37% of GT) was low; the true NT lands Class 7
  (15,000+), not Class 6. The fee moves at both Swedish ports.

**HELGAFELL (IMO 9306017) — OBSERVED, NT 3,783 (single source).**
- Marine MAN aggregator (vessel page IMO 9306017): GT 8,890, NT 3,783,
  DWT 11,143, TEU 908 — responded, fetched, value read from the page.
- No second source obtained (VesselFinder's HELGAFELL page renders without
  tonnage particulars in the fetched view — recorded as not confirming;
  other aggregators either carry no NT or were unreachable).
- Ratio: 3,783 / 8,890 ≈ 42.6%.
- The observed 3,783 lands Class 4 (3,000+), the same class as the estimate
  (3,200) — but the single-source observation is not registry-confirmed
  (an aggregator is not a registry; the DNV register and Equasis were the
  registry-grade candidates and both are unreachable — §3.3).
- Adjudication: the observed value is the better estimate (it replaces a
  pure ratio guess with an aggregator-observed particular), but the
  estimated flag STAYS (one aggregator source is not registry confirmation;
  the masquerade guard: an aggregator observation must not render as a
  registry measurement).

**MAREN MAERSK (IMO 9632129) — OBSERVED, NT 79,120 (single source, reliability impaired).**
- Marine MAN aggregator (vessel page IMO 9632129): GT 194,849, NT 79,120 —
  responded, fetched, value read from the page.
- Reliability caveat, disclosed: the same page carries a defective
  particular (TEU 600 — an obviously wrong value for a 19,076-TEU Triple-E),
  so the page's data quality is impaired. The NT value is consistent with
  the Triple-E class band (79,120 / 194,849 ≈ 40.6%; the repo's own
  Ever Given 45% / Clementine Maersk 58% band brackets it; Wikipedia's
  Madison Maersk article records the sister-ship particulars in the same
  band) and with the Class 9 placement's arithmetic forcing (§2), but the
  source's own defect means the value is treated as an observed estimate,
  not registry confirmation.
- The observed 79,120 lands Class 9 (60,000+) — the same class as the
  estimate (70,000). No fee moves from the class placement either way; the
  library value is updated to the observed figure with the flag retained
  and the caveat recorded in the source_note.
- No corroboration obtained (the aggregator's DWT figure for MAREN also
  deviates from the registry-confirmed 214,121 — further evidence the page
  is partially defective; the GT value on the page matches the library
  exactly).

**MSC KYUNGMIN (IMO 9967005) — NOT OBTAINED.**
- Aggregators attempted: Marine MAN (vessel page responds; carries GT
  21,979 but NO NT field — the page's tonnage block omits NT entirely);
  VesselFinder, MarineTraffic, VesselTracker, TrustedDocks, Linescape,
  MagicPort, maritimeoptima (search results reviewed — none exposes an NT
  value in a fetchable view); the prior sessions' orientation record (NT
  absent from the aggregators attempted) is confirmed.
- The estimate (8,000, Class 5) remains an estimate, with the formalized
  band and the boundary notice below.

### 3.3 Registry-grade sources — attempted, unreachable

- **DNV Vessel Register** (vesselregister.dnv.com, IMO lookups): blocked
  automated access — recorded as unreachable. (The search engine indexed a
  register page for IMO 9967005; the page itself refuses automated reading.)
- **Equasis**: the site responds but requires user registration for ship
  search — login-walled, unreachable for automated confirmation. Recorded
  as unreachable.
- **Danish Maritime Authority register** (dma.dk): access denied at the
  proxy — unreachable. (VISTULA and MAREN are Danish-flagged; the DMA
  register was the natural registry-grade source for both.)
- **EU MRV/THETIS**: the THETIS-MRV database carries verified annual
  emissions, not NT particulars (the v0.2.69 audit already recorded its
  data shape: annual, per-voyage-portion emissions — no tonnage
  particulars). Not an NT source; not attempted further.
- **Maritime-connector**: unreachable per the standing rule (two prior
  sessions died on it); skipped.

### 3.4 Outcome classification

Mixed: one registry... one confirmed (VISTULA, two-source agreement), two
observed-single-source (HELGAFELL 3,783, MAREN 79,120 — better estimates,
flags retained), one unobtainable (MSC KYUNGMIN — pure estimate remains). The
pass is therefore a MIXED re-derivation: a data correction with citations for
VISTULA; observed-value updates with retained flags for HELGAFELL and MAREN;
the formalized convention with bands and notices for the remaining estimate
(MSC KYUNGMIN) and for any future estimate.

## 4. The convention adjudication (the formalized estimation convention)

The convention formalizes what the v0.2.35 open-item-6 decision recorded
ad-hoc. It is recorded here as the standing convention and encoded in the
spec (§4.x contract paragraph) and the library schema.

### 4.1 Ratio basis

The convention's ratio basis is the observed container-ship band from the
repo's own evidence record, NOT a single ratio:
- The IMO 1969 International Tonnage Convention sets only a floor
  (NT ≥ 0.30 × GT) — no fixed ratio exists; the floor is the convention's
  hard lower bound.
- Observed container vessels (the spec's own §10 evidence): Ever Given
  ≈ 45%, Vistula Maersk ≈ 49%, Clementine Maersk ≈ 58%. The band
  **45–58%** is the container-ship-type-specific ratio band from published
  data, adopted as the convention's band. The two observations added this
  pass (HELGAFELL ≈ 42.6%, MAREN ≈ 40.6%) sit below the band — disclosed:
  feeder and ULCV hull forms run lower than the mid-size panamax vessels
  that generated the 45–58% band; the band is retained as the mid-size
  container norm, with the per-vessel observed values prevailing where they
  exist.
- The engine's missing-NT fallback (0.55 × GT) stands unchanged: it is a
  market-level default for vessels outside the library, the mid-band value
  of the observed range (the v0.2.35 adjudication, re-confirmed).
- The library's former "~36 percent of GT" per-entry basis is retired: the
  confirmed and observed values replace it where obtained; where an estimate
  must be authored (MSC KYUNGMIN), the basis is the mid-size band midpoint
  applied to the vessel's size class, with the band and the boundary risk
  disclosed in the source_note.

### 4.2 Error band

For an estimated NT (no observed value), the error band is the convention
band applied to the vessel's GT: **0.40–0.58 × GT** (the lower bound extended
below the mid-size band's 45% to cover the observed feeder/ULCV ratios at
40.6–42.6%; the upper bound the band's own 58%). For MSC KYUNGMIN
(21,979 GT): 8,792–12,748 NT — spanning the Class 5/6 boundary at 10,000:
the estimate sits inside the band of a class boundary, and the boundary
notice fires (§4.3).

### 4.3 The class-boundary disclosure (the boundary notice)

A vessel whose NT is estimated (flagged) AND whose error band spans a class
boundary renders a visible notice at both Swedish ports: the fee class is
uncertain; the honest figure shows the class actually used, and the
alternative class's fee, disclosed. The notice is data-driven (computed from
the estimate, the band, and the boundary set — never a port-id string, per
the v0.2.70 data-derived-boundary precedent). The notice renders:
- at the workspace: in the NT field's helper area (the estimate note gains
  the sensitivity sentence with the alternative class's fee delta);
- at the comparison: the vessel is the same at all ports; the notice is
  port-surface-specific (the class-keyed fees exist only at GOT/HEL).

Under the adjudicated data:
- MSC KYUNGMIN: band 8,792–12,748 spans 10,000 — the notice fires at GOT and
  HEL (Class 5 used; Class 6 disclosed as the alternative, with the fee
  delta per §2's exposure table).
- HELGAFELL (observed 3,783, flag retained): the observed value's class
  placement (4) is what the aggregator shows, but the single-source band
  still admits the 3,000 boundary at its lower edge (the observation itself
  is 3,783, comfortably above 3,000; the 6,000 boundary is far above the
  observed value). Adjudication: the boundary notice does NOT fire for
  HELGAFELL — the observed value sits 783 above the nearest boundary and
  the observation, not the generic band, is the placement basis; the
  estimate flag and the single-source note remain the honesty surface.
- MAREN (observed 79,120, flag retained): Class 9 is arithmetically forced
  (§2) — no notice; the flag and the source caveat remain.
- VISTULA (confirmed 16,947): no estimate, no flag, no notice — the entry
  renders as registry-observed data with its citation.

### 4.4 The masquerade guard

An estimate must never render as a registry measurement. The surfaces:
- the library schema: `estimated_fields` retains `nt` for every
  non-confirmed entry (HELGAFELL, MAREN, MSC KYUNGMIN); VISTULA's `nt` is
  removed from `estimated_fields` (the flag retires for that vessel) and
  the source_note records the confirming sources with the observation
  dates.
- the web: the "est." badge logic keys on `estimated_fields` as today; a
  confirmed entry loses the badge; a masquerade (a flagged value rendering
  unbadged, or an unflagged value rendering badged) fails the new pins.
- the source_note vocabulary: "NT estimated" remains the estimate marker;
  confirmed entries record "NT observed: 16,947 (Marine MAN aggregator,
  IMO 9775737, fetched 2026-09-30; corroborated by the spec §10 evidence
  record)" — the citation sentence is the confirmation's provenance.

### 4.5 Findings (recorded, out of scope or carried)

- The library's source_notes carried two stale class-claim sentences
  (MAREN "Class 7" for a Class 9 value; MSC KYUNGMIN "Class 6" for a Class
  5 value) — corrected in the re-derivation, disclosed here. The engine was
  never wrong (it classifies from the boundaries); the prose was.
- The HEL extraction reference §4.2's readiness-fee class-2 figure (4,200)
  does not fit the table's apparent geometric progression (the neighboring
  values suggest 4,4xx); the transcription matches the printed reference —
  recorded as a finding for the queue (re-verification against the printed
  price list, out of scope for this pass; the transcribed rate stands).
- The HEL reference's CP table (§ "Vessel particulars") records NT
  "(class)" column pairs that reflect the old estimates — a docs-staleness
  finding; the reference is the extraction record, not re-authored this
  pass (its §4.1 rate tables are the authoritative part and are correct).
- HAM re-verified GT-keyed: zero `nt_class` conditions in
  hamburg_2026.yaml; no NT consumer exists at Hamburg. HAM is
  byte-identical under this pass (pinned).
- The GOT/HEL fee rules themselves are untouched: the rates are transcribed
  from the price list; this pass changes the vessel data, not the tariffs.
  No rule change was encountered; no finding.

## 5. The re-derivation plan (item 2, executed after this seam)

1. VISTULA MAERSK: nt 13,000 → 16,947 (confirmed; flag retires;
   citations in source_note; the class claim updates to Class 7).
2. HELGAFELL: nt 3,200 → 3,783 (observed single-source; flag retained;
   source_note records the observation and the single-source caveat; class
   claim stays Class 4).
3. MAREN MAERSK: nt 70,000 → 79,120 (observed single-source, source
   reliability caveat recorded; flag retained; class claim corrected to
   Class 9; DEFAULT_VESSEL follows the library — the default call's NT is
   the library's value).
4. MSC KYUNGMIN: nt stays 8,000 (estimate; the source_note's class claim
   corrects to Class 5; the formalized band and the boundary notice apply;
   the notice fires at GOT and HEL).
5. Both Swedish ports' class-keyed fees re-derive from the data; the drift
   is classified per the v0.2.66 conventions (vessel fee, readiness fee,
   pilotage, per vessel per port; the totals move by exactly the fee
   deltas; HAM byte-identical, pinned).
6. The boundary-notice rendering (web) implements §4.3; the pins of item 4
   follow.

## 6. Verification plan

- Core suites in per-suite chunks (the standing environment rule), exact
  counts reported; new pins: the class-boundary exact-value pins (§ the
  "lowest nettodrag" semantics — 3,000 exactly → Class 4, from the class
  tables' own "3,000+" notation), the registry-citation pins, the
  boundary-notice pins, the HAM isolation red proof, the drift pins
  re-pointed with the old figures red-proven.
- Web suites in small batches (the standing rule), exact counts; the
  zero-drift baselines re-point (GOT/HEL move by the MAREN fee delta —
  none: MAREN stays Class 9; the baselines are expected to hold exactly,
  and any movement is a defect — the default call's vessel is MAREN, whose
  class does not move; the GOT/HEL baseline figures therefore HOLD, and
  the drift is confined to the non-default vessels' pins and the new
  notice surfaces).
- Zero-warning build with bundle hash; version guard both ways (the
  v0.3.0 row: the changelog text "model closed: ETS + NT landed"; the
  constant and the spec header in the same change; the three-way
  agreement).
- §8 per the standing method (asset-manifest content-hash identity; the
  cache-busting query as the proven fallback).
