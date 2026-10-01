# Scenario-Adjustment Layer Audit (v0.3.3, item 0 — committed before implementation)

This document is the audit of record for the v0.3.3 pass: the
scenario-adjustment layer plus three riders (the cross-port
functional-equivalence annotations, the AFIR regulatory-context notes, and the
MSC KYUNGMIN NT observation). The extraction references under docs/sources/
are the authorities; this audit verifies and adjudicates, it never re-adjudicates
what a committed extraction already settled.

## 1. The Eurogate extraction verified against the archived document

Authority: docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf
(EUROGATE Container Terminal Hamburg GmbH, "Prices and Conditions", effective
1st March 2026, 19 pages). The Hamburg extraction reference
(HAMBURG_EXTRACTION_REFERENCE.md) records the adjudications; this audit
re-verified every scenario-relevant figure against the archived PDF text:

**Ch. 7 storage (verified verbatim):**

- 7.1 Export (waterside loading, excl. barge): ISO-Standard 5 calendar days
  free, then day 6–13 at 42.00/84.00/126.00 EUR (20'/40'/45'), as from day 14
  at 84.00/168.00/252.00 EUR. Non-ISO/OOG 3 free days; Reefer 3 free days at
  63.00/126.00/189.00 then 126.00/252.00/378.00; hazardous (except Cl. 1+7)
  1 free day at 84.00/168.00/252.00 then 168.00/336.00/672.00.
- 7.2 Import (waterside discharging, excl. barge): ISO-Standard 3 calendar
  days free, day 4–8 at 42.00/84.00/126.00, day 9–13 at 84.00/168.00/252.00,
  day 14–18 at 126.00/252.00/378.00, as from day 19 at
  168.00/336.00/504.00. Non-ISO/OOG, Reefer, and hazardous variants as
  printed (four-band import ladder verified).
- 7.3 Transhipment (waterside both directions): ISO 5 free days, then
  day 6–13 at 42/84/126, as from day 14 at 84/168/252; the non-ISO/OOG,
  reefer, and hazardous variants verified as printed.
- 7.4 Empty Container (without cargo): no free time, ISO per day at
  21.00/42.00/63.00 EUR.
- 7.5 Transit Container (delivery per truck, train, barge): no free time;
  day 1–5 at 42/84/126, day 6–10 at 84/168/252, day 11–15 at
  126/252/378, as from day 16 at 168/336/504 (the non-ISO, reefer, and
  hazardous variants verified as printed).
- 7.5.3 (counting rule, verbatim): "Obligatory storage counts for every
  calendar day subject to free time given between receiving and delivery
  (the day of delivery to the terminal is free, whereas the day of
  redelivery do count as full day)." — the free-time boundary convention the
  scenario layer's day arithmetic must state.
- 7.5.1: UN class 1 and 7 hazardous cargo carries no free time at all.

**Ch. 3 shift/overtime and ch. 4 equipment (verified verbatim):**

- 3.1 waterside shift surcharges per shift/gang: weekday 3rd shift 2,097.00;
  Saturdays 1st/2nd 4,956.00; Saturdays 3rd/4th 6,947.00; Sundays/public
  holidays 1st/2nd 4,956.00; Sundays/public holidays 3rd/4th 6,947.00; days
  before high holidays weekday 1st 5,566.00; days before high holidays
  Saturday 1st 5,301.00 EUR.
- 3.2 rail-car receiving/delivery surcharges per container: 18.30 EUR both
  printed variants.
- 3.3 overtime per hour/part thereof per shift/gang: the ten printed items
  (700.00; 1,154.00; 1,358.00; 1,243.00; 1,639.00; 2,030.00; 1,639.00;
  2,030.00; two "On request" items).
- 3.4 waiting times: charged to the vessel by shift, per man per hour "see
  chapter 4" (i.e. the 4.1 staff rate 142.00 EUR/h) — the document's own
  cross-reference, so the waiting-time figure derives from ch. 4, never a
  new rate.
- 3.5 Common Cost Table: shift surcharges, waiting time, hatch covers, bin
  racks, restows are for the account of the Line operating the containership
  (the ship-side cost view is the document's own).
- Ch. 4 equipment/staff hire per hour or part thereof: staff 142.00; container
  crane with driver 1,841.00; van carrier 699.00; mafi 244.00; fork-lift up
  to 5 t 190.00; fork-lift over 5 t 309.00; reachstacker 583.00; security
  vehicle 190.00; security inspector 169.00; mafi trailer rental per day
  212.00 EUR. The wage-agreement note: "Changes to the wage agreement will
  have an immediate effect on the stated rates."

**The extraction's adjudications govern the parameter set** (this pass does
not re-adjudicate):

- Ch. 3–4 are scenario-dependent per-shift/per-hour charges requiring an
  operational schedule; the extraction records them as notices, not encoded
  rates ("a rate without an input would be an invention of usage").
- Ch. 7 storage is landside/cargo-side by §1.4.3 billing, but the current
  HHLA encoding already models storage as ship-visible optional scenario
  inputs; the Eurogate schedules were recorded in full and left unencoded
  — "storage is a scenario layer (the deferred scenario-adjustment layer
  owns it)."
