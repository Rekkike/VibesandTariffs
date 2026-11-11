# Code Review Audit — Stage 1 consultation record and Stage 2 remediation log

Recorded at v0.13.3 (user rulings 2026-11-11). Stage 1 was a read-only
hygiene, sanity-check and code-review consultation at HEAD 2aa21dd (v0.13.2);
this document is its audit seam, committed as item 0 of the v0.13.3 pass
before any remediation action. Stage 2 (this pass, v0.13.3) executes the
graded groups below under the same rulings. Changelog rows are never
rewritten; this document records findings, verdicts and execution evidence.
Where this document and `docs/SPECIFICATION.md` overlap, the specification
governs.

## 1. Scope and mode

- Stage 1 base: main at 2aa21dd (v0.13.2), read-only; no commits, branches,
  pushes or settings changes; the parked Rotterdam branch
  (`vibe/rotterdam-terminal-layer-v080`) was never touched.
- Stage 2 branch: `vibe/hygiene-review-v0133-2aa21dd`, branched from 2aa21dd,
  patch-grade under specification §11. Zero movement of any Grand Total,
  native figure, native per-GT figure or comparison ranking; the single
  declared rendered change is the Aarhus converted per-GT annotation repair
  (Unit 3, §6 below).
- Excluded by ruling: A-01 (its own dedicated pass, next); the
  CRA/react-scripts migration (its own pass, scheduled); all workflow
  changes (deploy `CI=false` and CI Node 20 stay as documented); the web
  `proxy` field (stays, documented side effect); the optional dependency
  majors (queued, not taken).

## 2. Stage 1 verification evidence (builder-executed in a /tmp copy of the
repository at 2aa21dd, Node v22.23.4; per-workspace `npm ci` per ADR-001)

- Registry regeneration determinism: two consecutive runs of
  `core/scripts/convert_yaml_to_json.js` produced byte-identical outputs —
  `web/src/data/ports.json` sha256
  `fbd08c773217198c202f8fade1ff92a3869dd5efed5cd23b54f5885c02f8941b`,
  `vessel_library.json` sha256
  `a96ce81ca0e19c0a06e15193ff79970b0323a317c02f58b7ac7b41f2e9c13038`;
  console logs identical; 9 ports, 2 published pairs, 4 vessels.
- Build reproducibility: two consecutive production builds at the unchanged
  tree produced identical content hashes — `main.5e34b5fb.js` sha256
  `a510b026b50b3c986f6be396e22fa7c3ac88329cfa264bb57434f42a192e95d5`
  (1,521,962 bytes raw / 295,254 gzip), `main.0277ea08.css` sha256
  `5bbda472a1af058c7f26a0822bca9445f5b1e1f38a8d2644c468b985a3cf90d6`
  (35,516 / 5,610 gzip), chunk `317.36124339.chunk.js` 4,453 / 1,795 gzip;
  source maps present; homepage `/VibesandTariffs`; zero warnings under
  `CI=true`.
- Suites, chunked with exact-path anchors (Node 22.23.4): core 41 suites /
  902 tests green in 6 chunks (7+7+7+7+6+7 suites; 201+119+124+144+184+130
  = 902 tests); web 60 suites / 684 tests green in 6 chunks of 10
  (106+126+94+114+159+85 = 684). Counts agree with the v0.13.2 CI ledger on
  Node 20 (902/41, 684/60).
- Version strings at 2aa21dd: `APP_VERSION = 'v0.13.2'` (web/src/version.ts),
  the print pin (web/src/print.test.tsx), the spec header
  (`Specification v0.13.2`, line 1) and changelog row 0.13.2 (110 rows) all
  agree; the chip test cross-checks the constant against the header.
- Guard fixtures, executed: `spec-guard-unbumped` exit 1,
  `spec-guard-bumped` exit 0, `spec-guard-spec-only` exit 0,
  `spec-guard-chip-ahead` exit 1, `spec-guard-chip-behind` exit 1; forward
  pass `--base 8349ab4 --head 2aa21dd` OK with exactly one new row (0.13.2).
- Workflow integrity: deploy.yml uses the Actions artifact route
  (`upload-pages-artifact@v3` → `deploy-pages@v4`, no branch push; also
  pinned by core/test/deploy_route.test.ts); tests.yml weekly cron
  `17 5 * * 1` = Mondays 05:17 UTC as commented; both suites on every push to
  main, reports only.
