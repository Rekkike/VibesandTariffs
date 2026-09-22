// Default form state (spec v0.2.28 default-call contract): the default call
// is the worst-case published-rate call. No environmental lever (ESI score,
// CSI class, fossil-free share, quantum volume) may reduce any figure unless
// the user explicitly enters it; a blank is "not entered" and is never
// coerced to a numeric score. Shared by the web form and pinned by
// core/test/environmental_defaults.test.ts.
import { CallInput, VesselInput } from './types';

export const DEFAULT_VESSEL: VesselInput = {
  gt: 55000,
  nt: 30250,
  loa_m: 290,
  beam_m: 32,
  draft_m: 12,
  teu_capacity: 4000
};

export function defaultCall(portId: string): CallInput {
  return {
    port_id: portId,
    date: new Date().toISOString().split('T')[0],
    containers_loaded_le20ft: 500,
    containers_loaded_gt20ft: 500,
    containers_discharged_le20ft: 500,
    containers_discharged_gt20ft: 500,
    calls_this_month: 1,
    flag_state: 'EU',
    vessel_type: 'container',
    // Blank = not entered (spec v0.2.28): never a seeded score, never coerced
    // to zero. Any environmental discount requires an explicit user entry.
    esi_score: undefined,
    // Default E (not registered): the least favourable Sjöfartsverket class and
    // the documented conservative default (Helsingborg reference §10.2; engine
    // fallback is also E). A user-set class overrides; this is a documented
    // default, not an accident — class A vs E swings the vessel fee by ~64,600
    // SEK for a mid-size vessel.
    csi_class: 'E',
    // Blank = not entered: the fossil-free discount needs an explicit >= 30%.
    fossil_free_fuel_percentage: undefined,
    ops_usage: false,
    lay_up_days: 0,
    storage_days_export: 5,
    storage_days_import: 3,
    reefer_units: 100,
    oog_units: 10,
    dangerous_goods_units: 20,
    hatch_cover_count: 0,
    gearbox_count: 0,
    pilotage_required: true,
    pilotage_hours: 4,
    pilotage_extra_pilot: false,
    pilotage_ordering_lead_time_hours: 2,
    // Hamburg parameters (spec v0.2.20). Lay time 16 h mid-range default
    // (50 h for ULCV); gangway one per call, class default overseas with the
    // feeder default applied from the vessel library for feeder-class ships;
    // pilotage full Elbe transit; estimated-parameter defaults seeded so the
    // estimate-flagged lines render with their default amounts.
    // Helsingborg parameters (spec v0.2.21). List-price defaults: valid ISSC,
    // EES at the September 2026 level, towage estimate with LOA-class tug
    // defaults applied by the engine when no tug count is supplied.
    ...(portId === 'helsingborg' ? {
      issc_valid: true,
      ees_rate_per_move: 35,
      towage_cost_per_tug: 60000,
      tug_count: undefined,
      clean_shipping_index_class: undefined
    } : {}),
    ...(portId === 'hamburg' ? {
      lay_time_hours: 16,
      // NOx Tier (spec v0.2.29): the default is the worst case (Tier 0),
      // flagged by the engine as an assumed parameter. The build-year
      // heuristic is never invoked silently - only via the explicit
      // infer_engine_tier_from_build_year user action.
      engine_tier: undefined,
      engine_tier_estimated: undefined,
      infer_engine_tier_from_build_year: false,
      gangway_class: 'overseas',
      gangway_count: 1,
      gangway_supervision_hours: 0,
      pilotage_segment_pct: 100,
      towage_amount: 15000,
      handling_rate_per_move: 358,
      hpa_berth_usage: false,
      berth_type: 'quay',
      berth_hours: 0,
      esi_noise_score: undefined,
      quantum_prior_year_gt: 0,
      waste_short_sea_reduction: false,
      waste_alternative_fuel_reduction: false,
      waste_sustainable_waste_reduction: false
    } : {})
  };
}
