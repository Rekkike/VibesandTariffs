# EU Regulatory Extraction Reference — Port Call Cost Analyzer

Authoritative extraction reference for the EU ETS / FuelEU regulatory block
(the v0.2.69 pass). The EU instruments are the authorities of record for this
block; where any builder directive conflicts with them, the instruments prevail
and the conflict is reported in the pass report. This document records the
source map, the applicability adjudication, and the computation design per the
silo conventions.

Extraction date: 2026-09-29 (Phase A of the v0.2.69 pass).

---

## 1. Sources

| ID | Instrument | Role | Prices? | Archive path |
|----|-----------|------|---------|--------------|
| E1 | Commission (DG CLIMA), "Reducing emissions from the shipping sector" (official Commission maritime-ETS page) | Orientation + the implementing-act inventory; secondary to E2/E3 | Confirms | `docs/sources/eu/ets/reducing-emissions-shipping-sector.html.md` |
| E2 | Commission (DG CLIMA), "FAQ — Maritime transport in EU Emissions Trading System (ETS)" (official Commission FAQ) | The phase-in percentages, the ship-size threshold, the geographic scope, the surrender calendar | Confirms | `docs/sources/eu/ets/faq-maritime-ets.html.md` |
| E3 | Directive (EU) 2023/959 (amending Directive 2003/87/EC — the ETS Directive) | The amending instrument (Articles 3ga–3gg inserted into Directive 2003/87/EC); **EUR-Lex blocks automated retrieval from this environment** — archived as extracted text from official Commission sources quoting the operative articles, with the full EUR-Lex URL as the reference of record | Yes (the law itself) | `docs/sources/eu/ets/directive-2023-959-extract.md` |
| E4 | Regulation (EU) 2023/957 (amending Regulation (EU) 2015/757 — the MRV Maritime Regulation) | The MRV data basis (per-voyage fuel consumption and CO2 reporting through THETIS-MRV; the same records that feed the ETS surrender and the FuelEU balance); not directly retrievable from EUR-Lex — recorded by reference | Yes (the law itself) | not archived — upstream: https://eur-lex.europa.eu/eli/reg/2023/957/oj/eng |
| E5 | Commission (DG MOVE), "Decarbonising maritime transport – FuelEU Maritime" (official Commission FuelEU page) | The target ladder, the applicability date, the reporting calendar | Confirms | `docs/sources/eu/fueleu/fueleu-maritime.html.md` |
| E6 | Commission (DG MOVE), "Questions and answers on Regulation (EU) 2023/1805" (official Commission Q&A) | The GHG-intensity mechanics: the 91.16 gCO2e/MJ reference value, the 2020 MRV fleet basis, the voyage-scope halves, the penalty formula's VLSFO expression, banking/borrowing/pooling (Articles 20–21) | Confirms | `docs/sources/eu/fueleu/fueleu-qa.html.md` |
| E7 | Regulation (EU) 2023/1805 (FuelEU Maritime) | The regulation itself; **EUR-Lex blocks automated retrieval** — archived as extracted text from official Commission sources quoting the operative articles, with the full EUR-Lex URL as the reference of record | Yes (the law itself) | `docs/sources/eu/fueleu/regulation-2023-1805-extract.md` |
| E8 | Commission Implementing Regulation (EU) 2023/2297 (neighbouring container transhipment ports) and Commission Implementing Decision (EU) 2023/2895 (island derogations) | The port-of-call boundary cases; Göteborg, Hamburg, and Helsingborg are not on either list (they are EU ports of call in the ordinary sense) | Boundary | not archived — upstream: https://eur-lex.europa.eu/eli/reg_impl/2023/2297/oj/eng |

**Directive-name correction (reported per the scope guard).** The v0.2.69
directive names "Directive (EU) 2023/2593 (ETS maritime)" as the ETS instrument.
That number does not exist as a maritime-ETS directive: instrument 2023/2593
is unrelated (Commission Delegated Regulation on deforestation-free products),
and the ETS maritime amending directive is **Directive (EU) 2023/959** (10 May
2023), which inserts Articles 3ga–3gg into Directive 2003/87/EC. The MRV
amendment is **Regulation (EU) 2023/957**, not "the MRV rules of Directive
2003/99". The instruments prevail; the audit proceeds on 2023/959 and
2023/957. The directive's substantive descriptions (the ≥5,000 GT threshold,
the phase-in percentages, the MRV data basis) all verify against the correct
instruments — only the numbers in the names were wrong.

