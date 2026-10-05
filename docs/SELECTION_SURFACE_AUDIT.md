# Selection-Surface Redesign — Audit (v0.5.0 pass, item 0)

Committed before any implementation, per the standing audit-first discipline.
Authority of record for every tariff figure: the extraction references
(`docs/sources/**/*_EXTRACTION_REFERENCE.md`). This audit invents no rate
and moves no figure; the pass is presentation-and-structure work with one
small data addition, on the verified six-port baseline (main at 81ea1bd,
v0.4.7, ledger 650 core / 523 web — re-verified green at session start,
chunked, exact counts stated in the pass report).

## Item 0.1 — The current selection surface (inventory)

**The horizontal port list.** `web/src/App.tsx:216-232` — a
`<Paper className="port-nav">` holding an MUI `<Tabs variant="scrollable"
scrollButtons="auto">`, one `<Tab>` per loaded port (`portLabel(port)` —
name plus tariff validity year, `web/src/portLabel.ts`) plus a final
"Compare Ports" tab. The tab index routes the page state: index
`LOADED_PORTS.length` sets `{ kind: 'comparison' }`, any other index sets
`{ kind: 'port', portId }`. Styling: `.port-nav` (`web/src/index.css:272`).
This is the horizontal list the drawer replaces; it is removed, not hidden
(pass item 1.5 — dead markup is dead data).

**The compare checkboxes.** `web/src/comparisonPortSelection.tsx` (40
lines) — `ComparisonPortSelection`, a `<Paper className="comparison-
section">` titled "Ports to compare" holding a flex-wrap checkbox list
(`.comparison-port-selection`, `web/src/index.css:871`), one MUI
`<Checkbox>` per port inside a `FormControlLabel`, plus the
empty-selection guard ("Select at least one port to compare."). Rendered
by the comparison view at `web/src/comparisonView.tsx:154`.

**The state machinery (unchanged by this pass).** `web/src/App.tsx:110-114`
— `const [comparisonSelection, setComparisonSelection] = useState<string[]>
(LOADED_PORTS.slice(0, 4).map(p => p.metadata.id))` (the v0.2.59 bounded
default: the first four registry ports). The handlers:
`onSelectionChange` appends on check, filters on uncheck
(`comparisonPortSelection.tsx:24-29`). The feed: `ComparisonView` derives
`selectedPorts = ports.filter(p => selectedPortIds.includes(p.metadata.id))`
(`comparisonView.tsx:75`) and `computePortResults` maps the selection to
one column per port, ranked cheapest-first on the converted basis — the
column set is exactly the checked set. The same store, the same feed: the
drawer relocates the checkboxes and changes none of this.

**Every test that pins selection or comparison behavior** (the transition
inventory, item 0.5 — each re-baselined or re-pointed this pass with
in-test attribution):

- `web/src/opsCardIsolation.test.tsx` — `clickTab` helper reads
  `.port-nav button` (line 45); six interactions click "Compare Ports"
  (119, 135, 150, 162, 194) and two click port tabs ("Helsingborg",
  "Gothenburg"); the all-ports pin selects via
  `.comparison-port-selection input[type="checkbox"]` (168).
- `web/src/perPortPersistence.test.tsx` — the same `clickTab` helper (74);
  port-tab and "Compare Ports" interactions; the all-ports pin selects the
  remaining ports via `.comparison-port-selection` checkboxes (182).
- `web/src/opsFold.test.tsx` — its own `clickTab` over `.port-nav button`
  (298-299); port-tab and comparison interactions.
- Direct-`ComparisonView` suites render with explicit `selectedPortIds`
  and no tab interaction — structurally untouched by the drawer, verified
  green after the pass: `comparisonDefaults`, `responsive`,
  `structuralPresence`, `grandTotalPerGt`, `publishedLabel`,
  `chargeTypeStages`, `handlingBasis`, `terminalScope`, `scenarioLayer`,
  `equivalenceNotes`, `discountLine`, `opsFold` (model-level),
  `rateRefresh`, `wasteOrigin`, `sameRouteAttestation` (its checkbox
  selectors are scoped to the workspace attestation, not the port list).
