# Gävle Extraction Reference — Port Call Cost Analyzer

Authority of record for the Port of Gävle build (the Swedish domestic
expansion pass, v0.4.0). Where any builder directive conflicts with this
document, this document prevails. All amounts are in SEK. The tariff states
no VAT treatment for its figures beyond ordinary invoicing terms; amounts
are treated as ex-VAT throughout, consistent with the model's conventions.

Extraction date: 2026-10-02. Tariff vintage: Hamntaxa Gävle Hamn, "gäller
från 1 januari 2026" (effective 1 January 2026). Reservation clause (§10):
"Gävle Hamn AB förbehåller sig rätten att revidera hamntaxan under året" —
the archived checksum pins the vintage this extraction transcribes. Language:
Swedish (the authoritative version per §9: "Vid eventuell tolkningstvist av
hamntaxan gäller senast publicerad svensk version").

---

## 1. Source

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| S1 | Gävle Hamn AB, Hamntaxa Gävle Hamn 2026 (10 pages, Swedish) | Gävle Hamn AB | Yes | `docs/sources/sweden/gavle/hamntaxa-2026.pdf` |
| S2 | Yilport Gävle Container Terminal AB, Yilport Gävle Container Terminal General Tariff, "2026 Tariff Rates" (5 pages, English; valid 1 January – 31 December 2026) | Yilport Gävle Container Terminal AB | Yes | `docs/sources/sweden/gavle/yilport-container-terminal-tariff-2026.pdf` |

- Fetch URL (S2): https://yilport.com/en/images/PartDocuments/2026_yilport_ga_vle_container_terminal_general_tariff.pdf
- Fetch date (S2): 2026-10-01
- SHA-256 (S2): `c80d0c673e1821b487cb1d1b42a457a39046089fd9dbe651cf853ce396e5d014`
- Identity verified (S2): issuer Yilport Gävle Container Terminal AB (address
  block, Fredriksskansvägen 64, SE 806 47 Gävle), title "Yilport Gävle
  Container Terminal General Tariff / 2026 Tariff Rates", "Valid from
  1 January 2026 to 31 December 2026", "VAT is excluded from all prices. The
  invoices and payments will be in SEK currency" (§1.2), "'PORTS OF SWEDEN,
  General Conditions 1989 for terminal operations' applies" (§1.6).
  Match — archived as expected. The operator layer joins the hamntaxa in the
  same silo's source tree (the Norvik two-document pattern).

- Fetch URL: https://gavlehamn.se/wp-content/uploads/2025/11/Hamntaxa-Gavle-Hamn-2026.pdf
- Fetch date: 2026-10-02
- SHA-256: `793b43ad0750ddd057304aa2be8025eecd3f723b5b365799eddcc9e41f2b0d68`
- Identity verified: title "HAMNTAXA GÄVLE HAMN / gäller från 1 januari
  2026", issuer Gävle Hamn AB (§9 contact block), effective date on cover,
  Swedish, structure: 1 Villkor (pp.2-3), 2 Hamnavgifter för fartyg (pp.4-5),
  3 Miljörabatter (p.6), 4 Avgifter för fartygsgenererat avfall (p.6),
  5 Varuhamnsavgift (p.7), 6 Spåravgift järnväg (p.8), 7 Bilvåg (p.9),
  8 Passerkort (p.9). Match — archived as expected.

## 2. Charging structure (billers)

Gävle Hamn AB acts as port authority; the container terminal is operated by
Yilport Gävle (named in §5.1: the varuhamnsavgift applies "på kaj 1 och 27
samt utanför Yilport Gävles koncessionsområde" — the concession structure is
visible in the tariff's own text). This is the integrated authority-plus-
operator question the HEL precedent adjudicated; here the split differs:
the port authority's hamntaxa covers vessel dues and waste, while the
varuhamnsavgift explicitly reaches outside the terminal operator's
concession area for quay 1/27 goods and goods not passed over quay.

Adjudication (per the HEL/Hamburg precedents): the hamntaxa is the port
authority layer and is transcribed in full; the terminal operator (Yilport
Gävle) publishes its own handling tariff separately — not this document, not
archived this pass. The container-call model's terminal-handling surface at
Gävle is therefore a GAP NOTICE: the document publishes no container
handling (stevedoring/lift) rate for the container terminal inside the
concession area. The vessel-side charges (vessel dues, waste, lay-time fee)
are complete in this document. The gap is surfaced, never filled.

1. **Gävle Hamn AB** — hamnavgift per vessel type and terminal, waste
   (miljötillägg), varuhamnsavgift (outside the Yilport concession and
   not-over-quay goods), lay-time fee, electricity connection.
2. **Sjöfartsverket** — national fairway dues and pilotage; own
   transcription with own citations (port-silo discipline).
3. **Yilport Gävle** — container-terminal handling inside the concession
   area; separate unpublished tariff (gap notice).

## 3. Fee rules (source S1)

### 3.1 Hamnavgift — container terminal vessels (§2.1, p.4)

- Containerfartyg: 2.97 SEK/GT.
- Break bulkfartyg (LoLo): 4.81 SEK/GT (out of scope for the container
  model; recorded).
- RoRo Kpl 15, 1-2 anlöp/vecka: 1.94 SEK/GT; >2 anlöp/vecka: 1.69 SEK/GT
  (out of scope — the container call; recorded per the directive).
- Övriga fartyg: 4.81 SEK/GT.
- Winter surcharge: "Istillägg 1 december till 30 april +100 % (enligt
  ovanstående taxa)" — a date-window surcharge doubling the vessel dues
  from 1 December to 30 April. The model's call carries a date; the
  surcharge is encoded as a date-conditioned adjustment (the call date
  within the window doubles the dues; the default call's date outside the
  window prices the base rate — the condition derives from the call date,
  never a port-id string).

### 3.2 Hamnavgift — other terminals (§§2.2-2.3, 2.5, pp.4-5)

- Kaj 1 Kemiterminalen tankers: 4.81 / 5.21 / 5.96 SEK/GT by GT band;
  Kaj 27 Energiterminalen: 4.94 / 5.35 / 6.12; Karskär all types 4.26;
  each with the same winter +100% surcharge. Liquid-bulk and other-terminal
  provisions — out of scope for the container call; recorded.

### 3.3 Electricity connection (§2.4, p.4)

- Anslutningsavgift: 5,145 SEK/anlöp; "Rörlig elförbrukning faktisk
  kostnad". This is the OPS-relevant published posture at Gävle: a fixed
  connection charge per call with consumption at actual cost. Encoded as
  the OPS connection component's data posture (enabled, SEK, SEK/call,
  5,145 SEK published connection charge); the actual-cost consumption is
  the user's input, never invented.

