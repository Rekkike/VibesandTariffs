# Port Call Cost Analyzer — Environment and Verification Discipline (Standing)

This document records the standing environment and verification discipline for every build session. It is a companion to `docs/SPECIFICATION.md`, which remains the sole governing authority for the data model, engine, and UI contracts; where the two overlap on deployment verification, the specification's §8 protocol governs. Every rule below was paid for in lost sessions and is part of the project's incident record (the specification changelog rows for v0.3.5 and v0.4.0 record the workspace resets; the v0.3.5 row records the tally double-count). No session should re-learn these rules through failure: every session reads this document before its first long-running step and follows it without needing a directive to restate it.

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

## 6. Session-start order

1. Confirm the repository head and the delivered ledger (core and web test counts) before any change.
2. Perform the standing verification ritual (the ECB EUR→SEK rate re-verification; update the YAML if the rate has moved; report the drift).
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

## Incorporation note

This document is standing from its creation. The next delivery pass records it in its changelog row and may incorporate its content into the specification as a numbered section; from that point the specification governs and this document serves as its concordance.
