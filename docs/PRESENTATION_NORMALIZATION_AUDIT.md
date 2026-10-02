# Swedish Presentation Normalization Audit (v0.4.4, item 0 — the committed seam)

Directive: one model, one presentation, six ports. Two user-visible
inconsistencies in the comparison view share one root cause: the v0.4.0
expansion transcribed national and family structures fresh into the three
new silos instead of following the established cross-port patterns
(standing discipline §9: shared national rules are referenced, never
duplicated). This audit was executed and committed before any
implementation.

## 1. The mechanism determination (item 0.5, first — it governs the rest)

How GOT and HEL "reference the shared block": the national rules are
**transcribed into each port's own silo file under a port-local id prefix**
(the port-silo discipline: each port file independently verifiable, zero
references to another port file; core/test/swedish_expansion.test.ts pins
that no second national file exists). The shared presentation is supplied
by **shared-pattern machinery** — code that recognizes the id prefixes and
applies the same classification, charge-type line, name rendering, and
stage placement to every silo's transcription:

- `core/src/classification.ts` `classifyRule()`: `^(sjofartsverket|sfv)_`
  patterns assign the functional classes (waterway_fairway_access,
  readiness_safety_capacity, purchased_service) and the shared basis notes.
- `web/src/chargeTypes.ts`: the same `^(sjofartsverket|sfv)_` patterns map
  the rules to the **Fairway dues** charge-type line (spec §4.2.16 lineage,
  v0.2.52), nesting under the "To reach the berth" comparison stage;
  `CARGO_RULE_IDS = {poh_cargo_due}` maps HEL's cargo due to the **Cargo
  dues** line under the "Quayside operations" stage.

