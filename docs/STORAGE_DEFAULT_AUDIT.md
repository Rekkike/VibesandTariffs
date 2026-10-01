# Storage-Default Convention Correction — Audit (v0.4.1, item 0)

Committed before any implementation, per the standing audit-first discipline.
Authority of record for every tariff figure: the extraction references
(`docs/sources/**/*_EXTRACTION_REFERENCE.md`). This audit invents no rate;
every figure below is either the engine's own arithmetic (run against the
verbatim-encoded data) or a verbatim citation.

## The decision under audit

The product owner's scope decision: **the default call carries no storage
stay.** The shared storage-day seeds (`storage_days_export: 5`,
`storage_days_import: 3` in `core/src/defaults.ts`) are set to zero. The
storage inputs are user-entered scenario surfaces and render only when days
are entered. The v0.4.0 Norrköping disclosure (one seeded chargeable day,
328,400 kr) demonstrated that a seeded planning assumption can manufacture a
charge at a port — a defect in the convention itself, now removed.

## Item 0.1 — Every surface the seeds touch (inventory)

**The seed definition (the only code change):**
- `core/src/defaults.ts:96-97` — `storage_days_export: 5`,
  `storage_days_import: 3` (the shared input defaults; not in any port's
  `reset_fields` — they are shared inputs by spec v0.2.47).

**The shared input surface:**
- `web/src/portWorkspaceInputs.tsx:1451-1472` — the Storage Days (Export)
  and Storage Days (Import) TextFields. Behavior otherwise unchanged:
  user-entered days price honestly against each port's verbatim free time
  and bands. No helper text today describes the default as prefilled —
  the inputs carry no `helperText` at all (checked; item 1.4 therefore
  requires no wording change on this surface, only the value behavior,
  which the engine change carries).

**Per-port storage rules that consume the seeds (all verbatim-encoded,
none change):**
- **GOT** (`core/data/gothenburg_2026.yaml`): APM Terminals storage,
  `basis: storage_days_export` / `storage_days_import` at four rules
  (lines 2521, 2552, 2585, 2606, 2627, 2648) — export free through day 6,
  import free through day 4, then 133/346/578 bands (S-level ladders).
- **HAM** (`core/data/hamburg_2026.yaml`): Eurogate ch. 7 storage
  (`days_input` at 1029, 1060, 1091, 1119 — the terminal-handling rules)
  plus HHLA storage (1247, 1277, 1963, 1999, 2035, 2065), free 3 import /
  5 export, then 41.10/82.20/123.30 EUR; both are `scenario_adjusted`
  surfaces at the default call.
- **HEL** (`core/data/helsingborg_2026.yaml`): import (322, 346, 369, 392)
  and export (415, 438, 461, 484) progressive ladders over the verbatim
  7-day free time.
- **NRK** (`core/data/norrkoping_2026.yaml:334-432`): the four per-size
  progressive ladders, free through day 4 (arrival + 3 working days),
  day 5-6 at 103/205 SEK, day 7+ at 253/507/301/600.
- **GLE** (`core/data/gavle_2026.yaml`): no container-storage rule — the
  Yilport concession's handling and storage are GAP NOTICES (unpublished,
  never invented). The seeds touch nothing at Gävle.
- **NVK** (`core/data/norvik_2026.yaml:469-565`): the four Hutchison TEU
  ladders, 5 free days (`days_input` at 478, 507, 536, 565), then
  91/343 SEK per TEU-day bands.

**The default-call definitions:** every port's `default_call` section
(overlay data) — none declares its own storage days; all inherit the shared
seeds. Verified by reading each YAML's `default_call` block.

**The pins that assert the seeds' values:**
- `core/test/storage_towage.test.ts:195-196` — asserts 5/3 (the standing
  "seeds sit within the free allowance" pin, this pass's superseded
  contract).
- `core/test/engine.test.ts:310-341` — asserts the ladder arithmetic at
  entered day counts (5, 8) against GOT; these are entered-value pins, not
  seed pins; they survive unchanged.
- `core/test/storage_towage.test.ts:172-195` — the per-flow ladder pins
  (entered days; survive unchanged).
- `core/test/swedish_expansion.test.ts:276-285` — the v0.4.0 Norrköping
  disclosure pin (the 82,400 + 246,000 = 328,400 kr seeded consequence) —
  re-baselined this pass with in-test attribution.
- `core/test/swedish_expansion.test.ts:267-274` — the GLE/NVK
  scenario-off pin (default call renders no storage line; survives,
  strengthened).
- Web pins asserting the Norrköping default total / per-GT:
  `web/src/comparisonDefaults.test.tsx:218` (8626172.5),
  `web/src/discountLine.test.tsx:114` (8 626 173 kr / 44.27),
  `web/src/grandTotalPerGt.test.tsx` (44.27 comment/cell).

**Documentation surfaces describing the seeds:**
- `docs/sources/sweden/gothenburg/GOTHENBURG_EXTRACTION_REFERENCE.md` §5
  ("Default-call storage and unit-count contract, spec v0.2.33") — states
  the seeds and their rationale; amended this pass (the contract
  paragraph, not any tariff figure).
