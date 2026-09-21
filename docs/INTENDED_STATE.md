Port Call Cost Analyzer — Gothenburg Intended State

This document is the authoritative intended state of the Gothenburg prototype. It is to be committed to the repository as `docs/INTENDED_STATE.md`. Every number in this document is audit-verified against the primary tariff documents. Where the repository disagrees with this document, this document governs. Any deviation must be either corrected or explicitly justified in writing with a source reference.

## 1. Repository Structure (Intended)

```
docs/
  INTENDED_STATE.md          (this document)
  sources/
    sweden/
      national/
        sjofartsverket/
          prislista-farleds-lotsavgifter-2026.pdf
          lathund-lotsavgifter-2026.pdf
      gothenburg/
        port-authority/
          port-tariff-2026.pdf
        apm-terminals/
          terminal-tariff-2026-june.pdf
core/
  data/
    gothenburg_2026.yaml     (THE single canonical data file; no duplicates anywhere)
  src/                       (engine, types, loader, index)
  test/
web/
  src/App.tsx                (imports ONLY ../core/data/gothenburg_2026.yaml)
```

Rules: exactly one data file per port. No JSON/YAML duplicates. Every source_reference in the data file points to a document in docs/sources/. The PDFs are never modified.

## 2. Fee Inventory — Complete

The canonical data file must contain, for Gothenburg 2026, the complete fee inventory below. The expected rule counts are listed; these are the verification numbers.

### 2.1 Port of Gothenburg (port authority) — 8 fee families

**Port infrastructure dues (progressive by GT, SEK):**

| GT portion | Rate per GT |
|---|---|
| 0-20,000 | 1.96 |
| 20,001-40,000 | 1.71 |
| 40,001-60,000 | 1.15 |
| above 60,000 | 0.80 |

Progressive: each GT portion is charged at its own band rate. Minimum fee per call: 500 SEK.

**Environmental discounts (on infrastructure dues):**
- ESI score >= 30 or CSI class 4: 10 percent discount.
- 30 percent or more fossil-free fuel bunkered in Gothenburg: additional 10 percent discount (retroactive).

**Frequency discount:** second call on same route (import + export): 50 percent discount on GT-based port dues.

**Waste dues (SEK):**
- Solid waste, European arrival: 0.13/GT
- Solid waste, non-European arrival: 0.24/GT
- Sludge, European, up to 11 m³: 0.21/GT
- Sludge, non-European, up to 11 m³: 0.31/GT
- Sludge exceeding 11 m³: 2,400/m³
- Scrubber waste: 800 admin fee + actual cost

Source-internal discrepancy, resolved: the tariff's worked example contradicts its own sludge table; the normative table governs (decision recorded 2026-09-20).

**Other dues:**
- Fresh water: below 50 m³ 0 SEK; above 50 m³ 50 SEK/m³
- Lay-up: 45 SEK/m LOA per commenced calendar day (only if > 24 hours after cargo ops)
- OPS connection: 7,000 SEK per call + electricity — ONLY at Energy Port jetties 519/520/521 (tanker segment). NOT a container charge. Container OPS pricing is unpublished and must be flagged as such, never priced.

### 2.2 Sjöfartsverket (national authority) — 6 fee families

**Fartygsavgift (vessel fee) — full 10 × 5 matrix, 50 rules (SEK per call):**

| NT class | NT from | A | B | C | D | E |
|---|---|---|---|---|---|---|
| 1 | 0 | 735 | 1,660 | 3,315 | 3,685 | 3,685 |
| 2 | 1,000 | 2,810 | 6,320 | 12,640 | 14,045 | 14,045 |
| 3 | 2,000 | 5,515 | 12,410 | 24,825 | 27,580 | 27,580 |
| 4 | 3,000 | 8,795 | 19,790 | 39,575 | 43,975 | 43,975 |
| 5 | 6,000 | 16,150 | 36,340 | 72,680 | 80,755 | 80,755 |
| 6 | 10,000 | 23,475 | 52,825 | 105,645 | 117,385 | 117,385 |
| 7 | 15,000 | 30,060 | 67,640 | 135,275 | 150,310 | 150,310 |
| 8 | 30,000 | 34,475 | 77,575 | 155,145 | 172,385 | 172,385 |
| 9 | 60,000 | 40,360 | 90,815 | 181,625 | 201,805 | 201,805 |
| 10 | 100,000 | 47,685 | 107,295 | 214,590 | 238,430 | 238,430 |

Note: the published tariff prints D and E identically. "Not registered" prices as E.

**Beredskapsavgift (readiness fee), by NT class (SEK per call):**

| Class | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Fee | 1,110 | 4,200 | 8,260 | 13,155 | 24,165 | 35,100 | 44,965 | 51,555 | 60,370 | 71,305 |

**Godsavgift (cargo fee):** high-value goods 3.36 SEK/ton; low-value 1.67 SEK/ton; passengers 2.52 SEK/pax; private vehicles 3.36 SEK/unit. Transit cargo exempt. Transshipped cargo exempt (it is neither import nor export at this port).

**Pilotage (lotsavgift), by NT class (SEK):**

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

Extra pilot: 12,620. Discounts: 30 percent Trollhätte kanal and Vänern; 10 percent Mälaren; 40 percent on piloted time exceeding 7 hours.

**Ordering fee (beställningsavgift), class-independent:** under 1 h 9,390; 1-2 h 7,510; 2-3 h 5,635; 3-4 h 3,775; 4 h or more 1,880 SEK.

**Frequency discount (calendar month, vessel + readiness fees only):** calls 1-2: 100 percent; call 3: 75; call 4: 50; call 5: 25; call 6+: 0 percent. Cargo and passenger fees always apply.

