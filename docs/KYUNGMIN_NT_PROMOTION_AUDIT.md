# v0.3.4 Audit — the MSC KYUNGMIN NT promotion (item 0)

Audit-first per the directive: findings committed before implementation.
The v0.3.3 audit (docs/SCENARIO_LAYER_AUDIT.md §5) is the provenance
authority; this audit does not re-adjudicate the evidence class — the
figure is an **aggregator observation, not a registry confirmation**
(all registry routes remain automation-blocked: the DNV register blocks
automated access, verified 2026-10-01; Equasis automation-blocked; the
Korean register not fetchable by automated retrieval).

The product owner has adjudicated 9,654 the more credible figure (the
Flexport Atlas aggregator corroborating the Marine MAN v0.3.0-era
figure; a plausible 44-percent NT/GT ratio against GT 21,979, normal
for a feeder container ship; versus a default of unknown provenance).
This audit determines the consequences before promoting.

## 1. The GOT NT-class boundary consequence (item 0.2)

The Sjöfartsverket size-class thresholds (core/data/gothenburg_2026.yaml
line 394, the engine's own `getNetTonnageClass` at engine.ts:1690):
1: 0, 2: 1,000, 3: 2,000, 4: 3,000, 5: 6,000, 6: 10,000, 7: 15,000,
8: 30,000, 9: 60,000, 10: 100,000 NT.

- 8,000 NT: `getNetTonnageClass(8000)` = **Class 5** (6,000 ≤ 8,000 < 10,000).
- 9,654 NT: `getNetTonnageClass(9654)` = **Class 5** (6,000 ≤ 9,654 < 10,000).

**Finding: the two figures share Class 5 — no class boundary is crossed
at GOT.** The promotion moves no GOT class-keyed figure: the vessel fee,
readiness fee, and pilotage all key to `nt_class: 5`, and the class-keyed
tables are stepped, not proportional to NT. The promotion is
figure-visible only (the NT field and its observation flag); no dues
movement. This was verified against the engine's class function, not
assumed from the directive.

Cross-check against the vessel's own record: the v0.3.0 estimate band
0.40–0.58 × GT = 8,792–12,748 spans the Class 6 boundary at 10,000 —
that band-uncertainty finding stands unchanged (it is the reason the
boundary notice exists); the promoted placement value 9,654 itself
sits below 10,000.

## 2. HAM and HEL (item 0.3)

- **Hamburg: no NT-bearing rule exists.** The port bills on GT
  (progressive GT dues, per-GT rebates) and call inputs; no rule in
  core/data/hamburg_2026.yaml carries an `nt_class` condition, and no
  rate uses NT as a basis or unit. The promotion moves nothing at HAM.
  (The portBillsOnNtClasses data check in web/src/ntBoundary.ts
  derives the same finding: HAM carries no nt_class rule.)
- **Helsingborg: the port's own dues are per-GT** (`poh_port_dues`:
  flat 6.85 SEK/GT, `unit_type: gt`), so the port authority's own fees
  are NT-independent. The Sjöfartsverket national rules embedded in the
  HEL silo (vessel fee, readiness fee, pilotage) carry `nt_class`
  conditions — the same stepped class tables as GOT. Both 8,000 and
  9,654 are Class 5 at those tables (the class function is shared), so
  **no HEL figure moves either**. The v0.3.0-era HEL CP2 pins (vessel
  fee Class 5) remain correct.

## 3. Isolation (item 0.4)

The library's vessel NT figures: HELGAFELL 3,783; VISTULA MAERSK
16,947; MAREN MAERSK 79,120; MSC KYUNGMIN 8,000. **No other vessel
carries the 8,000 figure** — the promotion touches KYUNGMIN's NT alone.
All other vessels' figures are untouched (verified by pin; a spillover
fails).

## 4. Boundary-notice interaction (declared consequence of the
promotion)

The web boundary notice (`ntBoundaryNoticeFor`, spec v0.3.0) has two
banding modes:

- An **observed** estimate (`nt_observed: true`) bands ±10 percent
  around the observation (the v0.3.0 audit's §4.3 adjudication — the
  observation is the placement basis).
- A pure **authored** estimate bands 0.40–0.58 × GT.

At 8,000 authored, the notice fired for KYUNGMIN (the ratio band spans
Class 6). At the promoted 9,654, the vessel becomes an observed
estimate like HELGAFELL and VISTULA MAERSK (two aggregators now agree
on the figure; the observed band is the honest band): ±10 percent =
8,689–10,619 NT, which still spans the Class 6 boundary at 10,000 —
**the notice keeps firing at both Swedish ports, now with the observed
band, and its figures re-baseline** (band 8,689–10,619, used Class 5,
alternative Class 6). The notice copy hardcodes the "0.40–0.58 × GT"
band description; the observed band renders its own description
(±10 percent of the observed figure). This re-baseline is the pass's
declared consequence, pinned and attributed in-test to the promotion.

## 5. Implementation consequences (the audit's instruction set)

1. `core/data/vessel_library.yaml`: KYUNGMIN `nt: 8000` → `9654`;
   `nt_observed: true` added (the placement basis is the observation);
   the `source_note` rewritten to state the promotion (the Flexport
   Atlas observation, verified 2026-10-01, corroborating the Marine MAN
   v0.3.0-era figure; observed-not-registry-confirmed; Class 5; the
   observed ±10-percent band still spans the Class 6 boundary — the
   notice keeps firing); the `nt_observation_records` entry stays as
   the observation's history (the model figure now reads the promoted
   value).
2. The observation flag travels with every NT rendering: the vessel
   selection surface already carries it (the `nt_observation_records`
   provenance note); the NT-class indication and the boundary notice
   copy carry the observation status.
3. Re-baselined pins (legitimate, attributed in-test to the promotion):
   `nt_rederivation.test.ts` (the `nt: 8000` pin and the band-disclosure
   source-note pins), `vessel_library.test.ts` (the no-confirming-source
   NT pin), the HEL CP2 KYUNGMIN fixture `nt: 8000` (dues unchanged —
   Class 5 either way; the fixture follows the library), the HHLA
   variant/audit fixtures' KYUNGMIN `nt: 8000` (all GT-billed —
   unchanged figures; the fixture follows the library),
   `eu_regulatory.test.ts`'s KYUNGMIN `nt: 8000` (all GT-billed), the
   web `kyungminObservation.test.tsx` (`nt` 9,654; the GOT/dues pins
   re-verified), `ntBoundaryNotice.test.tsx` (the KYUNGMIN band pins:
   the observed band 8,689–10,619; the rendered notice copy).
4. Zero-drift isolation: MAREN MAERSK (the default vessel) and all
   other vessels' GOT/HAM/HEL baselines stay byte-identical (pinned);
   KYUNGMIN's class-keyed dues at GOT and HEL move zero (Class 5 both
   figures — pinned as the verified absence of dues movement).