**Adjudication against the loader**: the loader knows no include or
injection mechanism — YAML silos are flat, self-contained rule lists
(`core/src/loader.ts`); the only shared assets are the engine, the
fee-family vocabulary, and the shared-prefix pattern machinery. The
v0.4.0 expansion honored the letter of the silo discipline (each port's
own transcription, its own citations — pinned in
core/test/swedish_expansion.test.ts "the national rules are the port own
transcription") but **violated the presentation half of the established
pattern**: it coined new prefixes (`gvh_sfv_`, `pon_sfv_`, `snv_sfv_`)
that the shared-pattern machinery does not recognize, so the same
authority renders as separate, differently-labelled lines outside the
Fairway dues line, and it assigned the cargo dues `fee_family: port_dues`
following each silo's own extraction-reference mapping table rather than
the engine's cross-port family map (see §3). The fix is therefore
**not** a loader change: the three silos keep their own rule copies and
citations (the port-silo discipline), and the **shared-pattern machinery
gains the three new prefixes** so the same rules render through the same
presentation as GOT/HEL — the reference-not-duplicate contract at the
presentation layer. The extraction references already record the correct
citation trail ("the class tables, the frequency discount, and the
godsavgift are the shared national machinery already verified in the
Gothenburg/Helsingborg extractions; [port]'s own YAML carries its own
transcription with its own citations") — they keep it unchanged.

## 2. The full inventory (item 0.1)

Engine-audited by script (core/scripts/audit_presentation_normalization.ts,
run against the loader and engine, never a probe of memory): every rule in
the GLE/NRK/NVK silos under a national prefix, field-by-field beside the
GOT equivalents. Each new port carries **87 national rules** (GOT 89; the
difference is pilotage id shape, below).

### 2.1 The Sjöfartsverket block inventory — every difference found

| Difference | GOT (`sjofartsverket_`) | HEL (`sfv_`) | GLE (`gvh_sfv_`) / NRK (`pon_sfv_`) / NVK (`snv_sfv_`) |
|---|---|---|---|
| id prefix | `sjofartsverket_` | `sfv_` | `gvh_sfv_` / `pon_sfv_` / `snv_sfv_` (recognized by nothing; renders outside the Fairway dues line, no functional class) |
| vessel fee count / figures | 50 rules (10 NT classes × 5 CSI A–E) | 50, **figures identical** | 50 each, **figures identical** |
| readiness fee | 10 rules, figures identical | 10 identical | 10 identical each |
| pilotage id shape | `pilotage_class{N}_start` / `_per_half_hour` | `pilotage_start_class{N}` / `pilotage_half_hour_class{N}` | HEL's shape (GLE/NRK/NVK match HEL, not GOT) — figures identical all five |
| ordering fee | `ordering_fee_{band}` (5 bands) | same, name "Ordering Fee - 4 to under 5 hours" style | same shape as HEL; GOT names "Ordering Fee - 4-5 hours" |
| godsavgift | `sjofartsverket_godsavgift` (fee_family fairway_dues) | `sfv_godsavgift` (fairway_dues) | present in all three, fee_family fairway_dues — but unmapped by the shared patterns, so the national cargo due renders outside the Fairway dues line |
| passenger/private-vehicle components | `sjofartsverket_cargo_fee_passengers` / `_private_vehicles` present | absent | absent (all three transcriptions match HEL's component set, not GOT's) |
| name string, vessel fee class E | "Vessel Fee - Class N, No CSI" | "Vessel Fee - Class N, CSI Class E" | "Vessel Fee - Class N, CSI Class E" (matches HEL) |
| description wording | "Vessel fee for Class N (0+ NT) with CSI Class X" | "Fartygsavgift (national vessel fee) for NT class N, Sjöfartsverket environmental class X." | HEL's wording (all three) |
| readiness description | "Readiness fee for Class N vessels" | "Beredskapsavgift (national readiness fee) for NT class N." | HEL's wording |
| source citation | prislista p.3/p.4/p.5, document prislista-farleds-lotsavgifter-2026.pdf | same document; verified_by vibe-session-helsingborg | same document; verified_by vibe-session-swedish-expansion; one clause-case difference ("Extra pilot" vs GOT "Extra Pilot") |
| frequency discount (biller section) | `sjofartsverket_frequency_discount` | `sfv_frequency_discount` | `gavle_sfv_frequency_discount` / `norrkoping_sfv_frequency_discount` / `norvik_sfv_frequency_discount` — bands and apply_families [vessel_fee, readiness_fee] identical; already caught by the `/frequency_discount/` shared pattern (renders on the Fairway dues line) |
| fee_family values | vessel_fee / readiness_fee / pilotage / ordering_fee / fairway_dues (godsavgift) | identical | identical — the families are already canonical; the defect is the unmapped prefix, not the family |

Recorded plainly: **no rate-structure, amount, or conditions difference
exists anywhere in the national blocks** — every difference is id prefix,
name string, description wording, citation bookkeeping, or component
presence (the passenger/private-vehicle godsavgift components exist only
in GOT's transcription; HEL/GLE/NRK/NVK carry the single blended
godsavgift rule; GOT's extra components never fire on container calls —
they need passenger/private-vehicle inputs the call model carries only at
GOT — and are out of scope for this presentation pass).

### 2.2 The cargo-dues family mapping table (read from the engine and the spec, never a probe)

The engine's cross-port segment-derivation table
(`core/src/types.ts` FEE_FAMILY_TO_SEGMENT) maps `port_dues` →
`vessel_call` and `cargo_fee` → `vessel_call`; the spec's comparison-view
contract (§4.3.1, §4.2.16-lineage v0.2.52) groups the cargo dues of the
call onto the **Cargo dues charge-type line under the "Quayside
operations" stage** — a rule lands there only via the charge-type mapping
(chargeTypes.ts `CARGO_RULE_IDS`), keyed by rule id, never by family
(the vessel_fee family collides across billers).

| Port | Rule id | Current fee_family | Renders today | Canonical per engine+spec |
|---|---|---|---|---|
| HEL | `poh_cargo_due` | port_dues | **Cargo dues line, Quayside operations** (the pinned GOT/HEL presentation, v0.2.52) | unchanged — the reference shape |
| GLE | `gvh_yilport_cargo_due` | port_dues | port_dues family row, "To reach the berth" | Cargo dues line, Quayside operations |
| NRK | `pon_cargo_due_20ft` / `_gt20ft` | port_dues | port_dues family row, "To reach the berth" | Cargo dues line, Quayside operations |
| NVK | `snv_pos_cargo_due_le20ft` / `_gt20ft` | port_dues | port_dues family row, "To reach the berth" | Cargo dues line, Quayside operations |

Note: HEL's `poh_cargo_due` itself carries `fee_family: port_dues` — the
fee family is not the defect and does not change. The finding-2 defect is
the **charge-type membership list**: only `poh_cargo_due` is a member, so
the three new ports' cargo dues land in the port-dues family row in the
reach-berth stage instead of the Cargo dues line. The correction adds the
five ids to the cargo-dues membership; **no fee_family value changes**
(finding 2 is a placement defect at the presentation layer, consistent
with the engine's segment table, which no cargo rule moves).

### 2.3 Directive-premise mismatch, reported (the archived prislista)

The directive's scope guard states "the archived national prislista
governs every copy" and directs verification against
`docs/sources/sweden/national/`. **That directory does not exist and has
never existed in the repository**: `git ls-files docs/sources/sweden`
lists no national tree; the Gothenburg extraction reference records the
authoritative status (source G3: "not archived — upstream URL in the port
YAML … earlier revisions of this reference claimed an in-repo archive path
that never existed (fixed in the worked-example fix pass, spec v0.2.37)").
The prislista's `document_url` fields in all five silos carry the
never-existed path `docs/sources/sweden/national/sjofartsverket/prislista-farleds--...pdf`
— a citation-bookkeeping defect of the same class the v0.2.37/v0.2.49
passes repaired for other sources (the upstream_url is correct and
recorded). This pass fetched the upstream prislista text successfully
(the summary document: class boundaries 0/1,000/2,000/3,000/6,000/10,000/
15,000/30,000/60,000/100,000; fartygsavgift class-9 row D/E 201,805;
beredskapsavgift class 9 60,370; pilotage class-9 start 35,755 and per-½h
8,105; ordering-fee bands 9,390/7,510/5,635/3,775/1,880; godsavgift
3,36/1,67; the frequency scale 100/100/75/50/25/0) — **every transcribed
figure in all five silos matches the fetched text exactly**. The
five-way equivalence (below) therefore verifies each transcription
against the same national figures, which the live upstream text
independently confirms. The in-repo archive remains a recorded gap (the
binary PDF is not fetchable by sandbox tooling — the standing §5/§8
limitation); the document_url bookkeeping repair is recorded as a
deferred-queue finding, not silently performed by this presentation pass.

## 3. The family-dependency check (item 0.3)

Swept every consumer of `fee_family` and of the charge-type membership:

- Engine (`core/src/engine.ts`): fee_family feeds (a) the dues-like
  effective-per-GT set (port_dues, fairway_dues, vessel_fee,
  readiness_fee, lay_up, idle_berth, hafenfonds, connection_fee) — cargo
  dues are not members; (b) `apply_families` matching for the
  biller-level frequency discount (vessel_fee + readiness_fee only); (c)
  the unmatched-family quality notice; (d) FeeResult bookkeeping. **No
  amount, discount attachment, or scenario gate depends on the cargo-dues
  charge-type membership or on any cargo family value.**
- Web: `FEE_FAMILY_TO_SEGMENT` (per-port segment grouping — unchanged by
  this pass), `STAGE_BY_FAMILY`/`STAGE_BY_CHARGE_TYPE` (stage placement —
  the corrected surface itself), comparisonModel's family rows and
  charge-type split (the placement mechanism, presentation only),
  frequencyPanel's `applyFamilies` (vessel_fee/readiness_fee — untouched),
  portWorkspace's port-dues OPS-fold filter (`fee_family === 'port_dues'`
  — unaffected: no cargo rule changes family).
- **The NRK liner attestation attaches to the port authority's dues**
  (`pon_port_dues` rule, the attestation-gated adjustment on the 6.60/GT
  line) — not to any national rule and not to the cargo dues; nothing
  cross-wires. The Sjöfartsverket frequency discount attaches to
  vessel_fee + readiness_fee in all five silos (identical
  apply_families), already on the Fairway dues line via the shared
  `/frequency_discount/` pattern.

Conclusion: the re-placement is presentation-only; no dependency exists
beyond the stage derivation itself. Checked before the re-family, as
required.

## 4. The equivalence verification (item 0.2 — the decisive step)

Method: the national dues are vessel-driven (NT class × CSI class, per
call), so the same vessel (DEFAULT_VESSEL, MAREN MAERSK: GT 194,849, NT
79,120 → class 9, CSI E) at the per-port default call profile must price
the identical national block at every Swedish port. The port-local
transcription (GLE/NRK/NVK) and the shared GOT/HEL machinery were computed
both ways (the engine over each silo; the shared GOT/HEL block applied to
the same call profile). Result — **identical figures, zero divergence**:

| National line | GOT | HEL | GLE | NRK | NVK |
|---|---|---|---|---|---|
| Vessel fee class 9 CSI E (fartygsavgift) | 201,805.00 | 201,805.00 | 201,805.00 | 201,805.00 | 201,805.00 |
| Readiness fee class 9 (beredskapsavgift) | 60,370.00 | 60,370.00 | 60,370.00 | 60,370.00 | 60,370.00 |
| Pilotage start class 9 | 35,755.00 | 35,755.00 | 35,755.00 | 35,755.00 | 35,755.00 |
| Pilotage per ½h (8 h default) | 64,840.00 | 64,840.00 | 64,840.00 | 64,840.00 | 64,840.00 |
| Ordering fee 2–3 h | 5,635.00 | 5,635.00 | 5,635.00 | 5,635.00 | 5,635.00 |
| Godsavgift | 268,800.00 | 268,800.00 | 268,800.00 | 268,800.00 | 268,800.00 |

Each figure independently matches the fetched prislista text (§2.3). The
six default totals hold byte-identically at their pinned values (GOT
3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40 / GLE 10,306,979.35 /
NRK 8,297,772.50 / NVK 11,952,324.05). **No divergence finding exists;
the stop-and-report path is not taken; the normalization proceeds.**

## 5. The canonical presentation (item 0.4)

The spec-pinned GOT/HEL rendering (v0.2.52 charge-type contract, the
comparison-view §4.3.1/§4.2.16 lineage): the Sjöfartsverket block renders
as the **Fairway dues** charge-type line ("Fartygsavgift +
Beredskapsavgift", plus the godsavgift since v0.2.61 and the
frequency-discount adjusters) nested under **"To reach the berth"**; the
cargo dues render as the **Cargo dues** line under **"Quayside
operations"**. The normalization target is this shape at all five Swedish
ports; the new ports' local labels change, never the reverse.

## 6. Verdict

Equivalence clean; dependency check clean; mechanism determined (shared
prefix patterns, not loader includes); canonical presentation read from
the spec. Item 1 proceeds: extend the shared national patterns to the
three new prefixes, add the five cargo rules to the cargo-dues membership,
pin the rendering at all five Swedish ports with red proofs, zero figure
movement.
