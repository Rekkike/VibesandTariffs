# Norrköping Extraction Reference — Port Call Cost Analyzer

Authority of record for the Port of Norrköping build (the Swedish domestic
expansion pass, v0.4.0). Where any builder directive conflicts with this
document, this document prevails. All amounts are in SEK and exclude VAT
("All prices are in Swedish Krona (SEK) and subject to VAT where applicable"
— treated as ex-VAT throughout, consistent with the Gothenburg, Hamburg, and
Helsingborg conventions).

Extraction date: 2026-10-02. Tariff vintage: Tariff 2026, Version 2.
Reservation clause (p.2): "PORT OF NORRKÖPING RESERVES THE RIGHT TO UPDATE OR
AMEND THIS TARIFF AT ANY GIVEN TIME. IT IS THE RESPONSIBILITY OF THE CUSTOMER
TO ENSURE THAT THE LATEST VERSION IS USED OR REFERRED TO. THE LATEST VERSION
IS ALWAYS PUBLISHED AT WWW.PORTOFNORRKOPING.SE" — the archived checksum pins
the vintage this extraction transcribes.

---

## 1. Source

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| S1 | Port of Norrköping, Tariff 2026 Version 2 (20 pages, English) | Norrköpings Hamn AB | Yes | `docs/sources/sweden/norrkoping/tariff-2026-v2.pdf` |

- Fetch URL: https://www.norrkopingshamn.se/wp-content/uploads/Tariff-2026-v2.pdf
- Fetch date: 2026-10-02
- SHA-256: `7113c7959104f002f8fc5aa7f4f95dc892aee8391ce79bbca2e4acd33657af72`
- Identity verified against the directive's expectation: issuer Norrköpings
  Hamn AB (org. 556007-2679, p.4 "General information"), title "TARIFF 2026 /
  VERSION 2 2026" (cover), effective reservation as quoted above, language
  English, structure: General Information (p.4), Vessel-Related Charges
  (p.7), Port Dues for Goods (p.9), Break-Bulk (p.12), Bulk (p.13),
  Container & Intermodal (p.14), Liquid-Bulk (p.17), Terminal (p.19),
  Project & Heavy Lift (p.20). Match — archived as expected.

