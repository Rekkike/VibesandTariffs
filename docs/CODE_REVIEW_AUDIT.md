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

## 9. CRA migration Stage 1 record (v0.15.0, 2026-11-11, Test-runner
## migration to Vitest, user rulings 2026-11-11)

Branch `vibe/test-runner-v0150-b5e64e3` from main b5e64e3. Scope: the web
test runner swaps to Vitest 3.x (web/vitest.config.ts; jsdom 26.x web-nested);
the production build stays react-scripts 5.0.1. npm audit, observed in the
/tmp build copy: before (b5e64e3) 36 full / 34 production (18 low, 5
moderate, 13 high, 0 critical full; 16/5/13 production); after (v0.15.0
tree) 39 full / 34 production — the +3 are dev-only and are the recorded
interim per the ruling: @vitest/mocker (moderate) and tinypool/vitest
(2 critical) in the Vitest worker chain, none in shipped runtime
dependencies; all 34 production advisories remain inside the
react-scripts 5.0.1 tree and leave at Stage 2. Suite counts unchanged:
core 902/41, web 693/60 under `vitest run` (chunked 106+131+97+114+160+85,
exact-path anchors, fileParallelism:false). Hash-equality red proof: at
unchanged version v0.14.0 the production build reproduces
main.40012ac1.js (sha256 f0a6f0a6…) and main.0277ea08.css (sha256
5bbda472…) byte-identically — the runner swap does not touch the bundle.
Fixed-clock red proof: with the fixedClock anchoring removed from the
setup path, 4 of 9 fixedDate pins go red under Vitest; restored green.
Recorded for Stage 2 (effective there, per the same rulings): the lint
layer is dropped entirely (the eslintConfig key leaves with
react-scripts; no lint gate exists in CI and the build type-check covers
the type signal) (Superseded in place at v0.16.2, 2026-11-12, Web
typecheck gate (worksuite ruling 2026-11-12): since v0.15.1 the vite
build runs no tsc, so the build type-check left with react-scripts and
nothing type-checked the web tests from v0.15.1 until v0.16.2; from
v0.16.2 the web test:types gate (tsc --noEmit over the test-inclusive
web/tsconfig.json, wired into tests.yml immediately before the Web
tests step) covers the type signal. The original wording above is the
pre-v0.16.2 record and is not rewritten.) and the web proxy field is dropped (no server exists
in-repo; the README LAN note is updated there); Stage 2 also takes
build.sourcemap true, an explicit 'modules' build target, and the
Node 20 to 22 move of both workflows with vite 8/vitest 5/jsdom 31
(projected 0/0 advisories, verified in a scratch projection).

### Stage 2 delivery record (v0.15.1, 2026-11-11, Build-tool migration to
### Vite, branch `vibe/build-swap-v0151-4e91ee6` from main 4e91ee6)

react-scripts 5.0.1 removed from web dependencies entirely (1154 packages
leave the lockfile); scripts are vite / vite build / vitest run; the
eslintConfig key (lint layer dropped per the ruling above — this note is
its record) and the proxy field (no server exists in-repo) are deleted;
the CRA homepage value /VibesandTariffs is superseded by `base` in
web/vite.config.ts and the key is removed — its fate: carried verbatim
into vite.config.ts, the served base path is unchanged. web/index.html
moves from web/public/ (no %PUBLIC_URL% macros; public/ held no other
assets). tsconfig moduleResolution node -> bundler. New web/vite.config.ts:
@vitejs/plugin-react, base, build.sourcemap true, explicit target —
deviation: vite 8 is rolldown-based and rejects the legacy 'modules'
keyword (observed BUNDLER_INITIALIZE_ERROR), so the target is es2020, the
old 'modules' baseline. npm audit observed in the /tmp build copy: before
(4e91ee6) 39 full / 34 production; after (v0.15.1 tree) 7 low full / 0
production — the web tree itself is 0/0; the 7 low are all in core's jest
29 dev chain, untouched by this pass and dev-only. deploy.yml and
tests.yml move to Node 22 (vite 8 requires >= 22.12), the Pages artifact
path is web/dist, CI=false dropped. Determinism: two consecutive vite
builds byte-identical. Shell: assets/index-<hash>.js + assets/index-<hash>.css,
zero static/js/main, asset-manifest.json gone (unused by the deploy
route; recorded here). Content pins on the new bundle at v0.15.1:
10.991 x2, 7.4754 x1, 2026-11-10 x3, 'Call date:' x4, 'not entered - no
date-window rule fires' x2, v0.15.1 x1, v0.15.0 x0. Print CSS carries
break-inside/page-break-inside and @media print/@page into the built
stylesheet (Vite does not autoprefix; both properties were already
present in source). One informational rolldown chunk-size notice
(>500 kB), recorded. Env scan: zero process.env/REACT_APP/PUBLIC_URL in
web/src, re-verified — no conversion was necessary. vitest.config.ts
fields all survive the vitest 3 -> 5 upgrade unchanged. Final bundle at
v0.15.1: assets/index-dU9ekIJF.js (sha256
90116476339237f9f48fc8f41eaf8e1c10e5fe9646170d9284f33f124fcce5f1),
CSS assets/index-CPM43X7J.css (sha256
a6b8ef14341dc4c52c7d380d9e78f1306f666db673b97f2a591a03d089b3a83e),
byte-identical across two consecutive builds; shell references both
assets, zero static/js/main.