- `web/src/accessibility.test.ts` — static source assertions over the
  decomposed app source (`appSource.ts` MODULES union); the drawer's
  aria contract is pinned there per the existing conventions
  (button-based disclosure, `aria-expanded`, `aria-controls` — the
  disclosureCard pattern), and the drawer module joins the union.
- `web/src/versionChip.test.tsx` renders `<App>`; no port-list assertions.
- Core: no core test pins the selection surface (it is web presentation);
  the zero-drift totals are pinned at `core/test/port_generalization.test.ts`
  (GOT/HAM/HEL) and `core/test/swedish_expansion.test.ts:88-90`
  (NRK 8,297,772.50 / GLE 10,306,979.35 / NVK 11,952,324.05).

## Item 0.2 — The country-metadata design

**Finding (a directive-expectation mismatch, reported per §9): the
`country` field already exists end-to-end.** The directive names it "this
pass's only data-layer change"; the audit finds the field present in the
type (`PortMetadata.country: string`, `core/src/types.ts:488`), in all six
silos (`core/data/gavle_2026.yaml:39`, `gothenburg_2026.yaml:8`,
`hamburg_2026.yaml:13`, `helsingborg_2026.yaml:18`,
`norrkoping_2026.yaml:25`, `norvik_2026.yaml:34`), in the loader's
validation (`core/src/loader.ts:718-723` — a missing country is a
validation error), and in the generated `web/src/data/ports.json` (the
converter passes metadata through verbatim). No silo, converter, or type
edit is required; the pass's data-layer work reduces to (a) the pin the
directive orders (every port carries a valid country; red-proofed) and
(b) the drawer's consumption. This is reported as a finding, never
silently archived as expected; the field's design below records the
convention so the expansion passes key on it additively.

**Value convention (stated choice and reason): full country names**
("Sweden", "Germany" — later "Denmark", "Poland", "Finland"). Reason: the
existing data convention is full names (all six silos and the loader's
non-empty validation were authored that way; changing to ISO codes would
be a re-shape of carried data for no functional gain — the drawer renders
the value directly as its group header, and the expansion-wave currency
keying reads `metadata.currency`, not the country string, so a future
Danish/Polish port is one additive YAML file either way). The drawer
groups on the field exactly as carried; no mapping table, no code-side
country list — a new country appears the day its port exists.

**Files the field touches this pass:** none structurally (the field
exists in all of: the six silos, `core/src/types.ts`,
`core/src/loader.ts` validation, the converter's pass-through,
`web/src/data/ports.json`, `web/src/portRegistry.ts` consumption). The
pass adds: the core country-metadata pin (new test in
`core/test/loader.test.ts`) and the drawer's grouping read. Designed so
the expansion currencies key on it later additively: the drawer never
enumerates countries; the cap never enumerates ports.

## Item 0.3 — The drawer design (refined by the audit)

