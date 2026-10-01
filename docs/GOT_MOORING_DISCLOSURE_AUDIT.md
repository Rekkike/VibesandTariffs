# GOT Mooring Disclosure — Audit (v0.3.1 seam)

The last known service gap at Gothenburg: mooring. This pass adds a GOT
notice plus an optional user-specified mooring input. Zero drift at the
default call; the notice is a zero-amount disclosure, never a charge.
This document is the committed seam, reported before any implementation.

## 1. Premise verification

Repo state at ef98026 (v0.3.0), enumerated not sampled:

- No mooring rule exists at any port: `grep -ri "mooring|klippan|båtmansstation|förtöjning"`
  across core/src, core/data, web/src, and docs matches only the spec's
  fee-family vocabulary — `mooring` is listed in §4's independent-providers
  sentence and the `fee_family` enumeration (docs/SPECIFICATION.md lines 166,
  196, 590) but no port YAML carries a mooring-family rule. Confirmed: the
  three port files carry zero rules and zero inputs for mooring.
- No mooring biller: the GOT billers list is Port of Gothenburg,
  Sjöfartsverket, APM Terminals Gothenburg, Towage operator (estimated) —
  no Klippan entry. HAM and HEL carry none either.
- No mooring input: the CallInput model (core/src/types.ts) has no
  mooring field; no port's reset_fields names one.
- The premise HOLDS: mooring is absent from every port surface today.

## 2. Facts encoded, with citations

- Company: AB Klippans Båtmansstation, org.nr 556132-5233, registered
  1970-01-26 (registry records show active since 1972 — the ~1972
  establishment of the directive's premise), ~33 employees, statutory
  object verbatim: "Bolaget skall utföra förtöjning och losskastning av
  fartyg i Göteborgs hamn" (public registry records: allabolag.se,
  merinfo.se, bolagsfakta.se, hitta.se, ratsit.se — each surfaced with the
  clause verbatim).
- Purpose and fleet, its own site (boatmangbg.com, archived): "main
  activity is mooring vessels in the Port of Gothenburg"; "consists of
  four mooring boats in different size"; a "long-standing partner of the
  Port of Gothenburg".