Note on the issuer's domain: the tariff's own reservation clause names
www.portofnorrkoping.se; the document was fetched from
www.norrkopingshamn.se (the operator's corporate domain, the URL of record).
Both names refer to Norrköpings Hamn AB; recorded so no session goes looking
for a second publisher.

## 2. Charging structure (billers)

Norrköpings Hamn AB (org. 556007-2679) acts simultaneously as port authority
and terminal operator ("acting as Port Authority in the port area of
Norrköping. The company is offering stevedoring and terminal services in its
area of activity", p.4). One integrated tariff covers port dues, cargo dues,
handling, storage, and ancillaries — the same authority-plus-operator
structure as Helsingborg, adjudicated per the HEL precedent: the integrated
operator's published figures are transcribed under the port's own biller;
no separate terminal concessionaire exists for the container operation.

1. **Port of Norrköping** — port dues (vessels), PSF, waste, demurrage, cargo
   dues, container handling, storage, ancillaries. Single biller.
2. **Sjöfartsverket** — national fairway dues (fartygsavgift,
   beredskapsavgift, godsavgift) and pilotage (lotsavgift). Referenced from
   the existing shared machinery; this port carries its own transcription
   with its own citations (port-silo discipline).
3. **Outsourced services** — tug (SVITZER, svitzer.com) and linemen (Frakt &
   Trosstjänst, frakotross.se) are explicitly outsourced (p.7): "These
   services are outsourced to the following companies." Neither company's
   rates are published in this tariff — towage stays an estimated parameter
   (the model's convention) and mooring/linemen is surfaced as a
   service_gap_notice (the v0.3.1 GOT pattern, condition-derived — the
   tariff names the service and its provider without a rate).

## 3. Fee rules (source S1)

### 3.1 Port dues for vessels (p.7)

- STANDARD TARIFF: 6.60 SEK/GT.
- LINER TARIFF: 5.70 SEK/GT.
- PSF (Port Security Fee, vessels): 0.10 SEK/GT, "In addition to the above".
- Adjudication (liner vs standard): the tariff publishes both without a
  selection rule in the extracted text. A container vessel in liner service
  is the model's call; the LINER TARIFF is a discount conditioned on the
  liner-service attestation. The default call prices the STANDARD TARIFF
  (6.60) — the worst case per the v0.2.28 default-call contract — and the
  liner rate is an adjustment conditioned on an explicit input. The absence
  of a published selection rule is disclosed in the rule description, never
  silently resolved.

### 3.2 Demurrage (p.7)

- 3.00 SEK/GT/day; "the port has the right to charge demurrage two hours
  after the laytime is over" (idle-vessel right, Port Authority holds it).
- Per commenced day per GT — the per_commenced_day shape with the basis GT.
  The two-hour-laytime trigger is the tariff's condition; the model prices it
  from an explicit idle-days input, zero in the default call (the call model
  does not carry idle days; zero renders no line — a stated default, never
  an invention).

### 3.3 Ship-generated waste (p.7)

- DRY CARGO VESSELS: 0.80 SEK/GT.
- LIQUID CARGO VESSELS: 1.90 SEK/GT (out of scope — container model).
- SLUDGE FEE: the extracted text announces the sludge fee under the waste
  section but the 20-page tariff publishes no sludge figure in the extracted
  text — GAP NOTICE, never invented. The waste line's basis string records
  that sludge is separately fee-bearing with no published figure in this
  document.
- Transport Agency pattern: the tariff states no exemption basis (no TSFS
  citation) in the extracted text; the §12 Transport Agency exemption
  pattern is not restated here — recorded as a finding, the waste line does
  not carry an exemption note this pass.

### 3.4 Cargo dues (p.10, "PORT DUES FOR GOODS — CARGO DUES")

- 20' container: 369 SEK/unit.
- 30' container: 395 SEK/unit.
- 40' container: 433 SEK/unit.
- 45' container: 488 SEK/unit.
- Rail infrastructure fee: 633 SEK/unit, "* applicable for all laden units
  which are not subject to Cargo Dues" — a rail-only provision, out of scope
  for the vessel call (the annotation is recorded here; it never enters the
  container-call model, which has no rail-leg input).

### 3.5 Container & Intermodal — Lift to/from vessel (p.14)

- 20': 855 SEK/unit; 30': 1,051 SEK/unit; 40': 1,249 SEK/unit;
  45': 1,283 SEK/unit; Out of Gauge: 7,038 SEK/unit; Hatches, boxes/other
  equipment: 812 SEK/unit; Lashing material: 539 SEK/unit.

### 3.6 Container & Intermodal — Lift to/from train / gate handling (pp.14-15)

- Lift to/from train: 20' 367; 30' 453; 40' 526; 45' 573; Trailer 573.
- Gate handling / inter-terminal move: 20' 479; 30' 509; 40' 546; 45' 546;
  Trailer 573; Moves ordered by authorities: 1,023 SEK/unit.
- Lift to/from truck "including a visual inspection of the unit's outside
  and seal" — land-side receiving/delivery, out of scope for the vessel call
  (the model's vessel-call scope adjudication: the vessel-side lift is
  3.5's "LIFT TO/FROM VESSEL"; land-side moves are recorded here and excluded
  from checkpoints — the same land-side exclusion the Helsingborg build
  applied to its truck/train delivery lines).

### 3.7 Cargo and infrastructure fees (p.15)

- Port Security fee: 21 SEK/unit.
- IMDG/ADR/RID-classified cargo: 399 SEK/unit.

### 3.8 Storage of units (p.16)

- IMPORT UNITS ARRIVING WITH VESSEL: day of arrival + 3 working days free;
  thereafter per TEU 13.50 SEK/day (from day of arrival/gate-in; "All
  calendar days are charged" for day 7- onward; day 5-6 and day 7- bands per
  size: 20' 103/253; 30' 154/369; 40' 205/507; 45' 230/568 SEK/day).
- EXPORT UNITS DEPARTING WITH VESSEL: day of arrival + 3 working days free;
  same band structure (day 5-6 / day 7-): 20' 103/301; 30' 154/450;
  40' 205/600; 45' 230/675 SEK/day.
- Train/truck-arriving units: +1 working day free (land-side, out of scope).
- Empty units: day 3-4 and day 5- bands, 20' 103/253; 30' 154/369;
  40' 205/507; 45' 230/568 (vessel) and 103/301 … 230/675 (train/truck).
- Storage is a scenario surface (the Eurogate ch. 7 pattern): the free times
  and bands are pinned data; the stay length is the user's scenario input;
  zero days renders no line.

### 3.9 Terminal section (p.19) — out of scope for the container call

- Storage of goods (open sky / warehouse tonnage-day bands), sweeping,
  labelling, VGM, seal, photos, T1 documents, IMDG labelling, ocular
  inspection. Ancillary and land-side; recorded, not checkpointed. VGM
  (order prior gate-in 477; after gate-in 1,936) and seal (97) are the
  container-relevant ancillaries — encoded as optional rules excluded from
  checkpoints, per the HEL §3.9 convention.

### 3.10 General information (pp.4-5) — context, out of scope

- Overtime scheme (200/100/150/400 percent bands), 500 SEK rebilling fee,
  4-hours-per-man cancellation charge, waiting time by the hour. Labour-time
  provisions, not per-call container costs. Ports of Sweden General
  Conditions 1989 govern (the same terms Helsingborg cites).

## 4. Sjöfartsverket national rules

Referenced, never duplicated beyond the port's own transcription duty: the
class tables (vessel fee, readiness fee, pilotage), the frequency discount,
and the godsavgift are the shared national machinery already verified in the
Gothenburg/Helsingborg extractions. Norrköping's own YAML carries its own
transcription of the same national tables with its own citations (the
port-silo discipline; see the Gothenburg extraction §4 tables, verified
against the same prislista).
Archived at v0.4.5: the prislista now has an in-repo archive under
`docs/sources/sweden/national/sjofartsverket/` (the verbatim text
extraction, the artifact this environment can fetch honestly; the binary
PDF remains unarchived — the recorded limitation). The shared national
extraction reference
`docs/sources/sweden/national/NATIONAL_EXTRACTION_REFERENCE.md` is the
authority of record for the national block, written once and cited by all
five Swedish silos; this port's national citations point at the archived
document's real path.


## 5. Estimated parameters

| Parameter | Default | Basis |
|---|---|---|
| Towage cost | 60,000 SEK per tug-assist | SVITZER named as provider, no published tariff in this document; declared estimate |
| Default tugs | LOA < 150 m: 0; 150-250 m: 1; > 250 m: 2 | Spec 3.3 (defaults are data, user-overridable) |
| Default pilotage hours | < 150 m LOA: 2 h; 150-250 m: 3 h; > 250 m: 4 h | Declared estimate (the model's convention) |

## 6. Fee-family mapping

| Charge | fee_family |
|---|---|
| Port dues 6.60/GT (standard; liner 5.70 adjustment) | port_dues |
| PSF vessels 0.10/GT + cargo PSF 21/unit | security |
| Waste 0.80/GT | waste |
| Demurrage 3.00/GT/day | port_dues |
| Cargo dues 369-488/unit | port_dues (cargo-side; same family, basis units) |
| Lift to/from vessel 855-1,283/unit | terminal_handling |
| IMDG 399/unit | dangerous_goods |
| Storage bands (scenario) | storage |
| Linemen (Frakt & Trosstjänst, outsourced, no published rate) | service_gap_notice |
| Sjöfartsverket vessel fee + readiness fee + godsavgift | fairway_dues / vessel_fee per the shared vocabulary |
| Pilotage | pilotage |
| Towage estimate | towage |

## 7. Default call (the model's established convention)

The default vessel MAREN MAERSK's profile: 4,000 moves (60/40 forty/twenty,
loaded/discharged balanced) = 800 20' + 2,400 40' loaded, the same
discharged. Default-call figure classes: port dues 6.60 × GT; PSF 0.10 × GT
+ 21 × units; waste 0.80 × GT; cargo dues by size; lift to/from vessel by
size; the Sjöfartsverket national rules at the vessel's class; no storage
days, no OOG, no IMDG, scenario inputs blank.

## 8. Verification log

- 2026-10-02: S1 text-extracted in full (20 pages, no gaps); every §3 figure
  above transcribed from the extracted text and re-read against it.
- 2026-10-02: identity verified (issuer, title, version, language,
  structure) before archiving; SHA-256 recorded at §1.
- 2026-10-02: the sludge-fee gap recorded as a gap notice (§3.3) — never
  invented; the liner-vs-standard adjudication recorded (§3.1).

## 9. Not modeled (surface as notices, never guess)

- Sludge fee — announced but no published figure in the extracted text.
- Linemen (Frakt & Trosstjänst) — outsourced, named, no published rate
  (service_gap_notice; the national boatman/mooring convention question:
  the tariff names the provider but quotes no national convention — the
  notice describes the tariff's own outsourcing sentence, condition-derived).
- Rail infrastructure fee 633 SEK/unit — rail-leg only, no model input.
- Land-side lifts (truck/train/gate) — out of the vessel-call scope.
- Overtime/cancellation labour charges — not per-call container costs.

## 10. Open decisions (defaults implemented, none blocking)

1. Liner vs standard tariff (§3.1): standard by default, liner as an
   attestation-gated adjustment; confirm the port's application rule if
   possible.
2. Sludge fee figure (§3.3): unpublished in this document; the port may
   quote on request — a future data correction when a figure is verified.
