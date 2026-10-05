# Deployment-Hygiene Audit — v0.5.2 (item 0, committed before any action)

This document is the audit-first seam of the v0.5.2 deployment-hygiene pass. It records the pass's fact-finding findings before any repository-state action is taken. The pass's scope: the stale-branch deletion, the §8 method amendment it exposed, and the verification-artifacts doctrine — documentation plus one git action, no model source, no figure movement beyond the standing ritual's conversion-only rate update (executed and committed as unit 1 before this audit was authored; the rate moved: 11.29 → 11.2525, publication 2026-10-05).

## 0.1 The Pages source verification

**Method.** The GitHub Pages configuration was read through the API equivalent of Settings → Pages: `gh api repos/Rekkike/VibesandTariffs/pages` (the sandbox cannot reach the UI; the API is the equivalent route).

**Finding.** `"build_type": "workflow"` — **GitHub Actions**, the expected configuration. The deploy workflow (`.github/workflows/deploy.yml`) deploys through the artifact route (`actions/upload-pages-artifact@v3` after `actions/configure-pages@v5`, then `actions/deploy-pages@v4` with `pages: write` and `id-token: write`), which is exactly the route the `workflow` build type names. The API response also carries a residual `source` object (`branch: main`); under `build_type: workflow` that field is inert legacy metadata — the Pages service serves the Actions artifact, not a branch snapshot — and it does not name a branch-source deployment. **No stop condition: the finding is the expected one, so the branch deletion may proceed.**

## 0.2 The stale-branch inventory

- **Branch list (remote heads):** `main` and `gh-pages` (verified by `git ls-remote --heads origin`). After v0.5.1's WIP deletion the delivered branch is `main` alone; `gh-pages` is the only legacy branch, as the directive expected.
- **Tip SHA (the restorable reference):** `c54ebbb2ebb0fffd31259f7d737c38e68ae18072` (commit "deploy: 67cbc036c70f49f25c8bc042cb4d7a9d741d7bfe", dated 2026-09-20). This audit records it; if the branch ever needed restoring, `git branch gh-pages c54ebbb2 && git push origin gh-pages` recreates it.
- **Staleness:** the branch tip predates v0.5.0 (2026-10-05 is the delivery date of both v0.5.0 and v0.5.1; the tip is from 2026-09-20, the v0.2.x-era deploy). Its content (`index.html`, `asset-manifest.json`, `static/`) is a stale build artifact snapshot, two expansion passes and one selection-surface redesign behind main's current deploy.
- **The recorded case — the branch's content is NOT the served artifact:** at the v0.5.1 verification the branch's stale bundle was probed as if it were the served artifact, producing a false discrepancy (a hash that could not match, twenty minutes of diagnosis). The served artifact is the GitHub Actions artifact deployed through the `workflow` route; the `gh-pages` branch is a vestige of a former branch-push deployment route and has no serving role under `build_type: workflow`. Deleting it removes the trap; the SHA above preserves the restorable reference.

## 0.3 The §8 current-text inventory

The amendment targets the spec's §8 "Served-bundle identity when the JS asset is unfetchable (v0.2.55, standing method)" paragraph. Its current method, step by step:

1. The deploy workflow's build log lists the artifact it uploaded (`File sizes after gzip` and the upload-artifact step's file listing).
2. The production build emits a content-hashed bundle filename (`static/js/main.<hash>.js`).
3. **The load-bearing step as written:** "the local zero-warning build emits the same filename; a filename match between the deploy log's artifact listing and the local build is therefore a content-identity proof of the served bundle."
4. The served HTML shell is fetched with cache bypass to confirm the deployment serves the application.

The paragraph's concluding sentence: "Together the deploy-log artifact listing, the filename match, and the live HTML shell establish the served-artifact identity."

**The defect the amendment repairs.** Step (3) as written makes the *local build's hash equality with the deploy log* the identity proof. At the v0.5.1 verification this assumption silently failed — not because the local hash was wrong, but because the verification's probe targeted the wrong artifact class entirely (the stale `gh-pages` branch snapshot rather than the Actions artifact), and the method as written had no way to name which artifact class its evidence belonged to. A method that names its evidence class survives a mis-targeted probe (the mismatch is immediately legible as "wrong artifact class"); a method that merely assumes local-vs-deploy hash equality does not. The amendment reorders the proof: the CI artifact manifest (the deploy workflow's own uploaded-artifact listing — or equivalently the live shell's own `main.<hash>.js` link, read from the served `index.html`) is the load-bearing identity evidence; the local zero-warning build's hash is supporting evidence of build reproducibility, never the sole proof. The v0.5.1 case is cited in the amended text as the recorded reason.

**Referenced elsewhere:** §7 of the delivery order (ENVIRONMENT_DISCIPLINE.md §7 step 3 and SPECIFICATION.md's delivery-order text) record "zero-warning build with the bundle hash recorded" and the post-merge "§8 served-artifact verification"; neither restates the hash-equality method, so no secondary edits are required — the hash-recording step remains correct (it is the supporting-evidence role the amended §8 names).

## 0.4 The verification-artifacts inventory

Three observed fetch-tool artifacts, recorded as standing notes in the discipline document (§8 of ENVIRONMENT_DISCIPLINE.md, where the document keeps its environment lessons — the same section that already carries the served-bundle-unfetchable method and the token-format note in the spec):

1. **The 0-kr hydration snapshot (v0.5.0, confirmed by real-browser check).** A fetch of the served page through the sandbox's fetch tooling can return a pre-hydration DOM snapshot — the served HTML shell with the empty root, which renders as 0 kr / no figures. What it is not: a deployment defect or an engine regression. The resolution: the check that matters on the shell is the bundle reference (`main.<hash>.js`) and the version marker; a real-browser check (or the rendered-application markers through the raw route) confirms the hydrated application.
2. **The ~32k bundle truncation on large JS assets.** The sandbox's fetch tooling truncates large JS bodies (observed ~32 KB of a much larger bundle). What it is not: a corrupted build or a served-artifact discrepancy. The resolution: the byte length is checked before any content assertion (the §8 truncation protocol already governs the shell; the same retry-and-length discipline applies), and identity is proven through the artifact manifest and the hashed filename, never through a truncated body's content.
3. **The gh-pages stale-branch trap (v0.5.1, twenty minutes).** A legacy `gh-pages` branch that no longer has a serving role under the Actions artifact route can be probed as if it were the served artifact, producing a false discrepancy. What it is not: a deployment failure. The resolution: §0.2's finding (the branch is a vestige; its content is not the served artifact) and the branch's deletion this pass — plus the amended §8's named evidence class, which makes a mis-targeted probe immediately legible.

## Item 2 pre-adjudication (recorded before implementation)

The §8 amendment is verification-protocol text, not model behavior; the likely adjudication is no pin (protocols are executed, not pinned; the version-guard and spec-guard runs already cover the spec's own consistency). The one pinnable candidate found: the deploy workflow's artifact route itself (`.github/workflows/deploy.yml` uses `upload-pages-artifact` and `deploy-pages`), a config-level pin against accidental reversion to a branch-push route. The directive allows but does not require it; the final adjudication is stated in the pass report.
