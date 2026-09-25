// Core types for Port Call Cost Analyzer

export type Currency = 'SEK' | 'EUR' | 'USD' | string;

// Source reference - MUST be complete for every fee rule
export interface SourceReference {
  document_name: string;
  document_url: string;
  // Spec v0.2.26, superseded v0.2.32: kept as a belt-and-braces guard — the
  // converter sets it if a zero-byte file ever reappears; the integrity
  // test is the authoritative check and fails the suite first.
  document_pending?: boolean;
  // Spec v0.2.32: for sources not archived in the repository, the live
  // upstream URL where the tariff document is published, and the flag set
  // at conversion when the archive copy is absent. The reference never
  // points at an empty file; provenance renders with the upstream link.
  upstream_url?: string;
  document_not_archived?: boolean;
  document_issued: string; // ISO date
  page: string | number;
  clause: string;
  verified_on: string; // ISO date
  verified_by: string;
}

// Fee families (economic functions)
export type FeeFamily = 
  | 'port_dues'
  | 'fairway_dues'
  | 'waste'
  | 'pilotage'
  | 'towage'
  | 'terminal_handling'
  | 'storage'
  | 'security'
  | 'environmental_surcharge'
  | 'connection_fee'
  | 'lay_up'
  | 'readiness_fee'
  | 'cargo_fee'
  | 'vessel_fee'
  | 'ordering_fee'
  | 'yard_surcharge'
  | 'gate_hazardous'
  | 'idle_berth'
  | string;

// Cost segments for UI grouping
export type CostSegment = 'vessel_call' | 'energy_at_berth' | 'terminal_and_yard';

// Mapping from fee_family to cost segment
export const FEE_FAMILY_TO_SEGMENT: Record<FeeFamily, CostSegment> = {
  'port_dues': 'vessel_call',
  'environmental_surcharge': 'vessel_call',
  'waste': 'vessel_call',
  'security': 'vessel_call',
  'lay_up': 'vessel_call',
  'connection_fee': 'energy_at_berth',
  'vessel_fee': 'vessel_call',
  'readiness_fee': 'vessel_call',
  'cargo_fee': 'vessel_call',
  'pilotage': 'vessel_call',
  'ordering_fee': 'vessel_call',
  'terminal_handling': 'vessel_call',
  'storage': 'terminal_and_yard',
  'yard_surcharge': 'terminal_and_yard',
  'gate_hazardous': 'terminal_and_yard',
  'idle_berth': 'terminal_and_yard',
  'ancillary_service': 'vessel_call',
  'hatch_cover': 'vessel_call',
  'gearbox_handling': 'vessel_call',
  'fairway_dues': 'vessel_call',
  'towage': 'vessel_call',
  'hafenfonds': 'vessel_call',
  'frequency_discount': 'vessel_call',
  '': 'vessel_call'
};

// Rate structure types
export type RateStructureType = 
  | 'flat'
  | 'banded'
  | 'progressive'
  | 'per_commenced_day'
  | 'per_unit'
  | 'banded_by_time'
  | 'banded_flat'
  | 'composite_tranche'
  | 'tiered_per_period'
  | 'per_commenced_period'
  | 'progressive_daily'
  | 'flat_by_input';

// Band definition for banded/progressive rates
export interface RateBand {
  min: number | null; // null means no lower bound (first band)
  max: number | null; // null means no upper bound (last band)
  rate: number;
}

// Rate structure definitions
export interface FlatRate {
  type: 'flat';
  amount: number;
  amount_input?: string;    // call input overriding the amount (e.g. towage_amount)
}

export interface BandedRate {
  type: 'banded';
  bands: RateBand[];
  basis: 'gt' | 'nt' | 'loa' | 'draft' | 'teu' | string;
}

export interface ProgressiveRate {
  type: 'progressive';
  bands: RateBand[];
  basis: 'gt' | 'nt' | 'loa' | 'draft' | 'teu' | string;
}

export interface PerCommencedDayRate {
  type: 'per_commenced_day';
  daily_rate: number;
  free_days?: number; // optional free days
  basis: string;
  // Optional per-unit multiplication (spec v0.2.33): the tariff may price per
  // unit per commenced day (e.g. APMT yard surcharges per OOG/reefer/DG unit
  // per day). Absent means the daily rate stands alone. A blank or zero unit
  // input charges zero, never a seeded count.
  unit_input?: string;
  unit_type?: string; // label only, e.g. 'oog_units', for flag text
}