**EUR-Lex retrieval note.** EUR-Lex (eur-lex.europa.eu) refuses automated
retrieval from this environment at every attempted route (HTML, PDF, ELI,
cellar) with a JavaScript robot check; the Publications Office cellar route
refused with Access Denied. Per the v0.2.32 not-archived convention, the
instruments are archived as extracted text prepared from official
europa.eu Commission sources that quote the operative provisions (E1, E2, E5,
E6), with the full official EUR-Lex URLs recorded as the references of
record in the extracts. Every number the block computes is carried by at
least one archived official-source document (E2, E5, E6); the extracts (E3,
E7) record the EUR-Lex citation structure. This is disclosed as a retrieval
limitation, never as a substitute authority: the archive records where the
authoritative text lives and what the official Commission sources state it
says.

---

## 2. The ETS obligation (as adjudicated for the model)

**Applicability** (E2, E3): since 1 January 2024, cargo and passenger ships
of or above **5,000 gross tonnage**, regardless of flag, on voyages and at
ports under the jurisdiction of an EU Member State. Below 5,000 GT: not in
scope (the 2026 Commission review of 400–5,000 GT ships is recorded as a
future boundary, not present law).

**Geographic scope** (E2): 100% of emissions from ships within a port of call
under the jurisdiction of a Member State (at berth and during movements
within the port), and 100% on voyages between two EU ports; 50% on voyages
between an EU port and a non-EU port, each direction. The "port of call" is a
stop to load or unload cargo or embark/disembark passengers; bunkering,
supply, crew-relief, repair, shelter, and distress stops are excluded, as are
stops at the listed neighbouring container transhipment ports (E8) — none of
which affects Göteborg, Hamburg, or Helsingborg, which are ordinary EU ports
of call.

**Phase-in of the surrender obligation** (E2, E3 — Directive 2003/87/EC
Article 3gb as inserted by Directive (EU) 2023/959): shipping companies
surrender allowances for

- 2025: **40%** of verified emissions reported for 2024;
- 2026: **70%** of verified emissions reported for 2025;
- 2027 onwards: **100%** of reported emissions.

The surrender deadline is 30 September of the following year. The 2026
phase-in fraction that applies to a 2026 call's emissions (reported in 2026,
surrendered by 30 September 2027) is therefore **70%** — the pass directive's
"the 2026 phase-in percentage cited to the article" is satisfied by this
figure with the E2/E3 citation.

**Gases**: CO2 for 2024- and 2025-reported emissions; CH4 and N2O added for
2026-reported emissions (the model's 2026 call window spans this boundary;
the model prices CO2 as the MRV-reported basis and states the boundary).

**Cost shape**: the obligation is allowances-quantity × allowance price. The
emissions quantity is MRV-verified per-voyage data; the allowance price is
market data (EUA auction/secondary prices), not a tariff.

## 3. The FuelEU obligation (as adjudicated for the model)

**Applicability** (E5, E6, E7): from 1 January 2025, commercial ships above
5,000 GT transporting cargo or passengers, regardless of flag, in respect of
energy used on voyages between ports under the jurisdiction of Member States
and at berth in those ports: 100% of the energy on intra-EU voyages and in EU
ports; 50% of the energy on voyages into or out of the EU.

**GHG-intensity standard** (E5, E6, E7 — Regulation (EU) 2023/1805 Article 4):
the yearly average GHG intensity of the energy used on board, well-to-wake,
measured against the **2020 reference value of 91.16 gCO2e/MJ** (the 2020
MRV-reported fleet average; fixed, not subject to revision), reduced by
target percentages in five-year steps:

- 2025–2029: **−2%** (limit 89.34 gCO2e/MJ);
- 2030–2034: −6%; 2035–2039: −14.5%; 2040–2044: −31%; 2045–2049: −62%;
  2050: −80%.

