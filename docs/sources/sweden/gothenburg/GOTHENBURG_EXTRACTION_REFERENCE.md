# Gothenburg Extraction Reference — Port Call Cost Analyzer

Authoritative extraction reference for the Gothenburg v1 build and its v0.2.33
storage-default and towage-symmetry revision. The Gothenburg fee figures
themselves are governed by `docs/INTENDED_STATE.md` (the audit-verified pilot
document); this reference records the source map, the storage and
yard-surcharge semantics, and the estimated parameters. Where any builder
directive conflicts with INTENDED_STATE.md on tariff figures, INTENDED_STATE.md
prevails; this document governs extraction semantics and estimated parameters.

Extraction date: 2026-09-23 (storage/towage revision). Tariff validity:
Terminal Tariff Gothenburg 2026 (issued 2025-12-01); Port of Gothenburg Port
Tariff 2026; Sjöfartsverket price list 2026 (issued 2025-11-01).

---

## 1. Sources

| ID | Document | Biller | Prices? | Repository path |
|----|----------|--------|---------|-----------------|
| G1 | Port of Gothenburg, Port Tariff 2026 | Port of Gothenburg | Yes | not archived — upstream: https://www.portofgothenburg.com/globalassets/dokument/port-tariff-2026.pdf |
| G2 | APM Terminals Gothenburg, Terminal Tariff 2026 (June revision) | APM Terminals Gothenburg | Yes | `docs/sources/sweden/gothenburg/apm-terminals-terminal-tariff-2026-june.txt` (archived v0.4.6 — the verbatim text extraction, delivered by the product owner 2026-10-02 outside the sandbox from the publisher’s tariff page, https://www.apmterminals.com/en/gothenburg/services/terminal-tariff, after every fetch route was refused at v0.4.5; the binary PDF is not retained by the delivery tooling, the recorded limitation, the prislista precedent) |
| G2b | APM Terminals Terms of Business, v31 March 2025 | APM Terminals Gothenburg | Terms (no rates) | `docs/sources/sweden/gothenburg/apm-terms-of-business-2025-03-31.txt` (archived v0.4.6, same delivery; the legal wrapper the tariff’s own §8 incorporates) |
| G3 | Sjöfartsverket, Prislista farleds- och lotsavgifter 2026 | Sjöfartsverket | Yes | `docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.txt` (archived v0.4.5 — the verbatim text extraction, the fetchable artifact; the binary PDF remains unarchived, the recorded limitation) — upstream URL in the port YAML (https://www-n.sjofartsverket.se/globalassets/tjanster/anlopstjanster/sjofartsverkets-farleds--och-lotsavgifter/prislista-farleds--och-lotsavgifter-2026.pdf); earlier revisions of this reference claimed an in-repo archive path that never existed (fixed in the worked-example fix pass, spec v0.2.37; the never-existed .pdf citation paths repaired to the real .txt path at v0.4.5); the national extraction reference `docs/sources/sweden/national/NATIONAL_EXTRACTION_REFERENCE.md` (v0.4.5) is the national block's authority of record, shared by all five Swedish silos |

G1 is not archived in the repository; the port file carries its live publisher
URL as `upstream_url` per the v0.2.32 source-link contract
(`document_not_archived` in the converted registry). G2 is archived since
v0.4.6 (the delivered text extraction above); the APMT rules' citations point
at the archived .txt path, and G2 has left the not-archived list.

## 1a. The APMT operator layer (v0.4.6)

Both documents delivered by the product owner on 2026-10-02 and committed
directly to main ahead of this pass (bea5787 the Terminal Tariff, 5f09007
the Terms of Business); the sandbox fetch environment remains refused by the
publisher's CDN on every route (the v0.4.5 recorded stop; the environment's
fetch limitation stands — the delivery route is recorded as it happened,
never rewritten as a fetch). The archives of record:

- `docs/sources/sweden/gothenburg/apm-terminals-terminal-tariff-2026-june.txt`
  — the Terminal Tariff, valid 01.01.2026 until 31.12.2026 (June revision as
  delivered), SEK ex-VAT per its §12, five pages, issuer APM Terminals
  Gothenburg AB. Every encoded APMT figure verified against it at v0.4.6
  (handling 377/535 per size, break bulk 54/1,000 kg, hatch cover 3,111,
  gearbox 1,036, ISPS 80, storage ladders export 0-6 free then 133/346/578
  and import 0-4 free then 133/346/578 per TEU/day, yard surcharges 437/709/
  382/1,025, gate DG 538, idle berth 500 — all matching; the 2026 handling
  section publishes the explicit per-size pair, the 2024 doubling convention
  surviving only in yard storage).
- `docs/sources/sweden/gothenburg/apm-terms-of-business-2025-03-31.txt`
  — the Terms of Business v31 March 2025, the legal wrapper the tariff's own
  §8 incorporates (no rates; terms-only).

The handling-basis determination (v0.4.6, docs/GOT_APMT_OPERATOR_ARCHIVE_
AUDIT.md §4): the tariff publishes no basis wording — §1 charges goods per
unit with no scope statement, no modality distinction, and no separately
priced landside legs (the §2 export/import entries are storage-clock rules,
not leg prices; the §4.1 538 figure is a DG receipt/delivery surcharge). The
annotation is the evidence-based characterization: single per-unit charge;
no modality distinction and no separately priced legs published; scope of the
charge not stated in the document — the bundled reading is a labeled
inference pending wording from APMT, never a claim. The container-through
toggle's GOT participation remains "not published" (a wording, never a zero).

## 2. Charging structure (billers)

1. **Port of Gothenburg** — port dues (progressive GT), waste, fresh water,
   lay-up, OPS connection (tanker jetties only).
2. **Sjöfartsverket** — national vessel fee, readiness fee, cargo fee,
   pilotage, ordering fee, frequency discount.
3. **APM Terminals Gothenburg** — terminal handling, security, special
   handling, yard storage, yard surcharges, gate operations, value-added and
   additional services.
4. **Towage operator** — commercial tug services, no published tariff found.
   Handled as an estimated parameter (§6).

## 3. Yard storage (source G2, p.4 "Yard Storage")

The tariff prices storage **per TEU per calendar day** on a free-time ladder:
days inside the free allowance cost nothing; only days beyond free time are
charged, at the band rate covering that day number.

- Export/transhipment: days 0–6 free; days 7–9 at 133 SEK; days 10–13 at 346
  SEK; beyond day 13 at 578 SEK.
- Import/domestic: days 0–4 free; days 5–7 at 133 SEK; days 8–11 at 346 SEK;
  beyond day 11 at 578 SEK.
- Storage time rules (G2): export from gate-in/discharge to the day before
  loading; import from the day after discharge to departure.

Extraction decision (v0.2.33): encoded as **ladder-form `banded_by_time`
rules** with the free time as an explicit zero-rate band from day 0
(`apm_terminals_storage_export`, `apm_terminals_storage_import`). The earlier
split single-band encoding (six rules) forced every rule to fire on every call
and relied on an engine fallback that charged free time; the ladder form
matches the tariff's own schedule layout and the shape the engine test pins.
The engine's ladder semantics (each day charged exactly once, at the first
band whose [min_days, max_days] interval covers that day number) computes
identically for both shapes; the restructure removes the shape divergence so
the data cannot re-trip the fallback path.