### 3.4 Liggetidsavgift — lay-time fee (§2.6, p.5)

- 62 SEK per metre LOA per commenced day ("per påbörjat dygn"), charged for
  vessels arriving earlier than needed for cargo start or remaining after
  completion beyond routine departure preparations. The per_commenced_day
  shape with basis loa_m; the default call prices no idle days (explicit
  input, zero default — the model has no seeded idle stay; recorded, never
  invented).

### 3.5 Undantag (§2.7, p.5) — state vessels, tugs, emergency calls;
exemptions with time limits. Not applicable to the container call; recorded.

### 3.6 Miljörabatter (§3 / §1.2, p.6)

- ESI ≥ 30 points or CSI ≥ 4 stars: 10% discount on the GT-based vessel
  fee.
- LNG fuel at call: 20% discount on the GT-based vessel fee.
- Registration must be reported in Maritime Single Window (MSW) before the
  call (§6). Two different CSI scales exist (the HEL caution): the port's
  own discount keys on the Clean Shipping Index's star rating (≥ 4 stars),
  not Sjöfartsverket's A-E class. The ESI ≥ 30 threshold matches HEL/GOT's
  ESI discount.
- Adjudication of the HEL correspondence: the ESI/CSI discount structure is
  functionally the same shape as Helsingborg's (§3.2 there) — a 10%
  GT-dues discount on the environmental index — but the CSI key is stars
  (≥4), not HEL's "CSI class 4". The equivalence annotation does NOT extend
  this pass; the correspondence is recorded here for the future verified
  equivalence audit. Stacking: the LNG discount's relation to the ESI/CSI
  discount (additive or exclusive) is not stated in the tariff — the
  conservative default prices one discount at a time (the highest), never
  both; recorded as an open decision (§10).

