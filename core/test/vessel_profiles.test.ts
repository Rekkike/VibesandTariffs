// Per-vessel profile-seeding contract (spec v0.2.48).
//
// Pins:
// - the reference particulars of every library entry against the verified
//   registry values (build years especially — the tier inference depends
//   on them);
// - the named-vessel profiles and their exact box-count splits;
// - the generic-class profile formula (class lay time × productivity) and
//   the 60/40 forty/twenty split, loaded/discharged balanced;
// - the productivity sanity band: a pair implying an impossible productivity
//   (e.g. 250 moves/hour) is never seeded;
// - the default vessel (Maren Maersk): DEFAULT_VESSEL equals the library
//   particulars and the default call seeds her profile;
// - the tier inference at the seeded build years (Maren 2014 → Tier II,
//   Kyungmin 2024 → Tier III, Helgafell 2005 → Tier I) — inference, never
//   a hand-set tier.
import { readFileSync } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { calculatePortCallCost, inferEngineTier } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import {
  DEFAULT_VESSEL,
  defaultCall
} from '../src/defaults';
import {
  NAMED_VESSEL_PROFILES,
  GENERIC_CLASS_PROFILE_INPUTS,
  PROFILE_PRODUCTIVITY_BAND,
  namedProfile,
  genericProfile,
  profileIsSane,
  defaultProfile,
  splitMoves,
  FORTY_FOOT_SHARE,
  DEFAULT_VESSEL_PROFILE_IMO
} from '../src/vessel_profiles';

interface LibraryVessel {
  name: string; imo: string; built: number; gt: number; nt: number;
  loa_m: number; beam_m: number; draught_m: number; teu_capacity: number;
}

describe('Vessel library reference particulars (spec v0.2.48 data audit)', () => {
  let vessels: LibraryVessel[];
  beforeAll(() => {
    const data = yaml.load(readFileSync(path.join(__dirname, '..', 'data', 'vessel_library.yaml'), 'utf8')) as { vessels: LibraryVessel[] };
    vessels = data.vessels;
  });
  const byName = (name: string) => vessels.find(v => v.name === name)!;

  it('MAREN MAERSK matches the verified reference: built 2014, 194,849 GT, 19,076 TEU, LOA 399 m', () => {
    const m = byName('MAREN MAERSK');
    expect(m.imo).toBe('9632129');
    expect(m.built).toBe(2014);
    expect(m.gt).toBe(194849);
    expect(m.teu_capacity).toBe(19076);
    expect(m.loa_m).toBe(399);
  });
  it('MSC KYUNGMIN: built 2024, LOA 171.92 m, beam 28.4 m; GT/TEU are tracker estimates with the basis stated', () => {
    const k = byName('MSC KYUNGMIN');
    expect(k.imo).toBe('9967005');
    expect(k.built).toBe(2024);
    expect(k.loa_m).toBe(171.92);
    expect(k.beam_m).toBe(28.4);
    expect(k.gt).toBe(21979);
    expect(k.teu_capacity).toBe(2400);
  });
  it('HELGAFELL matches the reference: built 2005, 8,890 GT, 909 TEU, LOA 137.5 m, geared feeder', () => {
    const h = byName('HELGAFELL');
    expect(h.imo).toBe('9306017');
    expect(h.built).toBe(2005);
    expect(h.gt).toBe(8890);
    expect(h.teu_capacity).toBe(909);
    expect(h.loa_m).toBe(137.5);
  });
  it('every build year is present (the tier inference depends on it)', () => {
    for (const v of vessels) {
      expect(typeof v.built).toBe('number');
      expect(v.built).toBeGreaterThan(1950);
      expect(v.built).toBeLessThanOrEqual(new Date().getFullYear());
    }
  });
});

describe('Tier inference at the seeded build years (v0.2.44 contract; never hand-set)', () => {
  it('Maren Maersk 2014 → Tier II; MSC Kyungmin 2024 → Tier III; Helgafell 2005 → Tier I', () => {
    expect(inferEngineTier(2014)).toBe('Tier II');
    expect(inferEngineTier(2024)).toBe('Tier III');
    expect(inferEngineTier(2005)).toBe('Tier I');
  });
  it('the default call applies the inferred Tier II and raises the inference flag', () => {
    const { port } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'hamburg_2026.yaml'));
    const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall('hamburg') });
    const flag = result.quality_flags.find(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier');
    expect(flag!.description).toContain('Tier II');
    expect(flag!.description).toContain('build year 2014');
    const explicit = calculatePortCallCost(port, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), engine_tier: 'Tier II', engine_tier_estimated: false }
    });
    // The inferred tier applies exactly as an entered tier would (v0.2.44).
    expect(result.total).toBe(explicit.total);
  });
});