- The social fund (§1.3.13) excludes storage charges from its base — any
  scenario-derived storage line must not enter the 1.5% social-fund base
  (verified in §1.3.13's own text).

## 2. The scenario layer's own terms (the machinery this pass builds)

The scenario layer adjusts cost lines by scenario parameters; it never
re-transcribes. Every scenario-adjusted figure derives from the same pinned
rates by stated arithmetic. The extraction's adjudicated surfaces:

1. **Storage scenario (ch. 7)**: the free-time parameters (export 5 days,
   import 3 days, transhipment 5 days, empties no free time, hazardous
   1 day, UN 1+7 none), the escalation bands, and the 7.5.3 counting rule
   are the document's own; the scenario parameter is the storage day count
   per container category — the same input contract the existing HHLA
   storage rules already use (storage_days_import etc.), extended to the
   Eurogate schedules at the Eurogate operator scope.
2. **Shift/weekend/holiday and equipment scenario (ch. 3–4)**: the extraction
   adjudicated that these require an operational schedule the call model does
   not carry (no shift-count input exists). The scenario layer therefore adds
   the missing inputs as scenario parameters — shift counts per the printed
   shift classes (weekday 3rd, Saturday, Sunday/holiday, pre-high-holiday)
   and gang-based overtime/waiting hours — each priced at the pinned ch. 3/4
   rates, each labeled scenario-derived. No parameter the document does not
   support is invented: the shift classes and the equipment lines are exactly
   the printed ones; the gang count is the call's own operational parameter
   (the document prices "per shift / per gang").
3. **Scenario-off is byte-identical**: no scenario input renders any line
   and no total moves (pinned both ways).

## 3. Equivalence pairs verified against the archived sources

The comparison view's family rows carry each port's own tariff terminology.
The claimed functional mapping was verified against the archived tariff
documents and the repo's own pinned functional classification
(core/src/classification.ts, pinned by core/test/functional_classification.test.ts):

| Claimed pair | Verification | Verdict |
|---|---|---|
| HPA Hafengeld ↔ Sjöfartsverket fairway dues as the access charge | Hafengeld is the HPA port fee for the vessel's call (Pricelist cat. 31 item A), classified berth_terminal_infrastructure — dues for the vessel's use of the port's berth/terminal infrastructure. Sjöfartsverket fartygsavgift+beredskapsavgift are waterway/fairway access dues (Föreskrift 2025:6, prislista pp.3–4), classified waterway_fairway_access. **The claimed mapping is functionally wrong: Hafengeld funds port infrastructure, not waterway access; the Sjöfartsverket dues fund the fairway, not a port's berth.** | **DROPPED** — the sources do not support it |
| HHLA/Eurogate berth-tonnage dues ↔ GOT port dues as the quay-occupancy charge | HHLA tonnage dues (Quay Tariff §1.2, GT x lay time at a berthed handling facility) and Eurogate berthing charge (P&C 2.1.1–2.1.2, every ship berthed at the handling facilities) are berth/terminal infrastructure — the quay-occupancy charge. GOT container vessel dues (Port Tariff §2.1/§2.2, progressive per GT, classified berth_terminal_infrastructure, "Municipal port dues on the vessel") are the port-infrastructure call charge — a per-call access-style due, not a lay-time quay-occupancy charge. **The claimed identity does not verify: the German lines are lay-time berth dues (GT x hours); GOT's dues are per-call per-GT with no time basis.** | **DROPPED as stated** — recorded instead as a partial, correctly-worded functional correspondence (see below) |

**The verified functional-equivalence set (annotated, stated as "functionally
corresponds to", never identity of amounts or labels):**

- **The access-charge slot** (what a vessel pays for the right to call):
  - GOT: the municipal Port of Gothenburg container vessel dues
    (berth_terminal_infrastructure, per-call) **functionally corresponds to**
  - HAM: the HPA Hafengeld (berth_terminal_infrastructure, per-call, covers
    up to 120 h in port) **functionally corresponds to**
  - HEL: the Port of Helsingborg port dues (berth_terminal_infrastructure,
    per-GT per call).
  All three are the port's own call/infrastructure charge. Verified basis:
  each tariff's own language (GOT "port dues based on GT"; HPA cat. 31 port
  fee; HEL "Port Dues for vessels, SEK per GT") and the repo's pinned
  functional classification.
- **The quay-occupancy slot** (time-based ship's dues at the berth):
  - HAM: HHLA tonnage dues / Eurogate berthing charge (GT x lay time)
  is **functionally unmatched at GOT and HEL** — neither Swedish port levies
  a lay-time-based berth due in the container domain (GOT lay-up is
  cargo-tied, a different function; HEL's long-stay dues key on LOA x time
  beyond four days, a congestion charge, recorded but not equated).
  Verified: both Swedish tariffs' archived texts carry no berthed-time
  ship's due.
- **The waterway-access slot**: the Sjöfartsverket vessel fee + readiness
  fee (+ godsavgift) at GOT/HEL have **no Hamburg counterpart** — Hamburg
  levies no national waterway due (the fairway access at HAM is not a
  separate toll; the Hafenfonds is a surcharge on quay-tariff fees,
  "Hafenfonds = port dues"). Verified: the STC/pricelist texts contain no
  waterway-due item.
- **The cargo-throughput slot**: HEL Port Dues Cargo (625.00 SEK/unit) and
  the Sjöfartsverket godsavgift (cargo-based fairway due) both key on
  handled cargo; Hamburg levies no cargo due (its ch. 6/8 items are
  container services, not dues). The two Swedish cargo-keyed charges
  **functionally correspond to each other only in their cargo basis** —
  one is a municipal cargo due, the other a national fairway cargo
  component; they stack at HEL and are never identical.

Annotation verdict: the two claimed pairs from the directive **do not
verify against the sources and are dropped as claimed**; the verified
three-slot functional map above is what the annotations state, each worded
as functional correspondence, never as identity of amounts or labels. This
is a directive-premise correction, reported.

## 4. AFIR facts verified against the act

Regulation (EU) 2023/1804 (AFIR), in force since 12 October 2023
(published OJ 22 September 2023). EUR-Lex robot-blocks automated retrieval
from this environment (the standing disclosure, re-observed this pass:
HTTP 202 with an empty body, the anti-bot interstitial). The facts were
verified against the EUR-Lex indexed snippets plus the archived-in-repo
pattern of official-secondary sources, cross-checked for consistency:

- **The maritime shore-side electricity obligation is Article 9** of
  Regulation (EU) 2023/1804 ("Targets for shore-side electricity supply in
  maritime ports") — **a directive-premise correction, reported: the
  directive said "Art. 8"; AFIR's Article 8 is liquefied methane for road
  vehicles.** Verified against the article table (NAP Core's official AFIR
  presentation; T&E's explainer; the EUR-Lex text itself).
- Article 9(1): Member States shall ensure a minimum shore-side electricity
  supply for seagoing container ships and seagoing passenger ships in
  TEN-T maritime ports; the necessary measures by **31 December 2029**
  (capability deadline), with the **minimum supply — at least 90% of port
  calls — from 1 January 2030**.
- Traffic thresholds attaching the obligation per port (average over the
  last three years, ships above 5,000 GT, moored at the quayside):
  **container ships more than 100 calls/year, ro-ro passenger ships more
  than 40 calls/year, cruise ships more than 25 calls/year.** (The 40/100
  figures in circulation are the passenger/container thresholds; the exact
  printed set is 100/40/25.)
- The ship-side obligation to connect is FuelEU Maritime's (Regulation (EU)
  2023/1805 Art. 6, from 1 January 2030 for container and passenger ships
  ≥5,000 GT at TEN-T quaysides) — AFIR is the port-side infrastructure
  mandate; **AFIR levies no vessel-side charge.**
- **Watch item (as with the ETS revision proposal): the AFIR review is
  under way** — the Commission opened a call for evidence on 23 March 2026
  (input by 20 April 2026), a broader public consultation in Q2 2026, with
  the legislative proposal expected Q4 2026 (the regulation's own review
  deadline is 31 December 2026, every five years after).

**Per-port facts:**

- **GOT** — TEN-T core port; OPS pioneer (the first Swedish high-voltage
  installation 2000, Stena Line OPS backbone, tanker-jet OPS since 2024);
  already operational at RoRo, RoPax, and Energy terminals; a new
  transformer station (SEK 129m contract, 2025) enables OPS at five
  container berths and two car/RoRo berths **by 2030** (total OPS
  investment ~SEK 600m, EU CEF co-financed ~SEK 90m). Container traffic
  (~700k TEU/yr, regular line services) far exceeds the 100-call
  threshold. Status: on track; the port's own published aim is "before
  2030".
- **HAM** — TEN-T core port; OPS operational at Eurogate CTH (three
  mega-ship berths, 7.5 MVA each, renewable supply) since May 2024, HHLA
  CTT following, CTB and CTA committed — the port's stated completion:
  **all large container terminals equipped by the end of 2025**; ten
  shore power connections for container ships plus four for cruise ships;
  container traffic far exceeds the threshold. Status: capability in
  place ahead of the 2029 deadline.
- **HEL** — TEN-T comprehensive network port; OPS already offered for
  ferries at the City Port; Scandinavia's first container-vessel OPS
  facility announced 2025 (with Actemium, up to 3.5 MW — a feeder
  container vessel's needs), **commissioning planned autumn 2026**, driven
  by a 2019 Environmental Permit Authority ruling (shore power available
  for container vessels within seven years). Container calls (feeder
  services) are the relevant threshold basis; the port's own
  announcements treat the 2030 mandate as applying. Status: in build,
  ahead of the deadline.

All three ports' OPS surfaces in this model are the existing OPS
speculation inputs (no published container-terminal OPS rate at any of the
three — verified at the v0.2.57/v0.2.64 passes; unchanged this pass).

## 5. The MSC KYUNGMIN NT observation's provenance

- The Flexport figure (NT 9,654) is an **aggregator observation, not a
  registry confirmation** — the directive states it as such, and this audit
  records it exactly that way.
- The registry routes were re-checked this pass and remain
  **automation-blocked**: the DNV register blocks automated access
  (verified 2026-10-01, the standing finding), Equasis is
  automation-blocked, the Korean register is not fetchable by automated
  retrieval. No registry confirmation was obtainable.
- Corroboration state: the v0.3.0 pass recorded the Marine MAN aggregator
  as carrying GT but no NT for IMO 9967005; the Flexport Atlas observation
  (NT 9,654, verified 2026-10-01) is a **second, independent aggregator
  now carrying an NT figure**. The two sources do not agree on a value
  (one carries none), so the observation is recorded as
  observation-not-confirmation, flagged, corroborating nothing numerically;
  a registry confirmation remains the only closing evidence.
- The default NT (8,000 estimate) does **not** move; no class boundary
  moves; the Class 5/6 boundary notice (the v0.3.0 error band
  8,792–12,748 NT spanning the Class 6 threshold at 10,000) keeps its
  existing behavior. The observation is recorded in the vessel library
  with a documented-observation provenance field and surfaced at the
  NT-class indication, never presented as registry-confirmed.

## 6. Baseline and ritual state at audit time

- Standing rate ritual, re-verified this pass: the Frankfurter API's latest
  TARGET publication remains **2026-09-30, EUR→SEK 11.331** — identical to
  the pinned rate and as_of in core/data/exchange_rates.yaml. No 2026-10-01
  publication exists yet (the API returns 2026-09-30). **No rate movement;
  no conversion-only re-baselining; the YAML is unchanged.** Drift: 0.
- Fresh-clone baseline verification (both suites chunked, exact counts):
  **560 core tests green** (26 suites, matching the stated baseline
  exactly); **460 web tests green** (39 suites). The stated web baseline
  of 461 does not reproduce: the v0.3.1 changelog's own arithmetic reads
  429 + 14 = 443 (stated as 444), and 444 + 17 = 461 (stated at v0.3.2);
  the measured present figure is 460 = 443 + 17. Every suite was counted
  individually (23+3+10+6+18+10+14+13+23+13+12+8+15+5+14+10+11+14+7+15+15+
  8+17+21+6+17+3+34+11+7+12+7+7+6+3+5+17+11+9) and the sum is 460. A
  one-test discrepancy in the historical changelog's arithmetic (444 vs
  443 at v0.3.1) is the reported explanation; this pass reports measured
  figures.
- Zero-drift native baselines byte-identical (verified in the baseline
  runs above): GOT 3,275,851.15 SEK / 16.81; HAM 2,204,910.90 EUR / 11.32;
  HEL 8,750,057.40 SEK / 44.91; conversion-bearing figures per the pinned
  11.331.

## 7. Implementation adjudications from this audit

1. The scenario layer's storage scenario extends the existing HHLA storage
   input contract to the Eurogate schedules (Eurogate operator scope), with
   the 7.5.3 counting rule stated in the basis; the social-fund exclusion
   of storage is preserved.
2. The shift/equipment scenario adds the extraction-adjudicated inputs
   (shift counts per the printed classes; gang-based overtime/waiting
   hours), priced at the pinned ch. 3/4 rates, labeled scenario-derived,
   never tariff-transcribed.
3. The equivalence annotations carry the verified three-slot map only; both
   directive-claimed pairs are dropped with reasons (item 3 above).
4. The AFIR notes cite Article 9 (corrected), the 2029 capability deadline,
   the 2030 90% minimum supply, the 100/40/25 call thresholds, the
   port-side nature (no vessel-side AFIR fee), the per-port statuses, and
   the review watch item — zero-amount, never additive, never a fee rule.
5. The KYUNGMIN observation adds a documented-observation provenance field
   to the vessel record (data-shape change; converter passes it through;
   pins extended), surfaced at the NT-class indication, flagged
   observation-not-confirmation; no default or boundary movement.