### 3.7 Miljötillägg — waste (§4.1, p.6)

- Normaltaxa: 0.98 SEK/GT.
- Fartyg till Karskärs kajer: 0.86 SEK/GT (other terminal; recorded).
- Containerfartyg: 0.18 SEK/GT.
- In accordance with Swedish legislation and EU directive 2000/59/EG;
  covers normal quantities (sludge, oily bilge water, solid waste);
  additional quantities billed specially (§8 lists the additional-fee
  conditions: late notification, foreign substances, non-ship-origin
  waste, packaging faults, missed delivery times, no ship personnel,
  pump capacity under 5 m³/h). Scrubber waste, cargo residues, non-ship
  waste: actual cost + 500 SEK administration fee (§4.2).
- Transport Agency pattern: the tariff cites Swedish legislation and the
  EU directive for the waste system, but states no TSFS-numbered
  exemption clause in the extracted text; the §12 Transport Agency
  exemption pattern (the GOT research) is not restated here — recorded as
  a finding. No exemption note is encoded this pass; the waste line's
  basis cites what the document states, never the imported pattern.

### 3.8 Varuhamnsavgift — cargo dues (§5, p.7)

- Charged for goods handled at quay 1 and 27 and outside Yilport Gävle's
  concession areas; also for goods not passed over quay. Charged once,
  either on arrival or departure. Per nearest metric ton.
- The published per-goods-slag table is liquid-bulk and bulk commodities
  (diesel/fotogen/eldningsoljor/tallolja 19.61; bensin/etanol 28.00;
  natriumhydroxid 14.48; svavelsyra 15.25; smörjoljor 27.48; slurry 10.76;
  cement 9.09; div. kemiska produkter 17.23; övriga flytande restprodukter
  11.08; skrot och övrigt gods ej över kaj 10.54 SEK/MT).
- GAP NOTICE — container cargo dues: the table publishes no container rate;
  §5.1's own scope sentence places container-terminal goods inside the
  Yilport concession where this tariff's cargo due does not reach. No
  container cargo due is invented; the model renders a gap notice for the
  cargo-side surface at Gävle (the authority's cargo due does not apply
  inside the concession; the operator's own tariff is unpublished this
  pass).

### 3.9 Spåravgift järnväg (§6, p.8) — rail: 145 SEK/wagon, 2,380 SEK per
ad-hoc marshalling occasion. Rail-leg; out of scope for the vessel call.

### 3.10 Bilvåg / Passerkort (§§7-8, pp.9) — truck weighing 133 SEK,
pass cards 215-375 SEK/card/year. Land-side; out of scope.

## 4. Sjöfartsverket national rules

Referenced, never duplicated beyond the port's own transcription duty: the
class tables, frequency discount, and godsavgift are the shared national
machinery (the Gothenburg extraction §4 tables, the same prislista). Gävle's
own YAML carries its own transcription with its own citations.

## 5. Estimated parameters

