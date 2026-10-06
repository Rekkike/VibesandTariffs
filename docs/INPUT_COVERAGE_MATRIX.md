# Cross-Port Input-Coverage Matrix (v0.4.7)

Companion artifact of docs/MODEL_HEALTH_AUDIT.md §5. Inventory of every
scenario/user input the model exposes, per port, with each asymmetry
classified: known-and-recorded (the deferred queue or an extraction reference
already records it) or unrecorded (a finding, recorded here for the first
time). The comparison view's honesty depends on asymmetries being recorded
rather than discovered by users.

Method: the engine's `CallInput` inventory cross-checked against (a) every
fee rule's conditions/unit inputs per port (script over all six YAML silos)
and (b) the UI's rendered inputs (every `handleCallChange` /
`handleCallChanges` / `state.call` reference across the web source). The
engine is the authority; the UI inventory is observational.

---

## 1. Shared inputs (rendered at every workspace)

The core call inputs render at every port's workspace: date, vessel type,
the four container counts, calls this month, flag state, arrival origin,
ESI/CSI/CSI-class, fossil-free percentage, OPS usage and the OPS speculation
set, EU ETS emissions/allowance price, pilotage required/hours/extra
pilot/ordering lead time, lay-up days, tug count, towage estimate, handling
estimate, the storage-day pairs that the port prices, lay time, engine tier.

## 2. Per-port input surfaces