**Compliance balance and penalty** (E6, E7 — Articles 20–23 and Annex IV):
the ship's annual compliance balance is the difference between its actual
GHG intensity and the target, times its in-scope energy. A deficit is
converted to energy and penalised at a fixed **2,400 EUR per tonne of VLSFO
equivalent energy** (Annex IV B formula; ≈ 0.058 EUR per MJ of non-compliant
energy), with a multiplier for consecutive-year deficits. Banking,
borrowing, and pooling (Articles 20–21) operate on the annual balance at
ship or pool level.

**Cost shape**: the obligation is an annual per-ship (or per-pool) balance,
settled once per reporting period — not a per-port-call charge. The penalty
rate (2,400 EUR/t VLSFO-eq) is tariff-like, but the balance it prices is an
annual quantity.

---

## 4. Applicability adjudication — per default vessel, per port

The three ports are all EU ports of call (GOT SE, HAM DE, HEL SE). The
instruments are EU-wide and port-blind: applicability does not vary by port,
only by vessel size, ship type, and voyage leg. The per-port adjudication
therefore records the call-model origin fields per port at default and the
resulting per-call scope.

**Current call-model origin fields at default** (the shared `arrival_origin`
selector, default `outside-europe`, spec v0.2.50): the default call at every
port is priced as an arrival from outside Europe. The v0.2.69 directive
states the default Maren Maersk calls are intra-EU in the model — **this is
not the case at the v0.2.68 baseline and is corrected here as a finding, not
silently**: the shared default is `outside-europe` (the worst case for the
Gothenburg waste dues, the realistic Asia-arrival leg). A vessel arriving
from outside Europe on an extra-EU leg has 50% of the voyage's emissions in
ETS scope (plus 100% of in-port emissions); the intra-EU leg (arrival from a
European port) carries 100%. The block's voyage-scope input therefore exists
and defaults to the extra-EU 50% leg, matching the model's own origin
default — the same dimension the waste dues already use.

| Vessel | GT | ETS applies? | FuelEU applies? |
|--------|-----|----------------|-------------------|
| HELGAFELL | 8,890 | **No — below 5,000 GT** | **No — below 5,000 GT** |
| MSC KYUNGMIN | 21,979 | Yes (cargo ship ≥5,000 GT) | Yes |
| VISTULA MAERSK | 34,882 | Yes | Yes |
| MAREN MAERSK | 194,849 | Yes | Yes |

**The <5,000 GT finding, pinned**: HELGAFELL (8,890 GT) — and any vessel
below 5,000 GT — is outside both instruments' scope entirely: the ETS
threshold (E2: "cargo and passenger ships of or above 5 000 gross tonnage")
and the FuelEU threshold (E5/E6: "above 5,000 gross tonnes") key on the same
5,000 GT line. No ETS allowance obligation and no FuelEU balance arise for
such vessels at any EU port. The exemption is entire, not partial, and the
regulatory block renders nothing for them (an exempt vessel renders no
regulatory lines at all — no absence wording, no zero lines; the block is
absent, the zero-collapse convention).

**MSC KYUNGMIN, VISTULA MAERSK, MAREN MAERSK** at any of the three ports:
ETS applies to the in-scope emissions portion (100% in-port + the voyage
fraction by leg: 50% extra-EU / 100% intra-EU), surrendered at the 2026
phase-in fraction 70%; FuelEU applies to the in-scope energy (same leg
halves), assessed annually.

**Per-port statement**: because the instruments are EU-wide and the ports
are all ordinary EU ports of call, the applicability verdict is identical at
GOT, HAM, and HEL for a given vessel and leg; the per-port silo principle is
honoured by transcribing the EU block into each port file separately (the
same convention as the national Sjöfartsverket rules transcribed per port) —
each port file carries its own regulatory rules with its own citations, and
no port file references another's.

---

## 5. The fuel-and-emissions data question (adjudicated honestly)

**(a) What the computation minimally needs.** An ETS figure needs a per-call
in-scope CO2 emissions quantity (tonnes). A FuelEU figure needs the in-scope
energy (MJ) and the well-to-wake GHG intensity of the fuels actually burned
(gCO2e/MJ). The port tariffs supply none of these; they price calls, not
fuel.

