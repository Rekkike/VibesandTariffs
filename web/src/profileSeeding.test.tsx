// Per-vessel call-profile seeding tests (spec v0.2.48).
// Pins the profile-seeding contract's every normative sentence:
//   - named presets and generic size classes seed a class-based call
//     profile on selection (lay time + the four container counts, split
//     60/40 forty/twenty-foot with loaded/discharged balanced);
//   - every seeded value carries its assumption flag ("lay time assumed
//     from vessel class at Gothenburg-class productivity — adjust for
//     your actual call"), rendered adjacent as helper text;
//   - a user entry overrides the seed without a flag (the helper text
//     disappears and the parent is notified);
//   - the default vessel is Maren Maersk: the default call seeds her
//     profile and the header names her as the active selection;
//   - the productivity sanity band rejects an impossible pair (a
//     250-moves/hour pair never seeds);
//   - the comparison context strip reflects the seeded profile with the
//     honest assumption annotations.
// The workspace recomputes on a 500 ms debounce; the settle helper waits
// it out before reading rendered results.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { PortWorkspace, ComparisonView } from './App';
import portsRegistry from './data/ports.json';
import {
  DEFAULT_VESSEL,
  defaultCall,
  namedProfile,
  genericProfile,
  profileIsSane,
  NAMED_VESSEL_PROFILES,
  PROFILE_SEEDED_CALL_FIELDS,
  DEFAULT_VESSEL_PROFILE_IMO,
  type VesselInput,
  type CallInput,
  type PortDefinition
} from '@port-cost/core';
import { readDecomposedAppSource } from './appSource';