- `core/data/norrkoping_2026.yaml:334` and `core/data/norvik_2026.yaml:469`
  — YAML comments stating "the seeded defaults sit inside the free time"
  (the Norrköping comment was already false for the export seed — the
  v0.4.0 disclosure — and is corrected this pass).
- `docs/SPECIFICATION.md` §4 (the storage rule language / default-call
  contract wording) — the changelog row and the amended contract
  paragraph carry the record.

## Item 0.2 — Each port's exposure (engine-verified, not assumed)

Method: `calculatePortCallCost` run against each port's verbatim data at
the seeded default call vs. the zeroed default call (`storage_days_export:
0, storage_days_import: 0`). The engine's own output, exactly as computed:

| Port | Seeded total | Seeded storage lines | Zeroed total | Zeroed storage lines | Movement |
|------|-------------|----------------------|--------------|----------------------|----------|
| GOT  | 3,275,851.15 | export 0 / import 0 (within free time; zero-amount lines) | 3,275,851.15 | none render (suppressed) | **0** — verified |
| HAM  | 2,204,910.90 | none (Eurogate free 3/5 ≥ seeds; scenario-off) | 2,204,910.90 | none | **0** — verified |
| HEL  | 8,750,057.40 | none (7-day free time accommodates the seeds) | 8,750,057.40 | none | **0** — verified |
| NRK  | 8,626,172.50 | export 82,400 (20') + 246,000 (40') | 8,297,772.50 | none | **−328,400 kr** — verified |
| GLE  | 1,370,979.35 | none (no storage rule; gap notice only) | 1,370,979.35 | none | **0** — verified |
| NVK  | 11,952,324.05 | none (Hutchison 5 free days ≥ seed 5/3; scenario-off) | 11,952,324.05 | none | **0** — verified |

**The declared movements, attributed:**
- **Norrköping:** the export seed (5 days) exceeds the verbatim free time
  (free through day 4) by exactly one day. Day 5 at the published day-5-6
  band: 20' units 800 × 103 = 82,400; 40' units 1,200 × 205 = 246,000;
  total 328,400 kr. Zeroing removes exactly this. New total
  **8,297,772.50 kr**; new per-GT 8,297,772.50 ÷ 194,849 =
  **42.59 SEK/GT** (8,297,772.50 ÷ 194,849 = 42.5857, pinned at
  the engine's own two-decimal rounding — the audit's initial hand figure
  42.58 was corrected against the engine's arithmetic; the engine is the
  authority). The import seed (3 days) sat inside the free time and moved
  nothing (verified — the seeded import rules rendered no line at all).
- **Norvik:** the directive's expected finding verified — the Hutchison
  scenario storage did **not** fire at the seeds: the 5-free-day ladder
  accommodates export 5 exactly (5 < 6, the first chargeable day) and
  import 3. Zero movement; no re-derivation required.
- **GOT/HAM/HEL/GLE:** zero movement, verified at the engine's own
  arithmetic, not assumed.

Every movement is declared and attributed; nothing drifts.

## Item 0.3 — The storage test contract (superseded → strengthened)

The standing pin (`core/test/storage_towage.test.ts`, "the seeded storage
days sit within the port free allowance") is **superseded**: it asserted a
property of the seeds, and the v0.4.0 Norrköping disclosure proved the
property false in general (the pin held only because its free-time
computation happened to accommodate GOT/HAM/HEL — it was never run against
NRK/NVK; the expansion suite carried the disclosure pin separately).

The new contract is stronger: **the default call manufactures no storage
charge at any port, because the default storage stay is zero days.** No
seeded planning assumption may manufacture a charge at any port — the
ESI-40 defect class generalized.

Pins marked re-baseline with in-test attribution:
- `core/test/storage_towage.test.ts` — the seed-value pin (5/3 → 0/0) and
  the free-allowance pin (replaced by the no-storage-line pin).
- `core/test/swedish_expansion.test.ts` — the NRK default-call baseline
  (8626172.50 → 8297772.50), the per-GT (44.27 → 42.59), and the v0.4.0
  disclosure pin (re-baselined to the zero-default postures; the
  scenario pins at entered days survive byte-identically).
- `web/src/comparisonDefaults.test.tsx`, `web/src/discountLine.test.tsx`,
  `web/src/grandTotalPerGt.test.tsx` — the NRK cells, attributed.

## Grade determination (§11)

§11's mapping: patch = changes that do not change what the model computes;
minor = added functionality that does not break what exists. This pass
**changes what the model computes at the default call** (the Norrköping
default total moves −328,400 kr) — the model's results at the default
change meaning (the default call now carries no storage stay). The
expected finding confirmed: **minor-grade, v0.4.1.**

## Standing ritual (performed before this audit's implementation work)

ECB EUR→SEK re-verified via the Frankfurter mirror (the runtime fetch was
removed at v0.4.0; the verification is an offline-ritual fetch, not a
feature): latest TARGET publication **2026-10-01 at 11.331** — identical
to the pinned rate. The pinned figure remains the one from the 2026-09-30
publication (the v0.4.0 convention: as_of stays at the publication the
pinned figure came from). **Drift 0; the YAML unchanged.**