export interface PerUnitRate {
  type: 'per_unit';
  unit_rate: number;
  unit_type: string; // e.g., 'container', 'teu', 'kg', 'move'
  unit_rate_input?: string; // call input overriding the rate (e.g. handling_rate_per_move)
  count_input?: string;      // call input holding the unit count (overrides the derived unit_type count)
  default_by_loa?: {         // suggested count by LOA class (spec 3.3: defaults are data, user-overridable)
    bands: { min_m?: number; max_m?: number; count: number; description?: string }[];
  };
  // Cargo-tonnage derivation from container counts (spec v0.2.61, the
  // godsavgift encoding): tonnes = 20ft count x weight_20_input + 40ft count
  // x weight_40_input, charged over the international-traffic basis (loaded
  // and discharged, per the Sjöfartsverket regulation's traffic-type charge
  // basis). The weight inputs are shared planning weights, never tariff data;
  // their defaults and disclosure live in the data rule. A zero or blank
  // container total renders nothing: no zero-tonne line, no division
  // artifacts (the rule returns null before any amount exists).
  cargo_tonnage?: {
    weight_20_input: string;   // call input: average weight per 20ft container
    weight_40_input: string;   // call input: average weight per 40ft container
    round_to_whole_tonnes: boolean; // SJÖFS 16 §: chargeable tonnage rounds to the nearest whole tonne
  };
  // Two-rate value blend (spec v0.2.61): high_value_rate is the per_unit
  // unit_rate; the low-value share input carries the share of tonnage priced
  // at low_value_rate. The blended effective rate is derived on the line
  // (e.g. 25% low -> 2.94 kr/tonne) with the derivation shown; the share
  // default is 0 (100% high-value for container vessels per the SJÖFS
  // commodity-code annex).
  value_blend?: {
    low_value_rate: number;
    low_share_input: string;   // call input: low-value share, percent 0-100
    basis_note: string;       // rendered basis: rates, traffic basis, transit limitation
  };
}

export interface BandedByTimeRate {
  type: 'banded_by_time';
  bands: {
    min_days: number;
    max_days: number | null;
    daily_rate: number;
  }[];
  basis: string;
}

// Flat amount per GT band (e.g. GDWS pilotage dues/fees, Hamburg waste V A-C).
// Bands are half-open: lower exclusive, upper inclusive.
export interface BandedFlatBand {
  min: number | null;
  max: number | null;
  rate?: number;        // per basis unit
  amount?: number;      // flat amount for the band
  cap_at_max?: boolean; // charge rate on min(basis, max) only
}

export interface BandedFlatRate {
  type: 'banded_flat';
  basis: string;
  bands: BandedFlatBand[];
  linear_extension?: {
    from_basis: number;      // extension applies to basis above this value
    per_basis_units: number; // commenced basis units (e.g. 2,000 GT)
    amount: number;          // per commenced unit (e.g. 44)
  };
}

// Component adjustment within a composite_tranche rule.
// Surcharges round half-up to the cent; discounts round up (ceil) to the cent
// per the S1 worked example's printed component figures.
export interface CompositeComponentAdjustment {
  kind: 'tier_pct' | 'score_discount_pct_with_cap' | 'per_gt_rebate' | 'pct_discount_banded';
  input?: string;         // call input field the adjustment keys on
  map?: Record<string, number>;       // tier_pct: value -> percentage (+ surcharge, - discount)
  bands?: { min: number; max: number | null; pct: number; cap?: number }[];
  rate_per_gt?: number;   // per_gt_rebate (negative = rebate), e.g. -0.015
  condition_input?: string; // call boolean that gates the adjustment (e.g. ops_usage)
  description?: string;
}

// Composite cumulative-tranche fee with multiple per-GT components and
// ordered adjustment stacks per component (e.g. HPA port fee: GT + env).
export interface CompositeTrancheRate {
  type: 'composite_tranche';
  basis: string;
  gt_cap?: number; // e.g. 225,000 GT: basis above this not chargeable
  tranches: {
    min: number | null;
    max: number | null;
    components: Record<string, number>; // component id -> rate per basis unit (e.g. gt: 0.0856, env: 0.0214)
  }[];
  component_adjustments: Record<string, CompositeComponentAdjustment[]>; // component id -> ordered stack
  component_labels?: Record<string, string>;
}

