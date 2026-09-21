# Helsingborg Extraction Reference — Port Call Cost Analyzer

Authoritative extraction for the Port of Helsingborg v1 build. This document is the
single source of truth for all Helsingborg fee data. Where any builder directive
conflicts with this document, this document prevails. All amounts are in SEK and
exclude VAT ("subject to VAT where applicable" — treated as ex-VAT throughout,
consistent with the Gothenburg and Hamburg conventions).

Extraction date: 2026-09-21. Tariff validity: Tariff 2026 (port reserves the right
to amend at any time; EES level adjusted monthly).

---

## 1. Sources

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| S1 | Port of Helsingborg, Tariff 2026 (9 pages, English) | Port of Helsingborg | Yes | `docs/sources/sweden/helsingborg/port-authority/tariff-2026.pdf` |
| S2 | Sjöfartsverket, Prislista farleds- och lotsavgifter 2026 | Sjöfartsverket | Yes | `docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.pdf` (already in repo) |
| S3 | Sjöfartsverket, Lathund lotsavgifter 2026 | Sjöfartsverket | Yes (pilotage detail) | `docs/sources/sweden/national/sjofartsverket/lathund-lotsavgifter-2026.pdf` (already in repo) |
| S4 | Ports of Sweden General Conditions 1989 for terminal operations | — | No (terms) | `docs/sources/sweden/helsingborg/port-authority/ports-of-sweden-general-conditions-1989.pdf` |
| S5 | General Terms and Conditions for the Stevedoring Operations 2011 | — | No (terms) | `docs/sources/sweden/helsingborg/port-authority/stevedoring-terms-2011.pdf` |

S1 public download: https://www.port.helsingborg.se/en/tariff/ ("Tariff 2026 –
Download as PDF"; the page also carries the current Emergency Energy Surcharge
level). S2 and S3 are already in the repository from the Gothenburg build. S4 and
S5 are terms-only; not needed for the build, do not block on them.

## 2. Charging structure (billers)

Helsingborgs Hamn AB (corporate ID 556024-0979) acts simultaneously as port
authority and terminal operator. The container terminal (West Harbour /
Västhamnen) is operated by the port itself; there is no separate terminal
concessionaire. One tariff document (S1) covers port dues, cargo dues, security,
stevedoring, storage, and ancillaries.

1. **Port of Helsingborg** — port dues, waste/environmental fee, port security
   fee, cargo dues, stevedoring, storage, ancillary services. Single biller for
   everything the port itself charges.
2. **Sjöfartsverket** — national fairway dues (fartygsavgift + beredskapsavgift)
   and pilotage (lotsavgift). Identical national rules as Gothenburg; S2/S3 are
   the sources.
3. **Towage provider** — commercial tug services, no published tariff found.
   Handled as an estimated parameter (§5).

Note on terminology — two different "CSI" scales exist and must never be conflated:

- Sjöfartsverket vessel-fee class **A–E** (environmental class, E = not registered).
- Port of Helsingborg discount requires **Clean Shipping Index class 4** (a
  separate 1–5 index scale) or ESI ≥ 30.

## 3. Port of Helsingborg fee rules (source S1)

### 3.1 Port dues, vessels (S1 p.5)
- 6.85 SEK per GT, all vessel types including container vessels. No banding, no
  minimum stated.
- Cruise/passenger alternative 165.00 SEK per passenger, highest total applies
  (not applicable to container model).
- Oil tankers: GT deduction for segregated ballast/double-bottom non-cargo spaces
  upon certificate (not applicable to container model).
- Additional fee after more than four days in port: 100.00 SEK per commenced
  metre LOA (non-residential area), per 7-day period or part thereof.

### 3.2 Environmental discounts (S1 p.5)
- ESI ≥ 30 points or CSI class 4 (Clean Shipping Index): 10 percent discount on
  port dues (GT-based).
- ≥ 30 percent fossil-free fuel of annual consumption: additional 10 percent
  discount. Granted retroactively upon documentation; the second discount stacks
  additively with the first (total 20 percent off).
- No frequency discount exists at this port (unlike Gothenburg).

### 3.3 Waste and environmental fee (S1 p.5)
- All vessels: 0.75 SEK per GT — **alternatively** 25,000 SEK per call. Includes
  sorted waste and up to 10 m³ sludge per call.
- **Reading (assumption, flagged)**: highest of the two applies. The tariff
  states the alternative without an explicit selection rule; the port's own
  cruise clause ("the option that generates the highest total amount applies")
  is applied by analogy. Break-even at 33,333 GT. Vessels below that pay the
  flat 25,000 SEK. Listed in §10 for confirmation.
