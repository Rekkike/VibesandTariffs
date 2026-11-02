# PDF Citation Spot-Check (v0.12.1)

PDF citation spot-check (user ruling 2026-11-01). Discrepancies ruled 2026-11-02.

Verification record only. No rule, rate, code, test or figure changed in this
pass; every verdict below is an observation against the archived source, and
the two discrepancy classes found are queued for separate, ruled remediation
passes.

- Base: main `fa1ea51` (v0.12.0). Recorded 2026-11-02.
- Tool: `pdftotext` (poppler) on the archived PDF under `docs/sources/`, one
  page at a time, layout mode. Quotes are the extracted lines with runs of
  spaces collapsed to one space; no other change.
- Numeric equivalence (directive item 3): comma and point decimal separators
  are equal; thousands separators and spacing are ignored; currency must
  match exactly.
- Page: the PDF page index (1-based). Where a citation names a section, annex
  or Anlage instead of a page, the row records the page on which the clause
  was found.

## 1. Inventory: rules citing a PDF document

Fee rules whose `source_reference.document_url` ends in `.pdf`, at `fa1ea51`:

| Silo | PDF-citing rules | All rules |
|---|---|---|
| aarhus | 14 | 16 |
| bremerhaven | 2 | 32 |
| gavle | 19 | 109 |
| gothenburg | 0 | 116 |
| hamburg | 53 | 56 |
| helsingborg | 31 | 121 |
| norrkoping | 18 | 108 |
| norvik | 22 | 112 |
| rotterdam | 12 | 14 |
| **Total** | **171** | **684** |

Gothenburg cites text transcriptions only, so its sample is empty by
construction. The five Helsingborg tariff 2026 p.8 ancillary rules
(`poh_imo_transport`, `poh_vgm`, `poh_other_admin`, `poh_customs_inspection`,
`poh_port_area_transport`) were verified against the PDF at v0.12.0 and are
not re-extracted here.

## 2. Sample

The deterministic floor per silo (directive item 2): (a) the rule with the
largest default-call amount; (b) one per_unit rule with an engine-case
unit_type; (c) one blank-gated optional rule. Categories that fall on the same
rule count once. Bremerhaven carries two PDF-citing rules, neither per_unit nor
blank-gated, so both are sampled. Beyond the floor, the seven further Gävle
rules citing the same document are recorded under Ruling 1 of 2026-11-02.

| Silo | (a) | (b) | (c) |
|---|---|---|---|
| aarhus | `apmt_aarhus_container_handling` | (same as a) | `apmt_aarhus_lashing` |
| bremerhaven | `gdws_pilot_fees_aussenweser` | none | none (`gdws_pilotage_dues_weser` added) |
| gavle | `gvh_yilport_handling_full` | (same as a) | `gvh_yilport_oog_surcharge` |
| gothenburg | none | none | none |
| hamburg | `eurogate_container_handling` | (same as a) | `eurogate_layby_charge` |
| helsingborg | `poh_lolo_handling` | (same as a) | `poh_fresh_water` |
| norrkoping | `pon_lift_vessel_gt20ft` | (same as a) | `pon_oog_lift` |
| norvik | `snv_hutchison_handling` | (same as a) | `snv_pos_sludge_excess` |
| rotterdam | `rotterdam_seaport_dues` | `rotterdam_towage` | `rotterdam_public_quay_dues` |

## 3. Results