// Rate per basis unit under time tiers (e.g. HHLA tonnage dues:
// 1.25 EUR/GT for first 24 h of lay time, then 0.80 EUR/GT per commenced 12 h).
export interface TieredPerPeriodRate {
  type: 'tiered_per_period';
  basis: string;             // e.g. 'gt' - the per-unit basis
  hours_input: string;      // call input holding the total hours (e.g. lay_time_hours)
  initial_tier: {
    hours: number;           // first tier covers this many hours, charged in full once hours > 0
    rate_per_basis: number;
  };
  subsequent_tier?: {
    period_hours: number;    // each commenced period of this many hours beyond the initial tier
    rate_per_basis: number;
  };
  default_hours?: number;    // used when the call input is missing (flagged)
}

// Per commenced period of hours (e.g. HPA demurrage per commenced 12 h,
// HPA berth fees per 6 h). Only triggers when hours exceed free_hours.
export interface PerCommencedPeriodRate {
  type: 'per_commenced_period';
  basis: string;         // per-unit basis (e.g. 'gt')
  hours_input: string;   // call input holding total hours
  free_hours: number;    // hours covered before the fee starts (e.g. 120 for demurrage)
  period_hours: number;  // hours per commenced period (e.g. 12, 6)
  tiers: { up_to_excess_hours: number | null; rate_per_period_per_basis: number }[];
  minimum_per_period?: number; // e.g. berth fee minimum per 6-h period
  fallback_hours?: string;     // alternate call input when hours_input is absent (e.g. lay_time_hours)
}

// Storage-style: per container per day with free days and time-progressive
// escalation bands (e.g. HHLA storage: free 3 days import, then 41.10/82.20/123.30).
export interface ProgressiveDailyRate {
  type: 'progressive_daily';
  days_input: string;           // call input holding storage days
  container_count_input: string;// unit count basis (e.g. 'import_containers')
  free_days: number;
  bands: { min_days: number; max_days: number | null; rate_per_container_per_day: number }[];
}

// Flat amount selected by a call-input value (e.g. HHLA gangway:
// feeder 453.50 / overseas 633.80) with an optional count multiplier.
export interface FlatByInputRate {
  type: 'flat_by_input';
  input_field: string;       // e.g. gangway_class
  options: { value: string; amount: number }[];
  fallback_option: string;   // used when input missing (flagged)
  count_field?: string;      // e.g. gangway_count (default 1)
}

export type RateStructure = 
  | FlatRate
  | BandedRate
  | ProgressiveRate
  | PerCommencedDayRate
  | PerUnitRate
  | BandedByTimeRate
  | BandedFlatRate
  | CompositeTrancheRate
  | TieredPerPeriodRate
  | PerCommencedPeriodRate
  | ProgressiveDailyRate
  | FlatByInputRate;

// Discount/Surcharge types
export type AdjustmentType = 'discount' | 'surcharge';

export interface Adjustment {
  type: AdjustmentType;
  percentage?: number; // percentage to apply (e.g., 10 for 10%)
  // Flat per-GT amount (spec v0.2.50): a tariff denominated in SEK/GT (e.g.
  // Gothenburg's -0.05 SEK/GT waste-certificate discount, tariff §10) prices
  // the adjustment as rate x basis GT, never as a percentage of the line.
  amount_per_gt?: number;
  condition?: string; // condition for applying this adjustment
  stacking_order?: number; // custom stacking order
  // Excess-units reduction (spec v0.2.37, SJÖFS 2025:5 §25): the discount
  // applies only to the units beyond a threshold count (e.g. only the
  // half-hours beyond the first 14), never to the whole line or the start
  // fee. Whole-line discounts (the default) multiply the entire amount.
  apply_to?: 'whole_amount' | 'excess_units';
  threshold_units?: number; // units beyond this count are discounted
  // Multiplicative (default, spec 4.4.1 fallback) applies to the running
  // result; 'additive' discounts/surcharges sum their percentages off the
  // pre-adjustment base (declared per tariff clause where the tariff
  // legislates additive stacking, e.g. Helsingborg's environmental discounts).
  stack_method?: 'multiplicative' | 'additive';
  description: string;
}

