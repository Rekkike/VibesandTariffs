# Stockholm Norvik Extraction Reference — Port Call Cost Analyzer

Authority of record for the Stockholm Norvik build (the Swedish domestic
expansion pass, v0.4.0). Where any builder directive conflicts with this
document, this document prevails. All amounts are in SEK; the Ports of
Stockholm document states VAT is added on all charges per Swedish law "where
not otherwise stated" — amounts are treated as ex-VAT throughout, consistent
with the model's conventions.

Extraction date: 2026-10-02. Two documents, one port entry, mirroring how the
Hamburg reference separates HPA from the terminal operators: the
port-authority layer (Ports of Stockholm) and the terminal layer (Hutchison
Ports Sweden AB at the Norvik container terminal).

---

## 1. Sources

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| S1 | Ports of Stockholm, "Prices and terms 2026" (25 pages, English; cover version 2026-06-17; issued in Swedish with English translation, Swedish prevails) | Stockholms Hamnar / Ports of Stockholm | Yes | `docs/sources/sweden/norvik/port-authority/prices-and-terms-2026.pdf` |
| S2 | Hutchison Ports Sweden AB, "Price List 2026 — Cargo handling and storage of goods in Stockholm Norvik Port" (10 pages, English) | Hutchison Ports Sweden AB | Yes | `docs/sources/sweden/norvik/hutchison/price-list-2026.pdf` |

### S1 — Ports of Stockholm prices and terms 2026

- Fetch URL: https://www.portsofstockholm.com/media/4p2ociwz/ports-of-stockholm-prices-and-terms-2026_version-2026-09-29.pdf
  (the fetch URL's filename carries version 2026-09-29; the document's own
  cover states "Version 2026-06-17" — both recorded here; the cover version
  governs the vintage pin.)
- Tariff page of record: https://www.portsofstockholm.com/access-services/prices-for-servicestariffs/
- Fetch date: 2026-10-02
- SHA-256: `aba23e206f68d6667e1e44a748cd90b3992bb42bc86ec0c64a260f58130d8619`
- Identity verified: four ports on the cover (Port of Stockholm, Port of
  Kapellskär, Port of Nynäshamn, Stockholm Norvik Port), Version 2026-06-17,
  25 pages, English. Reservation clause (p.5): "All prices stated are valid
  from 1 January until further notice, however at the latest until 31
  December in the year of issue. Ports of Stockholm reserves the right to
  revise price lists at any time, and current price lists are always
  available on www.portsofstockholm.com" — the archived checksum pins the
  vintage. Match — archived as expected.
- Scope adjudication (the port-silo discipline): one document serves one
  port entry. This extraction takes the Norvik sections only: §3.1 vessel
  dues (the basic fee is port-wide; Norvik's calls price it), §3.2.3
  container cargo dues (the Stockholm Norvik rows), §3.4 environmental
  rebates (port-wide mechanism on the basic fee), §3.5.2 Norvik lay-days,
  §3.8 waste fees (the Norvik included-quantities footnote), and the
  Norvik-relevant harbour services. Kapellskär/Nynäshamn are potential
  future additions riding the same archived source, not this pass.

### S2 — Hutchison Ports Sweden AB price list 2026

- Fetch URL: https://hutchisonportsstockholm.se/wp-content/uploads/2026/06/Price-List-2026.pdf
  (the plain-PDF URL served the document to a non-browser client on both
  2026-10-01 and 2026-10-02; no corporate-site interstitial was
  encountered — the standing plain-PDF retry was not needed.)
- Fetch date: 2026-10-02
- SHA-256: `65b33117ae7bb112636245b8a44716530005bc1ee675d2bfe853c674f3e5e087`
- Identity verified: issuer Hutchison Ports Sweden AB (Norvikvägen 18, SE-
  149 45 Nynäshamn; VAT SE556773229101; registered office Stockholm),
  "Price List 2026", "The price list is valid from June 1st, 2026, until
  further notice", scope "Cargo handling and storage of goods in Stockholm
  Norvik Port", 10 pages, English. Reservation: "The current price list is
  available at www.hutchisonportsstockholm.se." Match — archived as
  expected.

## 2. Charging structure (billers)

Stockholm Norvik presents the split Hamburg did: a port-authority layer
(Stockholms Hamnar — vessel dues, cargo dues, waste, lay-days) and a
separate terminal operator (Hutchison Ports Sweden AB, the container
terminal concessionaire — quay-side handling, storage, ancillaries). Two
billers, two documents, one port entry.

1. **Ports of Stockholm** — vessel dues (basic fee), container cargo dues
   (Norvik rows), waste fees (Norvik included quantities), lay-days tariff,
   environmental rebates on the basic fee.
2. **Hutchison Ports Sweden AB** — quay-side container handling, restows,
   hatch lids, reefer, weighing, storage, berthing charge (lay-by berth),
   ISPS security charge, documentation, seals, decals.
3. **Sjöfartsverket** — national fairway dues and pilotage; own
   transcription with own citations (port-silo discipline).
4. **Mooring/boatmen** — S1 §4.1 publishes mooring/unmooring per assignment
   by vessel length and time band (Port of Stockholm rows; the Norvik call
   uses the quay assignment rows). Encoded as published data at this port —
   not a service gap here; the published figures are transcribed.

## 3. Port-authority fee rules (source S1)

### 3.1 Vessel dues (§3.1, p.7)

- Basic fee: 5.17 SEK/GT.
- "When calling quay not belonging to Ports of Stockholm or when exempted
  for waste delivery" (footnote *2): 4.65 SEK/GT. Adjudication: the reduced
  rate is for non-PoS-quay calls and waste-exempt vessels — neither is the
  container call at Norvik (a PoS quay, waste not exempt); the basic 5.17
  is the container-call rate. The reduced rate is recorded, not encoded as
  a default.
- Minimum charge: 2,585 SEK/call.
- GT basis: Lloyd's Register 1969 measurement; "calculated on a minimum of
  500 GT" (footnote *1) — the minimum-GT floor recorded in the rule's basis.

### 3.2 Container cargo dues (§3.2.3, p.8)

- Stockholm Norvik Loaded container < 40': 331 SEK/unit.
- Stockholm Norvik Loaded container ≥ 40': 424 SEK/unit.
- Footnote *5: "Fee for each loaded container being loaded or discharged."
- Adjudication (size mapping): the model's four box counts map as 20' →
  < 40' (331), 40' and 45' → ≥ 40' (424) — the model's container_gt20ft
  field carries the 40-and-above boxes. The "loaded" qualifier: the fee
  applies to each loaded container; the model's call counts every box in
  the four fields as the call's loaded/discharged units (the container-call
  convention; empty repositioning is not representable in the model — a
  stated limitation, recorded in the basis string, never silently
  resolved).
