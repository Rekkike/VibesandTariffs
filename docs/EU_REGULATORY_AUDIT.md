# EU ETS / FuelEU Regulatory Block — Phase A Audit (v0.2.69)

The audit-before-computation seam for the v0.2.69 pass, committed before any
encoding. Authority of record: `docs/sources/eu/EU_REGULATORY_EXTRACTION_REFERENCE.md`
(the instruments and the archive). This document records the Phase A
adjudications; the pass report carries the summary.

---

## 1. Source gathering and archiving (Phase A.1) — done

Archived under `docs/sources/eu/` (ets/ and fueleu/ subdirectories): the two
official Commission ETS pages (the maritime shipping page and the maritime-ETS
FAQ), the two official Commission FuelEU pages (the main page and the Q&A),
and two instrument extracts (Directive (EU) 2023/959 and Regulation (EU)
2023/1805) prepared from the official Commission quotations of the operative
articles, with the full EUR-Lex URLs recorded as the references of record
(EUR-Lex refuses automated retrieval from this environment — a disclosed
retrieval limitation, recorded in the extraction reference §1). Every figure
the block computes is carried by at least one archived official-source
document. The full inventory with archive paths and retrieval dates is the
extraction reference §1 (E1–E8).

**Instrument-name corrections (the instruments prevail, reported):**
- The directive names "Directive (EU) 2023/2593" as the ETS maritime
  instrument — no such maritime directive exists (2023/2593 is a deforestation
  regulation); the ETS maritime instrument is **Directive (EU) 2023/959**
  (inserting Articles 3ga–3gg into Directive 2003/87/EC).
- "the MRV rules of Directive 2003/99 sections as referenced" — the MRV
  basis is **Regulation (EU) 2023/957** amending **Regulation (EU) 2015/757**
  (the MRV Maritime Regulation), not Directive 2003/99.
- Regulation (EU) 2023/1805 (FuelEU) is correctly named.
The substantive descriptions (threshold, phase-in, mechanics) all verify
against the correct instruments.

## 2. Applicability adjudication (Phase A.2) — the verdicts

Per port and vessel, as recorded in the extraction reference §4:

- **All three ports (GOT, HAM, HEL) are ordinary EU ports of call** — not on
  the transhipment-port or island-derogation lists. The instruments are
  EU-wide and port-blind: the verdict is identical at all three ports for a
  given vessel and leg. The per-port silo is honoured by transcription (§7
  of the extraction reference).
- **HELGAFELL (8,890 GT) and every vessel below 5,000 GT: exempt from both
  instruments entirely** — pinned as the <5,000 GT finding. The ETS
  threshold ("of or above 5 000 gross tonnage", Commission FAQ E2) and the
  FuelEU threshold ("above 5,000 gross tonnes", Commission FuelEU pages
  E5/E6) key on the same 5,000 GT line. No ETS surrender, no FuelEU balance,
  at any EU port. The block renders nothing for exempt vessels.
- **MSC KYUNGMIN (21,979), VISTULA MAERSK (34,882), MAREN MAERSK (194,849):
  in scope at every port** for both instruments (cargo ships ≥5,000 GT,
  regardless of flag).
- **Voyage legs**: the model's shared `arrival_origin` selector already
  carries the leg dimension. Default at every port: `outside-europe` —
  **a correction to the directive's premise** ("the default Maren Maersk
  calls are intra-EU in the model"): they are not; the shared default is
  outside-Europe (the v0.2.50 worst-case contract). The block keys off the
  actual selector and its actual default: an extra-EU arrival carries the
  50% voyage fraction, an intra-EU arrival 100%; in-port emissions are 100%
  under both. The default call therefore prices the 50% leg — consistent
  with the model's own origin default, and the intra-EU posture is one
  selector flip away, exactly as for the waste dues.