const appSource = readDecomposedAppSource();
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('profile-seeding contract — source-level pins (spec v0.2.48)', () => {
  it('the default vessel is Maren Maersk and the default call seeds her profile', () => {
    // The default is explicitly set to Maren Maersk (the audit's choice:
    // explicit beats implicit equivalence — one named source of truth).
    expect(DEFAULT_VESSEL.name).toBe('MAREN MAERSK');
    expect(DEFAULT_VESSEL.imo).toBe('9632129');
    expect(DEFAULT_VESSEL.gt).toBe(194849);
    expect(DEFAULT_VESSEL.built_year).toBe(2014);
    expect(DEFAULT_VESSEL_PROFILE_IMO).toBe('9632129');
    // the default call carries her profile: 50 h, 4,000 moves split
    // 800/1200/800/1200 (60% forty-foot per side, balanced)
    const call = defaultCall('hamburg');
    expect(call.lay_time_hours).toBe(50);
    expect(call.containers_loaded_le20ft).toBe(800);
    expect(call.containers_loaded_gt20ft).toBe(1200);
    expect(call.containers_discharged_le20ft).toBe(800);
    expect(call.containers_discharged_gt20ft).toBe(1200);
    // all three ports seed the same shared profile
    for (const id of ['gothenburg', 'hamburg', 'helsingborg']) {
      const c = defaultCall(id);
      expect(c.lay_time_hours).toBe(50);
      expect(c.containers_loaded_gt20ft).toBe(1200);
    }
  });

  it('the App initializes the default-vessel header label and the seeded assumption flags', () => {
    // the header names Maren Maersk as the active selection on fresh load
    expect(appSource).toMatch(/MAREN MAERSK \(IMO \$\{DEFAULT_VESSEL_PROFILE_IMO\}\)/);
    // the seeded fields start flagged as assumptions
    expect(appSource).toMatch(/useState<string\[\]>\(\[\s*\.\.\.PROFILE_SEEDED_CALL_FIELDS as string\[\]\s*\]\);/);
    // the App passes the assumption state to both views
    expect(appSource).toMatch(/onAssumedCallFieldsChange=\{setAssumedCallFields\}/);
  });

  it('the profile-seeding helper text renders adjacent (profile-assumption-helper class)', () => {
    // The assumption sentences per the honesty contracts, rendered via
    // FormHelperText adjacent to the seeded inputs.
    expect(appSource).toContain('lay time assumed from vessel class at Gothenburg-class productivity — adjust for your actual call');
    expect(appSource).toContain('moves assumed from vessel class (loaded share) — adjust for your actual call');
    expect(appSource).toContain('moves assumed from vessel class (discharged share) — adjust for your actual call');
    expect(appSource).toMatch(/className: 'profile-assumption-helper'/);
    expect(cssSource).toMatch(/\.profile-assumption-helper\s*\{/);
  });

  it('a seeded field edit clears that field\'s assumption flag and notifies the parent', () => {
    // handleCallChange routes through clearAssumedField for the seeded
    // fields, so a user entry overrides without a flag; the parent state
    // is kept in sync via the callback.
    expect(appSource).toMatch(/PROFILE_SEEDED_CALL_FIELDS as string\[\]\)\.includes\(field as string\)/);
    expect(appSource).toMatch(/const clearAssumedField = \(field: keyof CallInput\) => \{/);
  });

  it('named selections seed their profile; generic selections seed the class formula', () => {
    expect(appSource).toMatch(/seedProfile\(namedProfile\(selected\.imo\)\)/);
    expect(appSource).toMatch(/seedProfile\(genericProfile\(preset\)\)/);
  });

  it('the sanity band rejects an impossible pair before seeding (250 moves/hour never seeds)', () => {
    // The 250-moves/hour pair (4 h, 1,000 moves) is outside the band and
    // is never seeded — the band is checked inside the seeding path.
    expect(profileIsSane(4, 1000)).toBe(false);
    expect(appSource).toMatch(/const seedProfile = \(profile: SeededProfile \| null\) => \{/);
    expect(appSource).toMatch(/if \(!profile\) return;/);
  });
});

describe('named profile table (spec v0.2.48 reference values)', () => {
  it('Maren Maersk (IMO 9632129): 50 h, ~4,000 moves', () => {
    expect(NAMED_VESSEL_PROFILES['9632129']).toEqual({ lay_time_hours: 50, moves: 4000 });
  });
  it('MSC Kyungmin (IMO 9967005): 16 h, ~1,000 moves', () => {
    expect(NAMED_VESSEL_PROFILES['9967005']).toEqual({ lay_time_hours: 16, moves: 1000 });
  });
  it('Helgafell (IMO 9306017): 8 h, ~350 moves', () => {
    expect(NAMED_VESSEL_PROFILES['9306017']).toEqual({ lay_time_hours: 8, moves: 350 });
  });
  it('the split: 60% forty-foot per side, loaded/discharged balanced (800/1200/800/1200 at 4,000)', () => {
    const maren = namedProfile('9632129')!;
    expect(maren.containers_loaded_le20ft).toBe(800);
    expect(maren.containers_loaded_gt20ft).toBe(1200);
    expect(maren.containers_discharged_le20ft).toBe(800);
    expect(maren.containers_discharged_gt20ft).toBe(1200);
    expect(maren.moves).toBe(maren.containers_loaded_le20ft + maren.containers_loaded_gt20ft
      + maren.containers_discharged_le20ft + maren.containers_discharged_gt20ft);
  });
  it('generic classes follow the same formula: feeder 8 h × 45 = 360; panamax 24 h × 70 = 1,680; ultra-large 50 h × 80 = 4,000', () => {
    expect(genericProfile('feeder')).toMatchObject({ lay_time_hours: 8, moves: 360 });
    expect(genericProfile('panamax')).toMatchObject({ lay_time_hours: 24, moves: 1680 });
    expect(genericProfile('ultra-large')).toMatchObject({ lay_time_hours: 50, moves: 4000 });
  });
});

describe('workspace render: selection seeds the profile with flags (spec v0.2.48)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  let currentVessel: VesselInput;
  let currentCall: CallInput;
  let assumedCallFields: string[];

  const rerender = async (vessel: VesselInput, call: CallInput, assumed: string[]) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={vessel}
          call={call}
          onVesselChange={(v) => { currentVessel = v; }}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
          assumedCallFields={assumed}
          onAssumedCallFieldsChange={(fields) => { assumedCallFields = fields; }}
        />
      );
    });
  };

  const settle = async () => {
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
  };

  const selectOption = async (match: (label: string) => boolean) => {
    const input = container!.querySelector('.vessel-select input') as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const target = options.find(o => match(o.textContent ?? ''));
    expect(target).toBeDefined();
    await act(async () => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentVessel = { ...DEFAULT_VESSEL };
    currentCall = { ...defaultCall('hamburg') };
    assumedCallFields = [];
  });

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('selecting MSC Kyungmin seeds her profile (16 h, 70/210 splits) and flags the seeded fields', async () => {
    await rerender(currentVessel, currentCall, assumedCallFields);
    await selectOption(label => label.includes('MSC KYUNGMIN'));
    // 1,000 moves: 500/side, 60% forty-foot = 300... per splitMoves:
    // perSide = 500, forty = 300, twenty = 200
    expect(currentCall.lay_time_hours).toBe(16);
    expect(currentCall.containers_loaded_le20ft).toBe(200);
    expect(currentCall.containers_loaded_gt20ft).toBe(300);
    expect(currentCall.containers_discharged_le20ft).toBe(200);
    expect(currentCall.containers_discharged_gt20ft).toBe(300);
    // the assumption flags are all set and reported to the parent
    expect(assumedCallFields).toEqual([...PROFILE_SEEDED_CALL_FIELDS]);
  });

  it('selecting Helgafell seeds her profile (8 h, 70/105 splits)', async () => {
    await rerender(currentVessel, currentCall, assumedCallFields);
    await selectOption(label => label.includes('HELGAFELL'));
    // 350 moves: perSide = 175 (Math.round(350/2)), forty = 105, twenty = 70
    expect(currentCall.lay_time_hours).toBe(8);
    expect(currentCall.containers_loaded_le20ft).toBe(70);
    expect(currentCall.containers_loaded_gt20ft).toBe(105);
    expect(currentCall.containers_discharged_le20ft).toBe(70);
    expect(currentCall.containers_discharged_gt20ft).toBe(105);
  });

  it('selecting Maren Maersk seeds her profile (50 h, 800/1200 splits)', async () => {
    await rerender(currentVessel, currentCall, assumedCallFields);
    // start from a non-Maren state so the seed is observable
    currentCall = { ...currentCall, lay_time_hours: 12, containers_loaded_le20ft: 10,
      containers_loaded_gt20ft: 10, containers_discharged_le20ft: 10, containers_discharged_gt20ft: 10 };
    await rerender(currentVessel, currentCall, assumedCallFields);
    await selectOption(label => label.includes('MAREN MAERSK'));
    expect(currentCall.lay_time_hours).toBe(50);
    expect(currentCall.containers_loaded_gt20ft).toBe(1200);
    expect(currentCall.containers_loaded_le20ft).toBe(800);
  });

  it('selecting a generic size class seeds the class formula profile (feeder: 8 h, 360 moves)', async () => {
    await rerender(currentVessel, currentCall, assumedCallFields);
    await selectOption(label => label.includes('Generic feeder'));
    // 360 moves: perSide = 180, forty = 108, twenty = 72
    expect(currentCall.lay_time_hours).toBe(8);
    expect(currentCall.containers_loaded_le20ft).toBe(72);
    expect(currentCall.containers_loaded_gt20ft).toBe(108);
    expect(currentCall.containers_discharged_le20ft).toBe(72);
    expect(currentCall.containers_discharged_gt20ft).toBe(108);
    expect(assumedCallFields).toEqual([...PROFILE_SEEDED_CALL_FIELDS]);
  });

  it('selecting a generic size class seeds the class formula profile (panamax: 24 h, 1,680 moves)', async () => {
    await rerender(currentVessel, currentCall, assumedCallFields);
    await selectOption(label => label.includes('Generic Panamax'));
    // 1,680 moves: perSide = 840, forty = 504, twenty = 336
    expect(currentCall.lay_time_hours).toBe(24);
    expect(currentCall.containers_loaded_le20ft).toBe(336);
    expect(currentCall.containers_loaded_gt20ft).toBe(504);
  });

  it('the seeded fields render their assumption helper text; a user edit clears the flag without re-seeding', async () => {
    // seeded state: all profile fields flagged
    const seededAssumed = [...PROFILE_SEEDED_CALL_FIELDS];
    await rerender(currentVessel, currentCall, seededAssumed);
    await settle();
    const text = container!.textContent ?? '';
    expect(text).toContain('lay time assumed from vessel class at Gothenburg-class productivity');
    expect(text).toContain('moves assumed from vessel class (loaded share)');
    // the helper renders adjacent to the flagged inputs
    expect(container!.querySelectorAll('.profile-assumption-helper').length).toBeGreaterThan(0);
    // user override: edit the lay time; the flag clears, no new flags
    const layInput = container!.querySelector('.lay-time-input input') as HTMLInputElement;
    expect(layInput).not.toBeNull();
    await act(async () => { setInputValue(layInput, '30'); });
    expect(currentCall.lay_time_hours).toBe(30);
    // only lay_time_hours cleared from the parent's flag set
    expect(assumedCallFields).toEqual(
      seededAssumed.filter(f => f !== 'lay_time_hours')
    );
    await rerender(currentVessel, currentCall, assumedCallFields);
    await settle();
    const afterText = container!.textContent ?? '';
    expect(afterText).not.toContain('lay time assumed from vessel class');
    // the box-count flags remain until their own fields are edited
    expect(afterText).toContain('moves assumed from vessel class (loaded share)');
  });
});

