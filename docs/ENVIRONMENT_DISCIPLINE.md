# Port Call Cost Analyzer — Environment and Verification Discipline (Standing)

This document records the standing environment and verification discipline for every build session, and the standing working discipline that governs every pass. It is a companion to `docs/SPECIFICATION.md`, which remains the sole governing authority for the data model, engine, and UI contracts; where the two overlap on deployment verification, the specification's §8 protocol governs. Every rule below was paid for in lost sessions or defect repairs and is part of the project's incident record (the specification changelog rows for v0.3.5 and v0.4.0 record the workspace resets; the v0.3.5 row records the tally double-count). No session should re-learn these rules through failure, and no directive should restate them: this document is the canonical text; directives invoke it by reference so that repeated-but-slightly-different phrasings cannot drift the rules.

## 1. Chunking (strict)

- Never one long silent invocation. Test runs execute in per-suite or small-batch chunks with progress lines between chunks.
- Build first (one step), then test in batches.
- Commit and push a checkpoint before any step that could run longer than a few minutes.

Justification: full sandbox workspace resets occurred twice in the v0.3.5 session and twice in the v0.4.0 session, both during long test invocations. A reset destroys the workspace; only pushed work survives.

## 2. Exact-path tally anchors

When tallying per-suite counts, jest positional arguments are regular expressions: an unanchored pattern matches unintended suites (the v0.3.5 session double-counted — a `theme` pattern also matched `summaryTheme`, observing 506 against the 494 baseline). Use exact-path anchors for per-suite runs and report counts with their arithmetic.

## 3. Checkpoint protocol

- Create a `wip/<pass-name>` branch at the start of a pass and push it immediately. Do not accumulate unpushed work.
- Commit after each completed unit of work and before every long-running step.
- On an environment reset or a dead session: re-clone, check out the WIP branch, and continue from the last checkpoint — never restart from scratch. A successor session implements from the committed audit documents and checkpoints.
- After the final verified delivery (squash-merge to main), delete the WIP branch.

## 4. Web-suite runner

The web suite requires `npm test` (react-scripts); the direct jest runner lacks the Babel transform. Use `--runInBand` to cap resource use when chunking is not enough.

## 5. Web fetches

Never wait on a hung fetch. Abandon it, mark the source unreachable, and move on. A marked-unreachable source is an honest finding; a session stalled on a fetch is a lost session.

### 5.1 Verification-artifacts doctrine (standing, recorded v0.5.2; the observed fetch-tool artifacts, never re-diagnosed)

The sandbox's fetch tooling produces three recurring artifacts against the served site. Each is a property of the tooling, not a defect in the deployment or the model; each has a recorded resolution; no future session re-diagnoses them.

1. **The 0-kr hydration snapshot** (observed v0.5.0, confirmed harmless by real-browser check): a fetch of the served page can return the pre-hydration DOM — the HTML shell with the empty root, which reads as 0 kr and no figures. It is not a deployment defect or an engine regression. Resolution: the shell-level checks that matter are the bundle reference (`main.<hash>.js`) and the version marker; the hydrated application is confirmed by a real-browser check (or the rendered-application markers), never by the snapshot's zeros.

