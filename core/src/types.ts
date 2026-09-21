// Core types for Port Call Cost Analyzer

export type Currency = 'SEK' | 'EUR' | 'USD' | string;

// Source reference - MUST be complete for every fee rule
export interface SourceReference {
  document_name: string;
  document_url: string;
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
  percentage: number; // percentage to apply (e.g., 10 for 10%)
  condition?: string; // condition for applying this adjustment
  stacking_order?: number; // custom stacking order
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

// Complete port definition
export interface PortDefinition {
  metadata: PortMetadata;
  billers: Biller[];
  fee_rules: FeeRule[];
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
  flag_state: 'EU' | 'non-EU' | string;
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
  pilotage_required: boolean;
  pilotage_hours?: number;
  pilotage_extra_pilot?: boolean;
  pilotage_ordering_lead_time_hours?: number; // lead time for ordering fee
  hatch_cover_count?: number; // number of hatch covers handled
  gearbox_count?: number; // number of gearbox units handled
  // OPS inputs (energy-at-berth)
  ops_kwh_demand?: number; // kWh demand
  ops_connected_hours?: number; // connected hours
  ops_electricity_price_per_kwh?: number; // SEK/kWh (user-supplied, no published rate for containers)
  ops_peak_demand_kw?: number; // registered peak demand in kW
  // Hamburg call inputs
  engine_tier?: 'Tier 0' | 'Tier I' | 'Tier II' | 'Tier III' | string; // certified IAPP tier (most polluting engine)
  engine_tier_estimated?: boolean; // true when derived by heuristic rather than certified
  esi_noise_score?: number;        // ESI noise score (esi_score is the ESI air score)
  quantum_prior_year_gt?: number; // prior calendar year accumulated paid GT (HPA quantum discount)
  lay_time_hours?: number;        // HHLA tonnage-dues lay time basis (hours)
  port_time_hours?: number;        // total time in port (HPA demurrage basis); falls back to lay_time_hours
  hpa_berth_usage?: boolean;      // vessel at an HPA-operated berth (not a terminal berth)
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
  // Helsingborg call inputs (spec v0.2.21)
  issc_valid?: boolean;              // valid ISSC certificate; double security fee when absent (least-favourable default)
  clean_shipping_index_class?: string; // Clean Shipping Index class 1-5 (port discount; distinct from Sjöfartsverket A-E)
  towage_cost_per_tug?: number;      // estimated towage SEK per tug-assist (Helsingborg)
  sludge_extra_m3?: number;         // sludge above the 10 m3 included volume
  idle_berth_hours?: number;        // APM idle berth service hours (explicit request only)
  fresh_water_m3?: number;          // fresh water supplied (m3); free up to 50 m3, then 50 SEK/m3
  scrubber_waste?: boolean;         // scrubber waste delivered (800 SEK admin; disposal billed at cost)
  break_bulk_1000kg?: number;       // break bulk tonnage (1,000 kg units) at 54 SEK/unit
}

// Full input for cost calculation
export interface CostCalculationInput {
  vessel: VesselInput;
  call: CallInput;
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
}

// Biller breakdown in results
export interface BillerBreakdown {
  biller: string;
  currency: Currency;
  fees: FeeResult[];
  subtotal: number;
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