**(b) What is obtainable and verifiable today.** THETIS-MRV publishes
per-vessel, per-year verified MRV data from 2018 onward (annual CO2, fuel
consumption, distance, time at sea, per-voyage aggregates). A per-vessel
annual figure is verifiable with a citation, but it is not a per-call
figure: a call's emissions depend on the voyage length, speed, cargo, and
berth hours of that specific call. Deriving a per-call emissions basis from
an annual figure would embed an unstated proration assumption (e.g. per-day
or per-port-call averaging) — an invented figure in the pass's sense. The
evidence therefore supports the OPS-kWh precedent, not a published default:
**a user-specified emissions basis input**, blank by default, disclosed as
user-specified, computing nothing when blank.

**(c) The allowance price.** EUA prices are market data (EEX auctions;
2024 average 64.74 EUR/t, range 49.50–75.35, per the Commission's 2024
carbon-market report) — not tariffs, and not stable enough to encode as a
default rate. The precedent is the towage estimate and the OPS
user-specified rate: **a clearly-flagged user input with a stated basis**,
blank by default, never a hardcoded rate.

**Design the evidence supports (the v0.2.69 encoding):**

- `ets_emissions_tco2` — user-specified in-scope CO2 emissions for the
  call's ETS portion (tonnes), blank = not entered, no figure rendered. The
  user states the basis (e.g. from the vessel's own MRV/bunker records for
  this voyage; THETIS-MRV annual figures may orient the entry but are not
  per-call data). Never a seeded number.
- `ets_allowance_price` — user-specified EUA price (EUR/tCO2), blank = no
  figure. The input's helper text states the market basis and the observed
  2024 auction band with its citation; no default value is encoded.
- The leg scope keys off the existing shared `arrival_origin` selector:
  outside-Europe → 50% of voyage emissions + 100% in-port (the user's
  entered figure is the in-scope portion per the instrument's own split —
  the input contract states this); intra-EU → 100%.
- The 2026 phase-in fraction 70% is data in each port file's rule (cited to
  E2/E3), applied by the engine: allowances = emissions × price × 0.70.
- **FuelEU: no per-call charge is computed.** The honest adjudication
  (§6) is that FuelEU's compliance balance is annual and poolable — a
  per-call penalty figure would fabricate a proration the instrument does
  not define. The block renders a **notice** (with the formula and the
  2,400 EUR/t VLSFO-eq rate, cited to E6/E7) wherever the vessel is in
  scope, and computes nothing. The notice-presence is the deliverable.

---

## 6. The scope boundary (verdict)

**This pass encodes the per-call regulatory cost for the calls in the model.
It does not build a voyage-level annual compliance model** — no annual
totals, no pooling across calls, no FuelEU banking/borrowing balances, no
consecutive-year penalty multipliers, no fleet-level anything. That boundary
is inherent to the tool's shape (one call, priced at ports) and is recorded
here.

**Per-call honesty adjudication:**