| Rule | Silo | Document | Page | Extracted quote | Encoded | Verdict |
|---|---|---|---|---|---|---|
| `apmt_aarhus_container_handling` | aarhus | `apmt/Aarhus-01_01_2026-31_12_2026-Tariff - 2026.pdf` (cited §2.1) | 1 | "2.1 Load or Discharge Move" / "Full,Empty Per Container 1.105,00" / "Minimum payment: 140 unit per call" | 1,105 DKK per move; minimum 154,700 = 140 x 1,105 | MATCH |
| `apmt_aarhus_lashing` | aarhus | same document (cited §2.5) | 1 | "2.5 Lashing" / "Lashing / Unlashing Lashing per gang (2 persons) per hour, Minimum payment 4 hours." / "Weekday - 1st Shift Per Hour 2.251,00" | 2,251 DKK per unit of `lashing_containers` | Figure MATCH; basis DISCREPANCY (see 4.1) |
| `gdws_pilotage_dues_weser` | bremerhaven | `germany/national/gdws/pilot-tariff-2026.pdf` (cited Anlage 1, Abschnitt B Teil I; legs Abschnitt A 1.2) | 24, 25, 14 | p24 "48 000 - 50 000 5 215 5 107 5 309 5 255" and "50 000 - 52 000 5 291 5 199 5 322 5 258" (Weser column second); p25 "über 52 000 5 322 5 322 5 322 5 322"; p14 "f. Bremerhaven oder der Reede von Blexen und den Ankerplätzen bei Hoheweg 35 vom Hundert", "g. den Ankerplätzen bei Hoheweg und der Außenstation des Lotsenschiffes ... 30 vom Hundert", "des Betrages nach Abschnitt B Teil I Spalte 2" | Weser bands 5,107 / 5,199 / 5,322 EUR; sea approach 65 percent; default 5,322 x 0.65 = 3,459.30 | MATCH |
| `gdws_pilot_fees_aussenweser` | bremerhaven | same document (cited Anlage 2, Abschnitt B Teil I) | 49 | "32 000 - 33 000 3 403 3 350 1 515 1 986 1 923"; "39 000 - 40 000 3 556 3 740 1 663 2 158 2 107" (Außenweser column third); "für jede weiteren angefangenen 2 000 über 40 000 30 114 45 48 44"; "höchstens jedoch 4 100 4 100 4 100 4 100 4 100" | bands 1,515 / 1,663 EUR; +45 per commenced 2,000 GT over 40,000; cap 4,100; default 1,663 + 45 x 78 = 5,173, capped at 4,100 | MATCH |
| `gvh_yilport_handling_full` | gavle | `sweden/gavle/yilport-container-terminal-tariff-2026.pdf` (cited page 3, clause 4.1) | 4 | "4.1. Full container SEK 1 679" | 1,679 SEK per container | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_oog_surcharge` | gavle | same document (cited page 3, clause 4.3) | 4 | "4.3. OOG Containers additional 100% of the above rates" | 1,679 SEK per OOG unit (100 percent of 4.1) | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_handling_empty` | gavle | same document (cited page 3, clause 4.2) | 4 | "4.2. Empty container SEK 1 235" | 1,235 SEK | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_cargo_due` | gavle | same document (cited page 3, clause 5.1) | 4 | "5.1. Cargo Due (per full container) SEK 482" | 482 SEK | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_isps` | gavle | same document (cited page 3, clause 5.2) | 4 | "5.2. ISPS (per full container) SEK 73" | 73 SEK | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_imdg_reefer` | gavle | same document (cited page 3, clause 5.3) | 4 | "5.3. IMDG / Reefer Surcharge (per unit) SEK 401" | 401 SEK | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_imdg_dangerous` | gavle | same document (cited page 3, clause 5.3) | 4 | "5.3. IMDG / Reefer Surcharge (per unit) SEK 401" | 401 SEK | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_storage_full_20ft` | gavle | same document (cited page 4, clause 7.1) | 5 | "7. Storage (per TEU per Day)" / "7.1. Full Containers" / "Free Time 7 calendar days*" / "8+ days SEK 135" | 135 SEK per container per day after 7 free days | Figure and clause MATCH; page DISCREPANCY (see 4.2) |
| `gvh_yilport_storage_full_40ft` | gavle | same document (cited page 4, clause 7.1; section 1.3) | 5, 1 | p5 as above; p1 "1.3. Units greater than 20' to 40' are calculated as 2 TEU (includes 22', 23', 24, 30, 40' units). 45' containers are calculated as 2.25 TEU." | 270 SEK per container per day (135 x 2 TEU) | Figure and clause MATCH; page DISCREPANCY (see 4.2); observation 5.1 |
| `eurogate_container_handling` | hamburg | `germany/hamburg/eurogate/prices-and-conditions-2026.pdf` (cited page 6, clause 5.1.1) | 6 | "5.1 Loading/discharging from/to main vessel, feeder vessel or barge Per Container" / "5.1.1 ISO -Container, empty / full 358,00 €" | 358 EUR per move | MATCH |
| `eurogate_layby_charge` | hamburg | same document (cited page 4, clause 2.1.4) | 4 | "2.1.4 Ships using the Container Terminal as a lay by berth prior start of cargo ... Per 24 hrs or part thereof /TEU 1,34 €" / "Berth dues counts by maximum nominal intake of TEU (twenty foot equivalent unit)" | 1.34 EUR per commenced 24 h per TEU of nominal intake (the engine's `teu` basis is the vessel's `teu_capacity`) | MATCH |
| `poh_lolo_handling` | helsingborg | `sweden/helsingborg/port-authority/tariff-2026.pdf` (cited page 7) | 7 | "Lift-On/Lift-Off (LO-LO)" / "Handling full or empty units to/from vessels to/from “Place of rest” at the West Harbour." / "SEK per unit 890.00" | 890 SEK per container | MATCH |
| `poh_fresh_water` | helsingborg | same document (cited page 8) | 8 | "Fresh Water Supply" / "SEK per m³ 75.00" / "SEK minimum charge 945.00" | 75 SEK per m³; minimum 945 | MATCH |
| `pon_lift_vessel_gt20ft` | norrkoping | `sweden/norrkoping/tariff-2026-v2.pdf` (cited page 14) | 14 | "LIFT TO/FROM VESSEL" / "40' container 1 249 SEK per unit" | 1,249 SEK per over-20-foot unit | MATCH; observation 5.2 |
| `pon_oog_lift` | norrkoping | same document (cited page 14) | 14 | "Out of Gauge 7 038 SEK per unit" | 7,038 SEK per unit | MATCH |
| `snv_hutchison_handling` | norvik | `sweden/norvik/hutchison/price-list-2026.pdf` (cited page 5) | 5 | "Export containers" / "ISO containers receiving container to stack 2012 kr" / "including single lift to vessel" / "Import container" / "Lifted from vessel, received into stack, and 2012 kr" / "loaded to road transport" | 2,012 SEK per move | MATCH |
| `snv_pos_sludge_excess` | norvik | `sweden/norvik/port-authority/prices-and-terms-2026.pdf` (cited page 12, clause 3.8) | 12 | "3.8 Waste Fees" / "Sludge *1 1,550 SEK/m³" / "For ships at the quayside in Nynäshamn and Stockholm Norvik, 6 m³ sludge and 4 m³ sewage is included." | 1,550 SEK per m³ beyond the 6 m³ included | MATCH |
| `rotterdam_seaport_dues` | rotterdam | `netherlands/rotterdam/port-of-rotterdam/port-tariffs-and-conditions-port-of-rotterdam-2026.pdf` (cited Annex 1) | 14 | "TABLE 1 ‘PORT DUES GROSS TONNAGE’ ... TABLE 3 ‘SUSTAINABILITY COMPONENT’" / "E Containers ships in Deepsea Service 0.151 E Containers ships in Deepsea Service 0.067" | 0.151 + 0.067 EUR per GT; default 0.218 x 194,849 = 42,477.08 | MATCH |
| `rotterdam_public_quay_dues` | rotterdam | same document (cited Annex 1) | 17 | "§ 2.2 Rates for public quayage" / "Public quay dues are calculated based on a rate of €3.86 per vessel metre or part thereof (overall length) per twenty-four hour period or part thereof." | 3.86 EUR per metre LOA per commenced 24 h | MATCH |
| `rotterdam_towage` | rotterdam | `netherlands/rotterdam/port-of-rotterdam/tariffs-of-third-parties-port-of-rotterdam-2026.pdf` (cited p. 3, Boluda row 2) | 3 | "2 Maasvlakte 2 area (from the river to the berth or v.v./maximum time 2.5 hours)" / "L.o.a. of vessels in meters (a) 1 2" / "< - 163 2,983 3,729" ... "359 - 383 7,854 9,818" / "384 - 425 8,191 10,239" | column 2 bands, 3,729 to 10,239 EUR per tug; default 2 x 10,239 = 20,478 | MATCH |

Result: 24 rows. 14 MATCH; 1 basis DISCREPANCY (figure MATCH); 9 page
DISCREPANCY (figure and clause MATCH). Every encoded figure checked matches
its source. The five Helsingborg p.8 rules carry their v0.12.0 verification.

## 4. Discrepancies (ruled 2026-11-02; remediation queued, not performed)

### 4.1 `apmt_aarhus_lashing`: basis

PDF citation spot-check (user ruling 2026-11-01); discrepancy ruled 2026-11-02.

- Cited clause: the APMT Aarhus 2026 tariff §2.5, page 1.
- Figure: 2,251.00 DKK matches the weekday 1st-shift rate. MATCH on the figure.
- Basis: DISCREPANCY. The tariff prices per gang (2 persons) per hour with a
  minimum payment of 4 hours; the encoding is per_unit multiplied by
  `lashing_containers`, a per-container count, with no minimum encoded (the
  4-hour minimum, 9,004.00 DKK, appears in the rule description prose only).
- Mitigations: the proxy is disclosed in the rule description ("the weekday
  1st-shift rate prices the entered count"); the extraction reference
  documents the per-container gating; the rule is unreachable at Aarhus today
  (the input renders only inside the `hamburg_call_parameters` section, which
  the Aarhus input profile does not carry) and prices zero at every Aarhus
  default, so no displayed figure is wrong; zero figure movement at every
  surface.
- Disposition: remediation is a separate ruled pass, queued behind this pass.
  No change to the rule occurs in this pass.

### 4.2 Gävle Yilport S2 tariff: page citations

PDF citation spot-check (user ruling 2026-11-01); page discrepancy ruled 2026-11-02.

- Figures and clause references: MATCH. The sampled rules stand as verified
  (`gvh_yilport_handling_full` at 1,679 SEK per §4.1;
  `gvh_yilport_oog_surcharge` at the additional 100 percent per §4.3); every
  clause number resolves.
- Page citations: DISCREPANCY. The seven section-4/5 rules cite page 3 while
  the clauses sit on PDF page 4; the two storage rules cite page 4 while the
  clause sits on PDF page 5. The S2 PDF prints no page numbers (every page
  footer reads only "Public"), so the PDF page index is the only reference,
  and a citation that does not resolve to its named page is a failed citation
  under item 4.
- Mitigations: the off-by-one is systematic and single-step across all nine
  rules; the correction is one step per rule; the clause references resolve
  independently; zero figure movement.
- Disposition: the page correction is queued for remediation, a separate
  ruled pass. No citation, page value or other content changes in this pass.

## 5. Observations (no verdict change; for the remediation queue)

1. `gvh_yilport_storage_full_40ft` applies 2 TEU to every unit over 20 feet.
   Section 1.3 counts 45-foot containers as 2.25 TEU, which the two-bucket
   container model (20 feet and over 20 feet) cannot represent; a 45-foot unit
   is understated at 270 against 303.75 SEK per day. The rule prices zero at
   the default (no storage days).
2. `pon_lift_vessel_gt20ft` prices every unit over 20 feet at the 40-foot
   figure (1,249 SEK); page 14 also publishes 30-foot (1,051) and 45-foot
   (1,283) rates. This is the same two-size convention the container-through
   machinery records for Norrköping's landside legs, verified at v0.8.0
   against tariff pp.14-15 (`web/src/handlingBasis.ts`).