- Additional sludge above 10 m³: 2,075.00 SEK per m³ plus 15 percent
  administration fee (actual-cost basis for scrubber waste; not in checkpoints).
- Additional fee after more than four days in port: 4.00 SEK per commenced metre
  LOA per 7-day period or part thereof (waste counterpart).

### 3.4 Port dues cargo (S1 p.6)
- General cargo (goods in containers, on loading platforms, trailers or other
  cargo carriers): 625.00 SEK per unit.
- Bulk cargo 75.00 SEK/tonne with commodity-specific special rates (grain 19.80,
  etc.) — not applicable to container model.
- No port dues on: fuel/provisions, oily ballast, fairway equipment, empty
  cargo carriers not constituting independent commodity, unchanged transit crude.

### 3.5 Port security fee (S1 pp.4, 6)
- 78.00 SEK per unit (containers, platforms, trailers, lorries).
- Charged through the same invoice as cargo and ship fees. Vessels without valid
  ISSC are charged double security fee (condition to encode).

### 3.6 Stevedoring (S1 p.7)
- LO-LO, full or empty units, vessel to/from place of rest at the West Harbour:
  890.00 SEK per unit. Shifting onboard = one lift; shifting via quay = two lifts.
- Hatch cover handling: 2,255.00 SEK per unit.
- Delivery/receiving truck: 890.00 SEK per unit; train incl. shunting: 1,110.00
  SEK per unit (land-side; excluded from vessel-call checkpoints).
- Stuffing/stripping/warehousing: third party (Dalshult) — outside the port's own
  tariff; shown as not-billed-by-port.

### 3.7 Emergency Energy Surcharge, EES (S1 p.7)
- Applicable to all container units handled over quay. Variable, adjusted
  monthly on the prior-month average HVO (Neste MY Renewable Diesel) price:
  HVO ≤ 16 SEK → 0; 16.01–20 → 15; 20.01–24 → 35; 24.01–28 → 55; 28.01–32 → 75;
  32.01–36 → 95 SEK per move.
- **Current level (September 2026): 35 SEK per move** (verified on the port's
  tariff page, 2026-09-21). Encode as a datestamped parameter with the band
  table, not a constant.

### 3.8 Storage (S1 p.7)
- Full units on quay free 7 calendar days including arrival day. Thereafter per
  day: export 20' 95 / 30' 140 / 40' 190 / 45' 210; import 20' 275 / 30' 415 /
  40' 550 / 45' 620; empty from arrival day 20' 42 / 30' 64 / 40' 84 / 45' 94;
  trailer/swap body 260 full or empty. Checkpoints use zero storage days.

### 3.9 Ancillaries (S1 p.8) — encode as optional rules, excluded from checkpoints
- Fresh water 75.00 SEK/m³, minimum 945.00. IMO-transport 510/unit; decals
  570/670 + 31; sealing 610; washing 985 (20') / 1,295 (40'); cleaning/sweeping
  660/785; non-automatic lift 1,510; reefer connection 355 + 430/day; port-area
  transport 950; customs/veterinary inspection 1,015; VGM 430 pre-advised /
  1,175 not; other admin 360; late gate-in 360.

### 3.10 Labour (S1 p.3) — context only
- Hourly 985 SEK, gang hour 10,865 SEK, weekday 7 am–4 pm; overtime surcharges
  +100/150/200/250 percent by time band. Lashing not included in any charge.
  (Used for out-of-scope manual work; not in checkpoints.)

## 4. Sjöfartsverket national rules (sources S2/S3 — identical to Gothenburg)

Copy the corresponding rule blocks verbatim from `core/data/gothenburg_2026.yaml`
(port-independent national rules; keep source references to S2/S3). Tables
reproduced here for verification:

### 4.1 Vessel fee (fartygsavgift), SEK per call, by NT class × environmental class

| NT class | NT threshold | A | B | C | D | E |
|---|---|---|---|---|---|---|
| 1 | 0+ | 735 | 1,660 | 3,315 | 3,685 | 3,685 |
| 2 | 1,000+ | 2,810 | 6,320 | 12,640 | 14,045 | 14,045 |
| 3 | 2,000+ | 5,515 | 12,410 | 24,825 | 27,580 | 27,580 |
| 4 | 3,000+ | 8,795 | 19,790 | 39,575 | 43,975 | 43,975 |
| 5 | 6,000+ | 16,150 | 36,340 | 72,680 | 80,755 | 80,755 |
| 6 | 10,000+ | 23,475 | 52,825 | 105,645 | 117,385 | 117,385 |
| 7 | 15,000+ | 30,060 | 67,640 | 135,275 | 150,310 | 150,310 |
| 8 | 30,000+ | 34,475 | 77,575 | 155,145 | 172,385 | 172,385 |
| 9 | 60,000+ | 40,360 | 90,815 | 181,625 | 201,805 | 201,805 |
| 10 | 100,000+ | 47,685 | 107,295 | 214,590 | 238,430 | 238,430 |

