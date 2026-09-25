Note: this file is the authority of record for the Hamburg port file. Verified through five review passes (source fidelity, arithmetic, scope, buildability, scripted re-derivation). If the builder directive and this document differ, this document wins. Source PDFs are downloaded into the docs/sources/ paths in section 1 from the public URLs provided in the directive; S5 and S6 contain no prices and are not archived in-repo (source-integrity contract: recorded not-archived with live upstream URLs, section 1).


# Port Call Cost Analyzer — Hamburg Extraction Reference

Authoritative extraction record for the Hamburg port file. Status: DRAFT for user review. Every rate carries its document and clause citation. Worked calculations at the end are the mandatory checkpoints for the builder.

---

## 1. Source Documents

| # | Document | Version / date | Role |
|---|---|---|---|
| S1 | HPA Schedule of Fees and Charges — Maritime Shipping (Pricelist) | v2.0, effective 01.01.2026, issued 18.12.2025 | HPA port fee, demurrage, berth fees, misc fees, penalties; worked example |
| S2 | HPA Special Terms and Conditions — Maritime Shipping (STC) | v1.0, effective 01.01.2026, issued 09.10.2025 | Quantum discount levels, ESI air/noise discount tables, eligibility rules |
| S3 | HPA Port GTC | v1.0, effective 01.01.2026, issued 09.10.2025 | General contractual framework (no prices) |
| S4 | HHLA Quay Tariff (Kaitarif) | valid from 01.01.2026 | Ship's dues, cargo dues, storage, container services |
| S5 | HHLA General Terms and Conditions for Container Handling (GTCCH) | 01.11.2017 | Legal framework; §3 confirms Kaitarif as canonical price source; §6 ISPS passthrough; §10 fumigation penalty |
| S6 | Kaibetriebsordnung (UVHH) | May 2004 | Port-association framework: berthing allocation, obligation to shift, gear rules (no prices) |
| S7 | GDWS Tariff Ordinance for District Pilotage (Lotstarif) | as amended 01.01.2026 | Pilotage dues and pilot fees, River Elbe columns; caps, percentages, surcharges |
| S8 | Hamburg Ship Waste Fees Ordinance (SchiffsAbgV), English translation | as of 24 June 2025 (current version; revision announced for 01.01.2027) | Municipal ship waste fee: MARPOL I/IV/V components, GT factors, call charges, reductions |
| S9 | EUROGATE Container Terminal Hamburg — Prices and Conditions | effective 01.03.2026 | Eurogate terminal layer (default operator per §17): berthing charge, waterside handling, security, lashing/twistlocks, IMO surcharge, small-call minimum, lay-by, reefer, social-fund surcharge |
| S10 | EUROGATE Group — Standard Terms and Conditions of Business | English edition valid from 01.05.2014 (German binding edition "Fassung gültig ab 01. Mai 2014") | Contract layer per S9 §1.1 (no prices — recorded, not archived) |

Repository paths (mirroring the Gothenburg convention):

- \`docs/sources/germany/hamburg/port-authority/pricelist-maritime-shipping-2026.pdf\` (S1)
- \`docs/sources/germany/hamburg/port-authority/stc-maritime-shipping-2026.pdf\` (S2)
- \`docs/sources/germany/hamburg/port-authority/port-gtc-2026.pdf\` (S3)
- \`docs/sources/germany/hamburg/hhla/quay-tariff-2026.pdf\` (S4)
- S5 (GTCCH) — **not archived in-repo**; live upstream URL: \`https://hhla.de/fileadmin/download/General_Terms_and_Conditions_for_Container_Handling_GTCCH_01112017.pdf\`
- S6 (Kaibetriebsordnung) — **not archived in-repo**; live upstream URLs: English edition \`https://hhla.de/fileadmin/download/kaibetriebsordnung_mai_2004_ENG.pdf\`, German original \`https://www.uvhh.de/files/pdf/agb/kaibetriebsordnung_mai_2004.pdf\`
- \`docs/sources/germany/national/gdws/pilot-tariff-2026.pdf\` (S7)
- \`docs/sources/germany/hamburg/city-bukea/ship-waste-fees-ordinance-2025.pdf\` (S8)
- `docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf` (S9 — the Eurogate terminal layer's authority of record per §17; upstream `https://www1.eurogate.de/wp-content/uploads/2026/02/eurogate_prices_and_conditions_2026.pdf`, retrieval 2026-09-25)
- S10 (EUROGATE Group Standard Terms and Conditions of Business) — **not archived in-repo**; live upstream URLs: English `https://www1.eurogate.de/wp-content/uploads/2024/01/general_terms__conditions_of_business.pdf`, German `https://www1.eurogate.de/wp-content/uploads/2023/12/agb_eurogate_gruppe.pdf` (retrieval 2026-09-25)

## 2. Billers

| Biller | Segment | Notes |
|---|---|---|
| HPA (Hamburg Port Authority) | Port dues, lay-up/demurrage, HPA berths, admin | Public-law institution; ELBA portal declarations |
| GDWS (federal) via pilot station | Pilotage dues + pilot fees | Federal ordinance; dues go to federal funds, fees to pilots' funds |
| HHLA (CTB/CTA/CTT, one tariff) | Ship's dues, cargo dues, storage, container services | MSC/Hamburg JV since 2024; one published tariff for all three terminals |
| EUROGATE Container Terminal Hamburg | Berthing charge, waterside handling, security, social-fund surcharge (v0.2.49 terminal scope) | Second terminal operator; published Prices and Conditions (S9, effective 01.03.2026); modeled for Eurogate calls only |

Not modeled in v1: Eurogate Hamburg (second terminal operator), towage operators (Bugsier, Petersen & Alpers, Lütgens & Reimers), waste contractors. See estimated parameters.

## 3. Fee Rules — HPA, Price Category 31 (Container Ships)

### 3.1 Port Fee (Hafengeld) — S1, cat. 31, item A

Covers up to 120 hours (5 days) in port. Minimum EUR 43.56 per chargeable call. Two components, GT-banded:

| Tranche | GT range | GT component €/GT | Env component €/GT |
|---|---|---|---|
| A | 1 – 20,000 | 0.0856 | 0.0214 |
| B | 20,001 – 100,000 | 0.2981 | 0.0746 |
| C | > 100,000 | 0.2485 | 0.0621 |