**Form.** The `.port-nav` Tabs bar is replaced by a collapsed "Ports"
control in the same position and `Paper` chrome: a native
`<button type="button" className="port-drawer-toggle">` styled with the
existing theme tokens, carrying `aria-expanded` and `aria-controls`
pointing at the panel id — the exact disclosure contract the app already
pins (`web/src/disclosureCard.tsx:19-36`, `accessibility.test.ts`'s
button-based-disclosure assertions). The open panel
(`id="port-drawer-panel"`) renders one country section per distinct
`metadata.country` in registry order, each headed by a country header
(typography-styled, no new color literals — the v0.2.51 discipline), each
port row a labeled button (navigates to that port's workspace — the tab
bar's per-port function, carried) with the port's compare checkbox beside
it (the comparison model's function, carried). The current page is
marked on its row (the tab bar's selected-tab signal). The panel closes
on navigation and on Escape (the app's existing popover/disclosure
conventions); open/closed state is component-local and never touches
pricing or comparison results.

**Interaction and keyboard behavior.** Native button and native checkbox
throughout (Enter/Space operable by construction — the accessibility
suite's existing reasoning for MUI-adjacent disclosures); visible focus
per the existing theme; no click-only divs.

**Responsive.** The collapsed control renders identically at every
viewport (the 360 px floor and 600 px stacking threshold,
`web/src/responsive.ts`); the open panel is a single-column list that
wraps at small widths — no horizontal scroll is introduced at any
supported viewport.

**The comparison-checkbox relocation.** The drawer's per-port checkbox is
the existing model verbatim: same `comparisonSelection` store, same
append/filter handlers, same feed into `ComparisonView.selectedPortIds`,
same bounded four-port fresh-load default. The comparison view's
"Ports to compare" `Paper` (the old checkbox surface) is removed with the
relocation — the drawer is the one selection surface; the empty-selection
guard renders inside the comparison view where the count belongs (at the
comparison header, so a user who unchecks everything at the drawer still
sees why the table is empty). `comparisonPortSelection.tsx` is deleted
(dead markup is dead data).

## Item 0.4 — The comparison cap (adjudicated from the view's behavior)

**Cap = 6.** Reason, from the view's actual degradation arithmetic: every
port column keeps a 140 px readability floor (spec §4.3.1, v0.2.60), and
the label column keeps its bounded fit contract (~250 px at the wrapped
worst case). At the minimum supported *desktop* width band (1024-1200
px): six port columns (6 × 140 = 840) plus the label column fit without
horizontal scroll at 1152 px; a seventh column (7 × 140 = 980 + label)
forces scroll at every viewport below ~1280 px — the table degrades by
horizontal scroll inside its container (never by squeezing, per the
floor's contract), and the seventh column is where that degradation
begins at common laptop widths. The recommendation band was 4-6; 6 is
chosen because it is the last count that fits the floor arithmetic at
the supported desktop widths and it covers the entire current port set —
the cap never binds today, and binds honestly (disabled with a message,
never silently) the day the expansion wave creates a seventh port.

**Behavior (pinned).** The drawer always shows the honest count
("N/6 selected"). At cap, the next unchecked port's checkbox renders
disabled with an explanation naming the cap and the remedy (uncheck one
first) — never a silent drop, never a hidden cap. Unchecking always
works. The cap is presentation-only: `comparisonSelection` never
exceeds 6 by construction of the check handler (a check at cap is a
no-op on state, disclosed by the disabled control before the click can
happen); the bounded four-port default and every existing selection
pattern remain inside the cap.

## Item 0.5 — The transition inventory (re-baselined this pass)

1. `opsCardIsolation.test.tsx` — `clickTab` re-pointed from
   `.port-nav button` to the drawer interaction (open the drawer, click
   the row); the `.comparison-port-selection` checkbox selection
   re-pointed to the drawer's checkboxes. In-test attribution.
2. `perPortPersistence.test.tsx` — the same two re-pointings.
3. `opsFold.test.tsx` — the same `clickTab` re-pointing.
4. `accessibility.test.ts` / `appSource.ts` — the drawer module joins the
   MODULES union; the drawer's aria contract asserted per the existing
   pattern.
5. New suite `selectionDrawer.test.tsx` — the drawer-structure, grouping,
   feed, cap, and counter pins, each red-proofed.
6. New core pin in `loader.test.ts` — every loaded port carries a valid
   (non-empty string) country; red-proofed by mutation.
7. `comparisonView.tsx` — the `ComparisonPortSelection` import and render
   removed with the component's deletion; the empty-selection guard
   moves to the comparison header.
8. Spec §4.3.1 amended (the drawer and the cap join the comparison-view
   contract); changelog row and version constant in the same change.

Zero-drift: no fee rule, no default call, no rate, no engine path is
touched; the six pinned native default totals (GLE 10,306,979.35 /
NRK 8,297,772.50 / NVK 11,952,324.05 / GOT 3,275,851.15 /
HEL 8,750,057.40 / HAM 2,204,910.90) are verified byte-identical at the
engine after the pass; any total movement is a defect and stops the pass.