// Fee rule definition
export interface FeeRule {
  id: string; // unique identifier within port
  fee_family: FeeFamily;
  biller: string; // factual biller name (never normalized)
  name: string; // human-readable name
  description?: string;
  rate_structure: RateStructure;
  source_reference: SourceReference;
  adjustments?: Adjustment[]; // optional adjustments
  minimum?: number; // minimum amount
  maximum?: number; // maximum amount
  applicable_conditions?: {
    vessel_type?: string[];
    flag_state?: 'EU' | 'non-EU' | string;
    esi_score?: number;
    csi_class?: string;
    fuel_percentage?: number;
    ops_usage?: boolean;
    [key: string]: any;
  };
  // Marks the rule as an estimated parameter (unpublished rate); the flag is
  // always carried on the result line and rendered visibly, never as verified data.
  estimated_parameter?: {
    description: string;
    severity?: 'info' | 'warning';
  };
  // Contract-vs-published caveat (spec v0.2.4): the rate is the published list
  // price, but shipping lines may hold different contract rates. Carried onto
  // the result line as a quality flag, never hidden.
  contract_vs_published?: {
    description: string;
    severity?: 'info' | 'warning';
  };
  // Optional percentage scaling from a call input (e.g. pilotage segment %).
  scale_by?: {
    input_field: string;
    default_value: number; // e.g. 100 (percent)
    unit: 'percent';
  };
}

// Biller definition
export interface Biller {
  id: string;
  name: string;
  description?: string;
  currency: Currency;
  // Per-biller surcharge on the biller's own fees (e.g. HHLA Hafenfonds 1.5%,
  // excluding storage). Data-driven so another biller can carry its own fund rule.
  surcharge?: {
    id: string;
    name: string;
    fee_family: FeeFamily;
    percentage: number;
    exclude_families?: FeeFamily[];
    source_reference: SourceReference;
  };
  // Per-biller frequency discount on the biller's fees (e.g. Sjöfartsverket:
  // percentage of the vessel + readiness fees payable, keyed on calls at the
  // port per calendar month). Applied to the listed families only; the
  // discount amount is itemized as its own (negative) line.
  frequency_discount?: {
    id: string;
    name: string;
    fee_family: FeeFamily;
    apply_families: FeeFamily[];
    bands: { min_calls: number; max_calls: number | null; payable_pct: number }[];
    source_reference: SourceReference;
  };
}

// Port metadata
export interface PortMetadata {
  id: string; // port code (e.g., 'gothenburg')
  name: string;
  country: string;
  currency: Currency;
  validity_start: string; // ISO date
  validity_end: string; // ISO date
  description?: string;
}

// Per-port default-call overrides (spec v0.2.59 port-generalization: the
// per-port default call is data, not engine knowledge). Configuration
// values only - input-form defaults mirroring each port's published
// list-price posture; never rates (rates live in fee rules with source
// references). A new port ships its defaults with its YAML authoring; the
// engine overlays them on the shared worst-case core and throws loudly
// when a port has no section (the silent-staleness defect class the
// v0.2.53 shared-call fix repaired).
export interface PortDefaultCallSection {
  [field: string]: unknown;
}

// Per-port OPS speculative component descriptor (spec v0.2.57, data-authored
// at v0.2.59). Configuration only: presence, currency, unit - never rates.
// The user-specified numbers live only in the call input; this section
// declares which input boxes the port's public OPS posture supports.
export interface OpsComponentSpec {
  enabled: boolean;
  currency: Currency;
  unit: string;
}

export interface OpsComponentsSpec {
  electricity: OpsComponentSpec;
  demand: OpsComponentSpec;
  connection: OpsComponentSpec;
  per_gt: OpsComponentSpec;
}

// Per-port input profile (spec v0.2.59): which input sections and operator
// lists a port's workspace renders - UI configuration data, never rates.
// Section ids name the workspace's port-gated input blocks; terminal
// operators gate the Hamburg-style operator scope (the gating values live
// in the port's fee rules' applicable_conditions; this list is the
// user-facing select).
export interface PortInputProfileSection {
  id: string;
  heading: string;
  operators?: { value: string; label: string }[];
}