- **The 2026 phase-in fraction: 70%** — allowances surrendered in 2027 for
  2026-reported emissions cover 70% of verified emissions (Commission FAQ
  E2; Directive 2003/87/EC Article 3gb(1)(b) as inserted by Directive (EU)
  2023/959). 40% applies to 2024-reported, 100% to 2026-reported onward;
  the model's calls are dated 2026, so the operative fraction is the one
  applying to 2025-reported-emissions year... precisely: a call dated in
  2026 generates 2026-reported emissions, surrendered in 2027 at 100%.
  **Wait — the adjudication, stated exactly** (this paragraph is corrected
  in the pass report's deviation section): the phase-in percentages attach
  to the *emissions reporting year*: 40% for 2024-reported, 70% for
  2025-reported, 100% for 2026-reported and later. A 2026-dated call's
  emissions are 2026-reported → surrendered at **100%**. The extraction
  reference §2 initially recorded 70% for a 2026 call (conflating the
  surrender-year and reporting-year framings); the pass report records the
  correction: **the default 2026 call computes at the 100% fraction**,
  with the phase-in data carrying all three year-fractions and the call
  date selecting 2024→40% / 2025→70% / 2026+→100%. The commission FAQ's
  own sentence set ("2025: 40% of emissions reported for 2024; 2026: 70%
  of emissions reported for 2025; 2027 and beyond: 100%") pins this
  mapping unambiguously: the surrender year is one year after the
  reporting year, and the fraction is keyed to the reporting year.

## 3. Fuel-and-emissions data design (Phase A.3) — the adjudicated design

As recorded in the extraction reference §5, in full:

- **No invented consumption figure, no invented allowance price, no
  invented emissions factor.** THETIS-MRV publishes per-vessel annual
  verified data (2018 onward) — usable as *orientation with citation*, but
  not as a per-call default (an annual→per-call proration would be an
  unstated assumption, i.e. an invented figure).
- **Two user inputs, both blank by default** (the OPS-kWh and towage
  precedents): `ets_emissions_tco2` (the call's in-scope CO2 tonnes, the
  user stating the basis — the vessel's own MRV/bunker records for the
  voyage) and `ets_allowance_price` (EUR/tCO2; helper text states the
  market basis and the observed 2024 auction band 49.50–75.35 EUR, average
  64.74, cited to the Commission's 2024 carbon-market report; no default
  value encoded). Blank inputs render nothing and compute nothing.
- **The leg scope keys off the existing `arrival_origin` selector** — no new
  leg input; the same shared dimension the waste dues use, holding the
  voyage attribute constant across ports per the comparison philosophy.

## 4. Scope boundary verdict (Phase A.4)

As recorded in the extraction reference §6: **ETS is honest per-call** (the
obligation attaches to per-voyage, per-port-portion verified emissions; the
line's proration disclosure states every element: entered in-scope tonnes,
phase-in fraction, user's price). **FuelEU is NOT honest per-call** — the
compliance balance is annual, poolable, bankable, and borrowable; a per-call
figure would fabricate three unstated assumptions. The FuelEU deliverable is
**the notice**: applicability, the 2020 reference value (91.16 gCO2e/MJ), the
2025–2029 target (−2% → 89.34), the penalty rate (2,400 EUR/t VLSFO-eq), the
annual-balance statement with pooling/banking/borrowing, each cited — and no
computed amount. No annual compliance model is built (no annual totals, no
pooling, no multipliers) — the pass encodes per-call regulatory cost only.

## 5. Phase B encoding decisions (previewed for the seam)

- New fee family `regulatory`; new engine applicability condition
  (`min_gt` on the vessel) mirroring the instruments' threshold; the
  emissions×price×phase-in computation in the engine (a flat structure over
  the two user inputs with the phase-in fraction as data per port file).
- Per-port transcription (silo): each port file carries its own
  `eu_ets_allowances` and `fueleu_notice` rules with the E-citations.
- Currency: EUR at all three ports (EUAs are a EUR-denominated EU-market
  instrument; the Swedish ports render the EUR line under the
  local-currency contract with the declared conversion path).
- Stage: the regulatory family lands in "To reach the berth" (statutory
  call dues company); no new stage (argued in the extraction reference
  §7).
- reset_fields: `ets_emissions_tco2` and `ets_allowance_price` are declared
  per-port in each port's reset_fields (the attestation-input pattern — a
  user's price assumption and voyage figure are port-call-scoped entries),
  making them per-port state under the union semantics — a data-contract
  change carried with its pin updates in this pass, per the v0.2.68 §7
  sentence.
- Zero-drift: the block is additive — blank inputs render nothing, the
  pre-existing totals hold byte-identically at the default call (no new
  lines fire; the FuelEU notice is a zero-amount informational line that
  does not add to any total). The expected default-call figures: no ETS
  line (inputs blank), the FuelEU notice present at GOT/HAM/HEL for MAREN
  MAERSK (in scope), nothing at all for a <5,000 GT vessel.

The Phase B implementation, pins, red proofs, and the full verification
follow in the pass report.