- Documentation sanity: the two v0.13.2 dated notes (the A-01 supersession
  note in docs/APP_PURPOSE_AUDIT.md, the AAR erratum note in
  docs/SPECIFICATION.md line 131) are present, dated 2026-11-11, and
  internally consistent with the 0.13.0 row's arithmetic; no changelog row
  rewritten.

## 3. Seeded observations — verdicts

- `web/tsconfig.json.bak` committed leftover: CONFIRMED, byte-identical to
  `web/tsconfig.json`, the only `.bak/.orig/~` artifact in the tree.
- `@types/react-dom ^19.3.0` vs `react-dom ^18.2.0`: CONFIRMED and broader —
  installed `@types/react-dom` 19.3.0 and transitive `@types/react` 19.3.0
  against `react`/`react-dom` 18.3.1 runtime; masked by `skipLibCheck`.
- Legacy `react-scripts 5.0.1`: CONFIRMED; 5.0.1 is the latest published
  release, so its advisory profile is unfixable in place.
- Root `test` script core-only: CONFIRMED as fact; corrected as "stale" —
  documented deliberate state (README; tests.yml runs both suites in CI since
  v0.12.3). Hygiene candidate only.
- Node 22 local vs Node 20 CI: CONFIRMED and benign on evidence — local
  Node 22 produced identical suite totals and the identical bundle hash
  `main.5e34b5fb.js`.

## 4. Findings graded into groups

**(a) Safe zero-movement hygiene fixes** (outside the four guard behavior
paths, or lockfile/manifest-only): delete `web/tsconfig.json.bak`; add
`*.bak`/`*.orig`/`*~` to `.gitignore`; root `package.json` gains `test:web`
and `test:all` (existing scripts unchanged); declare `js-yaml` `^4.1.0` in
`web/package.json` devDependencies (testRates.ts imported it undeclared,
resolved only by workspaces hoisting — verified: `web/node_modules` lacks
js-yaml, root has 4.3.2).

**(b) Bundle-affecting dependency remediation, as declared changes:**
align `@types/react-dom` to `^18.x` (pulls `@types/react` 18 transitively);
`npm audit fix` WITHOUT `--force` (low/moderate tail only); no optional
major taken. Dev-only changes: the bundle must remain content-identical
(verified by hash after each step).

