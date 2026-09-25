# Rotation-Mode Arrival-Origin Override — Re-scope and Verdict Audit (v0.2.67, Item 1)

Reported before any implementation. Authority of record for every tariff
claim: the extraction references under `docs/sources/`, the archived tariff
PDFs, and (for the one passage no extraction reference quotes in full) the
live G1 publisher document, fetched and quoted verbatim below.

## 1. Intent reconstruction

The concept appears in exactly four places in the record:

1. **Spec v0.2.50 changelog row and §4.3.1 (comparison philosophy):** the
   arrival origin — the previous port of call's region — is one shared leg
   selector on the call; "a real rotation's sequence of legs (Asia →
   Hamburg → Gothenburg) is deliberately out of scope, priced by flipping
   the selector; a per-port origin override is explicitly deferred as a
   considered future option ('rotation mode'), not implemented."
2. **Gothenburg extraction reference §7, "Rotation mode — deferred":** the
   same statement, port-silo side.
3. **EXPANSION_AUDIT.md A4 and deferred list:** "the deferred rotation-mode
   override (deferred queue) is the only per-port-identity question" on the
   origin selector; the deferred-list entry restates it.
4. **Engine/data:** `arrival_origin` exists as a shared call input
   (`core/src/types.ts:498`, default `outside-europe` at
   `core/src/defaults.ts:74`); the four Gothenburg waste rules are its only
   consumers (`applicable_conditions.arrival_origin`,
   `core/src/engine.ts:90-92`); the engine's handled-conditions set names
   it (`core/src/engine.ts:256`).

**What the item was meant to answer.** A user pricing a real rotation
(Asia → Hamburg → Gothenburg) arrives at each port from a *different*
previous port. The tool answers "what does the arrival leg cost me?" with
one shared selector, so the honest per-rotation answer requires flipping
it per port and re-reading each total — three passes instead of one. The
deferred "rotation mode" was the per-port origin override: let the
Gothenburg column price the European leg (Hamburg → Gothenburg) while the
Hamburg column prices the Asia leg, in one screen.

**What question would a rotation-aware user ask that the model does not
answer?** Exactly one, and it is a comparison-workflow question, not a
charge question: "in my actual rotation, what does each port charge my
vessel as it actually arrives?" No charge or discount at any of the three
ports depends on the vessel's *sequence* of calls across ports.

## 2. Current-state model

- **Arrival origin:** one shared leg selector on the call model
  (`'europe' | 'outside-europe'`), held constant across ports per the
  comparison philosophy (v0.2.50). It is *not* in any port's `reset_fields`
  — verified in all three port files — so under the v0.2.60 persistence
  split it is a **shared** field (`PER_PORT_CALL_FIELDS` is the
  reset_fields union, `web/src/App.tsx:43`); an origin edit carries to all
  ports' workspaces and columns.
- **Voyage context:** none exists. The call model has no previous-port
  field, no voyage or rotation object, and no port-sequence input.
- **Per-call sequence inputs:** exactly one — `calls_this_month`
  (`core/src/types.ts:491`, default 1), consumed by two mechanisms:
  1. the national Sj\u00f6fartsverket frequency rabatt — a graduated
     per-calendar-month scale (calls 1–2 → 100%, 3 → 75%, 4 → 50%,
     5 → 25%, 6+ → 0% of the vessel fee and readiness fee;
     `frequency_discount` biller bands in both Swedish port files;
     engine consumption at `core/src/engine.ts:1731-1745`);
  2. the Gothenburg port-dues second-call discount — an engine adjustment
     gated on `condition: "calls_this_month >= 2"`
     (`core/data/gothenburg_2026.yaml:107`).
- **Origin- or sequence-sensitive engine rules beyond these:** none. The
  complete condition inventory across all three port files (verified by
  enumeration, not sampling): GOT — `esi_score >= 30 || CSI class 4`,
  `fossil_free_fuel_percentage >= 30`, `calls_this_month >= 2`,
  `waste_certificate_2022_91` (×2), `pilotage_hours > 7` (×10), and the
  four `arrival_origin`-gated waste rules; HAM — the three application-
  based waste-reduction booleans (`waste_short_sea_reduction`,
  `waste_alternative_fuel_reduction`, `waste_sustainable_waste_reduction`)
  plus band/threshold inputs elsewhere; HEL — the environmental
  conditions and `pilotage_hours > 7`. `flag_state` drives nothing
  (retired v0.2.50; a visible warning fires if a rule re-carries it).
  No rule at any port consumes a voyage, rotation, or port-sequence
  input. HHLA's "consecutive berths in one voyage = one uninterrupted lay
  time" (S4 1.2) is a lay-time accounting rule within a single Hamburg
  call, recorded in the extraction reference, not a cross-port sequence
  charge; the HPA inland-voyage rebate (item 200, −60%) is explicitly
  out of container scope (v0.2.63 audit).

## 3. Tariff basis

- **Swedish national (Sj\u00f6fartsverket prislista; F\u00f6reskrift 2025:6 /
  SJ\u00d6FS 2024:1):** the frequency rabatt and the godsavgift are per-call
  and per-cargo quantities at the charging port; neither depends on where
  the vessel arrived from or on a rotation pattern. No published OPS-due-
  per-GT exists (v0.2.64 finding, restated in the queue).