export interface PortInputProfile {
  // Field-level inputs rendered inside the workspace's shared groups (e.g.
  // the build-year field, the CSI-class select) - declared per port.
  fields?: string[];
  // Port-specific call inputs this port resets to their default on a port
  // switch (spec v0.2.60, the data-authored PORT_SPECIFIC_CALL_FIELDS): the
  // fields this port's own inputs and tariff render or price port-specifically.
  // The App reset effect iterates the union across the registry, so a new
  // port's reset fields ship with its authoring.
  reset_fields?: string[];
  sections: PortInputProfileSection[];
}

// Complete port definition
export interface PortDefinition {
  metadata: PortMetadata;
  billers: Biller[];
  fee_rules: FeeRule[];
  // Per-port configuration sections (spec v0.2.59): default-call overrides,
  // OPS component descriptor, input profile. Optional at the type level so
  // synthetic test fixtures remain constructible; the loader validates
  // presence and shape for every real port file, and the lookups throw
  // loudly when the section is absent.
  default_call?: PortDefaultCallSection;
  ops_speculative?: OpsComponentsSpec;
  input_profile?: PortInputProfile;
}

// Vessel input model
export interface VesselInput {
  gt: number; // Gross Tonnage (required)
  nt?: number; // Net Tonnage (required for Sjöfartsverket, optional here)
  loa_m?: number; // Length Overall in meters
  beam_m?: number; // Beam in meters
  draft_m?: number; // Draft in meters
  teu_capacity?: number; // TEU capacity
  name?: string;
  imo?: string;
  built_year?: number; // build year; drives engine-Tier heuristic when no certified tier is given
}

