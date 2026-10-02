# Terminal Layer, Handling Basis, and Norrköping Liner Rider — Audit (v0.4.2)

Authority of record for the terminal-layer completion and handling-basis
comparability pass. Where any directive expectation conflicts with an
archived document, the archived document governs and the mismatch is
reported here — a directive's identifications are expectations verified at
extraction, never assumptions. Audit-first phase boundary: this document is
committed before any model work; implementation proceeds from it.

---

## 1. Yilport Gävle archive (item 0.1)

| Field | Value |
|---|---|
| Document | Yilport Gävle Container Terminal General Tariff, "2026 Tariff Rates", valid from 1 January 2026 to 31 December 2026 |
| Issuer | Yilport Gävle Container Terminal AB (Fredriksskansvägen 64, SE 806 47 Gävle, Sweden) |
| Repository path | `docs/sources/sweden/gavle/yilport-container-terminal-tariff-2026.pdf` |
| Fetch URL | https://yilport.com/en/images/PartDocuments/2026_yilport_ga_vle_container_terminal_tariff.pdf |
| Fetch date | 2026-10-01 |
| SHA-256 | `c80d0c673e1821b487cb1d1b42a457a39046089fd9dbe651cf853ce396e5d014` |
| Pages | 5 |
| Conditions | VAT excluded (§1.2 "VAT is excluded from all prices. The invoices and payments will be in SEK currency"); "PORTS OF SWEDEN, General Conditions 1989 for terminal operations" applies (§1.6) |

Identity verified: issuer, title, validity window, currency, VAT exclusion,
and the Ports of Sweden 1989 terminal conditions all match the directive's
identification. The fetch succeeded on the first attempt (no hang); the PDF
was archived verbatim (binary identity by SHA-256 above; the same checksum
reproduced from the archived copy). The operator layer joins the hamntaxa in
the Gävle silo's source tree — the same two-document pattern as Norvik
(port authority + terminal operator).

### 1.1 Directive-figure verification (the PDF governs; every mismatch reported)

The directive's expected figures were verified against the archived PDF.
Several expectations do **not** match the archived 2026 document. The
archived figures govern; the mismatches are recorded here, never silently
resolved in either direction.

| Figure | Directive expectation | Archived PDF (section) | Finding |
|---|---|---|---|
| Full container throughput | 1,679 | **1 679** (§4.1) | Match |
| Empty container throughput | 1,235 | **1 235** (§4.2) | Match |
| OOG | +100% | **additional 100% of the above rates** (§4.3) | Match |
| Cargo due (per full container) | 482 | **482** (§5.1) | Match |
| ISPS (per full container) | 73 | **73** (§5.2) | Match |
| IMDG/reefer (per unit) | 401 | **401** (§5.3) | Match |
| Customs-area handling | 1,122 | **1 122** (§6.1) | Match |
| Food-inspection area | 1,661 | **1 691** (§6.2) | MISMATCH — PDF: 1 691 |
| Flat racks | 885 | **901** (§6.3) | MISMATCH — PDF: 901 |
| Repair moves | 558 | **568** (§6.4) | MISMATCH — PDF: 568 |
| Washing without/with estimate | 328 / 454 | **334** / **462** (§6.6/6.7) | MISMATCH — PDF: 334 / 462 |
| Odor neutralizer | 250 | **255** (§6.8) | MISMATCH — PDF: 255 |
| Vessel–vessel shifting | 558 | **568** (§6.9) | MISMATCH — PDF: 568 |
| Repair labor (per man-hour) | 558 | **568** (§6.5) | MISMATCH — PDF: 568 |
| Overtime gangs (per hour per gang) | 13,216 / 17,096 / 19,884 | **13 454** (Mon–Fri nights) / **17 404** (weekend) / **20 242** (public holidays) (§2) | MISMATCH — PDF: 13 454 / 17 404 / 20 242 |
| Productivity compensation bands | 6,668 / 13,277 / 19,884 | **6 788** / **13 516** / **20 242** (§3.2) | MISMATCH — PDF: 6 788 / 13 516 / 20 242 |
| Out-of-window surcharge bands | same bands as compensation | **6 788** / **13 516** / **20 242** (§3.5) — identical to the compensation table | Match in structure; figures per the PDF (the directive's 6,668/13,277/19,884 do not appear in the document) |
| Waiting time | 6,607/hour/gang | **6 726** per hour per gang (§3.7) | MISMATCH — PDF: 6 726 |
| COPRAR-absence fee | 5,000/call | **SEK 5000 per vessel call** (§3.8) | Match |

Also in the PDF, not in the directive's expectation list, recorded for
completeness: quay–quay vessel shifting 1 122 (§6.10), label add/removal 509
(§6.11), reefer plug in/out 506 and monitoring/electricity 395/unit/day
(§8.1/8.2), PTI handling 506 and PTI of empty reefers on quote (§8.4/8.3),
re-nomination (rollover) fee 345 (§9), and the incremental rebate schedule
(§10 — 10–20% by annual line-operator TEU volume, payment-conditioned; a
volume-based retrospective rebate with no call input, recorded here, never
encoded or silently applied).

The mismatch pattern (every section 6 and sections 2–3 figure differs by a
small amount) is consistent with the directive's expectations coming from a
different vintage of this tariff. The archived 2026 document is the authority
of record; its figures are the ones transcribed below.

### 1.2 Handling basis (verbatim, §4.1/§4.2)

- Full container: "SEK 1 679 (Includes lift off vessel, train or truck into
  terminal and lift to vessel, train or truck out of terminal. Hatch covers
  and twist-lock handling is included)" — the bundled convention, one rate
  both directions, vessel side and landside.
