import type { VesselInput } from '@port-cost/core';
import vesselLibrary from './data/vessel_library.json';

// Vessel-selection options (spec v0.2.60 decomposition, audit item B):
// the library registry, the generic size-class presets and labels, the
// combobox option union and helpers - extracted from App.tsx verbatim.
// Vessel library entries (name, imo, particulars, source_note provenance)
export interface LibraryVessel {
  name: string;
  imo: string;
  vessel_type: string;
  flag: string;
  built: number;
  gt: number;
  nt: number;
  loa_m: number;
  beam_m: number;
  draught_m: number;
  teu_capacity: number;
  class_note: string;
  engine_tier?: string;
  estimated_fields?: string[];
  source_note: string;
}
export const LOADED_VESSELS: LibraryVessel[] = (vesselLibrary as any).vessels ?? [];

// Vessel presets
export const VESSEL_PRESETS = {
  feeder: { gt: 8000, nt: 4400, loa_m: 150, beam_m: 25, draft_m: 8, teu_capacity: 800 },
  'feeder-max': { gt: 15000, nt: 8250, loa_m: 180, beam_m: 30, draft_m: 10, teu_capacity: 1200 },
  panamax: { gt: 55000, nt: 30250, loa_m: 290, beam_m: 32, draft_m: 12, teu_capacity: 4000 },
  'post-panamax': { gt: 100000, nt: 55000, loa_m: 340, beam_m: 45, draft_m: 14, teu_capacity: 8000 },
  'ultra-large': { gt: 215000, nt: 118250, loa_m: 400, beam_m: 60, draft_m: 16, teu_capacity: 20000 }
};

// Generic size-class display names for the combobox (spec v0.2.47): the
// preset keys are internal; the entries render as vessel entries with
// their approx. GT. One source of truth — derived from VESSEL_PRESETS, so
// a preset edit changes the combobox with it.
export const GENERIC_SIZE_CLASS_LABELS: Record<keyof typeof VESSEL_PRESETS, string> = {
  feeder: 'Generic feeder — approx. 8,000 GT',
  'feeder-max': 'Generic feeder max — approx. 15,000 GT',
  panamax: 'Generic Panamax — approx. 55,000 GT',
  'post-panamax': 'Generic Post-Panamax — approx. 100,000 GT',
  'ultra-large': 'Generic ultra-large — approx. 215,000 GT'
};

// Vessel-selection combobox (spec v0.2.47): one searchable control holding,
// in order: named library presets, generic size-class entries, and the
// "Custom vessel" entry. Typing filters across all three tiers.
export type VesselOption =
  | { kind: 'library'; vessel: LibraryVessel }
  | { kind: 'generic'; presetKey: keyof typeof VESSEL_PRESETS }
  | { kind: 'custom' };

export const CUSTOM_VESSEL_OPTION: VesselOption = { kind: 'custom' };

export const vesselOptionId = (option: VesselOption): string =>
  option.kind === 'library' ? `library:${option.vessel.imo}`
    : option.kind === 'generic' ? `generic:${option.presetKey}`
    : 'custom';

export const vesselOptionLabel = (option: VesselOption): string =>
  option.kind === 'library' ? `${option.vessel.name} (IMO ${option.vessel.imo})`
    : option.kind === 'generic' ? GENERIC_SIZE_CLASS_LABELS[option.presetKey]
    : 'Custom vessel — enter particulars below';

// Searchable-combobox option list (spec v0.2.47): library vessels first,
// generic size classes beneath them, Custom vessel last. Filtering is the
// Autocomplete's own case-insensitive substring match over these labels.
export const vesselOptions = (): VesselOption[] => [
  ...LOADED_VESSELS.map((v): VesselOption => ({ kind: 'library', vessel: v })),
  ...(Object.keys(VESSEL_PRESETS) as (keyof typeof VESSEL_PRESETS)[])
    .map((presetKey): VesselOption => ({ kind: 'generic', presetKey })),
  CUSTOM_VESSEL_OPTION
];

// The active vessel name for the app header (spec v0.2.47 active-vessel
// contract): the last selection's display name — a library vessel's name,
// a generic class name, or a custom label naming the entered GT. The
// workspace owns the selection; the header reads it via a callback.
// Custom-vessel naming follows the spec's "Custom vessel — 55,000 GT"
// pattern, updated live with the entered particulars.
export const customVesselLabel = (vessel: VesselInput): string =>
  `Custom vessel — ${new Intl.NumberFormat('en-US').format(Math.round(vessel.gt))} GT`;