describe('comparison context strip: seeded profile with honest flags (spec v0.2.48)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the strip reflects the seeded profile (50 h, 4,000 moves) with the assumption annotations', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const call = { ...defaultCall('gothenburg') };
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={[GOTHENBURG, HAMBURG]}
          vessel={{ ...DEFAULT_VESSEL }}
          call={call}
          selectedPortIds={['gothenburg', 'hamburg']}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          assumedCallFields={[...PROFILE_SEEDED_CALL_FIELDS]}
        />
      );
    });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    const text = container!.textContent ?? '';
    expect(text).toContain('MAREN MAERSK (IMO 9632129)');
    expect(text).toContain('194,849');
    expect(text).toContain('4,000 (loaded + discharged)');
    expect(text).toContain('50 h at berth');
    // honest flags, stated once in the strip
    expect(text).toContain('(assumed from vessel class at Gothenburg-class productivity — adjust for your actual call)');
    expect(text).toContain('(assumed from vessel class — adjust for your actual call)');
  });

  it('without seeded flags the strip states the values without assumption annotations', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const call = { ...defaultCall('gothenburg') };
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={[GOTHENBURG, HAMBURG]}
          vessel={{ ...DEFAULT_VESSEL }}
          call={call}
          selectedPortIds={['gothenburg', 'hamburg']}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
          assumedCallFields={[]}
        />
      );
    });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    const text = container!.textContent ?? '';
    expect(text).not.toContain('(assumed from vessel class');
  });
});