## 10. Core test-runner migration record (v0.16.0, 2026-11-11, branch
## `vibe/test-runner-core-v0160-8c5ce76` from main 8c5ce76)

Core's suite moves from jest 29 + ts-jest to Vitest 5 (5.1.0, aligned to
the web's 5.1.0) in a single pass; core has no build axis, so no staging.
Inventory correction to the Stage 0 consultation report: beyond the five
require() sites in three files (aarhus/bremerhaven crypto;
engine.test.ts's Panamax beforeAll js-yaml/fs/path), __dirname appears
in ~25 of the 41 test files, so the pass covers all CJS access with one
globals shim (core/test/vitest_setup_globals.ts: createRequire +
__dirname, loaded first in setupFiles) instead of per-file inline
conversion; zero jest.* sites existed (zero vi. conversions). New
core/vitest.config.ts (globals, node env, setupFiles, include, fileParallelism:false);
core/jest.config.js deleted. collectCoverage disposition per ruling:
per-run coverage collection dropped (the Stage 1 record-only item);
@vitest/coverage-v8 5.1.0 declared so --coverage works on demand; no
coverage in the default script or CI. Typecheck restored per ruling:
core/tsconfig.test.json (test-inclusive, types node + vitest/globals
replacing the departed @types/jest) + test:types script, wired into
tests.yml's core job before the suite run; gate green at HEAD
(tsc --noEmit exit 0, no pre-existing errors). Web typecheck gap observed
read-only in the scratch copy and queued as its own record item: web
tsc --noEmit reports 75 errors, all in *.test.* files, all TS2304/TS2582
missing vitest-globals names (the gap dates from v0.15.1, when the CRA
build type-check left with react-scripts); no web change in this pass.
(Superseded in place at v0.16.2, 2026-11-12, Web typecheck gate
(worksuite ruling 2026-11-12): the 75 figure was an undercount of the
same class and the same cure. The full observation of record at e09b484
is 3,421 error lines across exactly 60 web test files — 2,561 TS2304
(expect 2,497, afterEach 55, beforeEach 8, beforeAll 1) and 858 TS2582
(it 690, describe 168), all vitest-globals names — plus two
out-of-class items: TS7006 at helsingborgServices.test.tsx(88,70),
downstream of the unresolved it.each and vanishing with the globals
fix, and TS1501 at handlingBasis.test.tsx(214,71), a dotAll regex flag
against target es5, adjudicated to a target es2020 raise (the build's
own target of record, vite.config.ts build.target es2020; the es2018
minimum and a test-regex rewrite were both ruled out). The record item
is closed at §12 below. The original line is the v0.16.0 record and is
not rewritten.)
Vite copies ruling: the two post-migration vite copies (core and web,
both 8.3.8) are accepted as is — same version, no duplicate majors.
npm audit observed in the /tmp copy: before 7 low / 0 production at
8c5ce76; after 0 / 0, with jest, ts-jest and @types/jest leaving the root
lockfile entirely. Counts: core 902/902 across 41 under vitest run,
chunked 201+119+124+144+184+130; web untouched (zero web/ files in the
diff), 693/60 in CI. Observed-red proof: the winter pin 10,885,680.88
mutated to .89 went red under vitest, restored byte-identical green.
Registry regeneration unchanged (ports.json sha256 fbd08c77…).

## 11. Incident record (v0.16.1, 2026-11-11, Version ritual completion)

What happened: the v0.16.0 pass (c4cae55) merged with docs/SPECIFICATION.md
at v0.16.0 while web/src/version.ts (APP_VERSION, the chip's single source)
stayed v0.15.1, because the v0.16.0 directive's Unit 4 ordered a spec-only
bump. Consequence, observed at c4cae55 in the branch scratch: the web
versionChip cross-check ("the constant matches the specification header")
was red — Expected v0.16.0, received v0.15.1, 1 of 5 in that suite — and
stayed red until v0.16.1 completed the ritual (green 5/5 after; the pass's
observed-red proof is the base state itself). The version guard's forward
pass was green throughout because no behavior path changed (the guard's
chip cross-check only fires on behavior-path changes; the chip-behind
--state fixture pins the failure mode at exit 1).
Root cause, two stacked gaps: (1) the Stage 0 core-runner consultation's
Unit 7 described the version ritual for a migration pass but did not flag
that a spec-only bump leaves the chip cross-check red — the consultation's
own gap; (2) the v0.16.0 directive's Unit 4 then encoded that gap as a
"spec-only bump" instruction. The worksuite ledger records the directive's
spec-only premise as the flawed premise; this pass is the correction, not a
precedent: future passes bump spec header, changelog row and APP_VERSION
together in the same change whenever any web/src file changes (the guard
requires it), and a spec-only bump is only legitimate when no web/src file
changes AND the chip cross-check is knowingly left for a follow-up — which
this incident shows is not a state CI can stay in.
Correction delivered at v0.16.1: APP_VERSION v0.16.1, print pin, spec
header, one PATCH row; incident note adjacent to the spec changelog table;
this row. Nothing re-run or hidden: any queued c4cae55 Tests run that
executed shows the honest red record of this incident.

## 12. Web typecheck gate record (v0.16.2, 2026-11-12, branch
## `vibe/web-typecheck-v0162-e09b484` from main e09b484)

Closes the §10 record item (the web typecheck gap queued at v0.16.0,
dating from v0.15.1, when the CRA build type-check left with
react-scripts). Observation of record, the pass's red proof at base
e09b484 in the /tmp build copy (tsc 5.9.3 --noEmit -p web/tsconfig.json,
exit 2): 3,421 error lines across exactly 60 web test files, all
web/src/*.test.* — 2,561 TS2304 (expect 2,497, afterEach 55, beforeEach
8, beforeAll 1) and 858 TS2582 (it 690, describe 168), all
vitest-globals names — plus two out-of-class items adjudicated by the
worksuite ruling of 2026-11-12: TS7006 at helsingborgServices.test.tsx
(88,70), accepted as downstream of the unresolved it.each (vanishes
with the globals fix, observed), and TS1501 at handlingBasis.test.tsx
(214,71), a dotAll regex flag against target es5, ruled to a target
es2020 raise — the type-check language level matches the build's own
target of record (vite.config.ts build.target es2020); the es2018
minimum and a test-regex rewrite were both ruled out. The v0.16.0
scratch's 75-error figure was an undercount of the same class and the
same cure; superseded in place above per the same ruling. The fix:
web/tsconfig.json gains "types": ["node", "vitest/globals"] (the
existing include already covers src, so the tests are in scope) and
target es5 -> es2020; web/package.json gains the test:types script
(tsc --noEmit) and declares typescript ^5.9.3 in devDependencies
(aligned to the root 5.9.3 line, the v0.13.3 js-yaml declare-what-you-
use precedent; the lockfile gains exactly one line, the web workspace
entry — the hoisted root typescript 5.9.3 satisfies the range, no
duplicate); .github/workflows/tests.yml gains a "Web typecheck" step
immediately before "Web tests", mirroring the Core typecheck step with
an in-workflow attribution comment naming v0.16.2. Type resolution
verified by traceResolution: vitest/globals resolves to
web/node_modules/vitest/globals.d.ts (web-local vitest 5.1.0);
@types/node resolves to the hoisted root node_modules/@types/node
26.6.2 through the workspaces walk, so no @types/node declaration was
needed in web/package.json. Gate green at the post-fix state
(cd web && npm run test:types, tsc --noEmit exit 0); the base state
itself is the red proof (3,421 errors, exit 2). Bundle red proof: at
unchanged version v0.16.1 with the new tsconfig, vite build reproduces
assets/index-BlIV8-wy.js (sha256
80bf45915d65cb222e8491e22ecf51463de10c36992af4b8a838c85abe22d1a4) and
assets/index-CPM43X7J.css (sha256
a6b8ef14341dc4c52c7d380d9e78f1306f666db673b97f2a591a03d089b3a83e)
byte-identically — the target raise is types-only, zero bundle
movement. Counts hold: web 693/693 across 60 re-run chunked after the
gate (106+131+97+114+160+40+45, exact-path anchors), core untouched
(zero core/ files in the diff) 902/41. npm audit in the /tmp copy
after the lockfile regen: 0 full / 0 production. The version ritual
v0.16.2 and the full verification ledger sit in the spec changelog row
0.16.2.