- The Stockholm/Nynäshamn/Kapellskär 505 SEK/cont row is out of scope for
  this port entry (recorded; the silo discipline).

### 3.3 Environmental rebates (§3.4, p.10)

- CSI points / ESI points banded per-GT rebate table on the basic fee:
  15 bands from CSI 45-47.9 / ESI 50-52.9 (-0.01 SEK/GT) to CSI 87-90.0 /
  ESI 97-100.0 (-0.19 SEK/GT).
- "The maximum environmental rebate may never exceed 10 percent of the
  port fees." Both indexes: the vessel owner chooses one.
- Encoding: a banded per-GT rebate adjustment keyed on the ESI score input
  (the model's existing ESI surface); the CSI-points alternative is
  recorded in the rule description. The 10-percent cap is encoded as the
  adjustment's cap. This is NOT the HEL/GOT 10-percent discount shape —
  a per-GT rebate table with a cap; recorded honestly; the equivalence
  annotation does not extend this pass.

### 3.4 Lay-days tariff (§3.5.2, p.11)

- Norvik: a lay-day tariff applies when a vessel is docked more than 48
  hours at a PoS quay in total before loading/unloading starts and after
  it is completed; "payable per started 24 hour time period and is 25% of
  the current harbour dues for vessels" — 25% of the vessel dues
  (5.17 SEK/GT → 1.2925 SEK/GT) per commenced 24-hour period beyond the
  48-hour allowance. The per_commenced_period shape; the default call's
  50-hour lay time exceeds 48 hours by 2 hours → one commenced period
  fires in the default call (an honest consequence of the model's default
  vessel profile, computed, never hand-waved).

### 3.5 Waste fees (§3.8, p.12)

- Fixed waste fee: 30,000 SEK; rebate for ships < 20,000 GT or shortsea
  shipping: -15,000 SEK.
- Variable waste fee: 0.11 SEK/GT; rebate (per Waste instructions criteria):
  -0.06 SEK/GT.
- Sludge: 1,550 SEK/m³; scrubber waste 1,750 SEK/ton; sewage Stockholm
  27.90 SEK/m³ (Stockholm-only row, out of scope), other ports price upon
  request.
- Norvik footnote *1: "For ships at the quayside in Nynäshamn and Stockholm
  Norvik, 6 m³ sludge and 4 m³ sewage is included."
- Transport Agency pattern (§12 research): the tariff states "Waste fees
  are charged in accordance with the Swedish Transport Agency Regulations
  and General Advice (TSFS 2023:15) concerning delivery of waste from
  ships" — the pattern matches: a numbered TSFS regulation cited.
  Footnote *2 (the reduced fixed fee) mirrors the exemption-adjacent
  structure; the model encodes the < 20,000 GT rebate as the published
  condition (the shortsea definition is PoS's own determination — the
  model prices the GT condition only, and the shortsea alternative is
  recorded in the basis string).

### 3.6 Harbour services (§4, pp.14-15)

- Boatmen (mooring/unmooring), quay per assignment: vessel length < 130 m
  weekdays 07-16: 3,318 SEK; > 130 m: 6,637 SEK; evening/night 4,774 /
  9,549; weekend 7,793 / 15,588 SEK (mooring and unmooring priced equally).
  Encoded: the weekday daytime rows as the default assignment pair (the
  model carries no time-of-day input; the weekday-07-16 rate is the
  default with the posture recorded; a call's off-hours assignment is the
  user's scenario, not seeded).
- Stevedoring and handling charges (§4.3.1, Norvik rows): forklift 12 tons
  1,199 SEK/initiated hour; reachstacker < 10 tons Norvik 962 SEK/lift;
  containerlift loaded 832 SEK/lift; containerlift empty 416 SEK/lift;
  storage indoors Norvik 113 SEK/m²/day; labour 726 SEK/initiated hour
  (weekday). Ancillary-equipment rows — scenario surfaces, recorded; the
  container-call's quay-side handling is the Hutchison layer (S2), not
  these equipment-hire rows.

### 3.7 Out-of-scope S1 sections (recorded)

- §3.2.1 passenger/vehicle fees; §3.2.2 Stockholm goods-code table;
  §3.6 state ships; §3.7 quay storage (ferry/RoRo goods — "Goods/units
  that will be loaded or has been discharged from ferries/RoRo vessels":
  out of scope for the container call); §3.9 passing vessels; §3.10
  repair vessels; §3.11 Kapellskär service quays; §5 fresh water; §7
  inner-city quays; §8 lock dues.

## 4. Terminal fee rules (source S2)

### 4.1 Quay-side container handling (pp.4-5)

- Transshipment of container (not incl. storage): 1,523 kr.
- Export containers: ISO containers receiving container to stack including
  single lift to vessel: 2,012 kr.
- Import container: lifted from vessel, received into stack, and loaded to
  road transport: 2,012 kr.
- Restow via quay: 2,012 kr; restow on board: 985 kr.
- Adjudication (the container call): the export and import lines are the
  vessel-call handling charge (2,012 kr per unit — receiving plus the
  single lift to/from vessel; the import line's road-transport leg is part
  of the published unit rate, a basis note, not a separate figure). The
  default call prices each loaded/discharged unit at 2,012 kr via the
  export/import lines; transshipment (1,523) and restows are
  scenario/ancillary surfaces with their own counts (blank = no line).

### 4.2 Hatch lids / gear box (p.6)

- Hatch lids: 1,557 kr; gear box: 908 kr — the model's existing
  hatch_cover_count and gearbox_count inputs price these.

### 4.3 Reefer, weighing, washing (p.6)

- Reefer connection incl. temperature control: up to 20 ft 531 kr/day;
  over 20 ft 617 kr/day; PTI lift/transport 810 kr/unit; PTI electrical
  260 kr/day. Weighing: requested ≥ 6 h prior: 738 kr/unit; later: 2,313
  kr/unit; VGM material difference 564 kr + 2,231 kr. Washing 805 kr/unit.
  Scenario/ancillary surfaces; blank counts render no line.

### 4.4 Storage of containers or break bulk (p.7)

- Loaded storage, import and export, days after arrival until
  collected/loaded: Day 1-5: 0 kr/TEU/day; Day 6-7: 91 kr/TEU/day;
  Day 8 and above: 343 kr/TEU/day.
- Dangerous goods: Day 1-8: 99 kr/TEU/day; Day 9 and above: 425 kr/TEU/day.
- Empty storage: 46 kr/TEU/day. Frost-free storage: lift/transport 1,182
  kr/unit, rent 412 kr/TEU/day. Break bulk 143 kr/cbm/day.
- The Eurogate ch. 7 pattern applies: free time (5 days loaded), then
  banded per-TEU-day rates; storage is a scenario layer — the stay length
  is the user's input; zero days renders no line. The banded_by_time shape
  with per-TEU basis covers it.

### 4.5 Berthing charges (p.8)

- Lay-by berth utilized not joint to cargo OPS: 225 kr/LOA/day — a
  lay-by-berth scenario surface, not the cargo call; recorded, blank =
  no line.

### 4.6 ISPS security charge (p.10)

- 69 kr/unit, "apply for full units only" — per-unit security on loaded
  units; encoded per unit (the model's container_total basis).

### 4.7 Energy surcharge (p.10)

- "Laden Containers only (reviewed quarterly): Price on Application" —
  no published figure: GAP NOTICE, never invented. The line renders a
  gap notice naming the surcharge's existence and its Price-on-Application
  posture.

### 4.8 Out-of-scope S2 sections (recorded)

- Working hours, labour rates (stevedore 786 kr, foreman 1,179 kr),
  internal movements, gate services (express opening, re-delivery,
  rehandling, late gate-in), rail handling, land-side container handling
  (forklift at gate, change of empty, twistlocks, non-ISO chassis),
  bundling, documentation charges, access cards, photos, lashing,
  seals, decals — land-side and ancillary surfaces outside the
  vessel-call checkpoints; recorded here, never guessed.

## 5. Sjöfartsverket national rules

Referenced, never duplicated beyond the port's own transcription duty: the
class tables (vessel fee, readiness fee, pilotage), the frequency
discount, and the godsavgift are the shared national machinery (the
Gothenburg extraction §4 tables). Norvik's own YAML carries its own
transcription with its own citations.

## 6. Estimated parameters

| Parameter | Default | Basis |
|---|---|---|
| Towage cost | 60,000 SEK per tug-assist | No published Norvik tug tariff in either document; declared estimate |
| Default tugs | LOA < 150 m: 0; 150-250 m: 1; > 250 m: 2 | Spec 3.3 (defaults are data, user-overridable) |
| Default pilotage hours | < 150 m LOA: 2 h; 150-250 m: 3 h; > 250 m: 4 h | Declared estimate (the model's convention) |

## 7. Fee-family mapping

| Charge | fee_family |
|---|---|
| PoS vessel dues 5.17/GT (min 2,585) | port_dues |
| Environmental per-GT rebate table (capped 10%) | environmental_surcharge (adjustment on port dues) |
| Lay-days 25% of dues per commenced 24 h > 48 h | port_dues (lay-day basis) |
| Container cargo dues 331/424 per unit | port_dues (cargo-side) |
| Waste: fixed 30,000 (rebate -15,000 < 20,000 GT) + variable 0.11/GT (rebate -0.06) | waste |
| Boatmen mooring/unmooring per assignment | mooring (published at this port) |
| Hutchison quay-side handling 2,012/unit | terminal_handling |
| Hatch lids 1,557 / gear box 908 | terminal_handling |
| ISPS 69/unit | security |
| Storage bands (scenario) | storage |
| Energy surcharge (Price on Application) | gap notice |
| Sjöfartsverket vessel/readiness/godsavgift | fairway_dues / vessel_fee |
| Pilotage | pilotage |
| Towage estimate | towage |

## 8. Default call

The model's established convention: MAREN MAERSK's profile (4,000 moves,
60/40 split, balanced loaded/discharged). Default-call classes: vessel
dues 5.17 × GT (min 2,585); cargo dues 331 × 20' boxes + 424 × 40'+ boxes;
waste fixed 30,000 (no < 20,000 GT rebate at 194,849 GT) + variable 0.11 ×
GT (no criteria rebate by default); lay-days: 50 h lay time → one commenced
24-h period beyond 48 h → 25% of vessel dues; Hutchison handling 2,012 ×
4,000; ISPS 69 × units; boatmen 6,637 × 2 assignments (> 130 m, weekday);
the Sjöfartsverket national rules at the vessel's class; scenario inputs
blank.

## 9. Verification log

- 2026-10-02: S1 text-extracted in full (25 pages, no gaps); every §3
  figure transcribed from the extracted text and re-read against it.
- 2026-10-02: S2 text-extracted in full (10 pages, no gaps); every §4
  figure transcribed and re-read.
- 2026-10-02: identity of both documents verified before archiving;
  SHA-256 at §1; the Hutchison fetch needed no plain-PDF retry (the
  plain-PDF URL served directly).
- 2026-10-02: the energy-surcharge gap recorded (§4.7) — never invented;
  the lay-days default-call consequence computed (§3.4).

## 10. Not modeled (surface as notices, never guess)

- Hutchison energy surcharge — Price on Application (gap notice).
- Sewage at Norvik — "price upon request" for non-Stockholm ports.
- Scrubber waste 1,750 kr/ton — priced only on a user-supplied tonnage
  (blank = no line), per the actual-cost-family convention.
- PoS reduced vessel-dues rate (4.65) — non-PoS-quay / waste-exempt calls
  only; recorded, not a container-call default.
- Land-side, rail, gate, and documentation charges — outside vessel-call
  checkpoints.

## 11. Open decisions (defaults implemented, none blocking)

1. Lay-days trigger (§3.4): the 48-hour allowance spans before-ops and
   after-ops docked time; the model prices it from lay_time_hours (the
   whole stay) — the conservative reading; the basis string discloses the
   assumption.
2. Boatmen time-of-day: the weekday 07-16 rate is the default; off-hours
   assignments are user scenarios (no time-of-day input exists in the
   model).