- **Gothenburg (G1, Port Tariff 2026):** the waste schedule splits on the
  arrival origin ("Vessels arriving from European ports / non-European
  ports"; §10's footnote defines short sea shipping as the European-
  latest-port-of-call case) — fully served by the shared selector. The
  **container-vessel frequency discount** (live G1, §2.2 "OTHER
  DISCOUNTS — FREQUENCY DISCOUNT", p.10, fetched from the publisher
  2026-09-27, quoted verbatim): *"Scheduled shipping routes with calls at
  the Port of Gothenburg twice on the same route (import call and export
  call) are entitled to a 50% discount on port dues based on GT for the
  second call."* The condition is a **same-route import/export pair**, not
  any second call in a calendar month.
- **RORO/RoPax per-week scales (G1 §§2.3/2.5):** "the first two calls for
  one service (as recognised by the Port Authority) are charged at the
  1–2 calls per week band rate... The term 'week' refers to a calendar
  week, Monday–Sunday", bands 1–2 / 3–6 / 7+ (RoPax adds 21+) calls per
  week **and service**. These are the closest rotation-shaped rules in the
  sources — but they are (a) vessel classes outside the container model,
  (b) keyed on a Port-Authority-recognised "service", and (c) per-week,
  for which no input exists (standing queue finding). Their conditions
  inform the verdict: the tariff's own rotation-shaped concepts key on a
  *service*, not on a vessel's port sequence.
- **Hamburg (STC / HHLA / Eurogate / BUKEA):** no charge or discount
  depends on arrival origin or voyage sequence. The traffic-category
  distinctions that exist (HHLA gangway feeder/overseas; the retired HPA
  weight-dues overseas/European split, out of container scope) are
  service-class distinctions with explicit call inputs, already encoded.
  The short-sea waste reduction (−90%, BUKEA ordinance, application-based)
  is an attestation, not an origin gate.
- **Helsingborg:** no origin- or sequence-dependent provision beyond the
  national rules (verified against the archived tariff PDF and its
  extraction reference).

## 4. The GOT second-call rule: under- or over-served by calls_this_month?

**Over-served.** The tariff grants 50% off the GT-based port dues for the
*second call on the same route* — an import call paired with an export
call on a scheduled route. The model grants it for *any* call with
`calls_this_month >= 2`: two unrelated calls in one month (e.g. two
different services, or two import calls) both receive 50% off, where the
tariff gives the second unrelated call nothing. The reverse (a same-route
second call) is served correctly. The comparison-view "Calls This Month"
input (shared, all ports) invites exactly this over-service. The figure
at the default Maren Maersk call is large: the GT-based port dues are
204,279.20 SEK, so a calls=2 entry discounts 102,139.60 SEK that a
non-same-route second call would not earn under the tariff.

This is a fidelity gap in a charge rule, not a rotation feature; it is
the only place where a rotation-shaped tariff condition exists in the
container domain. The full-scope fix (a route/service model) is out of
the container-call domain. The minimal, bounded fix is an attestation
gate: the discount requires the user to attest the same-route pair, and
a missing attestation means the discount does not fire.

## 5. Design space

**(a) Rotation-mode per-port origin override — EXCLUDED.** No tariff rule
in scope prices the arrival origin differently per port pair: only
Gothenburg has origin-gated rules, so a per-port origin can only ever
change one column's waste lines, and the user can already flip the shared
selector and read that column. A per-port override would add a call-model
field, a persistence classification, and a comparison-context divergence
("same call" no longer means the same leg) to answer a question the
tariffs do not ask. The §4.3.1 sentence and the extraction-reference §7
paragraph are amended to record the exclusion.

**(b) GOT same-route second-call attestation — IMPLEMENTED (the minimal,
audit-bounded refinement).** The over-service finding is a real tariff
condition the model drops. The design:

- **Input:** `got_same_route_second_call?: boolean` on the call model —
  an explicit attestation, default false (worst case, the
  waste-certificate pattern). Shared, not per-port: the condition is a
  property of the call's route, and only GOT's rule consumes it.
- **Data:** the GOT rule's condition becomes
  `calls_this_month >= 2 && got_same_route_second_call` (the engine's
  condition matcher already handles `&&`; the description and the two
  corrected citations — §2.2 FREQUENCY DISCOUNT, p.10 — carry the
  tariff's own wording).
- **Engine:** no engine change (the compound condition is existing
  capability; verified against the condition evaluator).
- **UI:** a checkbox in the Gothenburg workspace's call-parameters group
  ("Same-route second call (import + export pair, Port Tariff 2026
  §2.2)"), helper text stating the tariff wording and that two unrelated
  calls do not earn the discount; the comparison view's discount line
  derives from the engine, so it moves with the attestation, no
  comparison-model change.
- **State:** shared field; not in any reset_fields list; the shared-call
  contract is unchanged.
- **Figures:** zero drift at the default call (attestation false). With
  calls_this_month ≥ 2 and the attestation true, the figure is the
  current one (102,139.60 SEK off). Without the attestation, the discount
  line is absent — the corrected behavior.

**Recommendation with argument.** The honest tariff basis supports both
halves of this split verdict: the rotation-mode concept is excluded
because no tariff in the container-call domain prices a rotation
sequence, and the one rotation-shaped condition that does exist (the
same-route pair) is minimally served by an attestation, not by a voyage
model. The reader decides; the implementation follows the authorities
of record.