describe('default-call figures at all three ports (spec v0.2.48, deliberate contract change; Gothenburg re-pinned v0.2.50)', () => {
  it('the new default call (Maren Maersk) prices to the pinned Grand Totals', () => {
    for (const p of [GOTHENBURG, HAMBURG]) {
      const result = require('@port-cost/core').calculatePortCallCost(
        p,
        { vessel: { ...DEFAULT_VESSEL }, call: { ...defaultCall(p.metadata.id) } }
      );
      const total = result.total;
      if (p.metadata.id === 'gothenburg') {
        // v0.2.50 defect-fix re-pin: the waste dues now price the arrival
        // origin (default outside Europe) instead of the flag (old default
        // EU): sludge 0.31 vs 0.21 and solid 0.24 vs 0.13 on 194,849 GT
        // = +40,918.29 → 3,007,051.15.
        // v0.2.61 drift re-pin (godsavgift promotion, expected per the
        // directive): the Swedish national cargo-based fairway due adds
        // 268,800.00 (80,000 t × 3.36 kr/t) → 3,275,851.15.
        expect(total).toBeCloseTo(3275851.15, 2);
      } else {
        // v0.2.66 promotion re-baseline: 2,313,489.31 -> 2,204,910.90
        // (the Eurogate terminal layer; §17.5).
        expect(total).toBeCloseTo(2204910.9, 2);
      }
    }
  });

  it('the default call keeps the worst-case no-discount posture at every port', () => {
    for (const p of LOADED_PORTS) {
      const result = require('@port-cost/core').calculatePortCallCost(
        p,
        { vessel: { ...DEFAULT_VESSEL }, call: { ...defaultCall(p.metadata.id) } }
      );
      const qualityText = JSON.stringify(result.quality_flags ?? []);
      const discounted = (result.billers ?? []).some((b: any) =>
        (b.fees ?? []).some((f: any) => (f.discounts ?? []).length > 0)
      );
      expect(discounted).toBe(false);
      expect(qualityText).not.toMatch(/discount/i);
    }
  });
});