**(c) Behavior-adjacent items:** the per-GT annotation defect (Unit 3, the
single declared rendered repair); the production-dead duplicate
`rankOrderByConvertedBasis` in web/src/responsive.ts (EUR-only inline
conversion; imported by no production module; stale ranking-strip comment)
deleted with its test coverage migrated to the live path in
`./conversion`; comment-only repairs of stale doctrine-contradicting
wording in `web/src/conversion.ts` (v0.3.2 rate-refresh header,
`OverrideProvenance.endpoint` v0.3.5 wording; the `overrideProvenance`
parameter itself stays, a live test surface), `core/src/engine.ts`
("simplified for now / in production" lines), `web/src/App.tsx` ("current
three ports", duplicated navigation comment), `core/scripts/check_spec_version.js`
("0.2.x" example wording), `core/scripts/convert_yaml_to_json.js`
(rate-refresh override-layer comment). Excluded by ruling and NOT touched:
A-01 (`defaultCall()` stamps today's date, P1 time-sensitive — its own pass
next), workflow changes, the proxy field.

**(d) Record-only observations** (no change recommended): the dead-and-guarded
`DEFAULT_EXCHANGE_RATE` in web/src/conversion.ts (confirmed still dead in
production per the v0.3.5 record; pinned to the YAML row by the v0.13.1
guard in rateRefresh.test.tsx); the engine's `vessel.nt` mutation side
effect in `getBasisValue`; the wall-clock `calculation_timestamp` (anchored
in tests by the fixed clock); the additive/multiplicative adjustment mixing
formula in engine.ts (no current data mixes the two kinds); the
unreferenced audit script `core/scripts/audit_presentation_normalization.ts`
with its stale five-port list; the dev-only duplicates js-yaml 3.15.2
(nested under babel-plugin-istanbul) and typescript 4.9.5 (nested under
react-scripts, vs 5.9.3 at root); `collectCoverage: true` on every core run;
the web tsconfig oddities (`paths` for `@port-cost/core/*` used only by
test-only type imports; `src/**/*.yaml` include matching nothing); the
fixed-clock 39-line twin (pinned for agreement by fixedDate.test.tsx).

## 5. Dependency audit evidence (builder-executed, worksuite-accepted)

- Root lockfile audit (`npm audit --omit=dev`): 43 vulnerabilities
  (16 low, 8 moderate, 18 high, 1 critical); with dev: 46 (2 critical).
  ALL of them sit inside the react-scripts 5.0.1 build/test toolchain
  (webpack-dev-server, webpack-dev-middleware, svgo, postcss, node-forge,
  serialize-javascript, shell-quote, handlebars, nth-check,
  follow-redirects, launch-editor, body-parser, …). None are in the
  shipped runtime dependencies (react, react-dom, @mui/*, @emotion/*,
  web-vitals are clean), and the deployed artifact is the static bundle
  built from `src/` only, so these advisories never reach the served site.
- `npm audit fix` without `--force` takes the low/moderate tail; the
  high/critical items require `--force` (breaking; would "install
  react-scripts@0.0.0") — unfixable inside react-scripts 5.0.1. Remediation is
  the scheduled CRA migration pass. Red-proof shape for Unit 2: reverting
  the lockfile re-flags the fixed advisories.
- Licenses: 1138 packages in the installed tree, all permissive (MIT ×963,
  ISC ×46, CC0-1.0 ×41, Apache-2.0 ×27, BSD variants, Unlicense ×2,
  Python-2.0, MPL-2.0, CC-BY-4.0, …); none unknown, proprietary or
  commercial.
- `npm outdated` queue deliberately NOT taken at v0.13.3: react/react-dom
  18.3.1 → 19.3.1; @mui 5.18.0 → 9.5.0; jest 29.7.0 → 30.5.2; typescript
  5.9.3 → 7.x; js-yaml 4.3.2 → 5.5.0; web-vitals 2.1.4 → 6.2.3;
  @types/jest 29.5.14 → 30.0.0. react-scripts has no newer release.

## 6. The declared rendered change (Unit 3) — the per-GT annotation defect

Two screen surfaces converted a per-GT annotation by raw multiplication
with the kr-per-EUR rate instead of routing through the single conversion
path (`toComparisonBasis`, currency-aware): web/src/comparisonCells.tsx
(the port-dues family cell annotation) and web/src/comparisonView.tsx (the
Vessel Access Charges row annotation). For EUR ports the raw multiplication
was arithmetically correct; for Aarhus (DKK) it applied kr-per-EUR to a
DKK/GT figure instead of the derived SEK-per-DKK cross. The print path
already converted currency-aware (`convertedFor` in printComparisonPages.tsx)
and the Grand Total per-GT cell already routed through `toComparisonBasis`,
so the Grand Total per-GT for Aarhus was already correct.

Declared movement, at the pins of record (EUR-SEK 10.9910, EUR-DKK 7.4754,
as_of 2026-11-10; cross 1.470289215292827; default vessel 194,849 GT;
Aarhus default call 6,348,361.00 DKK):

- Aarhus port-dues family annotation: erroneous 43.96 → corrected 5.88
  SEK/GT converted (native 4.00 DKK/GT × cross).
- Aarhus Vessel Access annotation: erroneous 46.16 → corrected 6.18 SEK/GT
  converted (native 4.20 DKK/GT × cross).
- Aarhus Grand Total per-GT: 47.90 SEK/GT, unchanged (already correct).
- Every EUR annotation unchanged (Hamburg family 3.52, vessel-access 36.38
  SEK/GT converted); every total, native figure, native per-GT figure and
  the comparison ranking byte-identical.

## 7. Adjudications (user rulings 2026-11-11)

- A-01 scheduled as its own dedicated pass (next); the P1 production
  finding stands unadjudicated until then.
- The CRA/react-scripts migration is scheduled as its own pass; the
  high/critical toolchain advisories are accepted and documented until then.
- deploy.yml `CI=false` and CI Node 20 stay as documented (local Node 22
  deviation recorded; identical hash and counts observed across both).
- The web `proxy` field stays (documented allowedHosts side effect).
- The optional dependency majors (§5 queue) are not taken.

## 8. Stage 2 execution record (filled in during the v0.13.3 pass)

Recorded here as executed: per-unit commits on
`vibe/hygiene-review-v0133-2aa21dd`; bundle-hash attribution chain
(baseline `main.5e34b5fb.js` at 2aa21dd; post-code-change hash at unchanged
version; post-version-bump hash; CSS throughout); suite counts and per-suite
deltas; lockfile and guard evidence; token sweep. See the v0.13.3 changelog
row in docs/SPECIFICATION.md for the delivery-level statement.