## 4. Yard surcharges (source G2, p.5 "Yard Surcharges")

Per **unit per commenced calendar day**, no free time:

| Surcharge | Rate (SEK/unit/day) | Unit count input |
|---|---|---|
| OOG | 437 | `oog_units` |
| Reefer (incl. handling, monitoring, power) | 709 | `reefer_units` |
| Dangerous goods | 382 | `dangerous_goods_units` |
| Overdue dangerous cargo penalty | 1,025 | `overdue_dangerous_units` |

Timing rules (G2): DG and OOG are not charged on the day of loading or
discharge; reefer is charged from arrival to departure.

Extraction decision (v0.2.33): the rules carry `unit_input` on the
`per_commenced_day` rate so the amount is days × rate × units. The prior
encoding multiplied only days × rate — a unit-count defect that understated
every surcharge for any user entering unit counts. The overdue-DG penalty is
additionally gated behind its own explicit `overdue_dangerous_units` input: a
penalty is never derived from the ordinary dangerous-goods count, because the
tariff's overdue state is an operational fact the user must attest.

## 5. Default-call storage and unit-count contract (spec v0.2.33)

The default call carries **zero storage days** (`storage_days_export: 0`,
`storage_days_import: 0` — spec v0.4.1, the convention correction; the
prior v0.2.33 seeds of 5/3 are superseded). Storage days are user-entered
scenario inputs: entered days price honestly against each port's verbatim free
time and bands (Gothenburg export 0–6 / import 0–4; Hamburg free 3 import /
5 export before storage escalates from day one of chargeable time;
Helsingborg 7 calendar days; Norrköping free through day 4; Norvik 5 free
days), and the zero default manufactures no storage charge at any port — the
v0.4.0 Norrköping disclosure (one seeded chargeable export day, 328,400 kr)
proved a seeded planning assumption can manufacture a charge, a defect in the
convention itself. Seeded special-cargo unit counts (reefer, OOG,
dangerous, overdue) are **blank**: a default that manufactures charges no user
entered violates the clean-baseline principle. Blank unit inputs therefore
charge zero on the yard surcharges; a user-entered zero is a value, not a flag.