- **ETS: honest per-call.** The directive's surrender obligation attaches to
  verified emissions reported per voyage and per port stay (the MRV data
  basis, E4): the per-voyage, per-port-portion emissions figure is a real
  quantity the instrument itself uses. A per-call ETS cost figure — the
  call's in-scope emissions × the allowance price × the phase-in fraction —
  is a faithful per-call rendering of an obligation that is genuinely
  incurred per voyage leg and port stay. The proration logic disclosed on
  the line: the entered emissions figure is the call's in-scope portion
  (the instrument's 50/100% leg split already applied), the phase-in
  fraction is the 2026 surrender percentage, and the price is the user's
  own. Every element is disclosed; nothing is hidden in the arithmetic.
- **FuelEU: NOT honest per-call — a notice, not a charge.** The compliance
  balance is the ship's *yearly average* GHG intensity against the target
  (E5: "the yearly average greenhouse gas (GHG) intensity of the energy
  used by ships"); the penalty prices the *annual* deficit; banking,
  borrowing, and pooling (E6, Articles 20–21) move balance across years and
  ships. A per-call FuelEU figure would require inventing an annual energy
  total, an annual intensity, and a proration of the annual penalty to one
  call — three unstated assumptions, and the pooled/banked balance makes
  even an honest annual figure unattributable to a single call. The
  exclusion-verdict discipline applies: **"FuelEU is an annual compliance
  balance, not a per-call charge — shown as a notice with the formula"** is
  the deliverable. The notice states the applicability (vessel in scope at
  this port), the standard (91.16 × (1 − 2%) = 89.34 gCO2e/MJ for
  2025–2029), the penalty rate (2,400 EUR/t VLSFO-eq), and that the
  balance is assessed annually per ship with pooling/banking/borrowing —
  never a per-call amount.

---

## 7. Encoding summary (Phase B design, per the silo principle)

Each port file carries its own `regulatory` family rules — the EU-wide rules
transcribed per port, the same convention as the national Sjöfartsverket
rules:

- One `eu_ets_allowances` rule per port (fee_family `regulatory`): a flat
  structure over the user inputs — `ets_emissions_tco2 × ets_allowance_price
  × 0.70` (the phase-in fraction data-authored per port file with the E2/E3
  citation), currency EUR at all three ports (EUAs are auctioned in EUR;
  the Swedish ports render the line in EUR under the local-currency
  contract with the comparison conversion applying as declared data) —
  **adjudication: the allowance is an EU-market instrument priced in EUR;
  the line states EUR and the existing conversion disclosure machinery
  handles the SEK comparison.** Gated on vessel GT ≥ 5,000 (engine-side
  applicability condition mirroring the instrument) and on both inputs
  being present; blank inputs render nothing (no zero line — the
  blank-means-nothing contract, the OPS precedent).
- One `fueleu_notice` rule per port (fee_family `regulatory`): fires as a
  zero-amount informational line with quality flags carrying the notice
  sentences and citations, wherever the vessel is ≥5,000 GT. Zero-amount by
  construction — it never adds to any total; the zero-line collapse keeps
  it visible (it carries flags, the informative-zero convention).
- Classification: the regulatory family classifies as `waste_environmental`
  (the environmental-dimension charge class) — the ETS line is a genuine
  cost line; the FuelEU notice is informational. Neither enters the
  vessel-access aggregate (both are excluded by design from the access
  classes).
- The stage adjudication (comparison view): the regulatory family lands in
  the **"To reach the berth"** stage's statutory-dues company (the
  reach-berth stage description already reads "and similar nautical and
  call dues"; the ETS allowance is a statutory call-voyage levy in the same
  sense as the Hafenfonds) — a new stage was considered and rejected: a
  fourth stage would re-shape the comparison surface for one family, and
  the regulatory charge accompanies the voyage and the call, not the berth
  or the cargo. The at-berth stage was also considered (the in-port
  emissions share) and rejected for the same reason: the obligation attaches
  to the whole voyage-and-port scope, not the berth stay.

## 8. Verification log

- 2026-09-29: E1, E2, E5, E6 fetched in full from europa.eu (official
  Commission sources) and archived as extracted text; the operative figures
  (5,000 GT threshold; 40/70/100% phase-in; 100/50% leg scope; 91.16
  reference value; 2/6/14.5/31/62/80% target ladder; 2,400 EUR/t VLSFO-eq
  penalty; Articles 3ga–3gg / 20–21 / Annex IV structure) cross-checked
  across at least two archived official sources each. EUR-Lex direct
  retrieval refused (robot check) at every route — recorded in §1; the
  extracts carry the EUR-Lex URLs as the references of record.
- 2026-09-29: The directive's instrument names corrected (2023/959 for
  "2023/2593"; 2023/957 for "Directive 2003/99"; 2023/1805 correct as
  named) — reported in the pass report per the scope guard.
- 2026-09-29: The default-call origin finding (the directive's "the default
  Maren Maersk calls are intra-EU in the model" vs. the actual
  `outside-europe` default) recorded in §4 — the block keys off the
  existing shared selector and its actual default.
- No rates were invented: the only figures carried into the encoding are
  the instruments' own (the phase-in fraction, the reference value, the
  target percentages, the penalty rate) and the observed 2024 auction band
  (stated as market context in helper text, never as a default price).
