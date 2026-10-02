# Annual Calendar-Window Condition Type — Audit (v0.4.3)

Authority of record for the calendar-window condition pass. The archived
hamntaxa (docs/sources/sweden/gavle/hamntaxa-2026.pdf, SHA-256 pinned in the
extraction reference) governs; this audit transcribes its wording verbatim
and records the adjudications. Committed before implementation (the
audit-first seam).

## 1. The istillägg inventory (verified against the archived PDF)

Every section carrying the istillägg line, with the window wording recorded
verbatim per section. **Verified: the window wording is identical in all
four sections** — each reads exactly:

> "Istillägg 1 december till 30 april +100 % (enligt ovanstående taxa)."

| Section | Scope | Rates covered by "ovanstående taxa" |
|---|---|---|
| 2.1 | Fartyg till Bulkterminal, Containerterminal och Granudden | Break bulk (LoLo) 4,81/GT; Containerfartyg 2,97/GT; RoRo Kpl 15, 1–2 anlöp/vecka 1,94/GT; RoRo >2 anlöp/vecka 1,69/GT; Övriga 4,81/GT |
| 2.2 | Fartyg till Kaj 1 Kemiterminalen | Tankfartyg 0–15 000 GT 4,81/GT; 15 001–20 000 GT 5,21/GT; >20 000 GT 5,96/GT |
| 2.3 | Fartyg till Kaj 27 Energiterminalen | Tankfartyg 0–15 000 GT 4,94/GT; 15 001–20 000 GT 5,35/GT; >20 000 GT 6,12/GT |
| 2.5 | Fartyg till Karskär | Alla fartygstyper 4,26/GT |

Sections 2.4 (elanslutning), 2.6 (liggetidsavgift) and section 4 (waste)
carry no istillägg line — the scope boundary below.

## 2. Scope boundary (verified)

The istillägg attaches to the hamnavgift GT rates of sections 2.1/2.2/2.3/
2.5 only. Verified against the document:

- §2.4 (Avgift för elanslutning) — no istillägg line; the connection
  charge 5,145 SEK/anlöp and the actual-cost consumption are outside the
  surcharge.
- §2.6 (Liggetidsavgift, 62 SEK/m LOA per påbörjat dygn) — no istillägg
  line.
- §4 (Avgifter för fartygsgenererat avfall) — no istillägg line; the
  miljötillägg waste rates (0.18/GT containerfartyg) are outside the
  surcharge.

The rule family gates accordingly: the winter variant keys on the
hamnavgift rules (fee_family port_dues, the hamnavgift lines), never on
the liggetidsavgift, electrical, or waste rules.

## 3. The miljörabatt interaction (adjudicated, recorded — not encoded)

The tariff's section 3 wording, verbatim from the archived PDF:

> "Fartyg som har minst 30 poäng enligt ESI eller har minst 4 stjärnor
> enligt CSI erhåller 10 % rabatt på fartygsavgiften baserat på GT.
>
> Fartyg som använder LNG som bränsle vid anlöp erhåller 20 % rabatt på
> fartygsavgiften baserat på GT."

Adjudication: the rabatt's object is "fartygsavgiften" — the vessel fee
the call is charged. On a winter call the vessel fee is the doubled
hamnavgift (the istillägg is +100 % "enligt ovanstående taxa", i.e. a
surcharge on the fee itself, and the fee actually charged is thereby the
doubled one). The tariff computes no separate winter fee: the winter
fartygsavgift IS the doubled fee. The reading that therefore governs:
**on a winter call the 10 % (or 20 %) rabatt applies to the doubled
fartygsavgift**, not to a pre-surcharge base — the document names the fee
("fartygsavgiften"), never a base rate, and the fee charged in the window
is the doubled one. Equivalently: the surcharge and the discount are
sequenced on the same fee — the +100 % enters the fartygsavgift and the
percentage rabatt then applies to it (a 10 % rabatt on a winter call
yields 1.8 × the base GT rate, not 1.9 × as a compute-on-base reading
would give). This reading is recorded only; no computation changes this
pass (see the directive-expectation mismatch below).