## 6. Estimated parameters (all quality-flagged, user-overridable)

| Parameter | Default | Basis |
|---|---|---|
| Towage cost | 60,000 SEK per tug-assist | No published Gothenburg tug tariff found; declared estimate anchored to the Helsingborg estimate (60,000 SEK per tug-assist, `HELSINGBORG_EXTRACTION_REFERENCE.md` §5): both ports sit in the same Swedish West Coast/Kattegat commercial towage market and a large-vessel harbour assist is a comparable operation. Flagged `estimated_parameter` on the line regardless of user override. |
| Default tugs | LOA < 150 m: 0; 150–250 m: 1; > 250 m: 2 | Spec 3.3 (defaults are data, user-overridable). Applied only when the user supplies no tug count; raised as an `assumed_parameter` flag ("tug requirement not entered; port default of N tugs applied; enter the actual requirement to override"). A user-entered zero tug count is a value and suppresses the flag. Reasoning: the Skandia container terminal is an open-harbour basin approach with no compulsory tug clause in the port tariff; the LOA-class bands mirror the Helsingborg pattern for the same fairway regime — small coasters berth without tugs, handymax-class container vessels take one assist, and vessels above 250 m LOA (panamax beam, deep draft on the Torummätnings-limited approach) take two. |

No other Gothenburg parameter is estimated: every tariff figure in the port
file is verified against G1/G2/G3.

## 7. Waste dues — compulsory base, origin split, certificate, exemption (spec v0.2.50)

Source: G1 (Port Tariff 2026), "Dues for ship-generated waste" schedule, p.5;
§§6, 10–12, pp.3–4. All quotations verbatim.

**Compulsory basis.** G1 §6: "The Port of Gothenburg charges for receiving
waste from vessels in accordance with Swedish legislation." The per-GT
sludge and solid-waste dues therefore apply to **every calling vessel**;
they are computed lines on every call, not opt-in services. The only relief
is the Transport Agency exemption (below).

**The split dimension is the arrival origin, never the flag.** The waste
schedule prices:

- Solid waste: "Vessels arriving from European ports 0,13 SEK/GT / Vessels
  arriving from non-European ports 0,24 SEK / Discount with certificates
  - 0,05 SEK/GT" — "The discount applies if the vessel is certified according
  to Commission Implementing Regulation (EU) 2022/91."
- Sludge: "Sludge from vessels arriving from European ports, up to 11 m³
  0,21 SEK/GT / Sludge from vessels arriving from non-European ports, up to
  11 m³ 0,31 SEK/GT / Sludge exceeding 11 m³ 2 400 SEK/m³" — the lay-time
  analogue: the rate covers the included volume, the excess bills per m³.
- Scrubber waste: "Administration fee 800 SEK" — "Scrubber waste unloaded in
  the Port of Gothenburg will be charged at the actual cost plus an
  administration fee." Only the 800 SEK administration fee is encoded;
  the actual disposal cost is excluded and labeled as such.

§10 defines the dimension in terms of the previous port of call:
"Short sea shipping includes all vessels with a European port as their
latest port of call." The tariff's own worked examples (p.11) state it the
same way: "A vessel of 70 000 GT arrives at the Port of Gothenburg from a
port in Europe" (European rates) and "A vessel of 12,000 GT arrives at the
Port of Gothenburg from a port outside of Europe" (non-European rates).

**Semantics fix (v0.2.50, defect).** The four waste rules were previously
gated on `flag_state` — the wrong dimension. A US-flagged vessel arriving
from a European port pays the European rates under the tariff; the old
model charged the non-European rates (and the reverse for a European-flagged
vessel arriving from outside Europe). The rules are now gated on a shared
`arrival_origin` call input ('europe' / 'outside-europe'), default outside
Europe (the worst case and the realistic Asia-arrival leg for the Maren
Maersk default). The flag is retained as vessel data only; the engine's
`flag_state` gate is retired.

