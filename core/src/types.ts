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

// Rate structure types
export type RateStructureType = 
  | 'flat'
  | 'banded'
  | 'progressive'
  | 'per_commenced_day'
  | 'per_unit'
  | 'banded_by_time';

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

export type RateStructure = 
  | FlatRate
  | BandedRate
  | ProgressiveRate
  | PerCommencedDayRate
  | PerUnitRate
  | BandedByTimeRate;

// Discount/Surcharge types
export type AdjustmentType = 'discount' | 'surcharge';

export interface Adjustment {
  type: AdjustmentType;
  percentage: number; // percentage to apply (e.g., 10 for 10%)
  condition?: string; // condition for applying this adjustment
  stacking_order?: number; // custom stacking order
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
}

// Biller definition
export interface Biller {
  id: string;
  name: string;
  description?: string;
  currency: Currency;
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
}

// Call input model
export interface CallInput {
  port_id: string;
  date: string; // ISO date
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