| Port | Port-specific inputs rendered |
|---|---|
| GOT | `got_same_route_second_call`, `waste_certificate_2022_91`, `fresh_water_m3`, `sludge_extra_m3`, `scrubber_waste`, `break_bulk_1000kg`, `idle_berth_hours`, `mooring_charge`, hatch cover / gearbox counts, OOG/reefer/DG/overdue-DG units |
| HAM | `terminal_operator`, `berth_type`, `berth_hours`, `hpa_berth_usage`, `gangway_class/count/supervision_hours`, `pilotage_segment_pct`, `port_time_hours`, `quantum_prior_year_gt`, lashing/twistlock/IMO containers, `layby_hours`, `reefer_extra_days`, `small_call_containers`, `container_service_admin_fee` (toggle), the three waste-reduction attestations, the scenario-parameter set (shifts, overtime, waiting, staff/equipment hours, gangs) |
| HEL | `issc_valid`, `ees_rate_per_move`, `towage_cost_per_tug`, `clean_shipping_index_class`, `fresh_water_m3`, storage-day pairs, `sludge_extra_m3` (engine-side; see §3) |
| GLE | the national shared set; no port-specific surface beyond the godsavgift planning weights (Karskär awaits a quay selector, recorded) |
| NRK | `nrk_liner_service`; the national shared set |
| NVK | the national shared set |
| BRV | `terminal_operator` (EUROGATE CTB default / NTB variant), `pilotage_segment_pct` (the Weser sea-approach default 65; scales the Lotsabgaben line only - the Aussenweser fees line is definitionally 100 percent, the asymmetry recorded here), `towage_amount` (est.), lashing/twistlock/IMO/lay-by/reefer-days/small-call counts (the Eurogate P&C optional services, blank-defaulted), `storage_days_import`/`storage_days_export` (the ch. 7 scenario surfaces, zero-defaulted), the shared EU-ETS pair |
| AAR | `tug_count` (override for the published towage bands' LOA default - the assumed-parameter flag fires when the port default applies), `esi_score` (the 4.5-percent ESI-discount gate, the shared environmental surface), `pilotage_hours`/`pilotage_extra_pilot`/`pilotage_ordering_lead_time_hours` (the shared pilotage set), lashing/DG/reefer/reefer-days counts (the APMT optional services, blank-defaulted), `storage_days_import` (the tariff-10 storage scenario surface, zero-defaulted), the shared EU-ETS pair and OPS block. The mooring line needs no input (the published GT bands price it); the 140-unit APMT minimum is a rule floor, never an input (v0.6.0) |

## 3. Engine inputs with no UI anywhere (unrecorded asymmetry, recorded here)

Twenty-five `CallInput` fields are priced by rules but have no rendered
input at any workspace:

- **HHLA container services (HAM):** `container_service_reception_units`,
  `container_service_extra_moves`, `gassing_20ft_units`,
  `gassing_40ft_units`, `vgm_weighing_units`, `vgm_calculative_units`,
  `reefer_connect_units`, `reefer_checks`, `labelling_units`,
  `neutralization_units` — each prices a published S4 §8 rate; the
  data descriptions record the rates as "Optional call input, default off";
  the absence of an input surface is recorded here.
- **Storage size classes (HAM/HEL/NVK):** `storage_empty_days` and the
  empty-unit counts (20/30/40/45 ft), the 30/45-ft full-unit counts
  (import/export), `storage_days_transshipment`,
  `storage_days_hazardous`, `transshipment_units` — the free-time ladders
  for the rendered storage-day pairs exist; the size-class and
  special-flow surfaces have no inputs.

Classification: the rules stay, correctly blank-priced at the default (the
v0.4.1 zero-default contract); input surfaces are future work for a
directive that orders them.

## 4. Rules whose unit inputs do not exist in the call model (unrecorded, recorded here)

- **HEL:** `poh_imo_transport` (`imo_transport_units`), `poh_vgm`
  (`vgm_units`), `poh_other_admin` (`other_admin_units`),
  `poh_customs_inspection` (`customs_inspection_count`),
  `poh_port_area_transport` (`port_area_transport_units`) — the unit_type
  values match no `CallInput` field and no engine case; the rules resolve to
  zero and render informative zero lines. The same no-input class as GOT's
  godsavgift passenger/private-vehicle components (v0.4.4).
- **GOT:** `apm_terminals_handling_break_bulk` (`1000_kg`) — the mis-encoded
  duplicate, MODEL_HEALTH_AUDIT §2.

## 5. Known-and-recorded asymmetries (verified against the queue)

- The Karskär quay selector (GLE): the 2.5 §recorded notice awaits the input
  (v0.4.3).
- The Yilport operational surfaces (GLE): recorded; encoded only when
  scenario inputs exist (queue item 6).
- The Yilport empty-container input 1,235/unit: recorded, not encoded
  (queue item 8).
- The APMT VAS surfaces (GOT): recorded with citations; encoded only where
  an input keys one (v0.4.6).
- The >20 ft storage doubling refinement (GOT): recorded, pending a per-size
  storage input (v0.4.6).
- The APMT charge-day exclusion refinement: recorded (v0.4.6).
- The Raumgebuehr Short Sea subdivision (BRV): the HGebO's European traffic
  area splits Short Sea (0.0438/0.1210) from Europaverkehr
  (0.1535/0.2368/0.2763); the shared arrival-origin selector is binary and
  cannot key it - a European arrival prices the conservative Europaverkehr
  rate, and the Short Sea figures are recorded in the extraction reference
  (section 4.1), never silently dropped (v0.5.1).
- The Raumgebuehr Europaverkehr extension (BRV): the 3b(2) ten-day extension
  encodes on the overseas side only; the Europe side's GT-band x time-period
  nesting has no engine rate shape - recorded in the extraction reference
  (section 4.2), stop-and-report (v0.5.1).
- The GDWS segment asymmetry (BRV): the Weser Lotsabgaben line scales by
  `pilotage_segment_pct` (65 percent sea approach); the Aussenweser Lotsgelder
  line never scales (its leg is definitionally 100 percent) - recorded in the
  extraction reference (section 5.2), v0.5.1.
- The Bremerhaven mooring convention: crew-handled per the directive's
  convention; no archived authority addresses Bremerhaven boatmen (the
  evidentiary status stated in the extraction reference section 7), v0.5.1.
- The APMT Aarhus scenario surfaces (AAR): the gate-move (truck/rail),
  yard, VAS, and reefer-plug surfaces are priced rules awaiting scenario
  inputs - the expansion-gate doctrine (recorded per the Aarhus extraction
  reference section 6; encoded where an input keys one, blank-zero
  otherwise), v0.6.0.
- The crane own-gear surface (AAR): the port container cranes rent
  excluding operator at 2,175 DKK/hour for ships working with their own
  gear at port quays (Crane Terms 8.1); the standard call at the APMT
  terminal prices the APMT quay rate and the crane rule never fires -
  recorded as the own-gear scenario surface, never a default line
  (the Aarhus extraction reference section 3), v0.6.0.
- The conditional electricity/shore-power/vet surfaces (AAR): the ToC
  13/14 electricity and shore-power tariffs (2.75 DKK/kWh plus connection
  fees) and the 15 veterinary border-control fee are conditional
  surfaces - they fire only for calls that order shore power or carry
  third-country animal products; no input keys them today, recorded not
  forced (the extraction reference section 6), v0.6.0.
- The waste-geography condition (AAR): the slop-oil free maximums depend on
  the last port's position relative to the Wilhelmshaven-Kristiansand line
  (5 m3 east / 10 m3 west); the waste scenario carries no last-port
  geography input, so the no-special-fee principle plus the ToC's named
  exceptions encode and the condition is recorded (the extraction
  reference section 8 - the gate doctrine's encode-or-record decision),
  v0.6.0.

## 6. Coherence-check adjudication

A pin that fails when a new asymmetry appears unrecorded would require a
canonical asymmetry registry the model does not carry; adjudicated as
over-fitting risk against a document snapshot (MODEL_HEALTH_AUDIT §5). The
matrix is the committed artifact; a future pass may add the registry as data
if the asymmetry class grows.