### 4.2 Readiness fee (beredskapsavgift), SEK per call, by NT class
Classes 1–10: 1,110 / 4,200 / 8,260 / 13,155 / 24,165 / 35,100 / 44,965 /
51,555 / 60,370 / 71,305.

### 4.3 Frequency discount (vessel fee + readiness fee)
Calls at the port per calendar month: 1–2 calls 100 percent, 3 calls 75 percent,
4 calls 50 percent, 5 calls 25 percent, 6 or more 0 percent of the fee.

### 4.4 Pilotage (lotsavgift), by NT class

| Class | Start fee | Per ½ hour |
|---|---|---|
| 1 | 9,670 | 2,160 |
| 2 | 12,485 | 2,840 |
| 3 | 15,290 | 3,435 |
| 4 | 17,300 | 3,940 |
| 5 | 19,305 | 4,400 |
| 6 | 26,105 | 5,865 |
| 7 | 29,730 | 6,735 |
| 8 | 32,540 | 7,335 |
| 9 | 35,755 | 8,105 |
| 10 | 45,420 | 10,255 |

Extra pilot 12,620 SEK. Pilotage discount 40 percent for piloted time exceeding
7 hours. Ordering fee (beställningsavgift) by lead time: <1 h 9,390; 1–2 h
7,510; 2–3 h 5,635; 3–4 h 3,775; ≥4 h 1,880 SEK. Checkpoints use ≥4 h (1,880).

### 4.5 Cargo fee (godsavgift) — not encoded in v1
High-value goods 3.36 SEK/tonne, low-value 1.67 SEK/tonne. Requires a
cargo-tonnage input the model does not have; same status as in the Gothenburg
build. Surface as "not yet encoded" rather than estimating.

## 5. Estimated parameters (all quality-flagged, user-overridable)

| Parameter | Default | Basis |
|---|---|---|
| Towage cost | 60,000 SEK per tug-assist | No published Helsingborg tug tariff found; declared estimate |
| Default tugs | LOA < 150 m: 0; 150–250 m: 1; > 250 m: 2 | Spec 3.3 (defaults are data, user-overridable) |
| Default pilotage hours | < 150 m LOA: 2 h; 150–250 m: 3 h; > 250 m: 4 h | Declared estimate for the suggestion default; user sets actual |
| EES level | 35 SEK/move, dated 2026-09 | Monthly variable per S1 §EES; band table encoded |
| Lay-time defaults | 16 h mid-range, 50 h ULCV | User experience values (Gothenburg practice); both below the 4-day long-stay thresholds |

## 6. Fee-family mapping

| Charge | fee_family |
|---|---|
| Port dues 6.85/GT | port_dues |
| Long-stay LOA surcharge (port + waste) | port_dues (basis loa_m, per 7-day period after 4 days) |
| Waste/environmental fee 0.75/GT vs 25,000/call | waste |
| Additional sludge 2,075/m³ + 15% | waste |
| ESI/CSI/fuel discounts on port dues | environmental_surcharge (discount adjustments) |
| Cargo due 625/unit | port_dues (cargo-side; same family, basis units) |
| Port security fee 78/unit | security |
| LO-LO 890/unit, hatch cover 2,255 | terminal_handling |
| EES 35/move | environmental_surcharge |
| Storage | storage |
| Ancillary services (water, VGM, washing, etc.) | ancillary_service (or existing equivalent) |
| Sjöfartsverket vessel fee + readiness fee | fairway_dues (vessel_fee as in Gothenburg build) |
| Pilotage (start + ½-hourly + ordering) | pilotage |
| Towage estimate | towage |
| Sjöfartsverket frequency discount | frequency_discount (adjustment on vessel + readiness fee) |

## 7. Checkpoints (script-verified 2026-09-21)

Common assumptions for CP1–CP5: first call of the calendar month (no Sjöfartsverket
frequency discount); Sjöfartsverket environmental class E (not registered —
conservative default, §10); pilotage required with hours per §5 and ordering
lead time ≥ 4 h; zero storage days; stay under 4 days (no long-stay surcharge);
no ancillary services; towage per §5 defaults; EES 35 SEK/move.

