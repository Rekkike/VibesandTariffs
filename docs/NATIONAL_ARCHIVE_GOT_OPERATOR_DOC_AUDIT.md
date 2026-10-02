# National-Archive and GOT Operator-Document Audit (v0.4.5)

Audit-first record for the two-item, one-vehicle pass. Item 1 repairs the
v0.4.4 audit's citation-integrity finding (the prislista never archived
in-repo; all five silos' national document_url fields carried a path that
never existed). Item 2 closes GOT's basis gap (the v0.4.2 audit's named
open finding) — checkpointed independently, with its own fetch risk and stop
condition.

---

## 1. Item 1 — the prislista archive and citation-path repair

### 1.1 The fetch and the honesty check

- Upstream URL (the one the GOT extraction reference already records):
  https://www-n.sjofartsverket.se/globalassets/tjanster/anlopstjanster/sjofartsverkets-farleds--och-lotsavgifter/prislista-farleds--och-lotsavgifter-2026.pdf
- Fetch date: 2026-10-02. The fetch tooling retrieves the PDF as text
  extraction only; the binary bytes are not retrievable by this environment
  (the v0.4.4 audit's limitation, re-tested this pass and confirmed). Per the
  honesty rule, the archive is the verbatim text extraction as fetched —
  never a fabricated archive — with the binary gap recorded in the national
  extraction reference as a limitation (the same disclosure class as the
  towage estimate's declared assumption).
- Archive: `docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.txt`
  — the directory's first resident, created by this pass.
  SHA-256: `fa1cfe5a5bf90a6f0b22f30abd3e832f4e01c9dcdc907987e96cf92f720d4699`.
- Extraction reference:
  `docs/sources/sweden/national/NATIONAL_EXTRACTION_REFERENCE.md` — the
  national block's authority of record, written once, cited by all five
  silos (the shared-machinery pattern extended to the source tree).

### 1.2 Identity verification

Issuer Sjöfartsverket (the document's own headings, "Sammanfattning av
Sjöfartsverkets farledsavgifter" / "… lotsavgifter", and the publisher
domain); title "Prislista farleds- och lotsavgifter 2026" (2026 edition);
validity "fr.o.m. 2026-01-01"; structure — two sections (fairway dues:
fartygsavgift by dräktighetsklass × miljöklass, beredskapsavgift, gods- och
passageraravgift, transitgodsrabatt, frekvent trafik, miljöincitament/CSI;
pilotage: per-½h lotsavgift by class, extra lots, lotsrabatter,
beställningsavgift bands, the two föreskrifter). Match — archived as
expected.

### 1.3 The citation repair

All five Swedish silos' national rules cited
`docs/sources/sweden/national/sjofartsverket/prislista-farleds-lotsavgifter-2026.pdf`
(and GOT/HEL additionally the double-dash filename variant in two rules) —
paths that never existed, carried through the not-archived marker (spec
v0.2.32). Corrected to the archived document's real path
(`…prislista-farleds-lotsavgifter-2026.txt`): GLE 176, GOT 180, HEL 176,
NRK 176, NVK 176 document_url/document_name pairs — 884 fields across 442
national rules. Bookkeeping only: no figure, rate, or condition changed;
the upstream_url provenance fields retained. The v0.2.37 false-path repair
is the precedent class; the v0.4.4 finding is closed.

### 1.4 The figure re-verification (verified-against-archive)

Every v0.4.4 equivalence figure re-verified against the archived document:
class boundaries 0/1,000/2,000/3,000/6,000/10,000/15,000/30,000/60,000/100,000
NT; class-9 fartygsavgift D/E 201,805; beredskapsavgift class 9 60,370;
pilotage class 9 start 35,755 + 8,105 per ½h; ordering bands 9,390 / 7,510 /
5,635 / 3,775 / 1,880; godsavgift 3.36 / 1.67 kr/ton; the frequency scale
100/100/75/50/25/0 %. Identical, stated as verified-against-archive now.

### 1.5 Pins and red proofs (item 1)

- One new core pin (source_integrity: the archive-presence pin — the
  national archive and its reference exist, all five silos cite the real
  path, no residual never-existed .pdf citation). Red proofs observed failing
  before trusted: the archive file removed (2 red in the suite), a silo's
  document_url reverted to the never-existed .pdf path (2 red); each
  restored green.
- Zero-drift: the six default totals pinned byte-identical in the existing
  suites (GLE 10,306,979.35 / NRK 8,297,772.50 / NVK 11,952,324.05 / GOT
  3,275,851.15 / HEL 8,750,057.40 / HAM 2,204,910.90) — verified green this
  pass.
- Re-baselined with in-test attribution: core source_integrity (the
  not-archived list loses its two prislista entries) and core godsavgift
  (the citation document_name .pdf → .txt).

## 2. Item 2 — the APMT Gothenburg operator document (stopped at the fetch boundary)

### 2.1 The fetch attempts and the stop condition

The directive names the known-blocking risk: APMT's CDN refuses non-browser
clients on the tariff PDFs. Attempted, in order, on 2026-10-02:

1. The publisher's tariff page
   `https://www.apmterminals.com/en/gothenburg/services/terminal-tariff` —
   Access Denied (Akamai edgesuite reference returned).
2. The cms-cd URL family (the 2026 document by its 2025 naming pattern
   `apm-terminals-gothenburg-terminal-tariff-2026.pdf`; the `terminal-tariff-2026.pdf`
   variant; the 2025 and 2024 editions with their rev parameters) — Access
   Denied on every attempt.
3. The www-host media path (`www.apmterminals.com/gothenburg/-/media/…`)
   for the 2026 document and the 2023 edition — Access Denied.
4. The cms-cd tariff page itself — Access Denied.
5. The cms-cd-eu1-prod host — the fetch service returned a temporary
   outage on both attempts (not a publisher refusal; recorded honestly as
   unresolved, never as served).
6. A search-indexed mirror — none exists in the index; every indexed hit
   resolves to the refused hosts or to the ctfassets asset.
7. The ctfassets host (which serves the RoRo schedule to a plain client) —
   serves only the Gothenburg RoRo Terminal Rate Schedule 2026 (verified by
   fetch; its "Handling of lift units … is included in the shipping line's
   stevedoring rates" sentence noted as context for a future pass, never as
   the container authority).

The stop condition is met: every container-tariff fetch route failed. Per
the directive, item 2 is marked unreachable, the finding is committed, and
item 2 stops — the delivery lands with item 1 complete. No figure, no
annotation, no toggle participation changed: the 377/535 verification, the
basis determination, the storage cross-check, and the scope adjudication all
remain open on a document-delivery route (a manually delivered PDF archives
against the GOT silo source tree and re-enters this item's checkpoint).

### 2.2 The recorded finding (the deferred queue's item)

The GOT basis gap stays open: the handling annotation remains "basis not
stated in the document" (the honest wording — the APMT document is still
not archived), and the container-through toggle's GOT participation remains
"not published" (a wording, never a zero). The 2024 doubling-convention
question (377 base → 754, not 535) remains unverified — recorded as a
research hint, never encoded; a future adjudication against the archived
document is the closing evidence, and any figure contradiction stops at
the report (the anchor port's 3,275,851.15 total is never silently
re-baselined).

## 3. Grade (§11)

Item 1 only landed: a citation repair with no figure movement — patch-grade
(v0.4.4 → v0.4.5). No figure correction was adjudicated (item 2 stopped at
its fetch boundary), so no minor-grade trigger exists.

## 4. Deferred queue (restated verbatim; findings appended)

1. Scrubber-waste actual-cost surfaces — deferred, unchanged.
2. Equipment-hire surface at Norvik — dropped per the product owner;
   recorded in the Hutchison extraction reference. Removed from the queue.
3. Pilotage-time assumption refinement per port — deferred, unchanged.
4. Gävle winter-surcharge calendar-window rule shape — deferred
   (engine does not support date-window conditions), unchanged.
   **Finding appended at v0.4.3 (recorded, not restated by later passes):**
   closed — the annual calendar-window condition type and the istillägg
   (docs/ANNUAL_WINDOW_CONDITION_AUDIT.md). The item stays listed verbatim
   as the historical record; it is not open work.
5. Handling-basis table now a verified artifact (TERMINAL_BASIS_COMPARABILITY
   audit §2): future terminal-operator documents — APMT Terminals
   Gothenburg first (the GOT case-3 finding) — enter against it; the basis
   annotation family re-baselines per port as each operator document is
   archived and extracted. **Finding appended at v0.4.5:** the APMT
   container tariff was re-attempted this pass and every fetch route was
   refused (audit §2.1 above); the item stays open on a document-delivery
   route.
6. Yilport operational surfaces (overtime §2, out-of-window §3.5, waiting
   time §3.7, COPRAR-absence §3.8, productivity compensation §3.2) —
   recorded; encoded only when a future pass adds the scenario inputs.
7. Norrköping liner criterion — deferred, unchanged.
8. Yilport empty-container input (1,235/unit) — recorded, not encoded.
9. **The prislista in-repo archive and the document_url bookkeeping repair
   (the v0.4.4 audit's deferred-queue finding) — closed at v0.4.5: the text
   extraction archived under docs/sources/sweden/national/ with its national
   extraction reference, every silo's national citation repaired to the real
   path; the binary PDF remains unarchived (the recorded limitation), a
   future binary-capable fetch may replace the text archive and re-verify.**