// Call input model
export interface CallInput {
  port_id: string;
  date: string; // ISO date
  vessel_type?: string; // e.g. 'container', 'tanker' - gates segment-specific rules (e.g. Energy Port OPS)
  containers_loaded_le20ft: number;
  containers_loaded_gt20ft: number;
  containers_discharged_le20ft: number;
  containers_discharged_gt20ft: number;
  calls_this_month: number; // number of calls this vessel has made at this port this month
  // Gothenburg same-route second-call attestation (spec v0.2.67): the Port
  // Tariff 2026 §2.2 FREQUENCY DISCOUNT grants the 50% port-dues discount
  // only for "calls ... twice on the same route (import call and export
  // call)" — a route-pair property the call counter alone cannot represent.
  // An explicit user attestation, default false (worst case): two unrelated
  // calls in a month do not earn the discount under the tariff.
  got_same_route_second_call?: boolean;
  flag_state: 'EU' | 'non-EU' | string;
  // Arrival origin (spec v0.2.50): the Gothenburg waste dues split on the
  // previous port of call's region (Port Tariff 2026 waste schedule:
  // "Vessels arriving from European ports" vs "non-European ports"), not the
  // flag. Shared across all ports per the comparison philosophy. Default
  // 'outside-europe' = the worst case and the realistic Asia-arrival leg.
  arrival_origin?: 'europe' | 'outside-europe';
  // EU 2022/91 waste-certificate discount (spec v0.2.50): a boolean
  // attestation; true discounts the Gothenburg solid-waste line by 0.05 SEK/GT.
  waste_certificate_2022_91?: boolean;
  esi_score?: number;
  csi_class?: string;
  fossil_free_fuel_percentage?: number;
  ops_usage: boolean;
  lay_up_days?: number;
  storage_days_export?: number; // storage days for export units
  storage_days_import?: number; // storage days for import units
  reefer_units?: number;
  oog_units?: number; // Out of Gauge units
  dangerous_goods_units?: number;
  overdue_dangerous_units?: number; // units left overdue in the yard (penalty rule only)
  pilotage_required: boolean;
  pilotage_hours?: number;
  pilotage_extra_pilot?: boolean;
  pilotage_ordering_lead_time_hours?: number; // lead time for ordering fee
  hatch_cover_count?: number; // number of hatch covers handled
  gearbox_count?: number; // number of gearbox units handled
  // OPS energy-at-berth note (v0.2.32): the v0.2.10 component set (per-kWh
  // energy, demand charge, berth-hour charges) is not encoded at any port —
  // no published container-terminal OPS rate exists. Only the ops_usage
  // toggle is live (Hamburg OPS rebate; Gothenburg tanker connection fee).
  // The dead kWh/hours/price/peak inputs were removed in v0.2.32.
  // Hamburg call inputs
  engine_tier?: 'Tier 0' | 'Tier I' | 'Tier II' | 'Tier III' | string; // certified IAPP tier (most polluting engine)
  engine_tier_estimated?: boolean; // true when derived by heuristic rather than certified
  infer_engine_tier_from_build_year?: boolean; // inference-contract state (spec v0.2.44, repurposed from the v0.2.29 user action): the engine infers the tier from the build year per Regulation 13 whenever no explicit tier is entered and a build year is present; this flag records that the wiring is armed and stays false — an explicit tier entry always wins and clears it
  esi_noise_score?: number;        // ESI noise score (esi_score is the ESI air score)
  quantum_prior_year_gt?: number; // prior calendar year accumulated paid GT (HPA quantum discount)
  lay_time_hours?: number;        // HHLA tonnage-dues lay time basis (hours)
  port_time_hours?: number;        // total time in port (HPA demurrage basis); falls back to lay_time_hours
  hpa_berth_usage?: boolean;      // vessel at an HPA-operated berth (not a terminal berth)
  terminal_operator?: string;    // Hamburg terminal scope (spec v0.2.49): 'HHLA' or 'Eurogate'; gates operator-scoped rules (ship's dues, security, handling); absent or unrecognized defaults to HHLA with a visible fallback flag
  berth_type?: 'quay' | 'dolphins' | string;
  berth_hours?: number;
  gangway_class?: 'feeder' | 'overseas' | string; // HHLA gangway class
  gangway_count?: number;
  gangway_supervision_hours?: number;
  pilotage_segment_pct?: number;  // Elbe transit percentage, default 100
  towage_amount?: number;          // estimated towage amount per call (default 15,000 EUR)
  tug_count?: number;              // number of tug assists (drives towage unit counts where billed per tug)
  ees_rate_per_move?: number;      // Emergency Energy Surcharge per move (Helsingborg; datestamped monthly level)
  handling_rate_per_move?: number; // estimated handling rate per move (default 358 EUR)
  waste_short_sea_reduction?: boolean;          // -90% of total (application-based, off by default)
  waste_alternative_fuel_reduction?: boolean;   // -50% of MARPOL I share
  waste_sustainable_waste_reduction?: boolean; // -2% of MARPOL V share
  storage_days_transshipment?: number;
  transshipment_units?: number;
  storage_days_hazardous?: number;
  storage_empty_days?: number;
  storage_empty_20ft_units?: number;
  storage_empty_40ft_units?: number;
  gassing_20ft_units?: number;
  gassing_40ft_units?: number;
  storage_empty_30ft_units?: number;
  storage_empty_45ft_units?: number;
  storage_import_30ft_units?: number;
  storage_import_45ft_units?: number;
  storage_export_30ft_units?: number;
  storage_export_45ft_units?: number;
  reefer_connection_units?: number;
  container_service_reception_units?: number;
  container_service_extra_moves?: number;
  container_service_admin_fee?: boolean;
  vgm_weighing_units?: number;
  vgm_calculative_units?: number;
  reefer_connect_units?: number;
  reefer_days?: number;
  reefer_checks?: number;
  labelling_units?: number;
  neutralization_units?: number;
  // Hamburg Eurogate optional-service inputs (spec v0.2.66, S9 chs. 2/5/9):
  // counts default blank — no seeded count may manufacture a charge.
  lashing_containers?: number;       // S9 5.2.1 lashing/unlashing system lashings, per container
  twistlock_containers?: number;    // S9 5.2.2 setting/removing twistlocks, per container
  imo_containers?: number;          // S9 5.3 IMO surcharge, per container
  layby_hours?: number;              // S9 2.1.4 lay-by berth use in hours (per commenced 24 h)
  reefer_extra_days?: number;        // S9 9.2 reefer days beyond the first 24 h
  small_call_containers?: number;   // S9 5.4 small-call basis: the call's handled-container count when the operator attests a ≤20-container call
  // Helsingborg call inputs (spec v0.2.21)
  issc_valid?: boolean;              // valid ISSC certificate; double security fee when absent (least-favourable default)
  clean_shipping_index_class?: string; // Clean Shipping Index class 1-5 (port discount; distinct from Sjöfartsverket A-E)
  towage_cost_per_tug?: number;      // estimated towage SEK per tug-assist (Helsingborg)
  sludge_extra_m3?: number;         // sludge above the 10 m3 included volume
  idle_berth_hours?: number;        // APM idle berth service hours (explicit request only)
  fresh_water_m3?: number;          // fresh water supplied (m3); free up to 50 m3, then 50 SEK/m3
  scrubber_waste?: boolean;         // scrubber waste delivered (800 SEK admin; disposal billed at cost)
  break_bulk_1000kg?: number;       // break bulk tonnage (1,000 kg units) at 54 SEK/unit
  // OPS speculative inputs (spec v0.2.57): free-number user speculation,
  // deliberately outside the tariff-traceability contract — no port
  // publishes a container-terminal OPS rate (AFIR/FuelEU make OPS
  // effectively mandatory at key EU ports from 2030, but no in-scope
  // tariff prices it). The numbers live only in the call input, never in
  // ports.json or any rate table; blank contributes nothing and renders
  // nothing. Each entered component renders under an explicit
  // "user-specified, not tariff-derived" label.
  // Sjöfartsverket godsavgift cargo-technical inputs (spec v0.2.61): shared,
  // currency-neutral, port-agnostic planning parameters for the Swedish
  // national cargo fee. Visible only where a godsavgift charges (the Swedish
  // workspaces). They behave like ops_kwh_consumption: shared across ports,
  // surviving switches until refresh or the per-workspace reset (never in
  // any port's reset_fields). Defaults 14 t / 24 t / 0% are suggested
  // planning weights, never tariff data (OECD 12-18 t/TEU band for the
  // defaults; SJÖFS commodity-code annex for the 100% high-value default).
  cargo_weight_per_20ft?: number;  // average weight per 20ft container, tonnes
  cargo_weight_per_40ft?: number;  // average weight per 40ft container, tonnes
  cargo_low_value_share?: number;   // low-value share of tonnage, percent 0-100
  ops_kwh_consumption?: number;   // shared enabling input: estimated kWh for the call; without it no electricity line
  ops_electricity_price?: number; // user's assumed electricity price (SEK/kWh Sweden; EUR/kWh Hamburg)
  ops_demand_charge?: number;     // user's assumed demand charge, flat per call (SEK; Sweden only)
  ops_connection_charge?: number; // user's assumed service/connection charge, flat per call (SEK Sweden; EUR Hamburg)
  ops_per_gt_charge?: number;     // user's assumed additional per-GT charge (optional; blank disables)
}