Directive-expectation mismatch, reported per §9 of the standing
discipline: the directive states "the miljörabatt surfaces were
recorded-not-encoded at v0.4.0 (no ESI/CSI discount rule exists in the
Gävle silo)". Verified against the silo: **an ESI-keyed miljörabatt
adjustment does exist** — `gvh_hamnavgift_container` carries a 10 %
discount adjustment gated on `"esi_score >= 30"` (committed in v0.4.0,
7146e02, and recorded in that pass's changelog row: "hamnavgift 2.97/GT
containerfartyg with the ESI ≥30 miljörabatt"). The directive's premise
does not hold for the ESI branch; the CSI-stars branch (≥4 stjärnor, a
different scale from the model's 1–5 CSI input) and the LNG 20 % branch
remain recorded-not-encoded, per the v0.4.0 adjudication. This pass
encodes nothing new for the rabatt either way (the interaction
adjudication above is recorded in this audit only), so the mismatch
changes no computation; it is reported, never silently resolved. The
record-not-encode pin therefore holds for this pass's change set: no
rabatt rule is added, and the existing ESI adjustment is untouched.

## 4. The default call's date (verified)

`defaultCall()` sets `date: new Date().toISOString().split('T')[0]` — the
session date at call time. In this session's environment that date is
2026-10-02, which is **not** in the 1 December–30 April window: the
istillägg does not fire at the default call. The pass proceeds (the
stop condition is not met). Note for the record: the default date is a
moving value — as the clock moves into the window, a default call would
begin pricing the doubled hamnavgift; that is the existing input
surface's behavior (the date field is the user's call input, required,
ISO), never a re-baselined figure. The engine test pins use explicit
non-winter dates so the pins never drift with the clock.

## 5. The condition-type design (adjudicated against the engine's
existing vocabulary)

Existing condition vocabulary, verified:

- `applicable_conditions` (rule-level gates): arrival_origin, min_gt,
  ops_usage, esi_score, csi_class, fuel_percentage, nt_class,
  vessel_type, ordering_lead_time_band, terminal_operator, issc_valid,
  plus a generic exact-match branch for call-field keys.
- Adjustment-level `condition` strings parsed by `evaluateCondition`:
  `field >= N` / `field > N`, `esi_score >= N`, `csi_class == 'X'`,
  `calls_this_month >= N`, bare call booleans, `&&`/`||` composition.
- The loader's contract: `applicable_conditions` is an open record with
  a documented handled set in the engine; unknown keys fall to the
  generic matcher (or, for `flag_state`, a visible warning).

Adjudication:

1. **The condition type** is data-declared as
   `applicable_conditions.date_within_annual_window:
   { start_month, start_day, end_month, end_day }` — a structured
   object under the existing open `applicable_conditions` record, an
   engine-generic calendar predicate: the call's date (month/day)
   falls within the annual window, endpoints inclusive, with wrap
   handling when the window crosses New Year (start > end means the
   window spans the year boundary: December–April). Never a port-id
   string; the month/day numbers are data, the wrap logic is generic
   machinery. A rule carrying the condition applies only inside the
   window; the base rule (unconditioned) applies year-round — the
   gated-variant pattern the engine already uses (e.g. the doubled
   ISSC security rule beside its single-rate sibling).
2. **The +100 %** is an existing adjustment shape: the engine's
   multiplicative `surcharge` adjustment
   (`adjustedAmount *= 1 + percentage/100`) with a `condition`. The
   winter variant is therefore encoded per the engine's existing
   gated-variant pattern: a winter variant of each hamnavgift rule
   (base rate × 2), gated on the condition, stacked beside the base
   rule which carries the negated window (outside) — the pattern used
   by the Hamburg ISSC doubled/single pair. A duplicated ×2 rule
   with the same source citation is data-only, engine-generic, and
   needs no new adjustment machinery. (Verified: no multiplier
   adjustment type exists as such; the multiplicative surcharge and
   the gated variant are the established shapes, and the gated
   variant is the one the loader and engine already exercise.)
3. No new input surface: the call input's existing required ISO
   `date` field is the input.

## 6. Findings summary

1. The istillägg window wording is identical in all four sections
   (verified, not assumed).
2. The scope boundary holds: hamnavgift only.
3. The miljörabatt reading: the rabatt applies to the doubled
   fartygsavgift on a winter call (the fee charged is the doubled
   one); recorded, not encoded this pass. The directive's
   recorded-not-encoded premise is incorrect for the ESI branch
   (an ESI-keyed 10 % adjustment has existed since v0.4.0) —
   reported; no rabatt rule is added or changed in this pass.
4. The default date (2026-10-02) is outside the window; the pass
   proceeds.
5. The condition type is `date_within_annual_window`, data-declared,
   engine-generic, wrap-handling; the surcharge is a gated winter
   variant of each hamnavgift rule (the existing gated-variant
   pattern).
