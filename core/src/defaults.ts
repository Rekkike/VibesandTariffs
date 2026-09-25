// Default form state (spec v0.2.28 default-call contract): the default call
// is the worst-case published-rate call. No environmental lever (ESI score,
// CSI class, fossil-free share, quantum volume) may reduce any figure unless
// the user explicitly enters it; a blank is "not entered" and is never
// coerced to a numeric score. Shared by the web form and pinned by
// core/test/environmental_defaults.test.ts.
//
// Per-port default-call data (spec v0.2.59): the port-conditional blocks
// that used to live here as a hand-kept enumeration are data now - each
// port's YAML carries its default_call section and registers it through
// core/src/port_data.ts. The shared worst-case core below is the base
// object; the port's declared defaults overlay it (the same merge the
// comparison applies since v0.2.53). A port without a registered section
// fails loudly, never silently pricing without its list-price defaults.
import { CallInput, VesselInput } from './types';

import { defaultProfile } from './vessel_profiles';
import { portDefaultCall } from './port_data';

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
  // The per-port section is data (spec v0.2.59): unknown ports throw rather
  // than silently pricing without their list-price defaults.
  const portSection = portDefaultCall(portId);
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
    // Gothenburg same-route second-call attestation (spec v0.2.67): off by
    // default — the worst case; the §2.2 frequency discount requires the
    // explicit same-route import/export-pair attestation.
    got_same_route_second_call: false,
    flag_state: 'EU',
    // Godsavgift cargo-technical planning inputs (spec v0.2.61): shared,
    // currency-neutral, visible only where a godsavgift charges. The 14/24 t
    // defaults are suggested planning weights, never tariff data (OECD
    // 12-18 t/TEU band); the 0% low-value default is the 100% high-value
    // container-vessel posture per the SJÖFS commodity-code annex. They
    // behave like the profile's container counts: shared across ports,
    // never in any port's reset_fields.
    cargo_weight_per_20ft: 14,
    cargo_weight_per_40ft: 24,
    cargo_low_value_share: 0,
    // Arrival origin (spec v0.2.50): shared leg selector, default outside
    // Europe — the worst case for the Gothenburg waste dues and the realistic
    // Asia-arrival leg for the Maren Maersk default (direct Asia → Hamburg /
    // Gothenburg). The engine's fallback flag renders the scenario plainly.
    arrival_origin: 'outside-europe',
    // EU 2022/91 waste certificate: not held by default (worst case); an
    // explicit attestation discounts the solid-waste line by 0.05 SEK/GT.
    waste_certificate_2022_91: false,
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
    // Per-port declared defaults (spec v0.2.59): the port's data section
    // overlays the shared core - Gothenburg's estimated towage, Hamburg's
    // terminal-operator scope and gangway/pilotage/berth parameters,
    // Helsingborg's ISSC/EES list-price posture (and any future port's
    // own defaults, shipped with its authoring, no engine edit). The
    // shared worst-case posture above never changes; only a port's own
    // declared list-price defaults enter here.
    ...(portSection as Partial<CallInput>)
  };
}