- The mandatory fact, sharpened by the archived source (better than the
  directive's "mandatory in practice"): Sjöfartsverket's official Göteborg
  pilot-area restriction page states mooring boatmen are OBLIGATORISK —
  "Det är obligatoriskt att använda utbildade båtmän vid förtöjning i
  Göteborgs hamn" — for every vessel in the Energy Harbour and all
  vessels of LOA 80 m or more elsewhere in the port (page updated
  2023-10-11, archived verbatim). Every container call in the model's
  domain (the four library vessels: 137.5–399 m LOA) is above 80 m —
  mandatory for the entire modeled domain, by regulatory instruction,
  not mere practice.
- The lease: the company holds the city-lease mooring concession at the
  Port of Gothenburg (arrendeavtal with Göteborgs Stad; Göteborgs Stad
  handlingar reference goteborg.se/wps/PA_Pabolagshandlingar/file?id=56480,
  a Göteborgs Hamn AB / Göteborgs Stad tjänsteutlåtande naming Klippans
  Båtmansstation; the full municipal record not archived this pass).
- No published rate: checked — the company's site is contact-based, no
  price list exists anywhere (archived); the Port of Gothenburg tariff G1
  carries no mooring line (its §4 lists mooring among independent
  providers — billed separately); no public source carries a rate.

Archive state (docs/sources/sweden/gothenburg/klippan/):
- batman-obligatoriskt.html.md — Sjöfartsverket båtmän page, verbatim.
- klippan-boatmangbg-com.html.md — the company site, verbatim with the
  registry facts and the archive note.
- Unreachable: klippanbatmansstation.se blocked automated retrieval
  (boatmangbg.com is the live company site, archived instead). The
  municipal lease record is referenced, not archived. Best-effort per the
  directive; the facts stand as directive context where the archive is
  thin, and every encoded figure is zero (the notice encodes no figure).

## 3. Precedent adjudication

Two candidate patterns:

(a) The FuelEU notice (v0.2.69): a zero-amount `regulatory_notice` line —
    the informative-zero convention; the flag renders, the line carries
    its own badge, the zero-line collapse keeps it visible (a zero line
    with flags is never collapsible, zeroCollapse.ts rule 1).
(b) The towage estimate (v0.2.33): a `per_unit` rule with an
    `estimated_parameter` flag and a data-authored default (60,000 SEK)
    surfaced as a user-editable input.

Verdict: the notice follows (a) — the FuelEU pattern fits because the
mooring notice discloses an EXCLUSION (a cost the total does not carry,
with no computable amount), exactly like FuelEU's per-call-honesty
boundary. Pattern (b) does not fit the notice because it presupposes a
declarable default rate — the scope guard forbids exactly that.

The input follows (b)-adjacent — the OPS/ETS conventions, not the towage
default: the input is a user-specified flat SEK amount, blank at default,
with `flat.amount_input` (the HAM towage_amount mechanism) carrying the
entered value. Unlike towage, no default amount is declared and no
`estimated_parameter` block fires on the data rule (nothing is estimated
— the blank default renders nothing). When entered, the line renders as
its own charge line with a user-specified flag. Mislabeled rendering
(the entry presented as tariff-derived or estimated) fails pins.

## 4. Placement

- The notice: a data rule in the GOT port file (id gothenburg_mooring_notice,
  family mooring, biller AB Klippans Båtmansstation — the factual biller,
  never normalized), zero-amount, carrying a new `service_gap_notice` flag
  (the regulatory_notice pattern generalized: an informational disclosure
  of a separately-billed service with no published rate — never
  estimated, never a regulatory instrument). The biller is added to the
  GOT billers list. Visible at every GOT call (flags survive the
  zero-line collapse; nothing hides behind an entry).
- The input: `mooring_charge` (SEK, per call, flat), rendered in the GOT
  workspace's gothenburg_ancillary section; a second GOT data rule
  (gothenburg_mooring_charge) consumes it via `flat.amount_input` —
  blank renders nothing, entered adds exactly the entered amount.
- HAM/HEL: nothing — no notice, no input, no biller (pinned isolation).
- Stage placement (item 2.2 adjudication): mooring is a berth-side
  service — the boatmen handle the lines that make fast at the berth.
  Against the existing stage segmentation: pilotage and towage (the
  other purchased nautical services) sit in "To reach the berth", and
  the mooring assist is the final act of the same nautical sequence
  (Sjöfartsverket's own page files the båtmän restriction under the
  Göteborg PILOTAGE area). Decision: "To reach the berth"
  (`STAGE_BY_FAMILY` mooring entry; the functional classification
  purchased_service). The at-berth stage is lay-time ship's dues and
  energy — a purchased per-call assist is not a lay-time charge.

## 5. reset_fields / union contract

`mooring_charge` joins GOT's `input_profile.reset_fields` (per-port: a
mooring entry at GOT must not render at HAM/HEL boxes). Per §7's union
sentence this is a data-contract change: the field moves from the shared
half to the per-port half of the persistence split for every port at
once. Pin updates in the same change (the v0.2.68/v0.2.69 precedent):
the resetFieldsUnion membership pin and the new suite's routing pins
(the field routes per-port; the HAM/HEL isolation pin).

## 6. Zero drift, both states

- Blank input: byte-identical everywhere (the notice is zero-amount and
  never additive; the default call gains no charge). GOT 3,275,851.15 SEK
  / 16.81; HAM 2,204,910.90 EUR / 11.32 / 127.59 SEK-GT; HEL
  8,750,057.40 SEK / 44.91.
- Entered: the total moves by exactly the entered amount; no other
  figure moves (the mooring line is the only new fee record; no family
  sum, stage sum, or aggregate absorbs another line's amount).
- Pinned, both states.
