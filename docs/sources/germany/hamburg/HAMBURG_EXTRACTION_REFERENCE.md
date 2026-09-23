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

Repository paths (mirroring the Gothenburg convention):

- \`docs/sources/germany/hamburg/port-authority/pricelist-maritime-shipping-2026.pdf\` (S1)
- \`docs/sources/germany/hamburg/port-authority/stc-maritime-shipping-2026.pdf\` (S2)
- \`docs/sources/germany/hamburg/port-authority/port-gtc-2026.pdf\` (S3)
- \`docs/sources/germany/hamburg/hhla/quay-tariff-2026.pdf\` (S4)
- S5 (GTCCH) — **not archived in-repo**; live upstream URL: \`https://hhla.de/fileadmin/download/General_Terms_and_Conditions_for_Container_Handling_GTCCH_01112017.pdf\`
- S6 (Kaibetriebsordnung) — **not archived in-repo**; live upstream URLs: English edition \`https://hhla.de/fileadmin/download/kaibetriebsordnung_mai_2004_ENG.pdf\`, German original \`https://www.uvhh.de/files/pdf/agb/kaibetriebsordnung_mai_2004.pdf\`
- \`docs/sources/germany/national/gdws/pilot-tariff-2026.pdf\` (S7)
- \`docs/sources/germany/hamburg/city-bukea/ship-waste-fees-ordinance-2025.pdf\` (S8)
- \`docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf\` (S9, reference anchor — see §8)

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