describe('Profile table (spec v0.2.48)', () => {
  it('named profiles: Maren 50 h / 4,000 moves; Kyungmin 16 h / 1,000; Helgafell 8 h / 350; Vistula 24 h / 2,000', () => {
    expect(NAMED_VESSEL_PROFILES['9632129']).toEqual({ lay_time_hours: 50, moves: 4000 });
    expect(NAMED_VESSEL_PROFILES['9967005']).toEqual({ lay_time_hours: 16, moves: 1000 });
    expect(NAMED_VESSEL_PROFILES['9306017']).toEqual({ lay_time_hours: 8, moves: 350 });
    expect(NAMED_VESSEL_PROFILES['9775737']).toEqual({ lay_time_hours: 24, moves: 2000 });
  });
  it('every named profile sits inside the productivity sanity band', () => {
    for (const p of Object.values(NAMED_VESSEL_PROFILES)) {
      expect(profileIsSane(p.lay_time_hours, p.moves)).toBe(true);
    }
  });
  it('the box-count split follows the European TEU ratio: 60% 40-foot, loaded/discharged balanced', () => {
    expect(FORTY_FOOT_SHARE).toBe(0.6);
    // 4,000 moves → 2,000 per side → 1,200 forty + 800 twenty per side.
    expect(splitMoves(4000)).toEqual({
      containers_loaded_le20ft: 800,
      containers_loaded_gt20ft: 1200,
      containers_discharged_le20ft: 800,
      containers_discharged_gt20ft: 1200
    });
    // 350 moves → 175 per side → 105 forty + 70 twenty.
    expect(splitMoves(350)).toEqual({
      containers_loaded_le20ft: 70,
      containers_loaded_gt20ft: 105,
      containers_discharged_le20ft: 70,
      containers_discharged_gt20ft: 105
    });
  });
  it('generic classes seed by the formula: class lay time × class productivity, all inside the band', () => {
    expect(GENERIC_CLASS_PROFILE_INPUTS).toEqual({
      feeder: { lay_time_hours: 8, productivity_per_hour: 45 },
      'feeder-max': { lay_time_hours: 12, productivity_per_hour: 50 },
      panamax: { lay_time_hours: 24, productivity_per_hour: 70 },
      'post-panamax': { lay_time_hours: 36, productivity_per_hour: 80 },
      'ultra-large': { lay_time_hours: 50, productivity_per_hour: 80 }
    });
    expect(genericProfile('feeder')).toMatchObject({ lay_time_hours: 8, moves: 360 });
    expect(genericProfile('panamax')).toMatchObject({ lay_time_hours: 24, moves: 1680 });
    expect(genericProfile('ultra-large')).toMatchObject({ lay_time_hours: 50, moves: 4000 });
  });
  it('the productivity sanity band rejects an impossible pair: 250 moves/hour never seeds', () => {
    expect(PROFILE_PRODUCTIVITY_BAND).toEqual({ min: 40, max: 140 });
    // A pair implying 250 gross moves/hour is outside the band.
    expect(profileIsSane(4, 1000)).toBe(false);
    // The band boundaries themselves seed.
    expect(profileIsSane(1, 40)).toBe(true);
    expect(profileIsSane(1, 140)).toBe(true);
    expect(profileIsSane(1, 141)).toBe(false);
    expect(profileIsSane(1, 39)).toBe(false);
    // unknown classes and missing profiles return null, never a pair
    expect(genericProfile('unknown-class')).toBeNull();
    expect(namedProfile('0000000')).toBeNull();
  });
});

describe('Default vessel = Maren Maersk (spec v0.2.48 default-vessel contract)', () => {
  it('DEFAULT_VESSEL equals the library entry particulars', () => {
    const data = yaml.load(readFileSync(path.join(__dirname, '..', 'data', 'vessel_library.yaml'), 'utf8')) as { vessels: LibraryVessel[] };
    const maren = data.vessels.find(v => v.name === 'MAREN MAERSK')!;
    expect(DEFAULT_VESSEL.gt).toBe(maren.gt);
    expect(DEFAULT_VESSEL.nt).toBe(maren.nt);
    expect(DEFAULT_VESSEL.loa_m).toBe(maren.loa_m);
    expect(DEFAULT_VESSEL.beam_m).toBe(maren.beam_m);
    expect(DEFAULT_VESSEL.draft_m).toBe(maren.draught_m);
    expect(DEFAULT_VESSEL.teu_capacity).toBe(maren.teu_capacity);
    expect(DEFAULT_VESSEL.built_year).toBe(maren.built);
    expect(DEFAULT_VESSEL.name).toBe('MAREN MAERSK');
    expect(DEFAULT_VESSEL.imo).toBe(DEFAULT_VESSEL_PROFILE_IMO);
  });
  it('the default call seeds her profile: 50 h lay time and the 4,000-move split at every port', () => {
    const profile = defaultProfile()!;
    expect(profile.lay_time_hours).toBe(50);
    expect(profile.moves).toBe(4000);
    for (const id of ['gothenburg', 'hamburg', 'helsingborg']) {
      const call = defaultCall(id);
      expect(call.lay_time_hours).toBe(50);
      expect(call.containers_loaded_le20ft).toBe(800);
      expect(call.containers_loaded_gt20ft).toBe(1200);
      expect(call.containers_discharged_le20ft).toBe(800);
      expect(call.containers_discharged_gt20ft).toBe(1200);
    }
  });
  it('the default call keeps the worst-case discount posture: no environmental discount at any port (v0.2.28 stands)', () => {
    for (const id of ['gothenburg', 'hamburg', 'helsingborg']) {
      const { port } = loadAndValidatePort(path.join(__dirname, '..', 'data', `${id}_2026.yaml`));
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      const discounts = result.billers
        .flatMap(b => b.fees)
        .flatMap(f => f.adjustments_applied ?? [])
        .filter((a: any) => a.type === 'discount');
      expect(discounts).toEqual([]);
      expect(result.total).toBeGreaterThan(0);
    }
  });
});