| Parameter | Default | Basis |
|---|---|---|
| Towage cost | 60,000 SEK per tug-assist | No published Gävle tug tariff in this document; declared estimate |
| Default tugs | LOA < 150 m: 0; 150-250 m: 1; > 250 m: 2 | Spec 3.3 (defaults are data, user-overridable) |
| Default pilotage hours | < 150 m LOA: 2 h; 150-250 m: 3 h; > 250 m: 4 h | Declared estimate (the model's convention) |

## 6. Fee-family mapping

| Charge | fee_family |
|---|---|
| Hamnavgift containerfartyg 2.97/GT (winter +100%) | port_dues |
| Liggetidsavgift 62/LOA-m/day | port_dues (lay-time basis) |
| Miljötillägg 0.18/GT (containerfartyg) | waste |
| Varuhamnsavgift (no container rate — gap) | port_dues (cargo-side; gap notice) |
| Electricity connection 5,145/call | ops connection posture (data) |
| ESI/CSI 10% + LNG 20% discounts | environmental_surcharge (adjustments) |
| Yilport container handling (unpublished) | terminal_handling (gap notice) |
| Sjöfartsverket vessel/readiness/godsavgift | fairway_dues / vessel_fee |
| Pilotage | pilotage |
| Towage estimate | towage |

## 7. Default call

The model's established convention: MAREN MAERSK's profile (4,000 moves,
60/40 split, balanced). Default-call classes: hamnavgift 2.97 × GT; waste
0.18 × GT (containerfartyg rate); no lay-time fee (no idle days); no winter
surcharge (call date adjudicated by the date condition); the Sjöfartsverket
national rules at the vessel's class; scenario inputs blank; the
cargo-side gap notice renders.

## 8. Verification log

- 2026-10-02: S1 text-extracted in full (10 pages, no gaps); every §3
  figure transcribed from the extracted Swedish text and re-read against
  it.
- 2026-10-02: identity verified before archiving; SHA-256 at §1.
- 2026-10-02: the container-handling gap (§2 adjudication, §3.8) and the
  container cargo-due gap recorded as gap notices — never invented.

## 9. Not modeled (surface as notices, never guess)

- Container terminal handling — Yilport Gävle's concession, separate
  unpublished tariff (gap notice).
- Container cargo due — no container rate in the varuhamnsavgift table
  (gap notice; the scope sentence explains why).
- Bulk/liquid commodity cargo dues — out of scope for the container model.
- Rail, truck weighing, pass cards — land-side.
- Scrubber waste actual cost + admin — actual-cost basis, not a published
  rate.

## 10. Open decisions (defaults implemented, none blocking)

1. ESI/CSI discount and LNG discount stacking (§3.6): the tariff does not
   state whether the two discounts combine; the conservative default prices
   the highest single discount. Confirm with the port if possible.
2. Winter surcharge application (§3.1): the +100% window is
   date-conditioned; the default call date outside December-April prices
   the base rate. The condition is derived from the call date, never a
   port-id string.

---

## 11. Yilport terminal layer (source S2, added v0.4.2)

Authority of record for the container-terminal operator rules (the v0.4.2
terminal-layer pass; audit: docs/TERMINAL_BASIS_COMPARABILITY_AUDIT.md §1).
All amounts SEK, ex-VAT. Sections cited are S2's own.

### 11.1 Handling basis (verbatim, §4)

- Full container: "SEK 1 679 (Includes lift off vessel, train or truck into
  terminal and lift to vessel, train or truck out of terminal. Hatch covers
  and twist-lock handling is included)" — bundled, one rate both
  directions; the through figure.
- Empty container: "SEK 1 235 (Includes lift off vessel, train or truck into
  terminal and lift to vessel, train or truck out of terminal, lifts to and
  from inspection area, inspection and dry sweeping. Includes removal of
  nails, hazardous placards and other minor tasks)".
- OOG (§4.3): "additional 100% of the above rates".

### 11.2 TEU arithmetic (§1.3, verbatim)

"Units greater than 20' to 40' are calculated as 2 TEU (includes 22', 23',
24, 30, 40' units). 45' containers are calculated as 2.25 TEU."

Adjudication: the §4 throughput rates are per unit (per container), so
handling, cargo due, ISPS, and IMDG/reefer need no TEU mapping; the TEU
arithmetic governs the storage surface (§7, per TEU per day), which uses the
model's established size convention (≤20' = 1 TEU, >20' = 2 TEU; the 45'
2.25 refinement has no bucket or count input — recorded here and in the
storage rule description with the §1.3 citation, never a re-profiled call).

### 11.3 Surcharges (§5, verbatim)

- Cargo Due (per full container): SEK 482.
- ISPS (per full container): SEK 73.
- IMDG / Reefer Surcharge (per unit): SEK 401.

### 11.4 Storage (§7, verbatim)

