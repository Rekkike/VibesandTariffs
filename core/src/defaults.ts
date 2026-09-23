// Default form state (spec v0.2.28 default-call contract): the default call
// is the worst-case published-rate call. No environmental lever (ESI score,
// CSI class, fossil-free share, quantum volume) may reduce any figure unless
// the user explicitly enters it; a blank is "not entered" and is never
// coerced to a numeric score. Shared by the web form and pinned by
// core/test/environmental_defaults.test.ts.
import { CallInput, VesselInput } from './types';

import { defaultProfile } from './vessel_profiles';

// Default vessel (spec v0.2.48 default-vessel contract): MAREN MAERSK
// (IMO 9632129) — a fresh load prices her call until the user selects
// otherwise, so the default figures are a real, named, verified vessel
// rather than an abstract 55,000-GT particular set. The particulars mirror
// the library entry; the equality is pinned. Her profile (50 h, 4,000
// moves) seeds the default call the same way a selection would.
export const DEFAULT_VESSEL: VesselInput = {
  gt: 194849,
  nt: 70000,
  loa_m: 399,
  beam_m: 60,
  draft_m: 16,
  teu_capacity: 19076,
  built_year: 2014,
  name: 'MAREN MAERSK',
  imo: '9632129'
};

export function defaultCall(portId: string): CallInput {
  return {
    port_id: portId,
    date: new Date().toISOString().split('T')[0],
    // Profile values from Maren Maersk's seeded profile (spec v0.2.48):
    // 4,000 moves split 60/40 forty/twenty, loaded/discharged balanced.
    // All other levers keep the v0.2.28 worst-case no-discount defaults —
    // the profile changes the call's size, never its discount posture.
    containers_loaded_le20ft: defaultProfile()!.containers_loaded_le20ft,
    containers_loaded_gt20ft: defaultProfile()!.containers_loaded_gt20ft,
    containers_discharged_le20ft: defaultProfile()!.containers_discharged_le20ft,
    containers_discharged_gt20ft: defaultProfile()!.containers_discharged_gt20ft,
    // Lay time is a shared input (spec v0.2.47): the default vessel's
    // profile seeds it (50 h) — the HHLA tonnage dues and HPA demurrage
    // read it at Hamburg and the Swedish per-commenced-period rules fall
    // back to it.
    lay_time_hours: defaultProfile()!.lay_time_hours,
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
    // Special-cargo unit counts default blank (spec v0.2.33): a count that
    // drives charges is never seeded - the default vessel carries no reefer,
    // OOG, dangerous-goods, or overdue units, and a seeded count would
    // manufacture charges no user entered (the ESI-40 defect class). Blank
    // means "not entered" and charges zero; a user-entered zero is a value.
    reefer_units: undefined,
    oog_units: undefined,
    dangerous_goods_units: undefined,
    overdue_dangerous_units: undefined,
    hatch_cover_count: 0,
    gearbox_count: 0,
    pilotage_required: true,
    pilotage_hours: 4,
    pilotage_extra_pilot: false,
    pilotage_ordering_lead_time_hours: 2,
    // Gothenburg towage (spec v0.2.33): estimated parameter mirroring the
    // Helsingborg pattern — no published tariff, LOA-class tug defaults
    // applied by the engine when no tug count is supplied, estimate-flagged.
    ...(portId === 'gothenburg' ? {
      towage_cost_per_tug: 60000,
      tug_count: undefined
    } : {}),
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
      // NOx Tier (spec v0.2.29, amended v0.2.44): not entered by default;
      // the engine infers from the build year per Regulation 13 when one is
      // present (flagged), and applies the worst-case Tier 0 only when the
      // build year is blank too.
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