**§10 certificate discount (EU 2022/91).** Modeled as an explicit attestation
input (`waste_certificate_2022_91`, default false — the worst-case posture):
when held, −0.05 SEK/GT off the solid-waste line only, per the tariff text
("a lower dues, SEK/GT for vessel generated solid waste… an additional
discount of 0.05 SEK/GT is granted from the regular waste fee").

**§11 non-compliance surcharge.** "A surcharge will be levied for any
additional costs incurred by the Port Authority, or its contractors as a
result of the port regulations not being followed." Contingent on an
operational breach with unpublished amounts; not modeled (no rate to encode).

**§12 Transport Agency exemption — documented status, deferred.** "Vessels
that have been granted exemption from the compulsory discharge of
ship-generated waste in Swedish ports by the Transport Agency do not pay any
sludge or waste dues in the Port of Gothenburg." This is an explicit
documented exemption, deliberately **not** encoded as a call input this pass:
modeling it would let a single checkbox zero four compulsory lines, and the
exemption is a rare, per-vessel regulatory grant (no default should imply
it). Deferred as a considered future option; no silent assumption exists —
the compulsory lines fire on every modeled call, and the UI's compulsory-basis
helper names §12 as the only relief.

**§10 short-sea discount note.** The §10 first sentence ("For ships in short
sea shipping***, a discount on the waste fee is provided in the form of a
lower dues, SEK/GT for vessel generated solid waste") describes the same
European-rate split the schedule already prices (§10's footnote defines
short sea shipping as the European-arrival case); it is not a separate
subtractive discount beyond the origin split and the 2022/91 certificate.

**Rotation mode — permanently excluded (spec v0.2.67).** The origin selector
is shared across all ports per the comparison philosophy (one leg, priced
identically everywhere). A real rotation's sequence of legs (Asia →
Hamburg → Gothenburg) is priced by flipping the selector per port. The
per-port origin override formerly deferred as "rotation mode" is a
permanent exclusion: the Gothenburg waste rules are the only
origin-gated rules in the container-call domain, so a per-port origin
could only ever change this port's own waste lines — a question the shared
selector already answers — and no charge or discount at any port in scope
depends on a vessel's port sequence. The tariff's own rotation-shaped
condition, the §2.2 FREQUENCY DISCOUNT ("Scheduled shipping routes with
calls at the Port of Gothenburg twice on the same route (import call and
export call) are entitled to a 50% discount on port dues based on GT for
the second call", p.10), is served by the explicit same-route attestation
(`got_same_route_second_call`, spec v0.2.67), not by a rotation model; the
RORO/RoPax per-week-and-service scales (§§2.3/2.5) key on a
Port-Authority-recognised service and belong to vessel models outside the
container-call domain. A line-service rotation product or a RORO/RoPax
vessel model would reopen it; nothing less does.

**§2.2 frequency discount — attestation-gated at spec v0.2.67.** The 50%
second-call discount on GT-based port dues is conditioned by the tariff on
the same-route import/export pair, not on any second call in a calendar
month. The port file's adjustment is gated on
`calls_this_month >= 2 && got_same_route_second_call`: the discount fires
only when the user attests the same-route pair (explicit input, default
false — the worst case); two unrelated calls in a month earn nothing under
the tariff. The rule's source citation is corrected against the live G1
document at the same pass (§2.2, pp.9–10; the earlier "Section 2.1, p.5"
and "Sections 3.2-3.3" attributions were mis-citations).

**Godsavgift — encoded at spec v0.2.61.** Gothenburg's own transcription
(port-silo discipline), per the Sjöfartsverket price list "Prislista farleds-
och lotsavgifter 2026" (the gods- och passageraravgift table, effective
fr.o.m. 2026-01-01; related regulation Föreskrift 2025:6 om farledsavgift):
högvärdigt gods (high-value cargo) 3.36 kr/tonne; lågvärdigt gods (low-value
cargo) 1.67 kr/tonne. "Lastat transitgods är befriat från godsavgift" —
loaded transit cargo is exempt (reduction application per §21 Föreskrift om
Farledsavgifter); the call model cannot represent transit cargo, and the
limitation is stated in the line's basis string, never silently assumed.
Traffic-type basis (Föreskrift 2025:6, not the price list): international
traffic is charged on loaded and discharged cargo, domestic traffic on loaded
only; the call model cannot distinguish traffic type, so the international
basis is the default with the assumption disclosed in the line's basis string
("international basis assumed"), and the domestic variant is a recorded
deferred finding. The container counts feeding the derivation already
represent both directions (loaded + discharged), so the tonnage prices once.
Encoded as rule sjofartsverket_godsavgift, fairway-dues family, "To reach
the berth" stage, functional class waterway/fairway access. Cargo tonnes
derive from the call's container counts and the shared planning weights
(spec §4.2.5): default 14 t/20ft, 24 t/40ft (OECD 12–18 t/TEU band,
user-adjustable, never tariff data), whole-tonne rounding (SJÖFS 16 §); the
low-value share input defaults to 0% (100% high-value for container vessels
per the SJÖFS commodity-code annex).
