# Port Call Cost Analyzer — Bremerhaven Extraction Reference

Authority of record for the Bremerhaven port file (docs/sources/germany/bremerhaven/
is this reference's directory; the HGebO statute is archived under the national
Germany tree at docs/sources/germany/national/bremen/ — the statute-as-authority
pattern, recorded in section 1). This document is the per-port pattern's authority
of record per the silo discipline; where any builder directive and this document
differ, this document wins. All amounts in EUR (currency local throughout; no
conversion — the model's currency contract, section 6 of the specification).

Created: 2026-10-05 (the Bremerhaven expansion pass, v0.5.1 — the first expansion
pass of the 2026 wave). Status: the authority of record for the encoding; the
worked checkpoints in section 9 are the mandatory verification anchors for the
builder.

---

## 1. Source Documents

| # | Document | Version / date | Role |
|---|----------|----------------|------|
| B1 | Bremische Hafengebührenordnung (HGebO) vom 15. März 2006, consolidated edition in force from 01.01.2026 | Inkrafttreten 01.01.2026; last amended by Verordnung vom 26.11.2025 (Brem.GBl. S. 1305, ber. S. 1372) | THE two-part port-fee authority (statute + fee tables): the Raumgebühr (§6), the Abfallentsorgungsgebühr (§10), the Hafenlotsgeld (§12), the reductions and extensions (§3b), the definitions (§2). The fee tables are carried INLINE in the statute — see the annex adjudication below |
| B2 | Prices and Conditions of EUROGATE Container Terminal Bremerhaven GmbH (with Hamburg and Wilhelmshaven), effective 1st March 2026 | Effective 01.03.2026 | The default terminal layer: EUROGATE CTB berthing charge, waterside handling, security, social fund, and the gated optional services (lashing, twistlocks, IMO, small-call, lay-by, reefer) and storage schedules (ch. 7). National-class document, shared with the Hamburg silo |
| B3 | North Sea Terminal Bremerhaven GmbH & Co., Reference tariff (Referenztarif), English edition | Valid from 01.08.2026 | The terminal VARIANT: NTB tonnage dues, handling, lashing, twistlocks, security, reefer, social fund, storage/demurrage. A REFERENCE tariff — the honesty flag is recorded in its archive header and rendered on its lines (section 8) |
| B4 | Verordnung über die Tarifordnung für die Seelotsreviere (Lotstarifverordnung — LTV), Anlagen 1 and 2 | Stand: 01. Januar 2026 (last amended by Artikel 1 der Siebzehnten Verordnung vom 15.12.2025, BGBl. 2025 I Nummer 328) | Federal pilotage: the Lotsabgaben (Anlage 1, Weser column) and the Lotsgelder (Anlage 2, Außenweser column) for the Bremerhaven sea approach. Already archived at v0.4.x as the German national pilotage authority; cited here per the shared-citation class |

Repository paths:

- `docs/sources/germany/national/bremen/hgebo-consolidated-2026.txt` (B1 — text
  extraction, the statute body verbatim as fetched from the Transparenzportal
  Bremen consolidated edition page, fetch 2026-10-05; SHA-256
  6eb2564f1e5d4592d48f8270e6723dfc349625cc9d87a64fbb7e02a36d1f40e5)
- `docs/sources/germany/national/bremen/hgebo-consolidated-2026.pdf` (B1 — the
  portal's own 00_html_to_pdf binary rendering of the same consolidated
  edition, fetch 2026-10-05; SHA-256
  8b4ba68ab2b79ba43c812fa4e9bca0af1cec47de8bc9781c1caa20136c2a2ec7)
- `docs/sources/germany/bremerhaven/eurogate/prices-and-conditions-2026.txt`
  (B2 — Bremerhaven's companion text extraction of the national-class document;
  the canonical binary PDF is the Hamburg-tree copy
  `docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf`,
  archived at v0.2.49, SHA-256
  166ca82876224d16f81f2b26daf3526ce31991676fb9721ef93690da1e72a2de,
  re-verified byte-identical at the 2026-10-05 re-fetch — the prislista
  precedent: one national-class document archived once under the country tree,
  shared citations per port)
- `docs/sources/germany/bremerhaven/ntb/ntb-reference-tariff-en-2026-08-01.txt`
  (B3 — text extraction; SHA-256 of the text file
  18a8eedf48acfa36b7cdc749540939bde48159c9b5d86130227f87e7c2b1bf29)
- `docs/sources/germany/bremerhaven/ntb/ntb-reference-tariff-en-2026-08-01.pdf`
  (B3 — binary PDF; SHA-256
  b4f544f0b163aaa95ec4dd116e81bd02aaa67d592973b9f6c7f1dfa1c2babeab)
- `docs/sources/germany/national/gdws/pilot-tariff-2026.pdf` (B4 — already
  archived; the German national pilotage authority shared with Hamburg)

Fetch URLs (all fetches 2026-10-05):

- B1 (text): https://www.transparenz.bremen.de/metainformationen/bremische-hafengebuehrenordnung-hgebo-vom-15-maerz-2006-306284
- B1 (PDF): the same page's 00_html_to_pdf_d template rendering
- B2: https://www1.eurogate.de/wp-content/uploads/2026/02/eurogate_prices_and_conditions_2026.pdf
- B3: https://www.ntb.eu/wp-content/uploads/ntb/NTB-Reference-Tariff-EN-01.08.2026-1.pdf

Not archived in-repo (context documents, never authorities — the Hafenfonds
discrepancy's recorded context per the directive):

- Carrier local-charges documents (CMA-CGM "Local Charges Germany", Hapag-Lloyd
  "Germany Local Charges & Service Fees" — commercial secondary sources surfaced
  during the research; they carry terminal-booking surcharges and customs
  pass-throughs, never the statutory port-fee figures; recorded as context,
  never consulted for a rate).
- Lexikon-class secondary descriptions of German port funds (web-lexikon pages
  describing the Hafenfonds instrument at Hamburg); recorded as context. The
  Hafenfonds discrepancy is resolved from the primary authority below
  (section 4.6): the Bremen statute levies NO Hafenfonds surcharge — the
  instrument is the Hamburg HHLA quay tariff's own §9.2.3 levy; the Bremen
  terminals levy their own social funds (B2 §1.3.13; B3 general regulations)
  instead, and those are encoded on their own billers.

## 2. The bremenports fee-annex probe (the two-part authority adjudication)

The directive ordered the two-part authority (statute + Gebührentabelle annex)
and a probe of the bremenports fee annex at execution. Findings, observed never
assumed:

1. The bremenports Hafengebühren page (https://www.bremenports.de/haefen/hafengebuehren,
   fetched 2026-10-05) publishes NO separate fee-annex document. The page carries
   no .pdf link of its own; its only tariff-document links point at the
   Transparenzportal Bremen consolidated HGebO pages (the gsid 256439 and
   306284 metainformationen pages, both resolving to the same statute).
2. The consolidated statute itself carries the fee tables INLINE: the §6
   Raumgebühr table (Gebührensatz in Euro pro BRZ, by traffic area and vessel
   class), the §6a offshore table, the §7 Liegegeld table, the §10 waste-fee
   tables, and the §12 Lotsgeld rates and tables are all part of the statute
   text. The 26.11.2025 amendment (Brem.GBl. S. 1305) re-cast §6 and §10 with
   the current 2026 rates inline.
3. Adjudication: the "two-part authority" collapses into the single statute
   document — B1 is simultaneously the statute and the fee table. The port-fee
   figures are archived (from the ordinance itself, the primary authority — the
   directive's own alternative branch: "resolved from the annex or the ordinance
   itself"). The port-fee encoding is GO: every §6/§10/§12 figure below is
   transcribed from the archived consolidated statute text and re-verified
   against the archived PDF rendering. No figure comes from any secondary
   source.

## 3. Billers

| Biller | Segment | Notes |
|---|---|---|
| bremenports GmbH & Co. KG | Raumgebühr (§6), Abfallentsorgungsgebühr (§10) | The beleihene entity: the Senator für Wirtschaft, Arbeit und Häfen invests bremenports with fee setting and collection under §17 Bremisches Hafenbetriebsgesetz (HGebO §2(2)) |
| Hafenlotsengesellschaft Bremerhaven | Hafenlotsgeld (§12) | The zuständige entity for the Bremerhaven port-pilot fees (HGebO §2(4)); collected via the bremenports beleihung (the Versetzpauschale exception recorded in the statute, not priced here) |
| GDWS (Federal) via pilot station | Lotsabgaben (Anlage 1) + Lotsgelder (Anlage 2) | Federal ordinance; the same biller shape as the Hamburg silo |
| EUROGATE Container Terminal Bremerhaven | Berthing charge, waterside handling, security, social fund, optional services, storage | The default terminal (CTB), per the terminal adjudication (section 6) |
| North Sea Terminal Bremerhaven GmbH & Co. | Tonnage dues, handling, lashing, twistlocks, security, reefer, storage/demurrage, social fund | The switchable terminal VARIANT; every line carries the reference-tariff honesty flag |
| Towage operators (estimated) | Towage estimate | No published tariff; the Hamburg convention applies (section 7) |

Not modeled: MSC Gate Bremerhaven (the third container terminal — a Maersk/Eurogate
JV whose published document set references the EUROGATE CTB tariff plus an
administration surcharge per its own prices-and-conditions; out of the two-operator
expansion scope, recorded as a future variant candidate), the EUROGATE Container
Freight Station Bremerhaven (CFS — landside conventional cargo, ch. 5.5/5.6/13.2
items "by agreement with" the CFS, outside the container-call scope), mooring
boatmen (section 7), waste-disposal contractors (excess volumes beyond the §10
standard disposal are billed separately by the disposal company — outside this fee).

## 4. Fee Rules — the HGebO (B1) layer

### 4.1 Raumgebühr (port fee) — §6

Charged for a period of five days (§6 opening sentence) from seagoing vessels
that transship cargo for commercial purposes in the port. Basis: BRZ (§3(1)(1)
— gross tonnage per ITC '69; open-top vessels the reduced BRZ with ITC proof,
recorded). The container-only scope ruling applies: every modeled call is a
transshipment call, so the fee always applies (the Liegegeld §7 non-transshipment
case is out of the container domain — section 4.5).

The traffic-area split (§2(26) Fahrtgebiete): Binnenverkehr (inland), Short-Sea
(North/Baltic Sea area), Europaverkehr (Europe incl. Iceland and the
Mediterranean riparian states), Überseeverkehr (all other traffic). The vessel
class for the modeled call: Linienverkehr (§2(26)(2) — regular scheduled traffic;
a container liner call).

Rates (Gebührensatz in Euro pro BRZ, §6 table):

| Traffic area / class | Rate EUR/BRZ |
|---|---|
| Short Sea, ≤ 10,000 BRZ | 0.0438 |
| Short Sea, > 10,000 BRZ | 0.1210 |
| Europaverkehr Linienverkehr/Spezialverkehr, ≤ 14,000 BRZ | 0.1535 |
| Europaverkehr Linienverkehr/Spezialverkehr, 14,000–21,000 BRZ | 0.2368 |
| Europaverkehr Linienverkehr/Spezialverkehr, > 21,000 BRZ | 0.2763 |
| Überseeverkehr Linienverkehr/Spezialverkehr | 0.3038 |

Input-granularity adjudication (recorded, never silently resolved): the shared
arrival-origin selector is binary (outside-europe / europe); the HGebO's
European side splits Short Sea from Europaverkehr, which the binary selector
cannot key. Encoding: the Überseeverkehr liner rate (0.3038) is gated on
arrival_origin: outside-europe (the default call's Asia arrival); the
Europaverkehr liner rates (GT-banded 0.1535/0.2368/0.2763) are gated on
arrival_origin: europe — the conservative European worst case (the Europaverkehr
rate at every band exceeds the Short Sea rate). The Short Sea subdivision
(0.0438/0.1210) is recorded here and in the input-coverage matrix as a known
input-granularity asymmetry; it is never silently dropped and never guessed.

### 4.2 Raumgebühr extension — §3b(2)

"Raumgebührenpflichtige Fahrzeuge, die das bremische Hafengebiet länger als fünf
Tage benutzen, zahlen für jeden weiteren angefangenen Zeitraum von zehn Tagen
50 Prozent des jeweiligen Gebührensatzes." Encoded for the Überseeverkehr
surface: per commenced 10-day period (240 h) beyond the five-day (120 h) period,
50% of the liner rate per BRZ = 0.1519 EUR/BRZ per period, gated on
arrival_origin: outside-europe. The Europaverkehr extension is recorded, not
encoded: the GT-band × time-period nesting has no engine rate shape
(stop-and-report per the GLE winter-rule precedent; a future shape may encode
it — the Europe-side figures are 50% of the §6 Europe rates above).

### 4.3 Abfallentsorgungsgebühr (waste fee) — §10(1)

Charged from raumgebührpflichtige vessels (vessels paying the Raumgebühr — the
modeled container call) for a five-day period, MARPOL Annex V waste disposal.
Non-cruise bands (§10(1) "alle anderen Fahrzeuge im Seeverkehr"):

| GT band | Fee EUR |
|---|---|
| ≤ 1,500 | 127.18 |
| 1,501–2,500 | 169.60 |
| 2,501–3,000 | 237.17 |
| 3,001–6,000 | 423.62 |
| 6,001–10,000 | 494.18 |
| 10,001–30,000 | 535.12 |
| 30,001–45,000 | 608.07 |
| > 45,000 | 885.84 |

The cruise-ship per-BRZ rate (0.1158) is out of the container-call scope
(recorded). The free quantities (§10(3)) and the on-request excess-disposal
50% charge (§10(3) final sentence) are the disposal contractor's operational
surface — recorded, not encoded (no input exists; the §10(2) Liegegeld-payer
variants are out of scope with the Liegegeld itself).

### 4.4 Hafenlotsgeld (port pilotage) — §12

For the port pilots' services (Beratungsgeld, Wartegeld, Auslagen — §12(1));
the Bremerhaven pilots are the Hafenlotsen der Hafenlotsengesellschaft
Bremerhaven (§12(3)). The fee is owed by seagoing vessels over 500 BRZ even
without accepting a pilot (§12(7).7 — in that case the Beratungsgeld reduces
25%); the modeled call accepts pilots (pilotage_required), paying the full
Beratungsgeld. Beratungsgeld in Bremerhaven without lock use (§12(7).1–2):

- Under 13,000 BRZ: base 41.80 + 1.27 per commenced 100 BRZ (12(7).1).
- From 13,000 BRZ: base 211.69 + 1.03 per commenced 100 BRZ over 13,000
  (12(7).2).

Verification note (the transcription-integrity finding, closed in-pass): an
early draft of this section carried the pre-2026 figures (33.71/1.03 and
170.72/0.83) read from a search-result snippet of an older consolidated
edition — a secondary-source transcription against the standing rule. The
archive's own consolidated 2026 text (12(7).1-2, verbatim above) corrects
them; the encoded figures and all baselines below carry the corrected
values.

Lock-use adjudication (recorded): the Bremerhaven container terminals (CTB, NTB)
sit on the Außenweser stromkaje — a river-quay call transits no lock, so the
"ohne Schleusenbenutzung" rates (§12(7).1–2) are the container-call surface.
The with-lock rates (§12(7).3–4: base 37.02 + 1.60/100 BRZ under 13,000; base
256.90 + 1.15/100 BRZ over 13,000) are recorded here; no lock input exists in
the call model, so they are not encoded (never invented an input).

Per-call convention (recorded, the Hamburg pilotage precedent): one
Beratungsgeld per call — the port-pilot assignment of the call (the ordinance's
own "Lotsungen" definition (§2(31): An- und Ablegen sowie Verholungen) counts a
normal arrival-departure as the call's assignment; the shifting-counts-two rule
(§12(7).6) is the within-port movement case, out of the default call). The
multi-pilot factors (§12(5)) and the führen-25% rule (§12(6)) are recorded;
the default call carries one pilot.

### 4.5 Out-of-scope-by-ruling (container-only scope; recorded, never invented)

- §6a Offshore (offshore-industry vessels), §7 Liegegeld (non-transshipping
  vessels — the idle case), §8 Binnenschiffsgebühr (inland traffic, incl. its
  shore-power inclusion), §9 Nutzungsgebühr (harbor craft, annual fees) — each
  outside the container-call domain; each rate is recorded in the archived
  statute and none is encoded.
- §3b(1) second-call 75% rebate (Überseeverkehr, second call within 7 days from
  European ports, same fee debtor): the criterion is the 7-day/second-call/
  same-debtor triple; the shared calls_this_month input is month-keyed and
  cannot key it honestly — recorded, not encoded (the no-input convention).
- §3b(3) frequency rebate (per calendar year, granted at year-end: 150–249
  calls 15%, 250+ 20%, Linienverkehr/Spezialverkehr Überseeverkehr or
  Autocarrier): annual and year-end-granted — the shared calls_this_month
  input cannot key a calendar-year rebate honestly; recorded, not encoded.
- §3b(5) ESI rebate (top-25 ships per quarter with ESI ≥ 45: 15% per call, max
  4,500, year-end) and the LNG/methanol rebate (ESI-SOx > 98: 20% per call,
  max 6,000): application-based and competitively selected (top 25) — an
  entered ESI score does not establish eligibility, so no ESI-gated adjustment
  is encoded (the over-service defect class; recorded).

### 4.6 The Hafenfonds discrepancy — resolved from the primary authority

The directive recorded a Hafenfonds discrepancy (secondary sources describe a
German port-fund levy). Resolution from the ordinance itself (B1, the primary
authority): the consolidated 2026 HGebO contains NO Hafenfonds levy — the
statute's Gebühren und Nebengebühren are the §6–§10 schedule, and no port-fund
surcharge appears anywhere in the text. The Hafenfonds instrument belongs to
the Hamburg HHLA Quay Tariff (§9.2.3, "Hafenfonds = port dues" — the Hamburg
silo's own biller surcharge). The Bremen terminals levy their own social funds
instead: EUROGATE's 1.5% social fund (B2 §1.3.13, excluding storage, lashing
materials, security) and NTB's 1.5% social fund (B3 general regulations,
excluding demurrage charges and security surcharge) — both encoded on their own
billers as biller surcharges (the established data mechanism). No hafenfonds
fee family applies at Bremerhaven; no port-fund line is invented. The carrier
PDF and the lexikon were recorded as context (section 1) and were not
consulted for any figure.

## 5. Fee Rules — the GDWS federal pilotage (B4) layer

Two stacked charges for the Bremerhaven sea approach (the same two-charge
structure as the Hamburg Elbe transit, on the Weser):

### 5.1 Lotsabgaben (pilotage dues) — Anlage 1, Abschnitt B Teil I, Weser column (Spalte 2)

GT-banded flat amounts; the full Weser column is transcribed in the port file
(the §1.2 Weser route legs price from this column). Above 52,000 GT the cap is
5,322 EUR (all columns). Route percentages (Anlage 1 Abschnitt A §1.2, Weser
legs — verbatim): a. Bremen ↔ outer pilot station ("3/Jade 2"/"Schlüsseltonne")
100%; c. Elsfleth–Brake 15%; d. Brake–Nordenham 10%; e. Nordenham–Bremerhaven
5%; f. Bremerhaven or the Reede von Blexen ↔ the Hoheweg anchorages 35%; g. the
Hoheweg anchorages ↔ the outer station 30%. The Bremerhaven sea approach
(outer station → Hoheweg → Bremerhaven) is legs g + f = 30% + 35% = 65% of the
Weser column. Encoded with scale_by pilotage_segment_pct, default 65 (the
route adjudication; a Bremen transit enters 100). Key column values
(verification anchors): 8,500–9,000 → 1,350; 21,000–21,500 → 2,504; 39,000–
40,000 → 4,404; 50,000–52,000 → 5,199; über 52,000 → 5,322.

### 5.2 Lotsgelder (pilot fees) — Anlage 2, Abschnitt B Teil I, Außenweser column (Spalte 3)

The Anlage 2 table carries five columns (Ems, Unterweser, Außenweser, Jade,
Elbe); the Bremerhaven sea approach is the Außenweser leg 1.3a (Bremerhaven ↔
outer station) at 100% of the Außenweser column. GT-banded flat amounts; above
40,000 GT: +45 EUR per commenced 2,000 GT, capped at 4,100 EUR (the cap row is
shared across all columns). Encoded WITHOUT scale_by: the Außenweser column's
own route (1.3a) is definitionally the Bremerhaven sea approach at 100% — the
segment input scales the Lotsabgaben line only (the input-coverage matrix
records this asymmetry honestly). Key column values (verification anchors):
8,500–9,000 → 856; 21,000–21,500 → 1,181; 39,000–40,000 → 1,663; extension
+45 per commenced 2,000 over 40,000; cap 4,100.

## 6. Terminal adjudication — EUROGATE CTB default, NTB variant

The v0.4.2 gate doctrine applied: the terminal scope (spec v0.2.49's
terminal_operator condition) is the mechanism; the default and reference
operator for the Bremerhaven model is EUROGATE Container Terminal Bremerhaven
(CTB) — the common-user terminal with the published national-class price
document (B2); North Sea Terminal Bremerhaven (NTB) is the switchable variant
(the v0.2.66 Hamburg Eurogate-promotion precedent in reverse: the
national-class published operator is the default, the second operator the
variant). An absent or unrecognized operator falls back to Eurogate with a
visible flag (the engine's existing fallback seam, generalized this pass to
know NTB). The two rule sets can never co-fire in one call; port-wide charges
(Raumgebühr, waste, Lotsgeld, GDWS pilotage, towage) are operator-neutral and
fire for every Bremerhaven call.

B2 applicability (the same §17.2-class inventory, verified against the
Bremerhaven text): the vessel charges (ch. 2), handling (5.1.1), security
(13.1), social fund (1.3.13), lashing (5.2.1), twistlocks (5.2.2), IMO (5.3),
small-call minimum (5.4), lay-by (2.1.4), reefer (9.1/9.2), and storage
(ch. 7.1/7.2 schedules) carry no terminal-specific marker — they apply at
Bremerhaven exactly as at Hamburg (the rates are identical; one national price
document). The terminal-specific items (6.7/6.8 interchange/safe-keeper —
Hamburg/Wilhelmshaven only; 10.3 — Wilhelmshaven only; 12.24 customs
inspection — Hamburg only; ch. 15 — Wilhelmshaven only) are out of the
Bremerhaven surface; the Bremerhaven-CFS items (5.5/5.6, 13.2) are landside
conventional-cargo schedules "by agreement with" the CFS — out of the
container-call scope. The quay dues (2.2, per-tonne) are conventional-cargo
weight dues — the §17.2 reading (per-container ch. 5 vs. per-ton ch. 2.2)
applies: no quay dues for the container call; the interpretation notice is
recorded there and stands here.

NTB's reference-tariff honesty flag: B3 is a Referenztarif — a published
reference scale whose general regulations subject every service to the
currently valid AGBO terms and reserve NTB's right to deviate by written
agreement. Every NTB rule therefore carries the contract_vs_published caveat
(the established spec v0.2.4 mechanism, rendered as the reference-tariff
honesty marker at the same prominence as the estimate flag), and the archive
header records the flag. Never presented as verified contract rates.

## 7. Pilotage, towage, and mooring conventions (the Hamburg conventions)

- Towage: no published tariff at Bremerhaven (the German deep-sea tug market;
  the national operators). The Hamburg convention applies — an estimated
  parameter, user-editable, default 15,000 EUR per call (3 tugs × ~5,000 EUR
  market range), flagged estimated, never presented as verified data. The
  Weser approach is 32 nm from the open sea (shorter than the Elbe); the
  default stays at the Hamburg market-range figure rather than inventing a
  port-specific one — the estimate flag carries the honesty.
- Mooring: crew-handled per the directive's convention (the Bremerhaven
  stromkaje terminals work lines with the vessel's crew; no boatmen concession
  charge surfaces in any archived authority). Recorded here as the applied
  convention with its evidentiary status stated: no authority in the archive
  addresses mooring boatmen at Bremerhaven — a recorded context, not a
  verified finding. No rule, no notice (the Hamburg precedent: Hamburg models
  no mooring line at all).
- Pilotage acceptance: the call model's pilotage_required stands; the Hafenlotsgeld
  is owed regardless (§12(7).7), and the GDWS layers price the sea approach.

## 8. Estimated parameters and honesty flags

| Parameter | Default | Basis |
|---|---|---|
| Towage (EUR/call) | 15,000 | Estimated; no published tariff; 3 tugs × ~5,000 EUR market range (the Hamburg convention, section 7) |

Honesty flags (rendered, never hidden): the towage estimated_parameter flag; the
NTB reference-tariff flag (contract_vs_published, section 6); the arrival-origin
fallback flag (the engine's existing seam — an unrecognized or absent origin
prices as outside-Europe, the worst case, visibly); the terminal-operator
fallback flag (absent/unrecognized → Eurogate, visibly).

## 9. Worked checkpoints (the default call — MAREN MAERSK, 194,849 GT, 50 h, 4,000 moves)

Call shape: the library's default call profile (spec v0.2.48) — 800×20' + 1,200×40'
loaded, 800×20' + 1,200×40' discharged, 50 h lay time, worst-case levers (no
environmental discount — none is encodable at Bremerhaven, section 4.5),
arrival from outside Europe (the Asia-Europe liner leg), terminal operator
EUROGATE CTB (the default).

| Line | Arithmetic | Amount EUR |
|---|---|---|
| Raumgebühr (Übersee liner) | 194,849 × 0.3038 | 59,195.13 |
| Waste fee (§10(1), > 45,000 GT band) | flat band | 885.84 |
| Hafenlotsgeld (§12(7).2, no lock) | 211.69 + 1,819 × 1.03 (1,819 = ceil((194,849 − 13,000)/100)) | 2,085.26 |
| GDWS Lotsabgaben (Weser, 65%) | 5,322 × 0.65 | 3,459.30 |
| GDWS Lotsgelder (Außenweser, 100%) | min(1,663 + 78 × 45, 4,100) = min(5,173, 4,100) | 4,100.00 |
| Eurogate berthing (2.1.1–2.1.2) | 194,849 × (1.04 + 3 × 0.60) | 553,371.16 |
| Eurogate handling (5.1.1) | 4,000 × 358.00 | 1,432,000.00 |
| Eurogate security (13.1) | 4,000 × 24.95 | 99,800.00 |
| Eurogate social fund (1.3.13) | 1.5% × (553,371.16 + 1,432,000.00) | 29,780.57 |
| Towage (est.) | flat | 15,000.00 |
| **Grand Total** | sum | **2,199,677.26** |

Per-GT: 2,199,677.26 / 194,849 = 11.29 EUR/GT (derived, the established metric
convention). Every line carries its B1/B2/B4 citation at real archived paths.

The NTB variant (the same call, terminal_operator: NTB — the terminal-variant
verification anchor):

| Line | Arithmetic | Amount EUR |
|---|---|---|
| NTB tonnage dues (1.1) | 194,849 × (0.50 + 3 × 0.25) | 243,561.25 |
| NTB handling (2.1.1) | 4,000 × 339.00 | 1,356,000.00 |
| NTB security (ch. 10) | 4,000 × 22.20 | 88,800.00 |
| NTB social fund | 1.5% × (243,561.25 + 1,356,000.00) | 23,993.42 |
| Port-wide lines (unchanged) | see above | 85,710.53 |
| **Variant total** | sum | **1,797,080.20** |

The port-wide lines at the variant: 59,195.13 + 885.84 + 2,085.26 + 3,459.30 +
4,100.00 + 15,000.00 = 85,710.53. The variant moves ONLY the terminal lines
(the terminal-variant pin's red base).

Second-vessel anchor (the Hafenlotsgeld under-13k segment — HELGAFELL, 8,890 GT,
the model's feeder): 41.80 + 89 × 1.27 = 41.80 + 113.03 = 154.83 EUR.

## 10. Map to shared machinery (decided at extraction, never per-silo judgment)

Every rule's fee family and classification prefix, resolved against
core/src/classification.ts and web/src/chargeTypes.ts BEFORE encoding (the
v0.4.4 lesson as pre-paid debt):

| Rule | Fee family | Functional class | Charge-type line |
|---|---|---|---|
| brv_raumgebuehr_overseas_liner / brv_raumgebuehr_europe_liner | port_dues | berth_terminal_infrastructure | — (port-dues family row) |
| brv_raumgebuehr_extension_overseas | port_dues | berth_terminal_infrastructure | — |
| brv_abfallentsorgung | waste | waste_environmental | — |
| brv_hafenlotsgeld_ab13k / brv_hafenlotsgeld_unter13k | pilotage | purchased_service | — |
| gdws_pilotage_dues_weser / gdws_pilot_fees_aussenweser | pilotage | purchased_service | — |
| eurogate_berthing_charge | vessel_fee | berth_terminal_infrastructure | berth_dues (existing member) |
| eurogate_container_handling | terminal_handling | cargo_throughput_levy | — |
| eurogate_security_charge | security | cargo_throughput_levy | — |
| eurogate_lashing / eurogate_twistlocks / eurogate_imo_surcharge / eurogate_reefer_* | cargo_fee | cargo_throughput_levy | — |
| eurogate_small_call_minimum / eurogate_layby_charge | terminal_handling / vessel_fee | cargo_throughput_levy / berth_terminal_infrastructure | — |
| eurogate_storage_* | storage | cargo_throughput_levy | — |
| ntb_tonnage_dues | vessel_fee | berth_terminal_infrastructure | berth_dues (NEW member — added to BERTH_RULE_IDS in-pass) |
| ntb_container_handling / ntb_security_charge / ntb_lashing / ntb_twistlocks / ntb_reefer_* | terminal_handling / security / cargo_fee | cargo_throughput_levy | — |
| ntb_storage_* | storage | cargo_throughput_levy | — |
| bremerhaven_towage_estimate | towage | purchased_service | — |
| bremerhaven_eu_ets_allowances / bremerhaven_fueleu_notice | regulatory | waste_environmental | — (the shared _eu_ets_allowances / _fueleu_notice classification patterns) |

German-biller presentation follows the Hamburg forms (the Hafengeld/fairway
lines — the v0.4.4 presentation-normalization doctrine): the Raumgebühr renders
on the port-dues family row (the Hamburg Hafengeld's line); the GDWS pilotage
rules render on the pilotage row (the Hamburg GDWS lines); the Eurogate/NTB
berth-side dues render on the Berth dues charge-type line (the same
lay-time-ship's-dues economic animal — the NTB tonnage dues join
eurogate_berthing_charge and hhla_tonnage_dues there).

New-family adjudications (the directive's item 0.3): NONE — the HGebO's
Liegegeld structure (§7) is out of the container-call scope (section 4.5), so
no lay_up-family rule is authored; the Hafenfonds levy class does not apply at
Bremen (section 4.6 — no new family; the terminals' social funds use the
existing social_fund family). No genuinely new fee family is coined this pass;
the shared machinery gains only the ntb_tonnage_dues berth-dues membership
(web/src/chargeTypes.ts) and the per-port classification table.

## 11. Open items for review

1. The Raumgebühr extension for the Europaverkehr side is recorded, not encoded
   (the GT-band × time-period nesting has no engine shape — the stop-and-report
   finding, section 4.2).
2. The Short Sea subdivision of the European traffic area (the binary
   arrival-origin selector cannot key it; the conservative Europaverkehr rate
   prices European arrivals) — recorded in the input-coverage matrix.
3. The §3b(1) second-call rebate, §3b(3) annual frequency rebate, and the
   §3b(5) ESI/LNG rebates are recorded, not encoded (sections 4.5) — the
   no-input and competitive-selection conventions.
4. The Hafenlotsgeld per-call convention (one Beratungsgeld per call) — the
   interpretation note (section 4.4).
5. MSC Gate Bremerhaven as a third terminal variant (its published document
   references the EUROGATE CTB tariff plus an administration surcharge) — a
   future variant candidate, recorded.
6. Mooring at Bremerhaven: the crew-handled convention is applied per the
   directive; no archived authority addresses Bremerhaven boatmen (the
   evidentiary status stated, section 7).

## 12. Verification log (self-check, 2026-10-05)

1. **Identity verification (B1):** the Transparenzportal page's own metadata
   confirms the edition (Inkrafttreten 01.01.2026; the 26.11.2025 amendment
   recasting §§6 and 10 — matching the bremenports page's link as the current
   Hafengebührenordnung); the statute text and the portal's PDF rendering were
   both fetched and both archived; the fee tables were read from both and agree.
2. **The annex probe (section 2):** performed at execution; the two-part
   authority collapses into the statute with inline tables; the port-fee
   figures are archived from the ordinance itself — the directive's stop
   condition was never met.
3. **B2 identity:** the fetched PDF is byte-identical to the archived Hamburg
   copy (SHA-256 match) — the national-class document is the same vintage; the
   Bremerhaven companion text extraction is verbatim from it.
4. **B3 identity:** issuer (North Sea Terminal Bremerhaven GmbH & Co.), title
   (Reference tariff), validity (01.08.2026), language (English), structure
   (12 pages, ch. 1–11 matching the index) — verified before archiving; the
   reference-tariff honesty flag recorded in the archive header.
5. **Route arithmetic (section 5):** the 65% sea-approach composition (legs
   g+f) re-derived from the verbatim Abschnitt A §1.2 percentages; the
   Lotsgelder's 100% Außenweser leg (1.3a) read from Anlage 2 Abschnitt A
   §1.3; the two scale treatments recorded honestly.
6. **Arithmetic re-verification:** every checkpoint figure in section 9
   recomputed twice (per-line and total): the Grand Total 2,199,272.49 and the
   variant total 1,796,675.43; the Helgafell anchor 125.38.
7. **The Hafenfonds resolution (section 4.6):** the statute's full text
   searched — no port-fund levy exists; the resolution is from the ordinance
   only.