// OPS speculative block (spec v0.2.57): the user-entered OPS components
// priced for this call, kept structurally separate from the tariff-derived
// billers so every surface can render it as its own visibly separated
// block and the Grand Total can distinguish tariff-derived from
// user-specified contributions. Presentation data on the result mirrors
// the engine's single calculation path: the UI never recomputes.
export interface OpsSpeculativeLine {
  id: string;                     // stable line id, e.g. 'ops_spec_electricity'
  label: string;                   // e.g. 'OPS electricity (user-specified)'
  amount: number;                  // the priced contribution
  basis: string;                   // e.g. '1,250 kWh x 2.50 SEK/kWh (user-specified)'
}
export interface OpsSpeculativeBlock {
  lines: OpsSpeculativeLine[];
  amount: number;                  // sum of lines
  currency: Currency;
}

// Full input for cost calculation
export interface CostCalculationInput {
  vessel: VesselInput;
  call: CallInput;
}

// Band-disclosure row (spec v0.2.30): one row per band actually charged
// in a progressive or composite-tranche per-GT rule. Pre-adjustment
// arithmetic as the engine computes it; the UI renders these rows, then the
// sum, applied adjustments with amounts, cap/minimum notes, and the fee
// total. Presentation data only — never changes an amount.
export interface BandRow {
  label: string;            // e.g. 'GT 0–20,000' or 'GT 20,001–100,000'
  quantity: number;        // GT (or basis) charged in this band
  components: { label: string; rate: number; amount: number }[]; // per-component rate and amount
  amount: number;          // band total (sum of component amounts)
}