Vessel particulars from `core/data/vessel_library.yaml` (NT values are library
estimates, flagged there).

| Component | CP1 HELGAFELL | CP2 MSC KYUNGMIN | CP3 VISTULA MAERSK | CP4 MAREN MAERSK |
|---|---|---|---|---|
| GT / NT (class) | 8,890 / 3,200 (4) | 21,979 / 8,000 (5) | 34,882 / 13,000 (6) | 194,849 / 70,000 (9) |
| LOA / moves | 137 m / 400 | 171.92 m / 400 | 200 m / 500 | 399 m / 3,000 |
| Pilotage hours | 2 | 3 | 3 | 4 |
| Port dues (6.85 × GT) | 60,896.50 | 150,556.15 | 238,941.70 | 1,334,715.65 |
| Waste (highest of 0.75×GT / 25,000) | 25,000.00 | 25,000.00 | 26,161.50 | 146,136.75 |
| Cargo side (1,628 × moves) | 651,200.00 | 651,200.00 | 814,000.00 | 4,884,000.00 |
| Vessel fee (class, E) | 43,975.00 | 80,755.00 | 117,385.00 | 201,805.00 |
| Readiness fee | 13,155.00 | 24,165.00 | 35,100.00 | 60,370.00 |
| Pilotage (start + ½-hours + ordering) | 34,940.00 | 47,585.00 | 63,175.00 | 102,475.00 |
| Towage (estimate) | 0.00 | 60,000.00 | 60,000.00 | 120,000.00 |
| **Total** | **829,166.50** | **1,039,261.15** | **1,354,763.20** | **6,849,502.40** |

Cargo side per unit = cargo due 625 + security 78 + LO-LO 890 + EES 35 = 1,628
SEK per move.

Pilotage detail (start fee + half-hours + ordering 1,880):
- CP1: 17,300 + 4 × 3,940 + 1,880 = 34,940
- CP2: 19,305 + 6 × 4,400 + 1,880 = 47,585
- CP3: 26,105 + 6 × 5,865 + 1,880 = 63,175
- CP4: 35,755 + 8 × 8,105 + 1,880 = 102,475

**CP5 — environmental discount checkpoint** (HELGAFELL as CP1, plus ESI score 35
and fossil-free fuel 35 percent): port dues 60,896.50 × 0.80 = 48,717.20; all
other components unchanged; **total 816,987.20**. Verifies additive stacking of
the two 10 percent discounts and that no other component is discounted.

## 8. Verification log

- 2026-09-21: S1 OCR-extracted in full (9 pages, no gaps); every §3 figure above
  transcribed from the OCR text and re-read against it.
- 2026-09-21: S2/S3 tables cross-checked against the verified Gothenburg-phase
  extraction (identical national tables, same prislista).
- 2026-09-21: All checkpoint arithmetic computed by script (36/36 Hamburg-style
  discipline: no hand-derived figures). Component sums and totals in §7 are
  machine output.
- 2026-09-21: EES current level 35 SEK/move confirmed against the port's tariff
  page (September 2026 entry).
- Waste-fee "highest applies" reading and Sjöfartsverket class-E default are
  documented assumptions (§10), not tariff text.

## 9. Not modeled in v1 (surface as notices, do not guess)

- Godsavgift (cargo fee, needs tonnage input) — "not yet encoded".
- Dalshult stuffing/stripping/warehousing — outside the port's tariff, shown as
  third-party, no published rates extracted.
- OOG handling ("as per request") — no published rate.
- Scrubber waste (actual cost), pumping charge (7.15 SEK/m³, liquid bulk only).
- Access cards, photography, labour/overtime (not per-call container costs).

## 10. Open decisions (defaults implemented, none blocking)

1. Waste fee alternative rule: highest-of (0.75 × GT vs 25,000) — assumed by
   analogy with the cruise clause; confirm with the port if possible. Affects
   CP1/CP2 (flat 25,000 applies below 33,333 GT).
2. Sjöfartsverket environmental class default: E (not registered) used for
   checkpoints — conservative; a named vessel's actual class may be A–C.
3. Towage estimate 60,000 SEK per tug-assist and tug-count defaults (§5).
4. Pilotage default hours (§5) — suggestion values only.
5. Realism note: MAREN MAERSK (399 m ULCV) is included for engine consistency
   with the other ports' checkpoints, not as a realistic Helsingborg caller.

---

End of reference.
