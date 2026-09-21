# Port Call Cost Analyzer — Specification v0.2.17

This document is the committed record of the project specification at version 0.2.17. It governs the data model, engine, and UI contracts of the Port Call Cost Analyzer. `docs/INTENDED_STATE.md` remains the authoritative audit document for the Gothenburg 2026 pilot data; where the two documents overlap, INTENDED_STATE.md governs the Gothenburg figures and this document governs the architecture and UI behavior.

## Versioning Policy

This specification uses three-decimal semantic versioning:

- **Major (X.0.0):** Fundamental architectural changes, scope redefinitions, or backward-incompatible revisions to the data model or output contract.
- **Minor (0.Y.0):** New features, new sections, or substantively new decisions that do not break existing structure. May also jump by more than one (e.g. 0.2.0 to 0.5.0) when a batch of related changes lands together.
- **Patch (0.2.Z):** Corrections, clarifications, wording harmonisation, and small factual adjustments that do not add or remove structural elements.

Small adjustments increment only the third decimal. Larger updates may jump more than one increment in the second decimal. Major version increments are reserved for genuine architectural breaks.

| Version | Date | Summary |
|---|---|---|
| 0.1.0 | 2026-09-20 | Initial specification: purpose, architecture, input models, rule language, currency, deployment |
| 0.2.0 | 2026-09-20 | Added charging entities (billers), cross-port comparability (function vs biller), data/presentation separation, extended call model, tariff versioning, tug defaults, data validation, stacking semantics, multi-terminal behaviour |
| 0.2.1 | 2026-09-20 | Corrected Hamburg classification from banded to progressive; updated worked contrast with reform history; completed Hamburg terminal operator inventory; added versioning policy |
| 0.2.2 | 2026-09-20 | Added section 5.1 Source Traceability as a core principle; expanded source reference to full provenance chain; made source references mandatory at load time |
| 0.2.3 | 2026-09-20 | Corrected Gothenburg from banded to progressive for container vessels; added net tonnage to vessel model; added worked contrast showing banded vs progressive vs flat; completed Gothenburg vs Hamburg comparison across all three billers |
| 0.2.4 | 2026-09-20 | Corrected scope note: APMT Gothenburg publishes container handling charges (SEK 377/535 per unit) — confidentiality applies only to shipping-line contract rates; added contract-vs-published caveat mechanism; recorded verified Gothenburg 2026 data (port authority, Sjöfartsverket, APMT) as available for encoding; scope note softened from "frequently confidential" to "may be confidential or contract-based" |
| 0.2.5 | 2026-09-20 | Added cost-segment grouping (vessel-side vs cargo-side) as a presentation-layer attribute derived from fee_family; enables viewing a call as ship cost only, container charges only, or both; low-relevance inputs (flag state, storage days) demoted to an optional details section in the UI |
| 0.2.6 | 2026-09-20 | Added energy-at-berth as a third cost segment (OPS connection, shore electricity, at-quay fuel); recorded AFIR (Regulation 2023/1804) and FuelEU Maritime (Regulation 2023/1805) obligations making OPS mandatory for container and passenger ships above 5,000 GT at TEN-T ports from 1 January 2030, with a zero-rating incentive from 2025 |
| 0.2.7 | 2026-09-20 | OPS regulatory applicability made a per-port data attribute (ten_t_status, ops_mandate details) so the UI reacts to port/terminal selection; non-TEN-T ports show OPS as optional without the mandate notice; source-traced like any tariff fact |
| 0.2.8 | 2026-09-20 | Recorded the exact AFIR port-applicability call-frequency thresholds (100/40/25 calls per year by ship category, averaged over preceding 3 years, counting only ships above 5,000 GT) and the FuelEU berth-duration condition (moored more than 2 hours); port regulatory block extended to carry the threshold evidence |
| 0.2.9 | 2026-09-20 | Added the FuelEU second phase: from 1 January 2035 the ship-side OPS duty extends to non-AFIR ports equipped with OPS; member states may impose OPS earlier (with one year's notification to the Commission) and may extend the duty to ships at anchorage; AFIR infrastructure deadline is 31 December 2029. Cross-verified against BetterSea, PYK Power, and Bureau Veritas. FuelEU flexibility mechanisms (pooling, banking, borrowing) noted as explicitly out of scope for the cost model |
| 0.2.10 | 2026-09-20 | OPS pricing generalized to a component set: per-call connection fee, per-GT charge, energy (per-kWh at user-supplied price), demand charge (per kW or kVA of registered peak demand), and berth-hour or standby charges — each component optional per port, expressed through existing rate structures; ports publish some subset, never inventing unpublished components |
| 0.2.11 | 2026-09-20 | Added the scenario-adjustment layer: per-session overlays of percentage or absolute adjustments on fee families or billers, never editing the sourced port file; primary use case is contract-rate scenarios (negotiated discounts on port dues, handling, shifting); adjusted lines visibly marked and itemized separately from verified baseline |
| 0.2.12 | 2026-09-21 | Deployment vendor-neutralized: removed all hosting-specific commitments (Fly.io) from purpose and deployment sections; the spec now states the deployment contract (static bundle, stateless, target is an owner choice) and the verification requirement (deployments verified at the served artifact, not pipeline exit status) |
| 0.2.13 | 2026-09-21 | Cost segments recut from vessel-side/cargo-side/energy into vessel-call/energy-at-berth/terminal-and-yard: quay lifts to place of rest moved into the vessel call segment; yard, gate, storage, and dwell charges moved to a separate terminal-and-yard segment. UI organized as three toggleable pages with a persistent total strip always showing grand total and per-segment breakdown; toggling filters display only, never the computed total |
| 0.2.14 | 2026-09-21 | Segment layout made responsive: vertical stacked list on narrow (phone) viewports; three side-by-side columns on wide (laptop/desktop) viewports, using horizontal space to show the segments in parallel. Toggle behavior and the persistent total strip unchanged in both layouts |
| 0.2.15 | 2026-09-21 | Layout rule refined after three-panel cramping: column count adapts to active-segment count as well as viewport width — two panels side by side from ~1200px, three-across only from ~1600px, wrapping rather than shrinking below readable panel width. terminal_handling confirmed in the vessel-call segment (quay lifts to place of rest), correcting a mapping defect |
| 0.2.16 | 2026-09-21 | Segment display names finalized: "Vessel Call" (subtitle noting terminal vessel operations are included), "Energy at Berth", "Yard & Storage" — replacing the misleading "Terminal & Yard" label, since the terminal's charges are split by activity across segments and only the by-biller view shows a biller's complete charges. Internal mapping key unchanged |
| 0.2.17 | 2026-09-21 | Added section 4.3.1: multi-port navigation (per-port pages with a persistent port selector, required as soon as a second port loads) and the cross-port comparison view — one column per selected port, rows by cost segment and fee family, list-price default with marked overrides, explicit "not charged" for absent functions, and data-quality flags carried through. Comparison is a presentation over multiple single-port computations, not a separate calculation path |

## 1. Purpose

A tool that estimates and compares the total publicly-known cost of a container vessel call across European ports, given a vessel profile and call parameters. Each result is traceable to its source tariff and validity date. The application is a static bundle deployable to any static host; the hosting target is an owner choice, deliberately unspecified here.

**Important scope note:** terminal handling charges may be confidential or contract-based at some ports. The tool therefore attempts port dues, nautical services, statutory/ancillary fees, and — where publicly available — terminal operator charges, and labels coverage explicitly per port rather than claiming a true "total" cost. Where a terminal publishes rates but shipping lines may hold different contract rates (e.g. APMT Gothenburg handling charges), the tool displays the published rate with a contract-vs-published caveat rather than a data gap.

## 2. Core Architecture Principle

**Ports are data, not code.** The application contains a single generic rule-evaluation engine. Every port's costing model — including its unique fee structures — is expressed as data in a structured port file. Adding or revising a port's tariff (for example, Hamburg's 2024 reform from a shipping-area split to progressive GT bands) is a data edit, never a code change.

**Each port is a self-contained costing model** that produces results under a shared output contract, enabling an aggregation layer that ranks and compares any one call across ports uniformly.

## 3. Input Models

### 3.1 Vessel

| Field | Type | Notes |
|---|---|---|
| name | string, optional | e.g. HELGAFELL, MAREN MAERSK |
| imo | string, optional | IMO number, alternative identifier |
| gt | number | Gross tonnage — drives most port authority dues |
| nt | number | Net tonnage (nettodräktighet) — drives Sjöfartsverket fairway and pilotage fees in Sweden; may differ from GT |
| loa_m | number | Length overall — drives pilotage/towage thresholds and lay-up dues |
| beam_m | number | |
| draft_m | number | |
| teu_capacity | number, optional | |
| vessel_class | enum, optional | preset classes below |

**Vessel presets** (generic classes, selectable without entering particulars): feeder (~8,000 GT), feeder-max (~15,000 GT), panamax (~55,000 GT), post-panamax (~100,000 GT), ultra-large (up to ~215,000 GT).

**Named vessels** are resolved from a curated vessel table maintained in the repository (name → particulars). No third-party lookup at runtime; MarineTraffic scraping is explicitly out of scope due to terms of service. Public fleet registries may be consulted at data-entry time, not runtime.

### 3.2 Call

| Field | Type | Notes |
|---|---|---|
| port | enum | from the loaded port set |
| terminal | enum/string, optional | terminal operator selection; for multi-terminal ports, alternatives are presented side by side and the user must select one before calculation proceeds |
| moves_over_quay | number | crane/container moves driving cargo-related fees |
| laytime_days | number | stay duration; many fees are per commenced day |
| free_time_days | number, optional | tariff-granted free time before storage/demurrage charges begin |
| demurrage_days | number, optional | days beyond free time, driving demurrage-like charges |
| berth_occupancy_hours | number, optional | time occupying the berth, distinct from cargo laytime in some tariffs |
| anchorage_hours | number, optional | time at anchor off-berth, a factor in some ports |
| ops_used | boolean | shore power connection during stay |
| ops_kwh | number, optional | electricity demand if OPS used |
| charge_demand_kw | number, optional | |
| traffic_category | enum | intra-European vs deep-sea, where tariffs distinguish |
| esi_score / emission_class | number/enum, optional | drives environmental discounts |
| tug_count | number, optional | number of tugs; defaults may be suggested per port and LOA class, user may override |
| season/date | date | selects applicable tariff version |

### 3.3 Tug and Towage Input

Towage cost depends on the number of tugs, which varies by port, vessel size, weather, and master's discretion. The tool provides default tug requirements per port and LOA class as suggestions, but the user may always override with a specific count or with costs reflecting personal agreements. The defaults are encoded as data, not code, and serve only as a starting recommendation.

### 3.4 Vessel Library

A curated, versioned static file of named vessels and their particulars (name, IMO, type, flag, built year, GT, LOA, beam, TEU capacity, class note). The library is authored as YAML and consumed as JSON at build time, exactly like the tariff data — no runtime API calls. Every entry carries a `source_note` recording where the particulars were verified. In the UI, a search/typeahead field matches on name or IMO; selecting a vessel pre-fills the form's inputs. Pre-filled values remain editable — selection is a convenience, not a lock.

## 4. Tariff Rule Language

### 4.1 Charging Entities (Billers)

A port is not a single biller — a call generates a cluster of costs from multiple parties. Each fee rule belongs to a charging entity (biller), of five kinds:

1. Port authority — port dues and general infrastructure charges (as in Hamburg).
2. National or state authorities — e.g. Sjöfartsverket (Swedish Maritime Administration), which levies Swedish fairway dues (*farledsavgift*) independently of the port authority.
3. Terminal operator(s) — lifts over quay, storage, and related cargo charges charged to the vessel. Large ports such as Hamburg have multiple container terminal operators, each with its own tariff.
4. Independent service providers — pilotage, towage, mooring, waste, etc.
5. Other costs — a catch-all for charging entities not yet classified, since port clusters are complex and additional actor types may emerge during extraction. An item assigned to "other costs" must carry a free-text biller name and triggers a quality warning.

Ports vary enormously in structural complexity, and the model must embrace that asymmetry rather than normalize it away:

- Hamburg (complex): port authority charges banded port dues, OPS charges, and infrastructure/fairway fees; multiple terminal operators each levy their own lift and storage tariffs. A call's cost depends on which terminal the vessel calls at.
- Helsingborg (simple): a flat-rate port dues structure from the port authority, whose own company also operates the terminal — a single biller, few rules.
- Gothenburg (intermediate): banded port dues from the authority, plus *farledsavgift* levied separately by Sjöfartsverket, with separate terminal arrangements.

A port file contains one or more billers, each with its own fee rules, currency, and tariff documents. The comparison output presents costs grouped by biller within each port, then a port total, so the user sees who charges what. Where a terminal operator's charges are not public, the gap is shown explicitly ("terminal charges: not publicly available — confidential") rather than omitted, so simple ports are not unfairly advantaged in comparison.

### 4.2 Cross-Port Comparability: Function vs. Biller

The same underlying cost function may be carved up differently across ports and countries:

- Fairway or fairway maintenance: a separate state-authority charge in Sweden (*farledsavgift*, Sjöfartsverket); an infrastructure charge from the port authority in Hamburg; folded into general port dues elsewhere.
- Towage and other nautical services: provided and billed by independent commercial providers in some ports, by the port authority or its subsidiary in others, with differing pricing structures.
- Sweden is the notable case of a national authority levying charges outside the port structure, but analogous structural variation exists elsewhere.

The model therefore separates two orthogonal attributes on every cost item:

1. fee_family — the economic function (fairway, towage, port_dues, ...), assigned consistently across all ports and countries. This is the semantic key that makes cross-port comparison meaningful.
2. biller — the factual attribution of who actually levies the charge in that port. This is always recorded as it is in reality, never normalized.

Two ports can therefore show the same fee family with entirely different billers, rate structures, and even embedded-in-another-charge status. The latter is recorded via a bundled_into marker on cost items subsumed within another fee, so that a function folded into port dues is visible rather than silently omitted or double-counted. Comparisons operate at the level of economic function, while the drill-down detail preserves exactly who charges what, where.

### 4.2.1 Cost-Segment Grouping: Vessel Call, Energy at Berth, Terminal and Yard

Every fee family maps to one of three cost segments, derived in the presentation layer (never stored per-rule in the data layer, to avoid a redundant attribute that could drift):

- Vessel call (the coming and going of the vessel, through to boxes at place of rest): port_dues, environmental_surcharge, fairway dues and pilotage (Sjöfartsverket vessel/readiness/cargo fees, pilotage, ordering), waste, security (vessel-level), towage, mooring, anchorage, lay_up, connection_fee (non-OPS), terminal_handling (lifts over quay to place of rest), hatch_cover, gearbox_handling, cargo-side fees that bill per call unit (cargo_fee, frequency_discount).
- Energy at berth: the OPS component set (ops_connection, shore_electricity, ops_per_gt, ops_demand, ops_standby) or, when OPS is not used, at_quay_fuel — see 4.2.2.
- Terminal and yard (costs of dwelling in and moving through the terminal beyond place of rest): storage, yard_surcharge, gate_hazardous, idle_berth (when tied to cargo operations), security (per-unit, when yard-related), demurrage (cargo).

The cut within what was previously "cargo-side" is deliberate: the lift over quay to place of rest belongs to the vessel call (the call is not complete until the boxes are at rest), while yard moves, gate transfers, storage, and dwell-related charges are logistics decisions beyond the call itself. This serves the two distinct questions users actually ask — what does it cost to bring this ship here and work it, and what does it cost to hold and move this cargo through the terminal — which a single total conflates.

**Segment display names.** The three segments display as: "Vessel Call" (subtitled to note it includes terminal vessel operations — lifts on/off, hatch covers, gearbox), "Energy at Berth", and "Yard & Storage" (what happens to cargo after place of rest: storage, yard moves, gate, dwell). The third segment is deliberately not named "Terminal": the terminal's charges are split across segments by activity — terminal vessel operations belong to the vessel call, yard dwelling to this segment — and a biller-named label would misdescribe its contents. The by-biller view (Port of Gothenburg / Sjöfartsverket / APMT) is the place to see everything one biller charges. The internal mapping key remains `terminal_and_yard`; only display labels change.

**UI behavior.** The results view is organized as three toggleable segments. Layout is responsive to viewport class:

- Narrow viewports (phone): the segments render as a vertical stack, one section per segment — a long scrollable list.
- Wide viewports (laptop, desktop): segments render side by side in columns, with the column count adapting to both viewport width and the number of active segments, so that no panel falls below a readable width: two active segments sit side by side from ~1200px; three active segments require a wider viewport (~1600px) to sit three-across, otherwise the third wraps below the first row. Panels never shrink to overlapping or cramped widths to force a single row.

In either layout the segments are toggleable; any subset can be active; the expected common case is vessel call + energy (terminal and yard is rarely of interest and off by default for first view). Regardless of which pages are active or which layout applies, a persistent total strip is always visible, showing the grand total and the per-segment breakdown, so the full picture never requires switching views. Toggling pages filters the display only — it never changes what is computed or summed in the total.

Inputs that affect only one segment are grouped accordingly in the form (vessel particulars and call parameters vs energy inputs vs storage days and special-cargo details), with low-relevance inputs (e.g. flag state, which matters only for waste dues; storage days, which matter only for terminal-and-yard) demoted to an optional details section rather than sitting in the primary form. This is a presentation change only: the underlying data model and engine are unchanged, and all inputs remain available when relevant.

### 4.2.2 Energy at Berth: A Third Segment

Energy consumption at quay — OPS connection fees, shore electricity consumption, and at-quay fuel — is separated as a third cost segment, distinct from vessel-side and cargo-side, for two reasons.

First, economic: energy at berth is a different decision domain from port and nautical fees. Its cost scales with berth hours and vessel power demand rather than with GT, cargo, or call counts, and it is increasingly billed by a different party (the utility or port energy subsidiary, e.g. HPA Port Energy Solutions in Hamburg) rather than the tariff billers.

Second, regulatory: the EU regulatory framework makes this segment a forward-looking compliance cost rather than an optional service:

- AFIR (Regulation (EU) 2023/1804, Article 9 and Annex II) obliges TEN-T core and comprehensive ports to provide shore-side electricity for seagoing container and passenger ships.
- FuelEU Maritime (Regulation (EU) 2023/1805, Article 6) obliges container and passenger ships above 5,000 GT to connect to OPS (or use zero-emission technology) at TEN-T core maritime port berths from 1 January 2030; from 2025 to 2029, OPS energy is zero-rated under FuelEU (it does not count toward the ship's annual GHG intensity), serving as a connection incentive.

Consequence for the model: for calls dated 2030 or later at TEN-T ports, OPS usage should be treated as a default-on assumption with a visible regulatory notice (AFIR/FuelEU), rather than an opt-in input. The 2026 tariffs already carry related hooks: Gothenburg bills a 7,000 SEK OPS connection fee plus electricity — but only at Energy Port jetties 519–521 (tanker segment; no container OPS fee is published in the 2026 tariff, so container OPS pricing must be flagged as unpublished rather than defaulted); Hamburg grants an OPS discount of 0.015 EUR/GT on the port fee (through 31 December 2026) with electricity billed separately. Energy-at-berth charges carry their own fee families (ops_connection, shore_electricity, at_quay_fuel) so the segment derives mechanically from fee family, consistent with 4.2.1.

OPS pricing component set. OPS billing is not a single fee but a component set, differing by port and terminal. Each port file expresses whichever components that port actually publishes, as separate fee rules using the existing rate structures — no new rule types:

- Connection fee: flat, per call (ops_connection). Example: Gothenburg Energy Port, 7,000 SEK.
- Per-GT charge: rate per GT of the vessel, either as a separate OPS fee or as a port-dues surcharge/reduction tied to OPS use (ops_per_gt). Example: Hamburg's OPS discount of 0.015 EUR/GT on the port fee (a negative component).
- Energy charge: per kWh consumed, at a price that is market-dependent and therefore a user input at calculation time, not an encoded constant; the port file may record a reference price with a valid_from date and a quality flag noting volatility (shore_electricity).
- Demand charge: per kW or kVA of registered or metered peak demand, common where the utility bills capacity separately (ops_demand).
- Berth-hour or standby charge: per hour connected or per hour at berth with OPS available (ops_standby).

Rules of the component set: components are optional per port; absent components are simply not present rather than zero-valued; unpublished components are never invented (the Gothenburg container terminal, for instance, has no published OPS pricing at all, so a 2030 call there shows the mandate notice with the cost lines flagged unpublished). Where a port bills electricity through a separate energy subsidiary, the biller field reflects that entity. All components carry source references like any fee rule, and demand and consumption inputs (kW, kWh, connected hours) are call inputs supplied by the user, since they depend on the vessel's power management rather than the tariff.

### 4.2.3 Scenario-Adjustment Layer: Contract Rates and Manual Overrides

The published tariff is the default baseline and remains untouchable in normal use. The scenario-adjustment layer lets the user overlay adjustments that reflect data only they hold, without ever editing the sourced port files.

Structure. An adjustment set is a per-session overlay consisting of adjustment rules, each specifying:

- Target: a fee family, a biller, or a fee family within a biller (e.g. port dues at the port authority; terminal handling at APMT; OPS energy).
- Operation: percentage (plus or minus) or absolute replacement of the rate. Absolute replacement covers negotiated fixed rates ("instead of 412 we pay 380 per unit") and is not limited to discounts; upward adjustments (rate increases, percentage or absolute) are equally supported for adverse-scenario modelling.
- Scope option: whole fee, or the rate component within a progressive band structure where meaningful.

Primary use case — contract rates. Shipping lines rarely pay published tariff rates; they negotiate discounts on port dues, per-unit lift costs, shifting, and other charges. A user with private contract knowledge enters their negotiated terms as an overlay (e.g. port dues minus 20 percent, terminal handling at 380 per unit instead of 412) and the app computes what their call actually costs, while the tariff baseline remains one click away for comparison. This directly operationalizes the contract-vs-published caveat recorded at v0.2.4: instead of a warning that real rates may differ, the tool lets the user supply them. Contract terms are private data; the overlay lives only in the user's session or local storage, never in the shared, sourced dataset.

Second use case — adverse-scenario and sensitivity modelling. The same mechanism, run in the positive direction, answers the opposite question: if negotiations fail and the published rates stand, or if the port raises tariffs, or electricity prices spike, what does the call cost then? Overlays such as port dues plus 10 percent, handling at 450 per unit, or shore power at a higher reference price let the user stress-test a call or a port comparison against plausible bad outcomes. Because adjustments toggle individually, a user can compare baseline, contract, and adverse scenarios on the same call inputs side by side.

Display and integrity rules:

- Adjusted lines are visibly marked and itemized as their own entries (baseline X, contract adjustment minus Y percent, effective Z), so a scenario can never be mistaken for the verified tariff result.
- Every view distinguishes baseline mode from adjusted mode, and the comparison views state which basis they use.
- Adjustments can be toggled on and off individually, and the default state on load is always the pure baseline.
- Order of operations relative to tariff-native discounts: contract adjustments apply after the tariff's own discount logic (ESI, frequency, volume), since negotiated terms are typically expressed off the net or gross rate as specified in the contract; the overlay rule carries an applies_to field (net / gross) to record which.

Not in scope for v1: persistence of named scenario profiles across sessions beyond local storage, and any sharing or synchronization of contract data — deliberate, since contract rates are commercially sensitive.

Per-port regulatory applicability. The AFIR/FuelEU obligations do not apply uniformly: they attach to TEN-T core and comprehensive maritime ports, and not all ports or terminals fall within that network — smaller ports are outside the mandate. Applicability is therefore a per-port data attribute, not a global constant:

- Each port file carries a regulatory block: ten_t_status (core / comprehensive / not_in_network, with source reference to the TEN-T network designation), plus the date from which the OPS mandate applies at that port's berths.
- The UI reacts to the selected port and terminal: at a mandated port, a call dated on or after the mandate date with a vessel above 5,000 GT defaults OPS on and shows the regulatory notice; at a non-TEN-T port, OPS remains a plain optional input with no mandate notice, and the energy-at-berth segment simply reflects whatever the user chooses.
- Where a port is in the network but a specific terminal lacks OPS infrastructure, the terminal-level override is recorded the same way (with source), and the UI shows a distinct notice: mandate applies but infrastructure unavailable at this terminal — a compliance risk flag rather than a cost line.

Exact applicability criteria (AFIR Regulation (EU) 2023/1804, Article 9; corroborated by T&E's AFIR explainer and secondary regulatory guides). Being a TEN-T core or comprehensive maritime port is necessary but not sufficient. The port must additionally exceed ship-category call-frequency thresholds, counted as annual averages over the preceding three years, counting only calls by ships above 5,000 GT:

- More than 100 port calls per year by containerships, OR
- more than 40 port calls per year by ro-ro passenger ships and high-speed passenger craft, OR
- more than 25 port calls per year by other passenger ships (cruise).

Where these thresholds are exceeded, the member state must ensure OPS capacity covering at least 90 percent of port calls by the relevant categories. For the ship-side duty, FuelEU Maritime Article 6 adds operational conditions: the vessel must be a container or passenger ship above 5,000 GT, moored for more than two hours, at a port of call under AFIR Article 9 — with defined exceptions (stays under two hours, zero-emission technology meeting Annex III, unscheduled safety calls, documented infrastructure unavailability, ship-shore incompatibility, emergencies, maintenance).

Consequence for the model: the port regulatory block carries the threshold evidence — ten_t_status, the three-year average call counts by category, and the resulting mandate determination, each with a source reference and a verified_on date. The UI's mandate notice is then fully explainable: it can show not just "AFIR applies" but why (TEN-T comprehensive; 142 containership calls per year average 2023–2025, above the 100 threshold). Ports below the thresholds show OPS as optional with a neutral note that the port falls outside the AFIR mandate thresholds. The vessel-side conditions (above 5,000 GT, container or passenger, moored over two hours) are evaluated by the engine from the call inputs, so the notice also reacts correctly to vessel presets.

Phasing beyond 2030. The ship-side OPS duty reaches further over time:

- From 1 January 2030: container and passenger ships above 5,000 GT at ports covered by AFIR Article 9 (as above).
- From 1 January 2035: the duty extends to ports not covered by AFIR Article 9 but equipped with OPS.
- Between 2030 and 2035, member states may impose OPS usage earlier at non-covered equipped ports, with notification to the Commission a year in advance; they may also extend the requirement to ships at anchorage.
- The AFIR infrastructure obligation (90 percent coverage) applies from 31 December 2029.

The engine therefore evaluates the mandate in three tiers by call date and port attributes: AFIR-covered port (2030), equipped non-covered port (2035), unequipped non-covered port (never — OPS remains optional). The member-state options (early imposition, anchorage) are recorded as port-level flags where known, defaulting to off with a data-quality note. Out of scope for the cost model: FuelEU flexibility mechanisms — pooling, banking, and borrowing of compliance balance — affect fleet-level GHG-intensity compliance economics, not per-call port costs, and are deliberately excluded.

This keeps the reaction deterministic and traceable: the behaviour follows from sourced facts in the port file, never from hard-coded port names in the application, preserving the ports-are-data principle. The TEN-T designation of each port in the initial set is to be verified and recorded during port encoding (open item).

### 4.3 Data and Presentation Layers

The data layer and the presentation layer are strictly decoupled.

Data layer: a rich, normalized model of cost items — every individual charge as a distinct record carrying its biller, fee family, formula, conditions, currency, and source reference. The model is deliberately over-specified relative to any single UI need, so that views, upgrades, and tariff changes never require data restructuring. Physically, in version 1, this model is stored as versioned structured files (YAML for authoring, JSON as the interchange format the application consumes), reviewable on GitHub. A database may be introduced later without redesign.

Presentation layer: the GUI derives all views from the data layer's output contract. The default view is a simple overview (port totals and top-level groupings); any grouping — by biller, fee family, or port — can be collapsed, expanded, or drilled into on request. Detail (individual clauses, tariff documents, calculation traces) is retrievable on demand rather than shown by default.

The exact interaction design of the GUI is deferred. What is normative now is that the data model must be sophisticated enough that no future presentation choice is constrained by it.

### 4.3.1 Multi-Port Navigation and the Comparison View

When more than one port is loaded, the UI is organized as separate per-port pages rather than one accumulating screen. A persistent port selector (navigation tab bar or equivalent) moves between per-port workspaces; each workspace contains the full form-and-results experience for that port, using that port's fee families, form fields, and data. Per-port separation is required: fee families and inputs differ between ports, and a single combined screen would become unusable as ports are added.

**The comparison view.** A distinct comparison screen (not a mode of a per-port page) answers the question "what would this same vessel, this same call, cost across these ports?" Behavior:

- The user selects the ports to compare (any subset of loaded ports) and enters the vessel and call parameters once. Parameters map to each port's rules; where a port has no equivalent input (e.g. a fee the port does not charge), that port shows no line for it rather than an error.
- The comparison renders one column per port, with rows by cost segment (vessel call / energy at berth / yard & storage) and, drillable, by fee family. Segment subtotals and the grand total per port are always visible; the cheapest/most expensive port per row is visually marked.
- Comparability rules from 4.2 apply: rows group by function (fee family), never by biller name, so ports that charge differently for the same function still line up. Where a function is genuinely absent at a port, the row shows an explicit "not charged" rather than being hidden, so an absence of cost is never mistaken for missing data.
- The comparison uses reference tariff rates only (list prices); contract rates and manual overrides from the scenario-adjustment layer may be applied per port, clearly marked, but the default comparison is list-price.
- Data quality is carried through: lines derived from unpublished or estimated rates carry the same flags as in per-port views, and a comparison including such lines is marked accordingly.

The comparison view reads the same canonical data and engine as per-port pages — it is a presentation over multiple single-port computations, not a separate calculation path.

### 4.4 Fee Rule Elements

Each fee rule in a port file carries five elements:

1. Base unit — what the fee is charged per: GT, move, commenced day, tug-hour, m³ water, kWh, flat.
2. Rate structure — one of:
   - flat: single rate per unit;
   - banded: the applicable rate per unit depends on which band the vessel's GT (or other key) falls into — e.g. Gothenburg port dues;
   - progressive: bands applied cumulatively to the portion within each band;
   - per_commenced_day and similar time-based forms.
3. Conditions — predicates on vessel or call parameters: traffic category, LOA thresholds, emission class or ESI score, OPS usage, laytime duration. A rule with unmet conditions does not apply.
4. Adjustments — percentage discounts or surcharges that may stack (ESI ladders, green-port surcharges, environmental indexing).
5. Currency and validity — mandatory currency, effective-from date, and source reference (document filename, page, clause).

#### 4.4.1 Adjustment Stacking Semantics

When multiple adjustments apply to a single fee, the combination method is declared per tariff clause where the tariff itself legislates the method (recommended default). Where a tariff is silent, adjustments apply multiplicatively in a defined order: surcharges first, then discounts, each applied to the running result. This is subject to iteration as real tariffs are encoded and edge cases emerge.

#### 4.4.2 Missing-Parameter Fallback

If a rule references a parameter the user did not supply (for example, an ESI-dependent discount with no ESI score entered), the tool assumes the least favourable value (no discount applied) and displays a visible notice on the result line, so the user is aware that a potentially applicable benefit was not computed.

#### 4.4.3 Data Validation

The application validates port files on load. If it encounters an unknown fee family, it does not silently proceed; it prompts the user to interpret or classify the item, accompanied by an explicit warning that calculation quality may be severely impacted. Banded structures with gaps or overlaps between bands are rejected at load time.

### 4.5 Rule Schema (illustrative JSON)

```json
{
  "fee_id": "port_dues",
  "fee_family": "port_dues",
  "biller": "port_authority",
  "currency": "SEK",
  "effective_from": "2026-01-01",
  "source": {
    "document": "got_port_tariff_2026.pdf",
    "document_url": "https://www.portofgothenburg.com/globalassets/dokument/port-tariff-2026.pdf",
    "document_issued": "2025-11-15",
    "page": 4,
    "clause": "§2.1",
    "verified_on": "2026-09-20",
    "verified_by": "vibe-session-001"
  },
  "base_unit": "GT",
  "rate": {
    "type": "banded",
    "key": "gt",
    "bands": [
      { "min": 0, "max": 5000, "rate": 6.10 },
      { "min": 5000, "max": 15000, "rate": 5.45 },
      { "min": 15000, "max": null, "rate": 4.90 }
    ]
  },
  "conditions": [
    { "field": "traffic_category", "op": "eq", "value": "deep_sea" }
  ],
  "adjustments": [
    { "type": "discount_pct", "field": "esi_score", "stack_method": "multiplicative", "ladder": [
      { "min": 30, "discount": 10 }, { "min": 50, "discount": 15 }
    ] }
  ]
}
```

Figures are illustrative placeholders pending extraction from the actual 2026 tariff PDFs; structure, not numbers, is normative in this version.

### 4.6 Worked Contrast: Banded vs Progressive vs Flat

- Gothenburg container vessels (progressive): the tariff explicitly states "progressive banding" — the first 20,000 GT charged at the 0 to 20,000 GT band rate, the next 20,000 GT at the 20,001 to 40,000 GT band rate, and so on. Each GT portion is charged at its own band rate, exactly like Hamburg.
- Gothenburg tankers (banded): the tariff states "Dues are calculated based on GT bands, and for the vessel's total GT" — one rate applies to the entire GT based on which band the vessel falls into. This demonstrates that a single port may use different rate structures for different vessel types.
- Helsingborg (flat): a single flat SEK/GT rate regardless of vessel size — same engine, rate.type set to flat instead of banded or progressive.
- Hamburg container vessels (progressive): GT split pro-rata across three bands, each portion at its own rate. Formerly split by shipping area (intra-European vs deep-sea) with three components (GT, handling/quantity, environmental) as of the 2020 tariff; reformed in 2024 to the current progressive structure. The 2026 tariff continues this progressive structure.

Both Gothenburg and Hamburg use progressive banding for container vessels, but with different band structures, rates, currencies, and additional components. This confirms that the progressive rate type is essential and common, not an edge case.

### 4.7 Tariff Versioning

Prior-year tariff versions are kept loaded alongside the current version, so users can compare historical or future-dated calls. The call date selects which tariff version applies. Critically, the rule engine must handle not only rate changes between versions but structural form changes — for example, Hamburg's port dues shifting from a traffic-category split (intra-European vs deep-sea, sub-50k GT threshold) to a banded GT structure. The version selector determines which set of rules is evaluated; the engine itself remains generic and does not hard-code any particular structure for any year.

## 5. Per-Port Model and Output Contract

Each port file is a complete, self-contained costing model: an ordered list of fee rules plus port metadata (name, UN/LOCODE, currency, tariff documents, effective dates). Ports with fees others lack simply carry additional rules; absent fee families are reported as "not levied in this port".

### 5.1 Source Traceability

Every rate, every fee rule, and every computed result line must carry a full provenance chain that allows the user to independently verify accuracy against the original tariff document. This is not an optional feature; it is a core principle of the tool.

**At the data level**, every fee rule carries a mandatory source reference with the following fields:

| Field | Notes |
|---|---|
| document | filename of the tariff document stored in the port directory (e.g. got_port_tariff_2026.pdf) |
| document_url | the original public URL from which the document was retrieved |
| document_issued | the issue date stated on the document (e.g. 2025-10-09) |
| page | the page number in the document where the rate appears |
| clause | the clause, section, or tariff number (e.g. STC 4.1.2.4, tariff 217, price category 31 Step B) |
| verified_on | the date the rate was extracted and verified by the maintainer |
| verified_by | identifier of the person or session that extracted the rate |

A fee rule without a complete source reference is rejected at load time. No rate enters the system without being attributable to a specific location in a specific document on a specific date.

**At the output level**, every computed result line carries the same source reference forward, so the user sees not just what they are being charged but exactly where that charge is defined in the tariff. The source reference is visible in:

- The itemized breakdown table, per line item
- The drill-down detail view, alongside the calculation trace
- The CSV and JSON exports, as a structured field per row
- The REST API response, as a nested object per result line

**At the presentation level**, source references are shown by default in the drill-down view and available on demand in the overview. A user who sees "Port fee GT component: EUR 37,736.50" can expand that line to see "Source: Port_of_Hamburg-GTC_-_Pricelist_Maritime_Shipping_-_as_of_01.01.2026, page 6, tariff 31 Step B, verified 2026-09-20" and can follow the document URL to the original PDF.

**Document storage**: tariff PDFs are stored in each port directory under /docs and are the source of truth. The application does not parse them at runtime; it serves them for download or links to the original public URL so the user can open the exact document and navigate to the exact page and clause.

**Rate changes between versions**: when a rate changes between tariff versions, both the old and new source references are retained in the versioned port files, so a user comparing a 2024 call against a 2026 call can see not only the different rates but the different source documents and clauses that defined them.

### 5.2 Shared Output Contract

**Shared output contract** (every port model must produce):

| Field | Notes |
|---|---|
| biller | charging entity: port authority, national/state authority, named terminal operator, independent service provider, or other costs (with free-text name) |
| fee_family | port_dues, fairway_dues, pilotage, towage, mooring, waste, security, ops, terminal_handling, storage, demurrage, berth_occupancy, anchorage, other |
| bundled_into | fee_id of the parent fee, if this cost item is subsumed within another charge; otherwise absent |
| description | human-readable line item |
| amount | in local currency, unrounded intermediate values |
| currency | ISO code |
| source_ref | full provenance object: document, document_url, document_issued, page, clause, verified_on, verified_by (see section 5.1) |
| validity | effective-from date |
| quality_flag | set when the fee family was unknown and user-interpreted, or when a required parameter was missing |

The comparison layer aggregates these per call: itemized breakdown per port, total per port in local currency, ranking, and per-line traceability. When a port's total is shown in another currency, conversion is applied uniformly at presentation (Section 6), so rankings never depend on the display currency.

## 6. Currency Handling

- All arithmetic is performed in the tariff's native currency (SEK, EUR, DKK, PLN).
- Conversion occurs exactly once, at the presentation layer, using ECB daily reference rates (public XML/CSV feed).
- The latest fetched rate set is cached with its publication date, displayed alongside results.
- If the feed is unreachable, the app uses the last cached rates and states this explicitly.
- The user's chosen display currency is never part of the calculation input.

## 7. Data Workflow and Repository Layout

Tariff PDFs are stored in the repository as the source of truth but are never parsed at runtime. Fee rules are extracted from PDFs (in this Vibe project) and encoded into structured port files, referenced by filename and page.

```text
/ports
  /segot (Gothenburg)     port.yaml, /billers (authority.yaml, terminals...), /docs (tariff PDFs)
  /deham (Hamburg)        — multiple terminal operator billers
  /sehbg (Helsingborg)    — single biller (authority-owned terminal)
  /segvle (Gävle)
  /plgdn (Gdansk)
  /debrv (Bremerhaven)
  /dkaar (Aarhus)
/vessels  vessels.yaml (curated named-vessel table)
```

Structured human-readable files are preferred over a database for version 1: YAML for authoring (human-editable tariff maintenance), JSON as the interchange format the application consumes. All files are reviewable on GitHub, fully versioned, and convertible to a database later without redesign. Prior-year tariff versions are retained in each port directory, distinguished by effective-from dates.

## 8. Application and Deployment

- Web form input (vessel and call parameters) → itemized per-port cost table, totals, ranking, CSV/JSON export.
- REST API returning the same results as JSON (web UI built on it).
- Deployable to any static host as a stateless single service (aside from an exchange-rate cache and tariff data files). The deployment target is an implementation choice, changeable without spec changes; the spec's requirement is that a deployment be verifiable at the served artifact (fresh deployment record and served bundle markers), never by pipeline exit status alone.

## 9. Initial Port Set

Gothenburg, Hamburg, Helsingborg, Gävle, Gdansk, Bremerhaven, Aarhus. Pilot port for schema validation: **Gothenburg**.

## 10. Open Items

1. Encode the Gothenburg 2026 tariff as the pilot port file. All three billers' figures are now extracted and verified (Port of Gothenburg Port Tariff 2026; Sjöfartsverket prislista and lathund 2026; APMT Terminal Tariff 2026, June edition). Remaining sub-item: encode the Gothenburg pilotage tariff (port authority and Sjöfartsverket rates are extracted; pilotage time assumption for the approach still needed).
2. Confirm tug-usage default values per port (number of tugs by LOA class) during extraction.
3. Draft the first Vibe coding prompt from this specification — drafted (see companion prompt document); review before use.
4. Research Hamburg's container terminal operators and the public availability of their tariffs — completed. Hamburg has two main container terminal operators: HHLA (CTA, CTB, CTT — with a published Quay Tariff) and Eurogate (CTH — tariff availability to be confirmed). Additional operators include Rhenus Midgard, Süd-West Terminal, and Unikai. The HHLA Quay Tariff still distinguishes by traffic category (overseas vs long-distance European vs short-distance European) in its weight dues, even though the HPA port dues no longer do so.
5. Define how confidential or contract-based terminal charges are flagged and displayed in comparisons — partially resolved: a contract-vs-published caveat annotation is defined (v0.2.4); a general confidential-charge flag remains for ports where no public rate exists at all.
6. Establish the GT-to-net-tonnage relationship for vessel presets (typical container vessel nt as a fraction of GT), or add explicit nt values to presets, since Sjöfartsverket bills on nettodräktighet.
7. Determine pilotage time assumptions per port (e.g. Elbe approach hours for Hamburg, Gothenburg approach) for hourly pilotage components.

### Resolved Decisions (for reference)

- File format: YAML for authoring, JSON as interchange. (Was open item 1.)
- Adjustment stacking: per-tariff declaration; multiplicative as fallback where a tariff is silent. (Was open item 3.)
- Missing-parameter fallback: assume least favourable value with visible notice.
- Multi-terminal default: present alternatives side by side; user must select; no arbitrary default.
- Data validation: unknown fee family prompts user with quality warning; banded gaps/overlaps rejected at load.
- Tug input: port/LOA-class defaults as suggestions; user may always override.
- Tariff versioning: prior versions kept loaded; engine handles structural form changes across years.