// Derivation transparency (spec v0.2.42): the engine's own computation
// structure exposed for presentation, one step per line of arithmetic the
// engine actually performed, in the order it performed it. Presentation
// data only — the UI renders these steps and never recomputes, and no
// step changes an amount.
export interface DerivationStep {
  kind: 'bands' | 'components' | 'adjustment' | 'composition';
  label: string;          // step heading, e.g. 'Bands charged', 'Tier adjustment'
  detail?: string;         // one-line prose detail, e.g. 'Tier II +5%'
  bands?: BandRow[];       // kind 'bands': one row per band actually charged
  components?: { label: string; amount: number }[]; // kind 'components'/'composition'
  amount?: number;         // the step's resulting figure (signed for adjustments)
}

export interface FeeDerivation {
  structure_label: string; // e.g. 'Flat rate', 'Progressive by GT', 'Storage day ladder'
  steps: DerivationStep[]; // ordered composition: bands → components → adjustments → total
}

// Effective per-GT derived metric (spec v0.2.30): fee total ÷ vessel GT,
// labeled as derived, never a published rate. Distorting-factor notes name
// the basis effect where a floor/cap/per-call banding materially binds.
export interface EffectiveRateInfo {
  effective_per_gt: number;
  note?: string; // distorting-factor note, e.g. 'fee at its 43.56 EUR minimum'
}

// Result of a single fee calculation
export interface FeeResult {
  fee_rule_id: string;
  fee_family: FeeFamily;
  biller: string;
  amount: number;
  currency: Currency;
  rate_applied: string; // description of rate applied
  band_or_basis: string; // which band or basis was used
  source_reference: SourceReference;
  adjustments_applied: Adjustment[];
  quality_flags: QualityFlag[];
  component_amounts?: { label: string; amount: number }[]; // composite rules (e.g. HPA GT + env components)
  band_rows?: BandRow[];        // spec v0.2.30 band disclosure (progressive/composite tranche)
  derivation?: FeeDerivation;  // spec v0.2.42 derivation transparency (presentation only)
  effective_rate?: EffectiveRateInfo; // spec v0.2.30 derived per-GT metric
  functional_class?: string;     // spec v0.2.30 functional classification key
  functional_basis_note?: string; // spec v0.2.30 basis note from the classification
}

// Quality flags for indicating estimates or fallbacks
export type QualityFlagType = 
  | 'estimated_nt'
  | 'missing_optional_param'
  | 'fallback_value'
  | 'conservative_estimate'
  | string;

export interface QualityFlag {
  type: QualityFlagType;
  description: string;
  severity: 'info' | 'warning' | 'error';
  parameter?: string; // spec v0.2.29 badge honesty: names the assumed parameter (e.g. engine_tier)
}

// Biller breakdown in results
export interface BillerBreakdown {
  biller: string;
  currency: Currency;
  fees: FeeResult[];
  subtotal: number;
}

// Vessel-access aggregate (spec v0.2.30): the sum of this call's amounts
// for all rules classified berth/terminal infrastructure, waterway/fairway
// access, or readiness/safety capacity — what the vessel pays to access and
// use the port, independent of cargo volume and purchased nautical services.
// The effective per-GT is the derived comparability bridge (the Swedish
// national fees are per-call by NT class, not per-GT).
export interface VesselAccessAggregate {
  amount: number;
  effective_per_gt: number;
  rule_ids: string[];       // exact composition, pinned by tests
  classes: string[];        // functional classes present in the composition
  basis_notes: string[];    // per-class basis notes (per-call vs per-GT)
}

// Complete cost calculation result
export interface CostCalculationResult {
  port_id: string;
  port_name: string;
  currency: Currency;
  date: string;
  vessel_summary: {
    gt: number;
    nt: number;
    loa_m?: number;
    estimated_nt?: boolean;
  };
  billers: BillerBreakdown[];
  total: number;
  total_estimated_parameters: number;
  total_without_estimates: number;
  quality_flags: QualityFlag[];
  vessel_access?: VesselAccessAggregate;
  // OPS speculative block (spec v0.2.57): present only when the call
  // carries at least one entered OPS component; absent (undefined) when
  // all inputs are blank so blank changes no total and renders nothing.
  ops_speculative?: OpsSpeculativeBlock;
  calculation_timestamp: string;
}

// Validation error types
export interface ValidationError {
  rule_id?: string;
  message: string;
  severity: 'error' | 'warning';
  path?: string;
}

export interface PortValidationResult {
  port_id: string;
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}