- Full containers: free time "7 calendar days" ("*Arrival and departure days
  will be calculated"); "8+ days SEK 135" (per TEU per day).
- Empty containers: "SEK 13,46" — the Swedish decimal comma, read 13.46 SEK
  per TEU per day; no free time stated for empties.
- OOG: additional 100% of the above rates.

Zero-storage-default convention (v0.4.1) holds: storage prices only
user-entered days beyond the verbatim free time; the default call prices no
storage stay.

### 11.5 Recorded, not encoded (S2 sections; never silent)

- §2 Overtime gangs: SEK 13 454 / 17 404 / 20 242 per hour per gang
  (Mon–Fri nights / Fri-night-to-Mon-morning / public holidays and eves);
  Saturdays minimum 5 hours, Sundays/holidays 6.
- §3.2 Productivity compensation: a CREDIT paid by the operator to the line
  — SEK 6 788 (1–200 moves per call), 13 516 (201–400), 20 242 (>400) —
  conditional on the guarantee of 20 container moves per STS crane per
  working hour and its seven conditions (a)–(h) (final container information
  ≥15 h prior with ≤10% rollovers, accurate ETA per pro forma, stowage-change
  limits, trim/structure/mooring allowing continuous work, full cellular
  vessel, health-and-safety lost-time deductions, wind >30 knots deductions,
  OOG/damaged-unit deductions). The conditions are not call inputs: recorded
  with the figures documented, never encoded as an unconditional credit (the
  silent-discount class).
- §3.5 Out-of-window surcharge: SEK 6 788 / 13 516 / 20 242 by the pro
  forma move-count bands; "arriving four (4) or more hours after the pro
  forma start time" is the trigger. No arrival-deviation input exists;
  recorded, not encoded.
- §3.7 Vessel waiting time: SEK 6 726 per hour per gang. No waiting-hours
  input; recorded, not encoded.
- §3.8 COPRAR-absence fee: "a fee of SEK 5000 per vessel call will apply"
  for services or operators not able to provide COPRAR files. An EDI
  capability with no model input; recorded, not encoded.
- §6 Additional services (per unit unless stated): customs-area handling
  and transport 1 122 (6.1); food-inspection area 1 691 (6.2); flat racks
  901 (6.3, "Includes stack/de-stack/side walls"); container to/from repair
  area 568 (6.4); repair labor 568 per man-hour (6.5); standard washing
  without estimate 334 (6.6); with estimate 462 (6.7); odor neutralizer 255
  (6.8); shifting containers vessel–vessel 568 (6.9); vessel–quay–vessel
  1 122 (6.10); label add/removal 509 per label (6.11).
- §8 Reefer services: plug in/out 506 per unit; monitoring and electricity
  395 per unit per day; PTI of empty reefers on quote; PTI handling 506.
- §9 Re-nomination (rollover) fee: SEK 345 per unit.
- §10 Incremental rebate: 0/10.0/12.5/15.0/17.5/20.0 percent by annual
  line-operator TEU tiers (10 001–25 000 up to >80 001), applied
  incrementally on §4.1/§4.2 throughput, payment-conditioned (undisputed
  invoices paid within 30 days on quarterly average). A retrospective
  annual-volume rebate with no call input; recorded, never applied.
- §1.2 late-payment interest 12% and 55 SEK collection fee: invoicing terms,
  not call costs.

### 11.6 Encode adjudication (v0.4.2)

Encoded: §4.1 full handling 1 679/unit; §4.3 OOG +100% on the throughput
rates (the existing oog_units input); §5.1 cargo due 482/full; §5.2 ISPS
73/full; §5.3 IMDG/reefer 401/unit (the existing reefer_units and
dangerous_goods_units inputs); §7 storage as scenario rules over
user-entered days at the verbatim free time and bands. The v0.4.0 gap
notices for terminal handling and the container cargo due are replaced by
these rules, re-baselined with attribution.

Not encoded (recorded): §4.2 empty handling 1 235/unit — the call model
carries no empty-unit count input (an input-less rule would be dead data;
a future pass adding the input prices it); every §11.5 item above.
