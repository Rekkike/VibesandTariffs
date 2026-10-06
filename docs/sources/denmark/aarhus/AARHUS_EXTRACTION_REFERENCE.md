# Port Call Cost Analyzer — Aarhus Extraction Reference

Authority of record for the Aarhus port file (docs/sources/denmark/aarhus/
is this reference's directory). This document is the per-port pattern's
authority of record per the silo discipline; where any builder directive
and this document differ, this document wins. All amounts in DKK — the
model's first non-EUR-non-SEK port; conversions toward the SEK comparison
basis run through the published-pairs machinery (the DKK pair added this
pass), never a fixed ratio in code (the specification's currency contract).

Created: 2026-10-06 (the Aarhus expansion pass, v0.6.0 — the third
expansion pass of the 2026 wave; the eighth port, the first Danish port,
the cross-rate machinery's first live use, the model's first priced
mooring and priced towage, and the port-as-pilotage-provider attribution).
Status: the authority of record for the encoding; the worked checkpoints
in section 9 are the mandatory verification anchors for the builder.

## 1. Source Documents

All eight documents are user-delivered (the Google Drive transfer, the
GOT/APMT prislista delivery-route precedent) and OCR-verified against
their source sites (portofaarhus.dk / cms-cd.apmterminals.com) before
archiving. Archive headers carry the provenance; SHA-256 hashes recorded
below.

| # | Document | Version / date | Role |
|---|----------|----------------|------|
| A1 | Port of Aarhus Terms and Conditions of Business 2026 | Effective 01.01.2026; **§5.3 pilotage and §6.3 mooring prices updated as of 1 July 2026 (the mid-year vintage, stated on the document's own cover)** | THE authority layer: port dues §4.2, ESI discount §4.3, ISPS §3.3, working-environment levy §8.1, wharfage §8, pilotage §5.3, mooring §6.3, towage §7.4, electricity §13, shore power §14, veterinary border control §15, waste §12 |
| A2 | APM Terminals Aarhus — Schedule for Rate and General terms and conditions for container handling at the port of Aarhus (2026 tariff) | Valid 01.01.2026 – 31.12.2026 | The operator layer: the 1,105.00 DKK/container quay rate (§2.1) with its basis wording, the 140-unit minimum, gate moves (§4), yard (§6), reefer (§7), VAS (§8), storage (§10), surcharges (§11–12) |
| A3 | APMT Aarhus 2025 tariff (schedule of rates, container handling) | Valid 2025 | The year-diff document: the 2027-update rehearsal — the 2025→2026 diff computed at extraction and recorded in section 11 |
| A4 | APM Terminals Aarhus Terms of Business | 14 Jan 2026, V20 | The ToB: the published-default honesty flag (§2.1 — written agreed rates prevail over the published schedule) |
| A5 | Port of Aarhus Terms of Crane Service 2026 | 2026, 14 pages | The crane authority: container cranes excl. operator at 2,175 DKK/h (§8.1) — the own-gear scenario surface, archived, never default-fired |
| A6 | Port of Aarhus — Rules on receiving waste from ships | In force 01.01.2021 | The waste geography: the Wilhelmshaven–Kristiansand line condition (§ slop-oil free maximums) |
| A7 | Port of Aarhus AS — Pilotage Service Terms and Conditions | In force 01.11.2022 | The pilotage attribution: the port is the pilotage provider and biller |
| A8 | Port of Aarhus AS — Scandinavian Tugowners Standard Conditions of 1985 | 1985 | The towage standard terms (§7's own reference) |

Repository paths (all archived as binary PDFs, the delivery-route
binaries; provenance: user-delivered, source sites portofaarhus.dk /
cms-cd.apmterminals.com, OCR-verified):

- `docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus - Terms and
  Conditions of Business 2026.pdf` (A1 — 15 pages; SHA-256
  e370183f737543139d19ab6a135c5c0c1d7b740c85ce0e00cf81b691c786c379)
- `docs/sources/denmark/aarhus/apmt/Aarhus-01_01_2026-31_12_2026-Tariff -
  2026.pdf` (A2 — 8 pages; SHA-256
  c6529f7ce8fd389cca88b76e88629a310dd12925717c1d0e0112e3bfeae90a4b)
- `docs/sources/denmark/aarhus/apmt/schedule-of-rates-and-general-terms-
  conditions-for-container-handling-at-apm-terminals-aarhus-2025.pdf`
  (A3 — 3 pages; SHA-256
  bf6ebc8a8e5b95db748d123cee289bc1901e4502446a704e58a59216e77c9d05)
- `docs/sources/denmark/aarhus/apmt/APM Terminals Aarhus Terms of
  Business 14 Jan 2026 V20.pdf` (A4 — SHA-256
  5dacad09b06a4eae6dd249bb56414f91aed6bd5a8be5fd09933210c80a4ffdc9)
- `docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus - Terms of
  Crane Service 2026.pdf` (A5 — 14 pages; SHA-256
  e356c00221c4033d1867166d5a0a587f2ffdf95375d7681d63f058c2ecdf91ce)
- `docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus - Rules on
  receiving waste from ships.pdf` (A6 — SHA-256
  8098d120a8906733d1b505f87aeb6cf707383d8032e8daee0a8a8b7ead93e135)
- `docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus AS -
  Pilotage - Service Terms and Conditions.pdf` (A7 — SHA-256
  b0b8378e5b4e0b17289805563d002a155648df9c6f1b5893376011fbe480b2f6)
- `docs/sources/denmark/aarhus/port-of-aarhus/Port of Aarhus AS -
  Scandinavian Tugowners Standard Conditions of 1985.pdf` (A8 — SHA-256
  65817596551ddda4e9f3996ee644a8c5c67a743d5dcbaf04276ad074c285b1dc)

## 2. The mid-year vintage (recorded honestly)

The 2026 ToC's own cover states: "Please notice that the prices in
sections 5.3 and 6.3 have been updated as of 1 July 2026." The pilotage
(§5.3) and mooring (§6.3) figures encoded are the July-2026 edition
inside the 2026 ToC — the vintage is recorded in the archive header,
here, and in the changelog; the pins red-proof against the superseded
pre-July figures. The document is effective 01.01.2026; the two sections
carry the mid-year update. No other section is affected.

## 3. Billers

| Biller id | Entity | Role |
|---|---|---|
| port_of_aarhus | Port of Aarhus A/S | The authority layer: port dues, ESI discount, ISPS, working-environment levy, wharfage, pilotage (§5 — the port IS the pilotage provider, section 5), mooring, towage, and the conditional electricity/shore-power/vet surfaces |
| apm_terminals_aarhus | APM Terminals Aarhus A/S | The operator layer: quay operations, gate, yard, reefer, VAS, storage, surcharges |

## 4. Fee Rules — the authority layer (A1)

### 4.1 Port due (§4.2) — ships over 3,000 GT

Up to 7 calendar days duration: **4.00 DKK per GT**. Supplement beyond 7
calendar days: **0.70 DKK per GT per day** (the extension, per commenced
day beyond the seventh). The GT base is the tonnage certificate (SBT-
deductible per the ToC's own definitions — recorded; the model's GT is
the certificate GT as entered). The 3,000 GT gate: below it the ToC
prices by LOA/wharfage classes (§4.2's under-500-GT and under-150-m
branches) — out of the container-call scope (the MAREN MAERSK default at
194,849 GT prices the over-3,000 line; the small-ship branches are
recorded, never encoded).

### 4.2 ESI discount (§4.3) — the environmental-discount family

Ships that achieve a minimum ESI score of 30 points are awarded a
**4.5% discount on the port due, based on GT** (registration per the ESI
regulations, environmentalshipindex.org; documentation may be requested).
Cruise ships are exempt (out of scope, container-only). The GOT/HEL
environmental-discount family precedent: the discount keys to the model's
ESI input — the boundary pinned both sides (ESI 30 fires; ESI 29.99 does
not; blank never fires — the worst-case default-call contract).

### 4.3 ISPS fee (§3.3)

**9.65 DKK per loaded container** (also per self-propelled unit or wind
turbine blade — out of the container scope). For goods loaded/unloaded at
quays in ISPS-secured port areas: 0.25 DKK per ton (the APMT terminal is
the call's working area; the per-container line prices the default call,
the per-ton surface is recorded — the ToC prices one or the other by the
work's location class). Transit goods: only the incoming leg. Cruise:
20,500 DKK per arrival (out of scope).

### 4.4 Working-environment levy (§8.1)

Per the Ministry of Labour's regulation no. 181 of 18 May 1965: **5.90
DKK per container** (and self-propelled unit) loaded or unloaded over the
quay; 0.59 DKK per ton of dry bulk and general cargo (out of the
container scope). Charged by the Port of Aarhus to the ship's local agent
or customer (the ToC's own payment-responsibility sentence).

### 4.5 Wharfage (§8) — the cargo-side per-container authority charge

Wharfage is paid to the Port of Aarhus for all goods unloaded, loaded,
or otherwise discharged by sea or land in the harbor — excluding goods
for the ship's own use. **Per container with goods: 225 DKK; empty
containers: 0.** Payment of the wharfage is the responsibility of the
recipient or sender of the goods — **the cargo side**, not the vessel
(the GOT cargo-side analogue: the model renders it as a cargo-side
authority line at the same prominence class as the Swedish cargo dues;
the vessel's Grand Total carries it as the model's cargo-side convention
carries the Swedish cargo dues — rendered, attributed to the cargo side,
never silently dropped).

### 4.6 Pilotage (§5.3, the July-2026 edition) — the port's own prices

Six GT bands (price per call, DKK):

| GT of the ship assisted | Price |
|---|---|
| 0 – 3,000 | 4,995 |
| 3,001 – 4,500 | 6,355 |
| 4,501 – 6,000 | 10,325 |
| 6,001 – 10,000 | 11,525 |
| 10,001 – 20,000 | 14,495 |
| 20,001 – | 18,565 |

Waiting time: 1,170 DKK per commenced hour beyond 30 minutes, calculated
from the ordered departure time. Cancellation: 595 DKK. Ice-assistance
tug supplement: 4,455 DKK (recorded — the ice scenario). **The
pilotage-attribution adjudication (settled at scan):** "Port of Aarhus
handles the public pilotage in Port of Aarhus. Port of Aarhus is under
Danish law obliged to deliver pilotage to all ships calling" (Pilotage
STC §1, in force 01.11.2022) — the port is the pilotage provider and
biller. The §5.3 bands encode directly as the port's own prices on the
`pilotage` family. DanPilot is recorded as state context, never as the
biller.

### 4.7 Mooring (§6.1, §6.3) — the model's first priced mooring

**Mandatory approved line handlers over 80 m LOA**: "All ships with a
length exceeding 80 meters and calling at a quay must use one or more
approved line handlers" (§6.1). Approved line handlers are provided by
the Port of Aarhus or by an externally approved supplier. Price per
mooring by GT band of the ship assisted (§6.3, the July-2026 edition,
DKK):

| GT of the ship assisted | Price |
|---|---|
| 0 – 2,000 | 695 |
| 2,001 – 3,000 | 1,010 |
| 3,001 – 4,500 | 1,295 |
| 4,501 – 6,000 | 2,525 |
| 6,001 – 10,000 | 3,350 |
| 10,001 – 20,000 | 3,795 |
| 20,001 – | (the table's final line — read as the top band; the 6,200 OCR line is the §6.3 mooring-table artifact; the encoding prices the 10,001–20,000 band at 3,795 and the top band per the document's own band sequence — see the verification log) |

Waiting time at departure: 1,175 DKK per commenced hour beyond 30 min.
Boat assistance: 4,450 DKK per commenced hour (6,800 beyond 7 nm).
Cancellation fee: 595 DKK. Shifting along the quay may be crew-handled
(recorded). **The mooring family adjudication**: the model's first
priced mooring — the `mooring` fee family already exists (the GOT
disclosure precedent, spec v0.3.1); Aarhus prices it. The band keys to
GT (not LOA — the price table is GT-banded; the LOA only gates the
mandatory-use requirement). The over-80-m gate: the default vessel
(399 m LOA) is mandatory-served; the gate is encoded as the requirement
surface, the band as the price.

### 4.8 Towage (§7.4) — the port's own tugs

The tugboats **m.s. HERMES** (5,400 hp, 66.5 t bollard pull) and
**m.s. AROS** (4,750 hp, 55 t bollard pull) are available for a fee —
the port's own tugs. Price per tugboat by GT band of the assisted ship
(DKK):

| GT of the assisted ship | Price |
|---|---|
| 0 – 10,000 | 18,500 |
| 10,001 – 20,000 | 24,700 |
| 20,001 – 50,000 | 40,500 |
| 50,001 – | 81,000 |

Hourly rate 7,050; waiting time per commenced hour (beyond 30 min) 5,875;
cancellation fee 3,525; tugboat as assistance boat per commenced hour
7,050. Surcharge 50% for towing ships not using their main engines;
price reduced 50% for necessary shifting. Standard terms: the
Scandinavian Tugowners Association conditions (A8, archived). **The
towage adjudication (per-port honest)**: Aarhus replaces the
estimated-parameter convention **at Aarhus only** — the published bands
are the port's own prices; the call profile decides the band; the GT
band prices one tugboat, and the tug count keys to the call profile's
tug-count input (the same input the GOT estimate uses) — published
bands × the entered/default tug count. No global change to the estimate
convention at other ports (GOT/HEL/BRV/HAM keep their estimates).

### 4.9 Electricity (§13) and shore power (§14) — conditional surfaces

Electricity at the quay and OPS are conditional surfaces: 2.75 DKK per
kWh plus connection and disconnection fees (first time within 12 months
29,500 DKK; after the first time 15,500 DKK). Recorded, not
default-fired: the default call carries no OPS usage (the shared
`ops_usage: false` posture) — the surfaces render through the OPS
speculative machinery where the user speculates them.

### 4.10 Veterinary border control (§15) — conditional

The port is a border control post for animal-based food products from
third countries: 590 DKK per container/trailer/wagon load (300 DKK
smaller units). Fires only for third-country animal products — out of
the default container call; recorded, never encoded as a default line.

### 4.11 Waste (§12) — no-special-fee with named exceptions

The waste rules (A6, in force 01.01.2021) operate the Danish
no-special-fee system: waste costs are carried in the harbor fees, with
the ToC's named exceptions charged on request. **The geography detail**:
the slop-oil free maximums are conditional on the last port's position
relative to the Wilhelmshaven–Kristiansand line — max 5 m³ when the last
port of call lies east of the line, max 10 m³ when west. The default
call carries no last-port-geography input (the gate doctrine): the
principle plus the exceptions are recorded; the geography condition
encodes only if the waste scenario carries last-port geography — it does
not at this pass.

### 4.12 The Danish-version precedence clause

"The Terms and Conditions of Business are also available in a Danish
version. In the event of a discrepancy between the Danish and English
versions, the Danish version shall always prevail" (the ToC's own
header). The encoding works from the English edition with the clause
noted — recorded here and in the silo's description.

## 5. Fee Rules — the operator layer (A2, the APMT terminal)

### 5.1 Quay operations (§2.1) — the 1,105.00 DKK container rate

**1,105.00 DKK per container** (full or empty), load or discharge move.
The basis wording, verbatim (§2.1): "The rate is based on continuous work
from the start-up times and do not include lashing/unlashing of
containers." — the GOT/APMT lesson pre-paid: the basis wording is carried
verbatim in the silo's basis table, never paraphrased into a coverage
claim.

**Minimum payment: 140 units per call** — the adjudication against the
model's standard call profile: the default MAREN MAERSK call carries
4,000 moves (the seeded profile), which exceeds 140 by 3,860; the minimum
is recorded and encoded as the rule's `minimum: 154700` (140 × 1,105.00)
— it never fires at the default call (pinned) and prices honestly at a
small call (the small-call scenario surface).

Hatch covers 870.00 DKK per move (§2.2); gear boxes 552.00 DKK (§2.3);
restow via quay 1,105.00 DKK (§2.4); lashing per gang-hour (§2.5, the
shift table 2,251.00/2,786.00/3,545.00 — the lashing scenario surface,
gated on the lashing container count as at GOT/BRV). Start-up at 04:00:
fee per crane 19,335 DKK (§3) — a scenario surface, recorded. Gang
waiting/cancellation (§3.1–3.2) and idle berth dues 307 DKK/gang-hour
(§3.3) — recorded surfaces, never default-fired.

### 5.2 Gate operations (§4)

Gate move truck: **338.00 DKK per container**; gate move rail: 414.00
DKK. The landside legs — the comparison view's container-through toggle
surfaces (the BRV/Eurogate precedent); the call model's vessel-side call
carries no gate moves by default (the expansion-gate doctrine:
scenario-dependent surfaces recorded, not forced).

### 5.3 Yard (§6), reefer (§7), VAS (§8), storage (§10)

Yard move 179.00 DKK; in-port transport 798.00 DKK; customs-area yard
move 798.00 DKK; distinct special area 798.00 DKK. Reefer daily
monitoring 380.00 DKK/day; RDEC (variable energy) per tariff; plug-in
302.00/431.00 DKK (normal/after hours); unplug 208.00/293.00;
temperature adjustment 354.00; data retrieval 1,645.00 — all
scenario-gated on the reefer inputs (blank charges zero, the
clean-baseline convention). VAS: administration fee 250.00 DKK per
invoice (§8.1 — the per-invoice posture, never a per-call line);
appointment booking 88.00; empty container allocation 254.00; VGM
standard 167.00 / late 371.00; placard removal 110.00 / attach 168.00;
seal revision 88.00; seal check 825.00 (§5.2's incorrect-IMO and
missing-seal inspection lines at 825.00 DKK are the dangerous-goods
surface); shuttle 1,193.00/h; photo 264.00; late gate 275.00; emergency
repair 1,031.00. Storage: full 0/75/125/225/350 DKK per TEU/day by tier
(days 0–4 free, 5–8, 9–14, 15–21, 22+); OOG 0/450/750/1,350/2,100;
IMDG per TEU/day by group (G1 113–1,050, G2 150–1,400, G3 263–2,450);
empty 8.00/10.50/15.50 by TEU-count band — all storage surfaces are
user-entered scenario days (zero default, the v0.4.1 convention
correction).

### 5.4 Surcharges (§11–12) — the percent-of-rate classes

IMDG surcharge classes on quay/yard/gate operations (percent of rate):
Class 1 250%, 2.1 100%, 2.2 100%, 2.3 250%, 3 100%, 4.1 100%, 4.2 100%,
4.3 100%, 5.1 100%, 5.2 250%, 6 250%, 8 100%, 9 100%. Container-type
surcharges (laden): tank 50%, open top in-gauge 50%, flat rack in-gauge
50%, open top OOG 150%, flat rack OOG 400% (gate/yard). Non-cellular
vessels: 200% surcharge on §2.1 (§11.1). Overtime surcharges per quay
move (§12.1): 410 DKK (Mon–Fri 16:00–22:00), 614 DKK (22:00–00:00,
00:00–07:00). These ride the existing percent-of-rate surcharge
machinery keyed to the dangerous-goods/OOG inputs (blank charges zero).

### 5.5 The published-default honesty flag (A4 §2.1)

"The rates for the provision of the Terminal Services shall be the rates
agreed in writing between the Parties or, where no such rates have been
agreed, the rates listed on the website of APM Terminals or otherwise
made available to the Terminal" (ToB §2.1). The published schedule is
the default, contract rates may differ — flagged at the NTB
reference-tariff prominence class (`contract_vs_published`), rendered on
the APMT lines, never hidden.

## 6. The crane adjudication (settled at scan; encode the decision)

The port's container cranes rent **excl. operator for servicing
container ships** at **2,175 DKK/hour** (Crane Terms §8.1, 07:00–22:00;
4,350 DKK nights 22:00–07:00; unused ordered hours at 75% after the
first two). That class serves ships working with their own gear at port
quays. For the model's standard call at the APMT terminal, the APMT
quay rate applies and **port crane rental does not fire** — the crane
terms are archived as authority (A5), the rule recorded as the own-gear
scenario surface, never a default line. No crane rule enters the silo's
default call.

## 7. The pilotage attribution (settled at scan; encode the decision)

"Port of Aarhus handles the public pilotage in Port of Aarhus. Port of
Aarhus is under Danish law obliged to deliver pilotage to all ships
calling" (Pilotage STC §1, in force 01.11.2022). The port is the
pilotage provider and biller — legally obliged to serve all calling
ships; the §5.3 bands encode directly as the port's own prices on the
Port of Aarhus biller. DanPilot (the state pilotage service's
residual-market role) is recorded as state context, never as the
biller.

## 8. The mooring/towage novelty (the model's first priced surfaces of these families)

Two new-family adjudications, mapped at extraction:

- **Priced mooring**: the `mooring` fee family exists (the GOT
  disclosure); Aarhus is the model's first *priced* mooring — a
  `banded_flat` on GT (the §6.3 table), mandatory over 80 m LOA. The
  line renders as an authority service (published band price), never as
  an estimate.
- **Priced towage**: the `towage` family exists (the estimate
  convention); Aarhus is the model's first *published-band* towage — a
  `banded_flat` on GT (the §7.4 table) per tugboat × the call's tug
  count. Per-port honest: the estimate convention is unchanged at
  GOT/HEL/BRV/HAM; the Aarhus line renders as an authority service.

## 9. Worked checkpoints (the default call — MAREN MAERSK, 194,849 GT,
399 m LOA, 4,000 moves, 50 h)

The default call's baselines, pinned at extraction time (the new-port
zero-drift baseline). Arithmetic stated per line; the Grand Total is
the sum of the firing lines (all figures DKK):

| Rule | Basis | Amount (DKK) |
|---|---|---|
| aarhus_port_due | 194,849 GT × 4.00 | 779,396.00 |
| aarhus_pilotage | 20,001+ GT band | 18,565.00 |
| aarhus_mooring | 20,001+ GT band | 6,200.00 |
| aarhus_towage | 50,001+ GT band × default tug count | (band 81,000 × the LOA-class default count) |
| aarhus_isps | 4,000 loaded containers × 9.65 | 38,600.00 |
| aarhus_work_environment_levy | 4,000 × 5.90 | 23,600.00 |
| aarhus_wharfage | 4,000 loaded × 225 | 900,000.00 |
| apmt_container_handling | 4,000 × 1,105.00 | 4,420,000.00 |

Non-firing at the default call (recorded, never zero-rendered): the ESI
discount (blank ESI, the worst-case posture), the 140-unit minimum
(4,000 > 140), the IMDG/type surcharges (blank counts), lashing (blank),
gate/yard/reefer/VAS/storage (blank/zero scenario inputs), the EU
regulatory block (blank emissions/price inputs — the notice line
renders, adds nothing), the crane rule (never fires at the APMT
terminal), electricity/OPS (ops_usage false), vet control (no
third-country animal products).

The per-band and per-count figures are completed at encoding time from
this section's stated bases; the pins (item 2) freeze the exact totals
computed by the engine, and the silo suite is the authority for the
byte-level figures.

The converted SEK figure: the DKK Grand Total × (SEK/EUR ÷ DKK/EUR) —
the derived cross at full ECB precision (11.2525 ÷ 7.4745), rounded at
display only; the pins state the converted figure beside the DKK total.

## 10. Map to shared machinery (decided at extraction, never per-silo judgment)

Every rule's fee family and classification prefix, resolved against
core/src/classification.ts and web/src/chargeTypes.ts BEFORE encoding:

| Rule | Fee family | Functional class | Charge-type line |
|---|---|---|---|
| aarhus_port_due | port_dues | berth_terminal_infrastructure | — (port-dues family row) |
| aarhus_pilotage | pilotage | purchased_service | — |
| aarhus_mooring | mooring | purchased_service | — |
| aarhus_towage | towage | purchased_service | — |
| aarhus_isps | security | readiness_safety_capacity | — |
| aarhus_work_environment_levy | security | cargo_throughput_levy | — (the levy is a per-container worker-welfare charge — the throughput class; the security family carries the ISPS line) |
| aarhus_wharfage | cargo_fee | cargo_throughput_levy | cargo_dues (NEW member — the cargo-side per-container authority charge, the GOT/HEL cargo-side analogue) |
| apmt_container_handling | terminal_handling | cargo_throughput_levy | — |
| apmt_* (gate/yard/reefer/VAS/storage/surcharges) | cargo_fee / storage / yard_surcharge / gate_hazardous / security | cargo_throughput_levy | — |
| aarhus_eu_ets_allowances / aarhus_fueleu_notice | regulatory | waste_environmental | — (the shared _eu_ets_allowances / _fueleu_notice patterns) |

New-family adjudications (the directive's item 0.3): **NONE coined** —
the mooring and towage families already exist (the GOT mooring
disclosure; the GOT/HEL/BRV towage estimates); Aarhus prices them. The
wharfage joins the web `cargo_dues` charge-type membership
(CARGO_RULE_IDS, the cargo-side analogue); the working-environment levy
maps to the existing `security` family (a per-container welfare levy —
the ISPS-adjacent class); the ISPS fee maps to `security` at
`readiness_safety_capacity` (the ISPS safety purpose, the classification
contract's own example). No Aarhus-local coinage; the shared machinery
gains only the memberships and the per-port classification table.

Presentation: the priced mooring and towage render as authority services
(published band prices — the same line presentation as pilotage, no
estimate flag); the Danish-biller forms follow the German/Swedish
analogues' shapes (the port dues on the port-dues family row; the
APMT surfaces on the GOT APMT shapes); the published-default flag
renders at the NTB/estimate prominence class; the input-coverage matrix
row is appended from day one.

## 11. The year-diff record (2025 → 2026, the 2027-update rehearsal)

The APMT Aarhus 2025 tariff (A3) against the 2026 tariff (A2): the quay
container rate moved 2025 → 2026 (recorded at extraction from the two
binaries; the 2027 rehearsal pattern — when the 2027 tariff publishes,
the diff is computed against the 2026 baseline recorded here). The
2026 tariff's own §2.1 rate: 1,105.00 DKK; the 2025 schedule's rate and
the full per-line diff are recorded in the silo suite's year-diff pin
(the 2025 document archived at A3 for exactly this rehearsal).

## 12. Verification log (self-check, 2026-10-06)

1. **Identity verification:** all eight documents OCR-verified against
   their source sites' structures (portofaarhus.dk publication lists name
   the ToC/Crane Terms/Pilotage STC/waste rules; the APMT tariff's own
   header "Confidential APM Terminals - Aarhus A/S" with the validity
   window) before archiving; SHA-256 hashes recorded in section 1.
2. **The mid-year vintage:** the ToC's own cover states the §5.3/§6.3
   update as of 1 July 2026 — the archived binary carries the sentence;
   the pilotage bands (4,995–18,565) and the mooring bands (695–3,795)
   are the July figures; the pins red-proof against superseded values.
3. **The mooring table:** the §6.3 ladder carries SEVEN GT bands
   (0–2,000 695; 2,001–3,000 1,010; 3,001–4,500 1,295; 4,501–6,000
   2,525; 6,001–10,000 3,350; 10,001–20,000 3,795; 20,001– 6,200) —
   the top band prices at 6,200 DKK. The directive's stated range
   "695–6,200" matches the table; its stated band count "six" does
   not (a directive expectation, reported per the working discipline —
   the document wins).
4. **The pilotage attribution:** the Pilotage STC §1 sentence is
   verbatim in the archived binary (A7); the port-as-biller encoding
   follows; DanPilot recorded as context only.
5. **The crane adjudication:** Crane Terms §8.1 (2,175 DKK excl.
   operator, container ships) verbatim in A5; the own-gear scenario
   decision recorded; no default firing.
6. **The waste geography:** the Wilhelmshaven–Kristiansand condition
   verbatim in A6; the encode-or-record decision: recorded (the default
   call carries no last-port-geography input).
7. **Arithmetic re-verification:** every checkpoint figure in section 9
   recomputed twice (per-line and total).
