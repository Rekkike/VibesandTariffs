// Per-vessel call profiles (spec v0.2.48 profile-seeding contract).
//
// A named preset or generic size class seeds a class-based call profile on
// selection: lay time at berth and total container moves, split into the four
// box counts. Every seeded value is an assumption — the UI flags it per the
// honesty contracts and a user entry always overrides without a flag.
//
// The generic formula: moves = class lay time x class-appropriate gross
// productivity, sanity-banded at 40-140 gross moves/hour so no seeded pair
// can imply an impossible productivity. A pair outside the band is never
// seeded (the profile functions return null) and the band is pinned by tests.
//
// The box-count split follows the European TEU ratio (~1.6 TEU per box, i.e.
// more 40s than 20s): 60 percent of moves are 40-foot boxes, 40 percent
// 20-foot, with loaded and discharged balanced (50/50).
import { CallInput } from './types';

export interface CallProfile {
  lay_time_hours: number;
  moves: number;
}

export interface BoxCounts {
  containers_loaded_le20ft: number;
  containers_loaded_gt20ft: number;
  containers_discharged_le20ft: number;
  containers_discharged_gt20ft: number;
}

export type SeededProfile = CallProfile & BoxCounts;

// Sanity band (spec v0.2.48): gross moves per hour implied by a seeded
// lay-time/moves pair must fall within [40, 140] — a pair outside the band
// implies an impossible productivity and is never seeded.
export const PROFILE_PRODUCTIVITY_BAND = { min: 40, max: 140 } as const;

// European TEU ratio ~1.6 TEU per box => 60 percent of moves are 40-foot
// boxes (2 TEU), 40 percent 20-foot (1 TEU): 0.6 x 2 + 0.4 x 1 = 1.6.
export const FORTY_FOOT_SHARE = 0.6;

export function profileIsSane(layTimeHours: number, moves: number): boolean {
  if (!Number.isFinite(layTimeHours) || layTimeHours <= 0) return false;
  if (!Number.isFinite(moves) || moves < 0) return false;
  const productivity = moves / layTimeHours;
  return (
    productivity >= PROFILE_PRODUCTIVITY_BAND.min &&
    productivity <= PROFILE_PRODUCTIVITY_BAND.max
  );
}

export function splitMoves(moves: number): BoxCounts {
  const perSide = Math.round(moves / 2);
  const forty = Math.round(perSide * FORTY_FOOT_SHARE);
  const twenty = perSide - forty;
  return {
    containers_loaded_le20ft: twenty,
    containers_loaded_gt20ft: forty,
    containers_discharged_le20ft: twenty,
    containers_discharged_gt20ft: forty
  };
}

// Named-vessel profiles (spec v0.2.48 reference table), keyed by IMO:
//   MAREN MAERSK  (IMO 9632129) - 50 h, ~4,000 moves (Triple-E, Asia-Europe)
//   MSC KYUNGMIN  (IMO 9967005) - 16 h, ~1,000 moves (feeder)
//   HELGAFELL     (IMO 9306017) -  8 h, ~350 moves (geared feeder, Iceland service)
//   VISTULA MAERSK (IMO 9775737) - 24 h, ~2,000 moves (Panamax, Baltic service)
// All four imply productivities inside the sanity band (80, 62.5, 43.75 and
// 83.3 gross moves/hour); Maren's equals the ultra-large class formula
// exactly (50 h x 80).
export const NAMED_VESSEL_PROFILES: Record<string, CallProfile> = {
  '9632129': { lay_time_hours: 50, moves: 4000 },
  '9967005': { lay_time_hours: 16, moves: 1000 },
  '9306017': { lay_time_hours: 8, moves: 350 },
  '9775737': { lay_time_hours: 24, moves: 2000 }
};

// Generic size-class profile inputs: class lay time and class-appropriate
// gross productivity (moves/hour). moves = lay time x productivity.
export const GENERIC_CLASS_PROFILE_INPUTS: Record<string, { lay_time_hours: number; productivity_per_hour: number }> = {
  feeder: { lay_time_hours: 8, productivity_per_hour: 45 },
  'feeder-max': { lay_time_hours: 12, productivity_per_hour: 50 },
  panamax: { lay_time_hours: 24, productivity_per_hour: 70 },
  'post-panamax': { lay_time_hours: 36, productivity_per_hour: 80 },
  'ultra-large': { lay_time_hours: 50, productivity_per_hour: 80 }
};

// Returns the named vessel's seeded profile, or null when the vessel has no
// profile or the pair fails the sanity band (never seed an impossible pair).
export function namedProfile(imo: string): SeededProfile | null {
  const profile = NAMED_VESSEL_PROFILES[imo];
  if (!profile || !profileIsSane(profile.lay_time_hours, profile.moves)) {
    return null;
  }
  return { ...profile, ...splitMoves(profile.moves) };
}

// Returns the generic size class's seeded profile (class lay time x
// class-appropriate productivity), or null when the class is unknown or the
// implied pair fails the sanity band.
export function genericProfile(classKey: string): SeededProfile | null {
  const input = GENERIC_CLASS_PROFILE_INPUTS[classKey];
  if (!input) return null;
  const moves = input.lay_time_hours * input.productivity_per_hour;
  if (!profileIsSane(input.lay_time_hours, moves)) return null;
  return { lay_time_hours: input.lay_time_hours, moves, ...splitMoves(moves) };
}

// The default vessel (spec v0.2.48 default-vessel contract): MAREN MAERSK.
export const DEFAULT_VESSEL_PROFILE_IMO = '9632129';

export function defaultProfile(): SeededProfile | null {
  return namedProfile(DEFAULT_VESSEL_PROFILE_IMO);
}

// The call fields a profile seeds (the assumption-flag set: a user edit of
// any of these clears that field's flag).
export const PROFILE_SEEDED_CALL_FIELDS: (keyof CallInput)[] = [
  'lay_time_hours',
  'containers_loaded_le20ft',
  'containers_loaded_gt20ft',
  'containers_discharged_le20ft',
  'containers_discharged_gt20ft'
];