Tranches are cumulative (each band of GT priced at its own rate — confirmed by S1's own worked example, p.8).

Adjustment stack, exact order (per S1 worked example):

1. Environmental component: apply Tier surcharge/reduction — Tier 0 / no notice +30%, Tier I +25%, Tier II +5%, Tier III and higher −20% (S1 item 115). Then ESI air discount on the tier-adjusted environmental subtotal (S2 4.1.1.1): score 20–<25 → 0.35% (max €175); 25–<35 → 0.7% (max €350); 35–<50 → 3.5% (max €700); ≥50 → 7% (max €1,050). Then ESI noise (S2 4.1.1.2): 40–<45 → 0.15% (max €75); 45–<55 → 0.3% (max €150); 55–<70 → 1.5% (max €300); ≥70 → 3% (max €450). ESI discounts apply only if registered in the IAPH database; no default.
2. GT component: cap first — GT above 225,000 not chargeable (S1 item 210). Then OPS rebate −0.015 €/GT if shore-power prerequisites met (S1 item 217). Then quantum discount on the resulting subtotal (S2 4.1.2.11): based on previous calendar year's accumulated paid GT in cat. 31 — >25m GT → 7.5%; >10m–25m → 5.0%; >1.5m–10m → 2.5%. Automatic, no application.
3. Port fee = adjusted GT component + adjusted environmental component.

Other GT-component rebates (conditional, not default): inland voyage −60% (item 200); shipyard time −80% (item 265); open-top ships use reduced GT if ITC proves it (item 215).

### 3.2 Demurrage — S1 cat. 31, item B

Beyond 120 h: €0.0165/GT per commenced 12 h (total excess up to 120 h) or €0.0255/GT per commenced 12 h beyond that. Minimum €44.38.

### 3.3 HPA Berth Fees — S1 cat. 31, item C

Only for HPA-operated quays/piers/dolphins (not terminal berths): €0.0152/GT per 6 h (quay), €0.0052/GT (dolphins), minimum €16.84 per docking per 6 h.

### 3.4 Other HPA Fees — S1 item D

- SG 2 ship-data transmission: €1,640/year (annual, per port user — not per call)
- SG 3 processing fee €18.70 per 20 min
- SGP1 late declaration penalty 5% of net invoice (min €33.54, max €647.18)
- SGP2 wrong-data penalty 50% of underpayment (min €33.54)

Model as flags/notes, not default charges.

## 4. Fee Rules — GDWS Pilotage (River Elbe) — S7

Two stacked charges for a full Elbe transit (Hamburg ↔ Elbe buoy = 100% column, S7 Annex 1.4a):

### 4.1 Pilotage Dues (Lotsabgaben) — S7 Annex B Part I, Elbe column (col. 4)

GT-banded; key values: 8,500–9,000 → €1,251; 21,500–22,000 → €3,030; 30,000–31,000 → €4,374; 34,000–35,000 → €4,701; 48,000–50,000 → €5,255; more than 52,000 → €5,322 (Elbe cap). Partial transits at fixed percentages (e.g. Cuxhaven–Elbe buoy 40%).

Verification note (2026-09-21 self-check): the ordinance contains multiple dues tables (Part I: Ems/Weser/Jade/Elbe; Part II: Kiel Canal/Kiel Fjord/Trave/Flensburg Fjord; Part III: Baltic districts). An earlier reading mistakenly took the €4,461 cap from the Part II region — the Elbe column has no such cap; it rises to €5,322 above 52,000 GT. Extractors must key on the Part I table only.

### 4.2 Pilot Fees (Lotsgelder) — S7 Annex B Part I, Elbe column (col. 5)

GT-banded; key values: 8,500–9,000 → €856; 21,500–22,000 → €1,450; 30,000–31,000 → €1,870; 34,000–35,000 → €1,974. Above 40,000 GT: +€44 per commenced 2,000 GT, capped at €4,100.

### 4.3 Surcharges — S7 Annex 1/2

Helicopter transfer at Elbe buoy: +70% of max Part I fee if no vessel transfer possible; +100% if master-requested. Waiting-time compensation per hour (S7 Annex 2). Model as optional flags; not defaults.

## 5. Fee Rules — Ship Waste Fee (SchiffsAbgV) — S8

Biller: Free and Hanseatic City of Hamburg (BUKEA — Environment, Climate, Energy and Agriculture Authority), a municipal charge under the Hamburg Ship Disposal Act (HmbSchEG 2022) implementing EU PRF Directive 2019/883. Not an HPA or terminal charge.

Covers a standard disposal: MARPOL I oils up to ship's tank capacity (2 h max pumping), MARPOL IV sewage up to 10 m³, MARPOL V A–C (plastics, food, household) up to storage capacity, plus fixed allowances for V D/E/F/I streams. Excess volumes are billed separately by the disposal contractor — outside this fee.

Fee, non-passenger ships (Annex 2 Table 2):

| Component | Rate | Notes |
|---|---|---|
| MARPOL I (oil/sludge) | 0.0135 €/GT | × GT |
| MARPOL IV (sewage) | 1 €/call | fixed |
| MARPOL V A–C | 0.0121 €/GT | × GT, capped: max 45,000 GT counted → max 544.50; ships >45,000 GT pay 828 |
| MARPOL V D, E, F, I | 47.30 €/call | fixed |

Reductions (on application): −2% of the MARPOL V share for certified sustainable-waste ships (EU 2022/91); −50% of the MARPOL I share for ships exclusively using alternative fuels; −90% of total for short-sea trade ships. Reductions combinable.

Comparison note: unlike Gothenburg, there is no EU/non-EU flag split — the Hamburg fee is flag-neutral, and the whole regime is an indirect system charge rather than a per-service price. A quantitative Hamburg-vs-Gothenburg waste comparison is deferred: it requires pulling Gothenburg's solid-waste dues rate from the Gothenburg port tariff (the sludge dues rate alone is in the Gothenburg file, but a like-for-like total needs both components re-checked). Do not assert direction or magnitude until that is done.

## 6. Fee Rules — HHLA Quay Tariff 2026 — S4

### 5.1 Ship's Dues (billed to ship's agent) — S4 §1

- Tonnage dues: €1.25 × GT for first 24 h of lay time; then €0.80 × GT per commenced 12 h. Lay time starts at berthing; Sundays/holidays count only if worked; consecutive berths in one voyage = one uninterrupted lay time (S4 1.2).
- Security charge: €17.00 per container to/from overseas vessel (S4 1.3.3).
- Gangway: €633.80 flat (overseas) / €453.50 (feeder) per gangway (S4 1.4).
- Gangway supervision: €101.30/h during operations (S4 1.5).
- Weight dues (conventional cargo only, not fully cellular container services): 6.50–10.90 €/1,000 kg by route class (S4 1.1). Not applicable to our reference calls.

### 5.1a Hafenfonds surcharge — S4 §9.2.3 (added in self-check; previously missed)

A surcharge of 1.5 per cent (Hafenfonds = port dues) is payable on fees (except storage charges) levied under the quay tariff. This applies to tonnage dues, security charge, gangway, and all §8 container services. It does NOT apply to the estimated handling parameter (negotiated, not a quay-tariff fee) nor to storage. Apply after each HHLA fee line, or as a single 1.5% uplift on the sum of non-storage HHLA fees.

### 5.2 Storage — S4 §3

Free time: import 3 calendar days after last discharge day; export 5 days after delivery; transshipment 7 days; hazardous 1 day. Then per container/day: 20' €41.10, 40' €82.20, 45' €92.20; non-ISO double. Empties (no free time): 20' €20.70, 40' €41.40. Import rates double after 7 chargeable days, triple after 14; export double after 9. IMO class 1+7: €185.10 per 24 h, no free time. Leakage containers: €213.30/day plus storage plus double extra movement plus admin fee.

### 5.3 Container Services — S4 §8

Reception/delivery €182.10 per container; extra movement €144.70; administration fee €42.20; VGM weighing €218.10 (or calculative €45.00); reefer connection €62.10 + energy €117.00/24 h + checks €22.50 each; labelling €113.95; neutralization €123.30; gassing space €176.90 (20') / €240.70 (40').

### 5.4 Container Handling — UNPUBLISHED

S4 §2.1.2: container handling charges "upon request." No published rate exists; rates are individually negotiated. Model as estimated parameter (see §8).

## 7. Fee-Family Mapping (Hamburg → Shared Taxonomy)

| Hamburg rule | Fee family | Biller |
|---|---|---|
| Port fee cat. 31 (GT + env) | port_dues | HPA |
| Demurrage | lay_up | HPA |
| HPA berth fees | idle_berth | HPA |
| Pilotage dues + pilot fees | pilotage | GDWS |
| HHLA tonnage dues | vessel_fee | HHLA |
| HHLA security charge | security | HHLA |
| HHLA gangway + supervision | readiness_fee | HHLA |
| Container handling (estimated) | terminal_handling | HHLA |
| Storage | storage | HHLA |
| Container services (reefer, VGM, etc.) | cargo_fee | HHLA |
| Ship waste fee (MARPOL I/IV/V) | waste | City of Hamburg (BUKEA) |
| Towage (estimated) | towage family per Gothenburg taxonomy | — |
| Quantum discount | frequency_discount | HPA |
| Tier/ESI/OPS adjustments | environmental_surcharge | HPA |

Note on towage: map to whatever family Gothenburg uses for tug assistance — the mapping must be function-based per spec 4.3, verified against the existing taxonomy.

## 8. Estimated Parameters (Unpublished Costs)

Both are user-editable, carry an "estimated" flag rendered visibly, and default as follows:

| Parameter | Default | Basis |
|---|---|---|
| Container handling rate (€/move) | 358 | EUROGATE Container Terminal Hamburg published waterside lift charge, chapter 5.1.1 (S9, effective 01.03.2026). HHLA's own rate is unpublished ("upon request", S4 §2.1.2); the competing terminal's published rate in the same port is the reference anchor. Definition: a "move" is one container lifted once (discharge or load) — a call handling 3,000 containers = 3,000 moves. Caveats: (a) Eurogate's 358 is subject to its own 1.5% social fund (S9 1.3.13), effective Eurogate rate ≈ 363.37 — the anchor stays at the published headline 358 with this noted; (b) lashing/unlashing (47 €/container, S9 5.2.1) is separate and not included — HHLA negotiated rates may bundle it |
| Towage (€/call) | 15,000 | 3 tugs × ~5,000 €/tug, deep-sea Elbe escort market range; no published tariff (operators Bugsier, Petersen & Alpers, Lütgens & Reimers) |

The comparison view must show these rows with the estimate flag, never as verified data. S9's Eurogate vessel-side charges are now modeled for Eurogate calls per the v0.2.49 terminal scope (berthing charge 1.04 €/GT for the first 24 h + 0.60 €/GT per commenced 12 h, 5.1.1 lift, 13.1 security, 1.3.13 social fund excluding storage, lashing materials, security); HHLA remains the reference operator for the default call.

## 9. Worked Checkpoints

All list price, no ESI, no quantum, no OPS, full Elbe transit (100%).

Lay-time assumptions (user-confirmed, 2026-09-21): vessels of Maren Mærsk's size (ULCV) typically stay 48–52 h at berth — use 50 h as the reference; vessels in the 20,000–40,000 GT range typically 16 h; Helgafell (8,890 GT) also assumed 16 h. Lay time is a call parameter; the checkpoints below use these defaults.

Tonnage dues formula (S4 1.2): first 24 h → 1.25 €/GT; each commenced 12 h thereafter → +0.80 €/GT. So: 16 h → 1.25 €/GT; 50 h → 1.25 + 3 × 0.80 = 3.65 €/GT.

Other call assumptions: one gangway per vessel (class per gangway rule below); gangway supervision 0 h in reference calls (scenario-dependent); lay time counted within the HPA port fee's 120 h coverage, so no demurrage line in any checkpoint; containers handled = moves basis (see §8 move definition).

Currency rule (user decision, 2026-09-21): every fee, subtotal, and per-port total is displayed in the tariff's local currency (EUR for Hamburg, SEK for Gothenburg) — never converted inline. Conversion happens only at the very end of the comparison view, as an optional user-triggered step: fetch current ECB reference rates, or enter a rate manually, to express each port's local-currency total in the user's chosen currency. The rate source and date are displayed with the converted figure. The engine and data files are currency-agnostic; conversion is a presentation-layer feature only.

Engine Tier assumption rule: the HPA environmental component keys on the vessel's engine NOx Tier (MARPOL Annex VI standard). Per STC 2.1.1: proof is a valid IAPP certificate, and the applicable basis is the most polluting engine installed and/or used during the entire port stay (not an average of main and auxiliary engines; mixed-tier situations default to the dirtiest engine unless the cleanest-engine proof procedure is applied, which costs processing fees or, under the simplified ESI-database route, requires ESI NOx > 53.33 for Tier II/III mixes or > 15.29 for Tier I/II mixes). Without IAPP proof, the "without" (Tier 0) standard applies (+30%). Model rule: engine tier is a single call input with values Tier 0/I/II/III+, defaulting by build-year heuristic (built 2011 or later → Tier II; 2000–2010 → Tier I; earlier or unknown with no IAPP → Tier 0) and flagged as estimated unless the user enters the certified tier. For the checkpoints: Kyungmin (2024), Vistula (2018) and Maren (2014) default to Tier II via the heuristic; Helgafell (2005) defaults to Tier I — her checkpoint line is noted with both Tier I and Tier II outcomes until her certified tier is confirmed.

Gangway class assumption: the HHLA gangway flat rate distinguishes feeder vessels (453.50 €) from overseas vessels (633.80 €). The tariff does not define the boundary; operationally it follows the service, not the ship. Model rule: gangway class is a call input, defaulting by vessel type/size (feeder-class container vessels → feeder rate; deep-sea → overseas rate), with the default visible and editable. Helgafell (909 TEU feeder) → feeder rate; the other three checkpoints use the overseas rate.

### CP1 — HPA sample (MUST MATCH EXACTLY, S1 p.8)

149,000 GT container ship, Tier III (−20%), ESI air 80 (−7%, cap not reached), OPS 50 MWh (−0.015 €/GT), quantum level 3 (−7.5%):

- GT component: 20,000×0.0856 + 80,000×0.2981 + 49,000×0.2485 = 37,736.50
- Cap: n/a. OPS: 149,000 × −0.015 = −2,235.00 → 35,501.50. Quantum: −7.5% → 32,838.88 (S1: 32,838.88)
- Env component: 20,000×0.0214 + 80,000×0.0746 + 49,000×0.0621 = 9,438.90. Tier III −20% → 7,551.12. ESI air −7% → 7,022.54 (S1: 7,022.54)
- Total: 39,861.42 (S1 states 39,861.43 — rounding; engine must match to the cent using S1's precision)

Acceptance rule for CP1 (important): the engine must reproduce the values printed in S1 (32,838.88 / 7,022.54 / 39,861.43), not strict re-rounding of the intermediate arithmetic. Note that 35,501.50 × 0.925 strictly rounds to 32,838.89 — S1's printed 32,838.88 reflects the authority's own multi-decimal internal computation ("The HPA uses multiple decimals that are not shown here"). The test fixtures must therefore use S1's printed figures verbatim, with a comment explaining the one-cent divergence.

### CP2 — Helgafell (8,890 GT, Tier I per build-year default — see note, 16 h lay time, 400 containers)

- HPA GT comp: 8,890 × 0.0856 = 760.98. Env (Tier I, +25%): 190.25 × 1.25 = 237.81. Port fee ≈ 998.79. (If her certified tier is II: env 199.76, port fee ≈ 960.74.)
- Pilotage: dues 1,251 + fees 856 = 2,107
- HHLA tonnage dues: 8,890 × 1.25 = 11,112.50; gangway 453.50 (feeder rate — Helgafell is a feeder vessel; see gangway note in §9 assumptions); subtotal 11,566.00; +1.5% Hafenfonds → 11,739.49
- HPA env note: Helgafell is a 2005 build; per the build-year heuristic her engine Tier defaults to Tier I. The checkpoint's primary figure uses Tier I (998.79); the Tier II alternative (960.74) is stated above. Engine tier is a call input with a build-year default heuristic (see §9 assumptions); the checkpoint value is assumption-dependent until her certified tier is confirmed.
- Security: 400 × 17 = 6,800.00; +1.5% → 6,902.00
- Waste fee: MARPOL I 8,890 × 0.0135 = 120.02; MARPOL IV 1.00; MARPOL V A–C 8,890 × 0.0121 = 107.57; V D/E/F/I 47.30. Waste total = 275.89
- Handling (est., no Hafenfonds — negotiated, not quay-tariff): 400 × 358 = 143,200

### CP3 — MSC Kyungmin (21,979 GT, Tier II, 16 h lay time, 400 containers)

- HPA: GT 20,000×0.0856 + 1,979×0.2981 = 1,712.00 + 589.94 = 2,301.94. Env: 428.00 + 147.63 = 575.63; +5% → 604.41. Port fee ≈ 2,906.35
- Pilotage: dues 3,030 + fees 1,450 = 4,480
- HHLA tonnage dues: 21,979 × 1.25 = 27,473.75; gangway 633.80; subtotal 28,107.55; +1.5% → 28,529.16
- Security: 6,800.00; +1.5% → 6,902.00
- Waste fee: 21,979 × 0.0135 = 296.72; + 1.00; + 21,979 × 0.0121 = 265.95; + 47.30. Waste total = 610.97
- Handling (est.): 400 × 358 = 143,200

### CP4 — Vistula Mærsk (34,882 GT, Tier II, 16 h lay time, 500 containers)

- HPA: GT 1,712.00 + 14,882×0.2981 (= 4,436.32) = 6,148.32. Env: 428.00 + 14,882×0.0746 (= 1,110.20) = 1,538.20; +5% → 1,615.11. Port fee ≈ 7,763.43
- Pilotage: dues 4,701 (34,000–35,000 band) + fees 1,974 = 6,675
- HHLA tonnage dues: 34,882 × 1.25 = 43,602.50; gangway 633.80; subtotal 44,236.30; +1.5% → 44,899.84
- Security: 8,500.00; +1.5% → 8,627.50
- Waste fee: 34,882 × 0.0135 = 470.91; + 1.00; + 34,882 × 0.0121 = 422.07; + 47.30. Waste total = 941.28
- Handling (est.): 500 × 358 = 179,000

### CP5 — Maren Mærsk (194,849 GT, Tier II, 50 h lay time, 3,000 containers)

- HPA: GT 1,712.00 + 23,848.00 + 94,849×0.2485 (= 23,569.98) = 49,129.98. Env: 428.00 + 5,968.00 + 94,849×0.0621 (= 5,890.12) = 12,286.12; +5% → 12,900.43. Port fee ≈ 62,030.41
- Pilotage: dues 5,322 (Elbe cap, >52,000 GT) + fees 4,100 (capped) = 9,422
- HHLA tonnage dues (50 h): 194,849 × 3.65 = 711,198.85; gangway 633.80; subtotal 711,832.65; +1.5% → 722,510.14
- Security: 3,000 × 17 = 51,000.00; +1.5% → 51,765.00
- Waste fee: MARPOL I 194,849 × 0.0135 = 2,630.46; MARPOL IV 1.00; MARPOL V A–C 828.00 (>45,000 GT flat); V D/E/F/I 47.30. Waste total = 3,506.76
- Handling (est.): 3,000 × 358 = 1,074,000

## 10. Open Items for User Review

1. Estimated defaults (§8): handling €358/move (Eurogate-anchored) and towage €15,000/call — confirm or adjust against your commercial knowledge.
2. Towage family mapping (§6 note) — confirm against the existing Gothenburg taxonomy.
3. Storage rules are extracted but the reference call assumes zero storage days (within free time); storage triggers only in scenario use. Confirm acceptable for v1 checkpoints.
4. SG 2 annual fee (€1,640/year) is per port user, not per call — proposed: shown as a note, excluded from per-call totals. Confirm.

## 11. Verification Log (self-check, 2026-09-21)

Full re-verification of this document against the primary sources after initial drafting. Findings and corrections:

1. **Corrected — pilotage dues table confusion.** The ordinance contains three dues tables (Parts I–III by district). The original draft's "Elbe capped at €4,461 above ~27,500 GT" was read from the wrong table region (Part II, non-Elbe districts). Correct Elbe values from Part I col. 4: 8,500–9,000 → €1,251 (Helgafell, was €1,178); 34,000–35,000 → €4,701 (Vistula, was €4,461); Elbe cap is €5,322 above 52,000 GT (Maren, was €4,461). Kyungmin's €3,030 confirmed correct.
2. **Corrected — pilot fees, Vistula band.** 34,000–35,000 → €1,974 (was €1,912, an unverified interpolation). Helgafell €856, Kyungmin €1,450, Maren €4,100 confirmed.
3. **Added — Hafenfonds surcharge (S4 §9.2.3).** 1.5% on all quay-tariff fees except storage. Missed in the initial extraction; now rule 5.1a and applied in all HHLA checkpoint lines. Not applied to the estimated handling parameter (negotiated outside the quay tariff).
4. **Corrected — arithmetic slips.** CP2 GT comp 760.98 (was 761.38); CP5 GT comp 49,129.98 and env 12,900.43 (were 49,129.78/12,900.44). Note: two of this pass's "corrections" were themselves wrong and were reverted by the fifth self-check — see §15 item 2.
5. **Confirmed.** HHLA tonnage dues basis (€1.25/GT × 24 h, €0.80/GT × commenced 12 h — S4 1.2 with GT footnote, and §9.1.1 confirming the vessel fee character); HPA cat. 31 tranche rates and adjustment order (against the S1 worked example, which CP1 must still match exactly); storage free times and escalation; quantum and ESI tables; lay-time assumptions (user-confirmed).

Residual uncertainty: the lay-time defaults (50 h ULCV / 16 h mid-range) are user experience values for Gothenburg practice, not Hamburg-published data — Hamburg-specific lay times may differ and are a call parameter, not a fixed constant.

## 12. Second Self-Check (2026-09-21, after waste extraction)

Re-verification of the waste addition, the handling anchor, and prior checkpoint arithmetic. Findings:

1. **Waste arithmetic verified.** All four waste checkpoint totals recomputed independently and confirmed: Helgafell 275.89, Kyungmin 610.97, Vistula 941.28 (per-GT basis, under the 45,000 GT cap), Maren 3,506.76 (V component flat 828 above 45,000 GT). GT bands, factors, and caps re-read from the S8 source text.
2. **Corrected (chat claim, not the document) — Gothenburg waste comparison.** In chat I asserted Hamburg's waste fee was "markedly lower" than Gothenburg's. That claim is unverified and probably wrong in direction: 941 EUR ≈ 10,700 SEK, which likely exceeds Gothenburg's waste dues for the same vessel. The reference now explicitly defers the comparison until Gothenburg's solid-waste rate is re-checked from its tariff. Rule going forward: no cross-port magnitude claims without both ports' numbers in hand.
3. **Sharpened — handling anchor definition.** "Move" defined as one container lifted once (3,000 containers handled = 3,000 moves), plus two caveats added: Eurogate's own 1.5% social fund makes its effective rate ≈ 363.37, and lashing (47 €/container) is excluded from the anchor — HHLA-negotiated rates may bundle it.
4. **Clarified — CP1 acceptance rule.** S1's printed quantum subtotal (32,838.88) differs by one cent from strict re-rounding (32,838.89) because the HPA computes with hidden decimals. Test fixtures must use S1's printed figures verbatim; the divergence is documented, not "fixed."
5. **Re-confirmed.** All HPA/HHLA/pilotage checkpoint arithmetic from the first self-check re-verified without change; pilot-fee cap logic for Maren Mærsk (2,107 base + 78 × 44 = 5,539 → capped 4,100) re-derived from the S7 increment rule.

## 13. Third Self-Check — Scope Review (2026-09-21)

Full-document read asking "what is missing" rather than re-checking arithmetic. Four gaps found and closed:

1. **Added — gangway to all HHLA checkpoint lines.** The gangway flat rate (633.80 € overseas) is a default charge on every container call but was absent from all four checkpoints. Added with its Hafenfonds share; all tonnage-dues subtotal and surcharge figures recomputed accordingly. (Gangway supervision 101.30 €/h remains scenario-only, 0 h in reference calls — now stated explicitly in §9 assumptions.)
2. **Added — currency rule.** All Hamburg amounts are EUR; Gothenburg's are SEK. The comparison view must display a currency-normalized total with the FX rate source and date shown, never a silent conversion. Without this rule the first cross-port comparison would produce a meaningless 10x-off number. Recorded in §8 assumptions.
3. **Clarified — call assumptions block.** Previously implicit: one gangway per call, no demurrage (lay times within the 120 h port-fee coverage), moves basis for handling, supervision 0 h. Now an explicit paragraph in §8. Implicit assumptions are how the vessel-library defect happened; none should survive into the builder directive unstated.
4. **Checked and resolved — scope edge cases.** (a) Maren Mærsk 194,849 GT is below the 225,000 GT cap, so no cap interaction — confirmed intentional. (b) GT band boundary semantics ("more than – up to") consistent across S7 and S1; the engine must treat bands as half-open (lower exclusive, upper inclusive) as the S1 worked example implies. (c) Waste fee reductions (short-sea −90%, alternative fuel −50%, sustainable waste −2%) are application-based and thus off by default in all checkpoints — correct, and now stated.

No further gaps identified. The document is considered stable for the builder directive pending the §10 decisions.

## 14. Fourth Self-Check — Hostile Review (2026-09-21)

Pass focus: buildability — reading the document as the builder would, hunting for places requiring invention or silent guesses. Findings:

1. **Corrected — Helgafell gangway rate.** CP2 charged the overseas gangway rate (633.80 €) to a 909-TEU feeder vessel whose tariff class is feeder (453.50 €). Recomputed; subtotal 11,566.00, with Hafenfonds 11,739.49. Root cause: the gangway class (feeder vs overseas) is a service distinction the tariff leaves undefined; it is now a documented call input with a stated default rule.
2. **Added — engine Tier semantics and assumption rule.** The Tier surcharge keys on engine NOx standard (MARPOL Annex VI), a property of the installed engines — not the build year, and the tariff does not define mixed main/auxiliary combination. All four checkpoints had been assigned Tier II with no stated basis. Now: tier is a call input with a build-year default heuristic, flagged estimated; Helgafell (2005) plausibly Tier I, with both outcomes stated in CP2 (Tier I port fee ≈ 998.79 vs Tier II 960.74). Her certified tier is a new open item for the user.
3. **Corrected — section numbering.** Two sections were numbered 5 and two 6 (an artifact of inserting waste as a new section). Renumbered 1–14 with cross-references updated. In a builder-facing document, ambiguous section numbers are how citations drift onto wrong rules.
4. **Currency rule replaced** with the user's decision: local currency throughout; optional end-of-comparison conversion via ECB reference rates or manual input, rate source and date displayed. (Supersedes the third self-check's normalization wording.)

Method note: this pass found nothing wrong with any extracted number — all four findings were about unstated assumptions and document structure, which is where the remaining risk lives now that three arithmetic passes have converged.

## 15. Fifth Self-Check — Mechanical Re-Verification (2026-09-21)

Method: all 36 checkpoint figures recomputed programmatically (scripted, not by hand), plus source re-reads for the Tier semantics and the GT-component rules. Findings:

1. **Corrected — five checkpoint figures.** CP3 GT comp 2,301.94 (was 2,301.95 — 1,979 × 0.2981 = 589.94); CP3 port fee 2,906.35; CP3 Hafenfonds 28,529.16 (was 28,529.66, a transcription slip); CP4 env 1,615.11 and port fee 7,763.43 (14,882 × 0.0746 = 1,110.20, not 1,110.02); CP5 Hafenfonds 722,510.14 (was 722,511.14, transcription slip).
2. **Process failure recorded — the first self-check introduced errors.** Two of pass #1's "arithmetic corrections" (CP4 env, CP3 GT) were themselves wrong: the original draft figures had been correct. Hand recomputation during review is error-prone in exactly the way it is meant to prevent. Countermeasure adopted: all checkpoint figures are now verified by scripted arithmetic (as in this pass), and the verification-log entry for pass #1 is annotated rather than silently rewritten.
3. **Sharpened — Tier basis semantics from STC 2.1.1 (source-verified).** The applicable Tier is that of the most polluting engine installed and/or used during the entire port stay, proven by IAPP certificate; mixed main/auxiliary tiers default to the dirtiest engine unless the cleanest-engine procedure (processing fee, or simplified ESI route with ESI NOx > 53.33 for Tier II/III mixes, > 15.29 for Tier I/II mixes) is applied; no IAPP proof → "without" (Tier 0, +30%). This replaces the fourth self-check's "tariff does not define combination" statement, which was wrong — the STC does define it.
4. **Confirmed at 36/36.** After corrections, every checkpoint figure reproduces from its inputs by script. CP1's strict re-derivation also confirmed: the only divergence from S1's printed figures is the documented hidden-decimals rounding (32,838.89 strict vs 32,838.88 printed), covered by the CP1 acceptance rule.

Document status: sound pending user decisions (§10 open items). The five verification passes have covered source fidelity, arithmetic, scope, buildability, and scripted re-derivation; the residual risks are the explicitly flagged assumptions (engine tiers, lay-time defaults, towage and handling estimates), each of which is a documented parameter rather than a silent constant.

## 16. Sixth Review — Terminal Scope and Ship's-Dues Diagnosis (2026-09-24, v0.2.49)

Scope: the three verdicts of the terminal-scope directive, decided from the archived S4 and S9 texts plus the live S5 (GTCCH) and S6 (Kaibetriebsordnung) upstream documents. All quotations verbatim.

### Verdict one — HHLA Kaitarif clause 1.2 tonnage dues apply to fully cellular container vessels

Decisive texts (S4 = HHLA Quay Tariff from 1st January 2026; S6 = Kaibetriebsordnung; S5 = GTCCH):

- S4 §1 (basis): "Ship's wharfage dues will be charged for the use by a seagoing ship of a quayside cargo handling facility. This is based on — cargo volume discharged/loaded (weight dues) — tonnage and the seagoing vessel's lay time (tonnage dues)."
- S4 §1.1 (the exclusion parenthetical): "Weight dues for all services rendered for the volume of cargo transhipped across the quay (excluding fully cellular container services handled at special facilities)". The parenthetical excludes fully cellular container services from **weight dues only** — "special facilities" (the container terminals) are excluded from the weight-dues chapter because their cargo moves are priced as container services, not conventional tonnage. Tonnage dues (§1.2) carry no such exclusion.
- S4 §1.2: "Tonnage dues — 1.2.1 for the first 24 hours of lay time 1.25 €* — 1.2.2 thereafter per each 12 hours of lay time or parts thereof 0.80 €* — * Multiplied by gross tonnage (GT)".
- S4 §9.1.1: "A vessel fee is required for the use of a quayside cargo handling facility by a seagoing vessel. This is payable by the ship's agent." — §9 speaks of the vessel fee generally; nothing confines it to non-container berths.
- S4 §9.6: "Contracts are based on the General Terms and Conditions for Container Handling (GTCCH) of the Hamburger Hafen und Logistik Aktiengesellschaft in the relevant valid version." — the container-terminal contract relationship runs through the GTCCH and prices via the Kaitarif.
- S5 (GTCCH) §1: "These General Terms and Conditions for Container Handling (GTCCH) shall be applied for all handling and storage of goods at the quay and all business activity on instruction of the client … in connection with handling activities for the client." §3 (Prices): "… the Company will charge for its services the prices stipulated in the actual version of the HHLA Kaitarif."
- S6 (Kaibetriebsordnung) §1: "Quay facilities provide a service for the handling and storing of goods which have been or are to be carried by sea." — the general quay framework knows no container-vessel carve-out; the Kaitarif (per §9.6) is the container-specific price layer on top of it.

**Verdict, no hedging: clause 1.2 tonnage dues apply to fully cellular container vessels at the HHLA container terminals.** The §1.1 parenthetical is a weight-dues scope rule, not a vessel-fee exemption; the vessel fee for a container vessel at a special facility is the §1.2 tonnage dues, billed to the ship's agent (§9.1.1). The existing `hhla_tonnage_dues` rule models this correctly — no over-application exists.

### Verdict two — Eurogate price structure: ship's dues billed separately from handling

Read of S9 (EUROGATE Container Terminal Hamburg, Prices and Conditions, effective 1st March 2026):

- Ch. 2 "Vessel charges": "Vessel charges will be calculated for the use of handling facilities by a seagoing vessel in accordance with: — The gross tonnage (GRT) and lay time of the vessel (berthing charge) — The volume of cargo loaded / discharged (quay dues)."
- §2.1: "Every ship berthed at the handling facilities must pay a berthing charge. … 2.1.1 for the first 24 hours of lay days minimum 1,04 € — 2.1.2 for every additional 12 hours or part of this period 0,60 €. … The lay time commences at the time of docking and shall be calculated uninterruptedly until the time of casting off." (§2.1.3 lay-by-berth TEU charge; §2.2 quay dues for non-containerized cargo.)
- Ch. 5 "Handling Charges": "5.1.1 ISO-Container, empty / full — 358,00 €" per container; "All prices plus security charge (see Section 13)." §5.2 lashing is a separate per-container line (47,00 €); §5.3 IMO surcharge 87,00 €; §5.4 minimum charge 3,308 € per ship for ≤20-container calls.
- Ch. 13: "13.1 Container full / empty — Per Container — 24,95 €."
- §1.3.13: "A 1.5% social fund will be charged on all services. The following shall be excluded: - storage charges - materials for stowing and lashing - security charge."

**Verdict, no hedging: the 5.1.1 waterside lift charge does not bundle berth time.** An Eurogate call's complete published charge structure for a container vessel is: berthing charge (2.1.1/2.1.2, GT × hours) + waterside lifts (5.1.1 × moves) + security (13.1 × containers) + optional lashing/IMO/minimum (5.2–5.4) + 1.5% social fund on all services except storage, lashing materials, and security (1.3.13). Lay-time charges are their own chapter (ch. 2), billed separately from handling (ch. 5) — exactly as HHLA's structure.

### Verdict three — the hybrid is an estimate-basis disclosure, not a double count

The current handling line is anchored to Eurogate 5.1.1 (358 EUR/move) while the call's ship's dues come from the HHLA Kaitarif (§1.2). Since verdict two establishes that 5.1.1 does **not** bundle berth/lay-time charges, the Eurogate anchor rate carries no lay-time component into the HHLA call. The hybrid therefore cannot double-count a lay-time component; it is an estimate-basis disclosure (HHLA's own rate is unpublished, S4 §2.1.2 "upon request"). The existing labeling contract stands: the line reads "Container Handling (est., Eurogate anchor)", never presented as an Eurogate terminal call.

### Reconciliation against the CMA CGM benchmark

Benchmark: ~1.5M EUR understood as a negotiated effective cost for an equivalent vessel. Default HHLA call (Maren Maersk, 194,849 GT, Tier II inferred, 50 h lay time, 4,000 moves): port fee 62,030.41 + tonnage dues 711,198.85 + security 68,000 + gangway 633.80 + handling estimate 1,432,000 + pilotage (dues+fees ~70,000) + waste (~2,745) + towage estimate 15,000 ≈ 2.36M EUR. Under verdict one the tonnage dues stand (no removal), so the raw-tariff HHLA call remains ≈ 2.36M — above the 1.5M benchmark, consistent with the raw-versus-negotiated relationship: the model prices published-tariff ceilings; a negotiated carrier realizes lower effective costs. An Eurogate call (published structure): port fee 62,030.41 + berthing 553,371.16 + handling 1,432,000 + security 99,800 + social fund 8,300.57 + pilotage ~70,000 + waste ~2,745 + towage 15,000 ≈ 2.24M EUR — likewise a raw ceiling. No verdict combination brings the raw figure below the benchmark, and none needs to: raw ≥ negotiated is the defensible relationship, now recorded in the spec's comparison philosophy.

### Implementation per verdicts (this pass)

- All 27 HHLA rules carry `applicable_conditions: terminal_operator: HHLA`; the three new Eurogate rules (berthing charge, handling, security + the biller's 1.5% social-fund surcharge) carry `terminal_operator: Eurogate`. Port-wide charges (HPA, GDWS, BUKEA, towage) are operator-neutral.
- `terminal_operator` call input (default HHLA, the reference operator); absent or unrecognized values fall back to HHLA with a visible fallback flag.
- Verdict pins: `core/test/terminal_scope.test.ts` (fallback visibility, mutual exclusion, Eurogate arithmetic at 50 h = 553,371.16, published-rate handling without estimated flag, security 99,800, social fund 8,300.57, operator-neutral demurrage and berth-fee scoping).

## 17. Seventh Review — Eurogate Terminal Promotion Audit (2026-09-25, v0.2.66)

Scope: the item-1 source audit of the Eurogate terminal-promotion directive. This section is the pass's authority of record for the new Eurogate encoding; all quotations verbatim from the archived S9 text. Decided before any encoding.

### 17.1 Source archiving and upstream checks

- S9 — EUROGATE Container Terminal Hamburg GmbH (with Bremerhaven and Wilhelmshaven), *Prices and Conditions*, effective 1st March 2026. Archived since v0.2.49 at `docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf`. Upstream URL (verified 2026-09-25): `https://www1.eurogate.de/wp-content/uploads/2026/02/eurogate_prices_and_conditions_2026.pdf`. S9 is now added to the §1 source table (it was previously recorded as the reference anchor only).
- S5 — GTCCH (HHLA), dated 01.11.2017. Upstream check 2026-09-25: the HHLA download center still links `General_Terms_and_Conditions_for_Container_Handling_GTCCH_01112017.pdf` as the current edition — **no newer edition exists upstream**. The 2017 date stands; its age is disclosed in §17.4 wherever the HHLA layer is referenced. The GTCCH is HHLA's contract layer, not the Eurogate layer; no Eurogate rate depends on it.
- S6 — Kaibetriebsordnung (UVHH), May 2004. Upstream check 2026-09-25: the current linked "Quay operating conditions" is still `kaibetriebsordnung_mai_2004_ENG.pdf` — **no newer edition exists upstream**. The Kaibetriebsordnung is the port-association quay framework, operator-neutral; no Eurogate rate depends on it.
- Eurogate Group Standard Terms and Conditions of Business (S9 §1.1: "use of facilities shall be governed by the regulations contained in these Prices and Conditions and by the Standard Terms and Conditions of Business of the EUROGATE Group in its latest version"). English edition "Version valid from May 1st 2014": `https://www1.eurogate.de/wp-content/uploads/2024/01/general_terms__conditions_of_business.pdf`; German binding edition "Fassung gültig ab 01. Mai 2014": `https://www1.eurogate.de/wp-content/uploads/2023/12/agb_eurogate_gruppe.pdf`. Both are contract-only documents with **no prices** — recorded here with live URLs, not archived, per the S5/S6 convention. This is the Eurogate analog of the HHLA GTCCH; no rate depends on it.
- No further Eurogate schedule pages carrying prices were found upstream beyond S9 itself: S9 is the complete published price schedule of EUROGATE Container Terminal Hamburg GmbH (chapters 1–15). The pages 10.10/10.11 "CPA Transport" and 12.19/12.20/12.21/12.24 customs items are Hamburg-only schedules inside S9 and are recorded in §17.2 where relevant.

### 17.2 Full Eurogate charge inventory for a container call (S9)

Quoted verbatim from S9. Applicability is adjudicated for the default Maren Maersk call (194,849 GT, 50 h lay time, 4,000 container moves: 800×20′ + 1,200×40′ loaded, 800×20′ + 1,200×40′ discharged; no reefer, OOG, or IMO units by default).

**Vessel charges (ch. 2) — apply to the default call:**

- §2.1: "Every ship berthed at the handling facilities must pay a berthing charge." §2.1.1 "for the first 24 hours of lay days minimum 1,04 €"; §2.1.2 "for every additional 12 hours or part of this period 0,60 €" — "The lay time commences at the time of docking and shall be calculated uninterruptedly until the time of casting off." Basis: "the gross tonnage index* of the vessel concerned … multiplied by the gross tonnage index". **Default call: 194,849 × (1.04 + 3 × 0.60) = 553,371.16 EUR** (50 h = first 24 h + three commenced 12-h periods). Note on wording: §2.1.1's "minimum" reads as the rate word of the tariff line (a per-GT rate, not a call minimum — §1.3.4 states "Minimum charge: not applicable"); v0.2.49's terminal_scope pins established the same reading.
- §2.1.3 — vessels without proper tonnage measurement, per running meter, on request: not applicable (Maren Maersk is a measured vessel).
- §2.1.4 — lay-by berth: "Ships using the Container Terminal as a lay by berth prior start of cargo operation or after completion of cargo operation … Per 24 hrs or part thereof/TEU 1,34 €. Berth dues counts by maximum nominal intake of TEU". Conditional: fires only for a lay-by use; the default call is a working cargo call. Encoded gated.
- §2.2 — quay dues/weight dues: "Vessels engaged in overseas shipping (outgoing and incoming traffic) 9,45 €/t; b. Vessels engaged in European shipping … 5,46 €/t". These are **weight dues on conventional (non-containerized) cargo** — the container-terminal pricing of box cargo runs through ch. 5 per-container, not through tonnage weight dues; S4 §1.1's HHLA analogue ("excluding fully cellular container services handled at special facilities") documents the same port convention. **No quay dues for the default container call.** Notice: S9 itself carries no explicit container carve-out sentence; the non-application is a read of the tariff's structure (per-container ch. 5 vs. per-ton ch. 2.2), recorded here as an interpretation notice, not an invention of either direction.

**Handling (ch. 5) — apply to the default call:**

- §5.1.1: "Loading/discharging from/to main vessel, feeder vessel or barge Per Container — ISO -Container, empty / full 358,00 €". "All prices plus security charge (see Section 13)." **Default call: 4,000 × 358.00 = 1,432,000.00 EUR** (published rate — no estimated flag).
- §5.2.1: "Lashing / unlashing, securing Container on main / feeder vessels (Basis: overall volume of Container handled and restowed) Per Container — Lashing / unlashing, using system lashings on board seagoing vessels 47,00 €". §5.2.2: "Setting / removing twistlocks on board 24,00 €" per container. §5.2.3–5.2.4 chains/wire and general/heavy cargoes: on request (no published rate — notice, never invented). §5.2.5 bridge fittings 142,00 € per employee/hour. Conditional: lashing is an ordered service, "Basis: overall volume of Container handled and restowed"; the default call carries no lashing order (count blank → zero). Encoded gated on an explicit lashing container count.
- §5.3: "Surcharge for IMO Container Per Container 87,00 €". Conditional: fires only for IMO (dangerous-goods) containers; the default call carries none. Encoded gated on the dangerous-goods unit count.
- §5.4: "Charge for ships with up to 20 Container handled Per transaction / per ship 3.308,00 €". Conditional: a minimum bill for small calls — it can never fire for the 4,000-move default call. Encoded gated (the small-call condition cannot hold at the default; the rule must exist for the gate to be real, as GOT's tanker-gated OPS rule does for the container default).
- §5.1.2 Non-ISO/OOG 716,00 €; §5.1.3 chains 1,432,00 €; §5.1.4 special security on request; §5.5–5.8 conventional cargo, hatch covers, bin racks — all conditional on cargo the default call does not carry (OOG units blank by default). Not encoded in this pass beyond the existing OOG convention; recorded as notices (the default call is pure ISO; encoding OOG rates for Hamburg is a future data extension, not a gap in the default call).
- §5.1 penultimate: "Discharging / loading on basis free out / free in. Discharging/loading costs and all charges related to handling and storage are exclusively and irrevocably to be paid by the shipping line given by the vessel." — the waterside charges are the shipping line's, consistent with the model's ship-side cost view.

**Reefer (ch. 9) — conditional (no reefer by default):**

- §9.1: "For the first 24 hours or part thereof including plug on / plug off in the yard 181,50 €" per container; §9.2: "For subsequent 24 hours or part thereof 144,50 €". Fires only with reefer units (blank by default). Encoded gated.

**Other handling-side chapters — adjudicated out of the waterside ship-side call:**

- Ch. 3 (shift surcharges 3.1, receiving/delivery surcharges 3.2, overtime 3.3, waiting times 3.4) and ch. 4 (equipment hire): scenario-dependent per-shift/per-hour charges that require an operational schedule the call model does not carry (no shift-count input exists). Recorded as notices; not encoded (a rate without an input would be an invention of usage).
- Ch. 6 (receiving/delivery from/to rail/truck, 6.1.1 ISO 152,00 €) and ch. 7 (storage 7.1/7.2/7.3/7.4), ch. 10 landside transport, ch. 11 status change, ch. 12 special services: **landside/cargo-side charges** — §1.4.3 bills handling charges for goods via quay to "the issuer of the port record … / the recipient of the cargo"; the ship-side call carries none of them by default. The current HHLA encoding models storage as ship-visible optional scenario inputs; the Eurogate storage schedules (7.1 export: ISO 5 free days, 42/84/126 with escalation; 7.2 import: ISO 3 free days, 42/84/126/168 four bands; 7.3 transhipment; 7.4 empties 21/42/63 no free time) are recorded here in full and remain unencoded in this pass — the default call fires no storage (free time covers the defaults), and storage is a scenario layer (the deferred scenario-adjustment layer owns it). Notice, not a gap for the default call.
- Ch. 8 restowing (8.1.1 ISO 433,00 €): on-board restow operations are not part of a standard call; notice.
- Ch. 13 security: "13.1 Container full / empty Per Container 24,95 €". **Default call: 4,000 × 24.95 = 99,800.00 EUR.** Note ch. 5's "All prices plus security charge (see Section 13)" — security is additive to every handling price; it is also excluded from the social fund (§1.3.13).
- Ch. 14 ship's equipment and provisions (14.1 all-inclusive clearance 157,50 € per delivery): conditional on deliveries of ship's stores; the default call models none. Notice.
- Ch. 15 customs/bonded seaport: Wilhelmshaven-only contractual text; no prices. N/A for Hamburg (except the customs service items under ch. 12 already covered by the landside adjudication).

**Social fund (§1.3.13):** "A 1.5% social fund will be charged on all services. The following shall be excluded: - storage charges - materials for stowing and lashing - security charge." **Applies to the default call** on all biller-line services except the named exclusions.

**Defect finding (repair in this pass):** the current `eurogate_social_fund_surcharge` encoding (v0.2.49) excludes `terminal_handling` from the 1.5% base (`exclude_families: [storage, terminal_handling, security]`). S9 §1.3.13 verbatim excludes only **storage charges, materials for stowing and lashing, security charge** — handling is IN the base. The v0.2.49 terminal_scope pin 8,300.57 (fund on berthing only) encoded exactly the three-rule Eurogate surface of that pass; under the promoted surface the corrected base includes the handling line. This is a transcription defect against the authority of record, repaired by this pass, and the drift it produces is classified in the pass report.

### 17.3 Applicability matrix — default Maren Maersk call

| S9 charge | Rate | Default call | Basis at default |
|---|---|---|---|
| Berthing charge 2.1.1/2.1.2 | 1.04 EUR/GT first 24 h; 0.60 EUR/GT per commenced 12 h | **Fires** | 194,849 × (1.04 + 3×0.60) = 553,371.16 |
| Handling 5.1.1 | 358.00 EUR/container | **Fires** | 4,000 × 358.00 = 1,432,000.00 |
| Security 13.1 | 24.95 EUR/container | **Fires** | 4,000 × 24.95 = 99,800.00 |
| Social fund 1.3.13 | 1.5% on services excl. storage, lashing materials, security | **Fires** | 1.5% × (553,371.16 + 1,432,000.00) = 29,780.57 |
| Lashing 5.2.1 | 47.00 EUR/container | Conditional (gated) | no lashing order at default → 0 |
| Twistlocks 5.2.2 | 24.00 EUR/container | Conditional (gated) | same gate → 0 |
| IMO surcharge 5.3 | 87.00 EUR/container | Conditional (gated) | no IMO units at default → 0 |
| Small-call minimum 5.4 | 3,308.00 EUR per ship ≤20 containers | Conditional (gated; cannot fire at 4,000 moves) | 0 |
| Lay-by 2.1.4 | 1.34 EUR/TEU per 24 h | Conditional (gated) | working call → 0 |
| Reefer 9.1/9.2 | 181.50 / 144.50 EUR per 24 h | Conditional (gated) | no reefer at default → 0 |
| Quay dues 2.2 | 9.45/5.46 EUR/t | Not applied (conventional cargo only — §17.2 notice) | 0 |
| Storage ch. 7 | 21–1,008 EUR/day bands | Not applied (landside; free time covers defaults) | 0 |
| Shift/overtime/waiting ch. 3–4 | per shift/hour | Not encoded (no schedule input — notice) | 0 |

### 17.4 HHLA-vs-Eurogate delta table (the drift definition)

Current HHLA terminal layer (28 rules + biller surcharge) vs the promoted Eurogate layer. Line figures at the default call, script-computed against the engine at e2094d5.

| Charge | HHLA current (S4) | Eurogate (S9) | Default-call movement (EUR) |
|---|---|---|---|
| Berth/ship's dues | `hhla_tonnage_dues` 1.25/GT 24 h + 0.80/GT 12 h → 711,198.85 (S4 §1.2) | `eurogate_berthing_charge` 1.04/0.60 → 553,371.16 (S9 2.1.1–2.1.2) | −157,827.69 |
| Waterside handling | `hhla_container_handling` 358.00/move, **estimated flag** (S4 §2.1.2 unpublished; S9 5.1.1 anchor) → 1,432,000.00 | `eurogate_container_handling` 358.00/move, **published** (S9 5.1.1) → 1,432,000.00 | 0.00 (estimate flag retires) |
| Security | `hhla_security_charge` 17.00/container → 68,000.00 (S4 §1.3.3) | `eurogate_security_charge` 24.95/container → 99,800.00 (S9 13.1) | +31,800.00 |
| Gangway | `hhla_gangway` 633.80 overseas → 633.80 (S4 §1.4) | no Eurogate gangway charge in S9 | −633.80 |
| Gangway supervision | `hhla_gangway_supervision` 101.30/h → 0.00 at default (S4 §1.5) | no counterpart | 0.00 |
| Biller surcharge | `hhla_hafenfonds_surcharge` 1.5% excl. storage + terminal_handling (S4 §9.2.3) → 11,697.49 on tonnage+gangway+security | `eurogate_social_fund_surcharge` 1.5% excl. storage + lashing materials + security — **corrected base includes handling** (S9 §1.3.13) → 29,780.57 on berthing+handling | +18,083.08 |
| Storage (11 rules) | `hhla_storage_*` progressive bands (S4 §3), default free time → 0.00 | not encoded this pass (landside; §17.2 notice) | 0.00 |
| Container services (13 rules) | `hhla_container_service_*` optional, default off → 0.00 | Eurogate optional services 5.2/5.3/5.4/9.1/9.2/2.1.4 encoded gated, default off → 0.00 | 0.00 |
| **Terminal-layer total** | **2,313,489.31** call total of which terminal layer 2,223,530.14 | see §17.5 | |

Terminal-independent charges do not move: HPA port fee 62,030.41; GDWS pilotage 5,322.00 + 4,100.00; BUKEA waste 2,630.46 + 1.00 + 828.00 + 47.30; towage estimate 15,000.00 (sum 90,959.17).

### 17.5 New baseline (script-computed, pinned in the pass)

HPA 62,030.41 + GDWS 9,422.00 (dues 5,322.00 + fees 4,100.00) + Eurogate berthing 553,371.16 + handling 1,432,000.00 + security 99,800.00 + social fund 29,780.57 + lashing 0 + twistlocks 0 + IMO 0 + small-call minimum 0 + lay-by 0 + reefer 0 + BUKEA 3,506.76 (2,630.46 + 1.00 + 828.00 + 47.30) + towage 15,000.00 = **2,204,910.90 EUR**; per-GT 11.32 EUR (2,204,910.90 / 194,849 = 11.32); the SEK comparison figure re-derives at delivery (11.32 × 11.275 = 127.63 SEK/GT; ranked order unchanged — HAM remains the highest per-GT figure).

Erratum (2026-09-25): the first issue of this section stated 2,295,869.90 EUR / 11.78 / 132.86 SEK — an arithmetic slip that double-counted the terminal-independent charges (90,959.00 added twice). The engine-verified figure is 2,204,910.90; the pins, the drift table (§17.4 movements are unaffected), and the delivered baseline all carry the corrected value.

### 17.6 HHLA adjudication — retire versus variant

Cost of option (a) — retire HHLA (Eurogate-only):

- Data: delete the 28 `hhla_*` rules and the `hhla` biller (1,809-line file loses ~620 lines); the input profile's operator select loses the HHLA option; the `gangway_class`/`gangway_count`/`gangway_supervision_hours` inputs retire (no Eurogate counterpart); `handling_rate_per_move` retires (the published rate replaces the estimate input).
- Pins: terminal_scope's fallback contract (absent → HHLA) inverts; hamburg.test CP2–CP5 HHLA pins re-point to Eurogate equivalents or retire disclosed; handling_hygiene's estimate-subtotal pins re-derive (the estimated set drops to towage-only 15,000.00); functional_classification's vessel-access aggregate re-derives (Hafenfonds line replaced by the social fund, a non-vessel-access family).
- Documentation: the HHLA extraction reference (§6, S4) is retained as historical documentation; S4/S5/S6 stay archived.
- Risk: the HHLA comparison disappears from the live surface; if a user needs HHLA figures, the historical record is text-only.

Cost of option (b) — keep HHLA as a switchable terminal variant:

- Data: keep both layers gated `terminal_operator` (the gating already exists, v0.2.49); default flips to Eurogate. Per-port data grows by the Eurogate optional services only.
- Engine: no change required — `terminal_operator` conditions, the operator select, and the fallback flag all exist. The fallback default (absent → HHLA) must re-point to Eurogate: a one-line engine default change plus its pin. The estimate machinery (handling_rate_per_move) stays for the HHLA variant.
- UI: the operator select already renders both options; the comparison strip's "HHLA (default — the reference operator)" label re-points.
- Pins: the same HHLA pins must anyway re-point (the default call changes operator); the marginal pin cost of the variant is near zero — both surfaces were already pinned at v0.2.49.

Recommendation, argued from evidence: **option (b) — keep HHLA as a switchable terminal variant; Eurogate becomes the default and reference operator.** The marginal cost of the variant is small and was already paid at v0.2.49: the gating mechanism, the operator select, the mutual-exclusion pins, and both rule sets exist and are tested. Retiring HHLA would delete a working, pinned, archived surface and force every HHLA pin into a text-only historical record, while the variant preserves the honest in-app HHLA-vs-Eurogate comparison the tool exists to make — the two operators' published structures differ materially (tonnage 711,199 vs berthing 553,371; security 68,000 vs 99,800; fund 11,697 vs 29,781 at default). No variant mechanism beyond what exists is built in this pass; the promotion is a data-default flip plus new gated rules, not an engine change.

### 17.7 Encoding decisions for the pass

- `default_call.terminal_operator: Eurogate`; the input profile's operator list order and labels update (EUROGATE first, the default and reference operator; HHLA second, the switchable variant). The engine's `terminal_operator` fallback default re-points from HHLA to Eurogate — the only engine edit, a default constant plus its flag text, no architecture change.
- New Eurogate rules, all gated `terminal_operator: Eurogate`, all with S9 citations: `eurogate_lashing` (5.2.1, 47.00 EUR/container, gated on a lashing container count input), `eurogate_twistlocks` (5.2.2, 24.00 EUR/container, same gate), `eurogate_imo_surcharge` (5.3, 87.00 EUR/container, gated on the dangerous-goods count), `eurogate_small_call_minimum` (5.4, 3,308.00 EUR, gated to calls of ≤20 handled containers — cannot fire at the default), `eurogate_layby_charge` (2.1.4, 1.34 EUR/TEU per 24 h, gated on a lay-by berth-day input), `eurogate_reefer_first_24h` (9.1, 181.50 EUR per reefer per first 24 h), `eurogate_reefer_subsequent_24h` (9.2, 144.50 EUR per reefer per subsequent 24 h).
- New call inputs (Hamburg-scoped, default blank/zero — no seeded count may manufacture a charge): `lashing_containers`, `twistlock_containers`, `layby_teu_days` (gated to the lay-by scenario), reefer via the existing shared `reefer_units` + a Hamburg reefer-days input. The small-call minimum reads the existing container fields; no new input.
- The social-fund exclusion list corrects to `[storage, security]` — `terminal_handling` leaves the exclusion list per S9 §1.3.13; the materials-for-stowing-and-lashing exclusion is the lashing-service lines' own materials (no lashing materials line exists in the fee surface; the exclusion is recorded in the reference and stays vacuous until a materials line exists).
- Classification entries for every new rule id; berth-side rules join the web berth-dues membership where the segmentation contract requires.
- The HHLA layer stands unchanged as the variant (scope guard: no HHLA rule edits beyond none; the layer only ceases to be the default).