2. **The ~32k bundle truncation on large JS assets** (observed on the served bundle): the fetch tooling truncates large JS bodies at roughly 32 KB of a much larger document. It is not a corrupted build or a served-artifact discrepancy. Resolution: check the expected byte length before asserting any content (the spec §8 truncation protocol's retry-and-length discipline), and prove identity through the CI artifact manifest and the hashed filename, never through a truncated body's content.

3. **The stale-branch trap** (observed v0.5.1, twenty minutes lost): a legacy branch snapshot (`gh-pages`, deleted at v0.5.2) that has no serving role under the Actions artifact route can be probed as if it were the served artifact, producing a false hash discrepancy. It is not a deployment failure. Resolution: the served artifact's evidence class is named in the amended spec §8 — the CI artifact manifest or the live shell's own bundle reference; a probe returning any other artifact class is a mis-targeted probe, reported as such, never as a served-artifact discrepancy.

## 6. Session-start order

1. Confirm the repository head and the delivered ledger (core and web test counts) before any change.
2. Perform the standing verification ritual (section 10).
3. Fresh-clone environment setup per ADR-001: per-workspace installs, core build, ports.json regeneration.
4. Re-verify the baseline suites (chunked) to the exact delivered counts before starting implementation.

## 7. Delivery order

1. Rebuild core/dist and regenerate ports.json before running web tests.
2. Full suites in chunks with exact counts and stated arithmetic against the delivered baseline.
3. Zero-warning build with the bundle hash recorded.
4. Version guard verified both ways (chip-ahead red, chip-behind red) plus the forward pass green.
5. Squash-merge to main, delete the WIP branch, and perform the §8 served-artifact verification per the specification.

## 8. Reporting

A report is true only if every stated fact is checkable. State deviations plainly; never report predictions or intentions as accomplishments.

## 9. Working discipline (standing, governs every pass)

- Extraction references under `docs/sources/` are the authorities of record and prevail over directives. A directive's identifications are expectations: a mismatch is reported, never archived as expected.
- Never invent rates and never fill gaps silently; gaps surface as notices. "Not published" is always available and is never rendered as a zero.
- Ports are data silos; shared national rules (the Sjöfartsverket block) are referenced, never duplicated.
- Formal tone, no contractions, in code, specification, and reports.
- Currency local throughout; conversions only at the pinned rate through the established machinery.
- Zero-drift: every prior feature and every baseline survives byte-identically except a pass's own declared, attributed movements. A movement is never unexplained.
- One directive pass at a time; one delivery, one spec bump.
- Every contract is pinned, and every pin has a red proof where the tooling allows one: the mutated state is observed failing before the pin is trusted.
- Reports state the archive and adjudication results, the declared movements with their arithmetic, the exact suite counts with their arithmetic, the served-artifact verification, deviations, and the deferred queue restated verbatim with findings appended.

## 10. Standing verification ritual (every session, first)

Re-verify the ECB EUR→SEK reference rate to the latest TARGET-business-day publication (the Frankfurter mirror in `core/data/exchange_rates.yaml`); update the YAML if the rate has moved, regenerate, and report the drift. The pinned default is static, versioned data; this ritual is its maintenance.

## 11. Directive format

A directive states only what is new: the scope decision, the items, the report requirements, the scope guards, and the deferred queue context. The standing rules are not restated; a directive's preamble is a single line invoking this document. A conflict between a directive and this document is reported, never silently resolved in either direction; this document's sections 1-8 may be overridden only by an explicit, attributed instruction in the directive naming the section and the reason.

## Incorporation note

This document is standing from its creation. The next delivery pass records it in its changelog row and may incorporate its content into the specification as numbered sections; from that point the specification governs and this document serves as its concordance.

**Incorporated at v0.4.2** (specification §§12–15, changelog row 0.4.2):
from that point docs/SPECIFICATION.md governs and this document serves as
its concordance. The two record the same rules; any drift between them is
a defect in the concordance, never a silent resolve in either direction.

## 12. Branch-first session start (recorded v0.7.0)
A session start lists branches first (`git branch -a`) and locates the
pass tip before any checkout; a pass continues on its WIP branch, never
from main while a WIP branch exists.

## 13. node_modules is janitor-swept (recorded v0.7.0)

A `node_modules` directory inside the repository working tree is wiped
by the sandbox janitor within roughly one minute of its creation; an
install there does not survive, and a build step that depends on it dies
mid-pass (observed as the previous session's build-step death). The
standing workaround for the remainder of the v0.7.0 pass:

- Dependencies live under `/tmp` (fresh lockfile install in a `/tmp`
  copy of the repository), never inside the repository tree.
- Test and build runs execute from the `/tmp` copy, which is synced
  from the repository working tree before each run.
- Edits land in the repository tree, never only in the `/tmp` copy;
  local binaries from the `/tmp` install are used rather than `npx`.