### 2.3 APM Terminals Gothenburg — 6 fee families

**Terminal charges on goods:** ISO <= 20 ft 377 SEK/unit; ISO > 20 ft 535 SEK/unit; break bulk 54 SEK/1,000 kg. Contract-vs-published caveat displayed.

**Security and special handling:** ISPS 80 SEK/unit; hatch cover 3,111 SEK per move and unit; gearbox handling 1,036 SEK per move and unit; dangerous-goods vessel-side surcharge 0 (costs arise via yard and gate surcharges).

**Yard storage (SEK per TEU per calendar day; > 20 ft at double rate):**
- Export/transshipment: days 0-6 free; 7-9: 133; 10-13: 346; >13: 578
- Import/domestic: days 0-4 free; 5-7: 133; 8-11: 346; >11: 578

Storage time rules: export/transshipment from gate-in/discharge to day before loading; import from day after discharge to departure.

**Yard surcharges (per unit per day):** OOG 437; temperature-controlled 709 (incl. handling, monitoring, power); dangerous goods 382; overdue DG penalty 1,025. DG and OOG not charged on the day of loading or discharge; reefers from arrival to departure.

**Gate operations hazardous:** 538 SEK/unit. **Value-added services:** container photos 606 (OCR) / 2,691 (other); VGM weighing 606 pre-ordered / 2,691 not; seal at terminal 606 / sealing inspection 2,691.

**Additional services:** combined goods service 1,538/unit; TI document completion 605; DG label 203/label; manual booking change 100/item; customs administration 367/unit; segregation 317/unit; customs/border-control transport 1,569/unit; freshwater connection 791, water 53/m³; invoice re-handling 537; idle berth service 500/hour (voluntary, rounded up, only when no operations); non-electronic invoicing 512/invoice.

## 3. Input Model (Intended)

- CSI class: A, B, C, D, E, Not registered. Not registered = E rates (Sjöfartsverket), no environmental discount (port dues). Every selection produces full-priced lines.
- ESI score: numeric, plus "no score" state (no discount; base dues).
- NT: first-class input driving all Sjöfartsverket classes, with estimate fallback and "estimated" badge.
- Cargo flows: loaded <= 20 ft, loaded > 20 ft, discharged <= 20 ft, discharged > 20 ft, transshipped units (godsavgift-exempt; one discharge lift + storage + surcharges in this call; visible note that the onward lift belongs to the connecting call), transit cargo aboard (godsavgift-exempt, no terminal charges), high/low-value tonnage split for godsavgift.
- Lay-up days relabeled "Lay-up days (idle, not working cargo)"; zero default for normal calls.
- Hours at berth: separate input (future OPS use).
- Calls this month (drives frequency discounts); pilotage lead time (drives ordering fee); piloted hours and extra pilot flag.

## 4. Engine Behavior (Intended)

 1. Results grouped by biller, then into three segments derived from fee_family: vessel-side, cargo-side, energy-at-berth.
 2. Sjöfartsverket block presented under "Fairway dues and pilotage — Sjöfartsverket" with vessel fee, readiness fee, cargo fee, pilotage, and ordering fee visible as components.
 3. No fee line may silently disappear. If an expected fee family finds no matching rule, emit a validation warning naming the family and condition (e.g. "vessel_fee: no rule matched for CSI class A").
 4. Progressive calculations are progressive (each GT/NT portion at its band rate), never banded-uniform for container dues.
 5. Discounts compose per tariff semantics: port environmental discount on infrastructure dues; Sjöfartsverket frequency discount on vessel + readiness fees only.

## 5. Verification Checkpoints (Acceptance Tests)

The panamax verification call: 55,000 GT, NT 30,250, EU flag, 750 containers <= 20 ft + 750 > 20 ft discharged, ESI >= 30, CSI A, first call of month, pilotage 4+ hours' notice.

| Checkpoint | Expected (SEK) |
|---|---|
| Port dues, base | 90,650 |
| Port dues with ESI >= 30 | 81,585 |
| Waste (solid, EU) | 7,150 |
| Terminal handling | 684,000 |
| Vessel fee (Class 8, CSI A) | 34,475 |
| Readiness fee (Class 8, call 1) | 51,555 |

Additional boundary tests: frequency discount at calls 2, 3, and 6; ordering fee at just-under-1-hour and exactly-4-hours; pilotage 7-hour discount boundary; godsavgift high/low split and transit/transshipment exemptions; not-registered equals E; matrix spot checks across all NT and CSI classes.

## 6. Current Known State (as of commit 75e3353)

Verified against the repository: consolidation to a single canonical file is complete and correct in structure. Contents are incomplete: 37 of 50 vessel fee rules (classes 1-5 partial; Class 10 CSI A missing); readiness fee, pilotage, ordering fee, terminal handling, security, and storage families absent from the canonical file (they exist in git history — commit 57c930e and the pre-consolidation JSON — and must be restored, not re-transcribed). CI run on 75e3353 failed. The docs/sources structure does not yet exist.

## 7. Reporting Protocol

Completion reports must state, verifiably: commit SHA, the canonical file path, vessel fee rule count, the complete list of fee families present in the canonical file, the four source document paths in docs/sources/, and the CI run conclusion. A report is true only if every stated fact is checkable on GitHub. Do not report predictions or intentions as accomplishments.

Deployment claims must additionally cite the served artifact, never the pipeline exit status alone: the deployment record (SHA and timestamp from the repository's Environments/deployment history) and a content marker of the deployed bundle matching the reported commit. A green run that deployed nothing is a false report.