- Empty container: "SEK 1 235 (Includes lift off vessel, train or truck into
  terminal and lift to vessel, train or truck out of terminal, lifts to and
  from inspection area, inspection and dry sweeping. Includes removal of
  nails, hazardous placards and other minor tasks)" — the same bundled
  convention.

### 1.3 TEU arithmetic (§1.3, verbatim)

"Units greater than 20' to 40' are calculated as 2 TEU (includes 22', 23',
24, 30, 40' units). 45' containers are calculated as 2.25 TEU."

Adjudication: the model's established size convention is the two-bucket
split (`container_le20ft` = 20' = 1 TEU; `container_gt20ft` = over-20' =
2 TEU in the engine's own `teu` unit arithmetic) with the default profile's
40/60 forty/twenty split; the 45' = 2.25 TEU refinement has no 45' bucket
and no 45' count input. The rate structure prices **per unit** (per
container lifted), not per TEU — the tariff's own §4 rates are per unit and
only storage (§7) is per TEU per day. Per-unit pricing therefore needs no
TEU mapping at all for handling, cargo due, or ISPS; the TEU arithmetic
governs the storage surface, which is per TEU per day and priced from
user-entered days (§1.4 below). The call is never re-profiled.

### 1.4 Storage (§7, verbatim)

- §7.1 Full Containers: Free Time **7 calendar days** ("*Arrival and
  departure days will be calculated"); 8+ days **SEK 135** (per TEU per day,
  the section title's basis).
- §7.2 Empty Containers: **SEK 13,46** — an obvious PDF typography for
  13.46 (the Swedish decimal comma), read as 13.46 SEK per TEU per day; no
  free time stated for empties.
- §7.3 OOG Containers: additional 100% of the above rates.

Adjudications: (a) the 13,46 figure is transcribed with the decimal-comma
reading recorded — never silently normalized; the extraction reference and
rule description carry the verbatim string and the reading. (b) The
zero-storage-default convention (v0.4.1) holds: the storage surface prices
only user-entered days beyond the verbatim free time; the default call (zero
days) prices no storage at Gävle. (c) The per-TEU basis uses the engine's
established TEU arithmetic (1 TEU per ≤20' unit, 2 TEU per >20' unit); the
45' 2.25 refinement has no bucket and is recorded in the rule description
with the §1.3 citation — never a re-profiled call.

### 1.5 Recorded, not encoded (the silent-discount class)

- **Productivity compensation (§3.2):** "The Terminal Operator shall pay to
  the Line compensation in line with the below" — SEK 6 788 (1–200 moves),
  13 516 (201–400), 20 242 (>400). A **credit** conditional on the
  productivity guarantee (20 container moves per STS crane per working hour)
  and its seven listed conditions (a)–(h) (final information 15 h prior,
  accurate ETA, stowage-change limits, trim/mooring, full cellular vessel,
  health-and-safety deductions, wind >30 knots deductions, OOG/damaged-unit
  deductions). The conditions are not call inputs; the compensation is
  recorded with its figures documented in the extraction reference and the
  rule description, never encoded as an unconditional credit.
- **COPRAR-absence fee (§3.8):** "For services or operators that are not
  able to provide COPRAR files, a fee of SEK 5000 per vessel call will
  apply." An EDI-capability condition with no model input; recorded, not
  encoded.
- **Out-of-window surcharge (§3.5), overtime (§2), waiting time (§3.7):**
  scenario-shaped surfaces (arrival-window deviation, hours ordered, gang
  waiting) with no existing scenario input covering them at any port;
  recorded in the extraction reference, not encoded. No input exists for
  out-of-window arrival, overtime hours, or waiting hours; inventing one is
  out of scope for this pass.
- **Incremental rebate (§10):** annual-volume retrospective, per line
  operator; recorded, not encoded.

### 1.6 Encode scope (item 1's contract)

Encoded as data rules in the Gävle silo, biller Yilport Gävle (its
description re-baselined from "separate tariff, unpublished" to the
archived 2026 tariff): full container handling 1,679/unit (§4.1), empty
1,235/unit (§4.2), OOG +100% of the throughput rates (§4.3, the existing
`oog_units` input), cargo due 482/full (§5.1), ISPS 73/full (§5.2), IMDG /
reefer surcharge 401/unit (§5.3, the existing `reefer_units` and
`dangerous_goods_units` inputs), storage per §7 as scenario rules over
user-entered days (zero-default). The two v0.4.0 gap notices
(`gvh_terminal_handling_gap`, `gvh_cargo_due_gap`) are replaced by their
rules, re-baselined with attribution.

Empty-container adjudication: the model's call inputs carry no empty-unit
count (the call model prices loaded and discharged containers; the §4.2
empty rate has no input surface). Recorded in the extraction reference and
the rule description with the verbatim figure; not encoded as a firing rule
— an input-less rule would be dead data (the same discipline as the liner
rate before this pass's rider). The full-container §4.1 rate is the
container-call surface.

---

## 2. Six-port handling-basis audit (item 0.2)

From the already-archived authorities and their extraction references; no
new fetches for GOT/HEL. Each port's published basis, verbatim, with
citations. This table is a verified artifact: future terminal-operator
documents (APMT for GOT included) enter against it.

| Port | Case | Published basis (verbatim) | Citation |
|---|---|---|---|
| **Hamburg (Eurogate)** | Unbundled, vessel-to-quay only | Ch. 5 "Handling Charges" covers "Loading/discharging from/to main vessel, feeder vessel or barge" (5.1.1 ISO-Container, empty/full 358,00 €); "Receiving and delivery from/to rail/truck per movement" is a **separate** ch. 6.1.1 ISO-Container 152,00 € per movement | S9 (Eurogate Prices and Conditions, effective 01.03.2026) ch. 5.1.1 / ch. 6.1.1; Hamburg extraction reference §"Eurogate terminal layer" and the v0.4.0 item-3 basis finding |
| **Gävle (Yilport)** | Bundled (container-through) | "Includes lift off vessel, train or truck into terminal and lift to vessel, train or truck out of terminal. Hatch covers and twist-lock handling is included" | Yilport 2026 tariff §4.1/§4.2 |
| **Stockholm Norvik (Hutchison)** | Asymmetric | Export: "ISO containers receiving container to stack including single lift to vessel" 2,012 kr — vessel-side, no road leg. Import: "lifted from vessel, received into stack, and loaded to road transport" 2,012 kr — the road leg is bundled on the import side only. Rail separately priced: "Trailer loaded to/from rail stack including Receiving, Lifts plus transfer to train 1575 kr"; "Container loaded to/from rail stack including Receiving, Lifts and transfer to train 1300 kr" | Hutchison Price List 2026 pp.4–6; Norvik extraction reference §4.1 |
| **Norrköping** | Fully leg-priced | Vessel: "LIFT TO/FROM VESSEL" 20' 855 / 30' 1,051 / 40' 1,249 / 45' 1,283 SEK per unit. Rail: "LIFT TO/FROM TRAIN" 20' 367 / 30' 453 / 40' 526 / 45' 573. Truck: "Lift to/from truck, including a visual inspection of the units outsides and seal" / "GATE HANDLING / INTER-TERMINAL MOVE" 20' 479 / 30' 509 / 40' 546 / 45' 546 | Norrköping Tariff 2026 v2 pp.14–15; extraction reference §§3.5–3.6 |
| **Helsingborg** | Case 1 — handling with basis wording | "Handling full or empty units to/from vessels to/from 'Place of rest' at the West Harbour. SEK per unit 890.00" — vessel-to-rest-place, no onward leg bundled. The landside legs are separately published: "Delivery/Receiving Train incl. Shunting … to/from 'Place of Rest' to/from Train. SEK per unit 1 110.00"; "Delivery/Receiving Truck … to/from 'Place of Rest' to/from the Truck. SEK per unit 890.00" | Helsingborg Tariff 2026 p.7; extraction reference §3.6 |
| **Gothenburg (APMT)** | Case 2 — figures without basis wording, **archived and verified at v0.4.6** | The APMT source documents are **archived since v0.4.6** (the product-owner delivery 2026-10-02: `apm-terminals-terminal-tariff-2026-june.txt` and `apm-terms-of-business-2025-03-31.txt`; every encoded figure verified against the archive — audit `docs/GOT_APMT_OPERATOR_ARCHIVE_AUDIT.md`). The tariff publishes **no basis wording**: §1 charges goods per unit with no scope statement, no modality distinction, and no separately priced landside legs (the §2 export/import entries are storage-clock calculation rules, not leg prices; the §4.1 538 figure is a dangerous-goods receipt/delivery surcharge). The annotation is the evidence-based characterization: **"single per-unit charge; no modality distinction and no separately priced legs published; scope of the charge not stated in the document"** (§1.1, per unit 377/535 SEK). The bundled reading is recorded as a **labeled inference pending wording from APMT** — never a claim. The container-through toggle's GOT participation remains **"not published"** — a wording, never a zero | Gothenburg extraction reference §1a (the APMT operator layer, v0.4.6); the archived Terminal Tariff §1.1; audit `docs/GOT_APMT_OPERATOR_ARCHIVE_AUDIT.md` §4 |

Report of the case per port: Hamburg — vessel-to-quay only, the 152.00 EUR
movement separate (ch. 6.1.1). Yilport Gävle — bundled, one rate both
directions. Hutchison Norvik — asymmetric (export vessel-side; import
includes the road leg; rail separate at 1,575 trailer / 1,300 container).
Norrköping — fully leg-priced (vessel / rail / truck each its own line).
Helsingborg — case 1: handling **with** basis wording ("to/from vessels
to/from 'Place of Rest'"), plus separately published truck (890) and train
(1,110, incl. shunting) legs. Gothenburg — case 2, archived and verified at
v0.4.6: the APMT handling figures price in the silo from the archived
tariff, and the archive itself publishes no basis wording — §1 charges goods
per unit with no scope statement, no modality distinction, and no separately
priced landside legs; the annotation records exactly that (the honest
characterization: scope of the charge not stated in the published document),
with the bundled reading recorded as a labeled inference pending wording
from APMT; the toggle's GOT participation remains "not published".

Directive deviation, reported: the directive anticipated case 2 or case 3
for HEL. The archived Helsingborg tariff carries explicit basis wording
(the "Place of Rest" sentence) — case 1, with its landside legs published;
the container-through toggle therefore adds HEL's published legs like
Norrköping's (the sources govern). The directive anticipated case 3 for
GOT ("plausible ... no terminal-handling figures in the silo"); the finding
is case 2 — the APMT figures (377/535) are encoded and price, but the
source document is unarchived and no basis wording exists to record. This
section is amended in-pass over the committed item-0 audit (the correction
is itself a finding of the basis table's verification, never a silent
resolve).

---

## 3. Norrköping liner definition and the frequency-input contract (item 0.3)

**The tariff's own definition:** the Port of Norrköping Tariff 2026 Version
2 (p.7, "PORT DUES FOR VESSELS") publishes exactly:

> "STANDARD TARIFF 6,60 SEK GT
> LINER TARIFF 5,70 SEK GT"

and **no definition of the liner-service condition anywhere in the
document** — the full 20-page extracted text was searched (the single
occurrence of "LINER" is the rate line itself). Neither frequency-shaped
nor qualitative: the tariff states the rate without stating who qualifies.

**The frequency-input contract:** the call model's existing
`calls_this_month` input (types.ts CallInput; the "Calls This Month" field
in the workspace inputs; default 1) is a per-port monthly call counter —
the input Helsingborg's discount machinery and the Sjöfartsverket frequency
rabatt key on (the latter through the biller's frequency_discount bands and
the speculation-side frequency panel). It expresses *how many times* the
vessel called, never *whether the service is a liner service*.

**Finding and shape:** the liner condition is **not frequency-shaped** in
the Norrköping document — no definition exists to map onto the frequency
input, and deriving eligibility from a call count would be exactly the
scale-conflation the Gävle CSI-stars caution names (a number guessed into
an attestation). Per the directive's own decision rule ("if the definition
demands more — a rotation attestation — add a small yes/no qualifier beside
the input, never a guess from a number"), the honest surface is a **yes/no
liner-service attestation** beside the frequency input: `nrk_liner_service`
(default false, the worst case — the v0.4.0 extraction's own adjudication
that the standard rate is the default). The rider encodes the 5.70/GT rate
as a conditional rule keyed on that attestation, never on the call count.
The attestation's provenance is the user's own knowledge of the service
(the tariff publishes no qualifying criterion); the rule description and
the extraction reference state this plainly.

---

## 4. Standing ritual (§10)

The Frankfurter mirror's latest TARGET publication is **2026-10-01 at
11.331**, identical to the pinned rate (the YAML's as_of stays 2026-09-30,
the publication the pinned figure comes from). No rate movement; the YAML
unchanged; drift 0.

---

## 5. Deferred queue (restated; findings appended)

1. ~~Scrubber-waste actual-cost surfaces~~ — deferred, unchanged.
2. ~~Equipment-hire surface at Norvik~~ — **dropped per the product
   owner**; recorded in the Hutchison extraction reference (no vehicle
   planned; the reference's "Hire of handling equipment and staff" rows
   stay recorded-not-modeled). Removed from the queue.
3. ~~Pilotage-time assumption refinement per port~~ — deferred, unchanged.
4. ~~Gävle winter-surcharge calendar-window rule shape~~ — deferred
   (engine does not support date-window conditions), unchanged.
5. **Handling-basis table now a verified artifact** (this document §2):
   future terminal-operator documents — APMT Terminals Gothenburg first
   (the GOT case-3 finding) — enter against it; the basis annotation
   family re-baselines per port as each operator document is archived and
   extracted.
6. **Yilport operational surfaces** (overtime §2, out-of-window §3.5,
   waiting time §3.7, COPRAR-absence §3.8, productivity compensation
   §3.2): recorded here and in the extraction reference; encoded only
   when a future pass adds the scenario inputs they demand.
7. **Norrköping liner criterion**: the tariff publishes none; if the port
   ever publishes a qualifying definition, the attestation re-baselines
   against it (a future data correction, the KYUNGMIN-promotion pattern).
8. **Yilport empty-container input** (§4.2, 1,235/unit): recorded, not
   encoded — a future pass adding an empty-units input prices it.
