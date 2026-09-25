// Port-generalization pins (spec v0.2.59, refactor pass 1).
//
// The four silent-failure sites are data now: the per-port default call
// (default_call section), the OPS component descriptor (ops_speculative
// section), the input profile (input_profile section) - each port ships
// its configuration with its YAML authoring, and every lookup fails loudly.
//
// Pins:
//  - data-driven defaults: each real port's YAML section produces its
//    default call through the registered data, byte-equivalent to the
//    code-authored enumeration it replaces (the zero-drift baselines in
//    the engine suites prove the figures; these pins prove the mechanism);
//  - the loud failures: an unregistered port throws at defaultCall /
//    opsComponentsForPort / portInputProfile - never a silent empty
//    default, never the named-port OPS fallback (red proofs: an
//    enumeration that ignored the data must fail);
//  - a port that is never committed (the test-fixture port): a new port's
//    data produces its default call and OPS posture with zero code edit -
//    the generalization proof;
//  - no code enumeration: the per-port blocks are gone from defaults.ts
//    and engine.ts (the red-proof half: an enumeration that ignores the
//    data cannot pass these).
import {
  DEFAULT_VESSEL,
  allPortResetFields,
  defaultCall,
  opsComponentsForPort,
  portResetFields,
  registerPortData,
  registerPortDefinition,
  __clearPortDataRegistry,
  isPortDataRegistered
} from '../src/index';
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { PortDefinition } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const DATA_DIR = path.join(__dirname, '..', 'data');
const PORT_IDS = ['gothenburg', 'hamburg', 'helsingborg'] as const;

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(DATA_DIR, `${id}_2026.yaml`)).port;
}

// The never-committed test-fixture port: proof that a new port's defaults
// and OPS posture ship with data alone. A fourth Swedish-style port with
// its own list-price defaults and a two-component OPS posture.
const FIXTURE_PORT: PortDefinition = {
  metadata: {
    id: 'fixture_port',
    name: 'Fixture Port',
    country: 'Testland',
    currency: 'SEK',
    validity_start: '2026-01-01',
    validity_end: '2026-12-31'
  },
  billers: [{ id: 'pa', name: 'Port Authority', currency: 'SEK' }],
  fee_rules: [],
  default_call: {
    towage_cost_per_tug: 45000,
    ees_rate_per_move: 21,
    issc_valid: true
  },
  ops_speculative: {
    electricity: { enabled: true, currency: 'SEK', unit: 'SEK/kWh' },
    demand: { enabled: true, currency: 'SEK', unit: 'SEK/call' },
    connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
    per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
  },
  input_profile: {
    sections: [{ id: 'fixture_call_parameters', heading: 'Fixture Port Call Parameters' }]
  }
};

describe('per-port default-call data (spec v0.2.59)', () => {
  it('every real port file carries the default_call, ops_speculative, and input_profile sections', () => {
    for (const id of PORT_IDS) {
      const raw = fs.readFileSync(path.join(DATA_DIR, `${id}_2026.yaml`), 'utf8');
      const data = yaml.load(raw) as PortDefinition;
      expect(data.default_call).toBeDefined();
      expect(data.ops_speculative).toBeDefined();
      expect(data.input_profile).toBeDefined();
      expect(Array.isArray(data.input_profile!.sections)).toBe(true);
    }
  });

  it.each(PORT_IDS)('%s: the registered data section produces the port\'s default call (byte-equivalent to the code enumeration it replaces)', (id) => {
    const call = defaultCall(id);
    expect(call.port_id).toBe(id);
    // The shared worst-case core (spec v0.2.28) survives the overlay:
    expect(call.csi_class).toBe('E');
    expect(call.calls_this_month).toBe(1);
    expect(call.arrival_origin).toBe('outside-europe');
    expect(call.reefer_units).toBeUndefined();
    // And the per-port declared defaults arrive from the data (YAML null
    // being the authoring form of blank - normalized to undefined at
    // registration, the spec v0.2.28 blank contract):
    const section = (loadPort(id).default_call ?? {}) as Record<string, unknown>;
    for (const [field, value] of Object.entries(section)) {
      expect((call as unknown as Record<string, unknown>)[field]).toBe(value === null ? undefined : value);
    }
  });

  it('the section values match the code-authored defaults exactly (Hamburg block, the largest)', () => {
    const call = defaultCall('hamburg');
    expect(call.terminal_operator).toBe('HHLA');
    expect(call.engine_tier).toBeUndefined();
    expect(call.engine_tier_estimated).toBeUndefined();
    expect(call.infer_engine_tier_from_build_year).toBe(false);
    expect(call.gangway_class).toBe('overseas');
    expect(call.gangway_count).toBe(1);
    expect(call.gangway_supervision_hours).toBe(0);
    expect(call.pilotage_segment_pct).toBe(100);
    expect(call.towage_amount).toBe(15000);
    expect(call.handling_rate_per_move).toBe(358);
    expect(call.hpa_berth_usage).toBe(false);
    expect(call.berth_type).toBe('quay');
    expect(call.berth_hours).toBe(0);
    expect(call.esi_noise_score).toBeUndefined();
    expect(call.quantum_prior_year_gt).toBe(0);
    expect(call.waste_short_sea_reduction).toBe(false);
    expect(call.waste_alternative_fuel_reduction).toBe(false);
    expect(call.waste_sustainable_waste_reduction).toBe(false);
  });

  it('the zero-drift baselines hold through the data-driven defaults (the v0.2.53 merge and the v0.2.28 core)', () => {
    for (const [id, expected] of [
      // v0.2.61 drift-reconciliation re-pin: GOT/HEL gain the godsavgift
      // line (+268,800.00 SEK each at the default call's 80,000 derived
      // tonnes x 3.36 kr/t); HAM unchanged.
      ['gothenburg', 3275851.15],
      ['hamburg', 2313489.31],
      ['helsingborg', 8750057.40]
    ] as const) {
      const port = loadPort(id);
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(id) });
      expect(result.total).toBeCloseTo(expected, 2);
    }
  });

  it('a new port\'s data produces its default call with no code edit (the test-fixture port, never committed)', () => {
    registerPortDefinition(FIXTURE_PORT);
    const call = defaultCall('fixture_port');
    expect(call.towage_cost_per_tug).toBe(45000);
    expect(call.ees_rate_per_move).toBe(21);
    expect(call.issc_valid).toBe(true);
    // The shared core still underlays:
    expect(call.csi_class).toBe('E');
    expect(call.calls_this_month).toBe(1);
    // And the fixture's OPS posture is its own:
    const ops = opsComponentsForPort('fixture_port');
    expect(ops.connection.enabled).toBe(false);
    expect(ops.per_gt.enabled).toBe(false);
    expect(ops.electricity.unit).toBe('SEK/kWh');
  });

  it('loud failure: defaultCall throws for an unregistered port - never a silent empty default', () => {
    expect(() => defaultCall('never_registered_port')).toThrow(/no per-port default-call data registered/);
  });

  it('loud failure: opsComponentsForPort throws for an unregistered port - the named-port fallback is gone', () => {
    expect(() => opsComponentsForPort('never_registered_port')).toThrow(/named-port fallback is removed/);
  });

  it('loud failure: calculatePortCallCost throws for a port definition carrying no ops_speculative section', () => {
    const bare = { ...FIXTURE_PORT, ops_speculative: undefined } as PortDefinition;
    expect(() =>
      calculatePortCallCost(bare, { vessel: DEFAULT_VESSEL, call: defaultCall('fixture_port') })
    ).toThrow(/no ops_speculative descriptor/);
  });

  it('loud failure: registerPortData rejects a port missing any section (load-time, not first-use)', () => {
    expect(() =>
      registerPortData('incomplete_port', {
        defaultCall: { towage_cost_per_tug: 1 },
        opsSpeculative: FIXTURE_PORT.ops_speculative!,
        inputProfile: FIXTURE_PORT.input_profile!
      } as never)
    ).not.toThrow();
    expect(() =>
      registerPortData('missing_defaults_port', {
        opsSpeculative: FIXTURE_PORT.ops_speculative!,
        inputProfile: FIXTURE_PORT.input_profile!
      } as never)
    ).toThrow(/default_call section missing/);
  });

  it('red proof: an enumeration that ignores the data must fail - the per-port blocks are gone from the code', () => {
    const defaultsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'defaults.ts'), 'utf8');
    expect(defaultsSource).not.toMatch(/portId === 'gothenburg'/);
    expect(defaultsSource).not.toMatch(/portId === 'hamburg'/);
    expect(defaultsSource).not.toMatch(/portId === 'helsingborg'/);
    const engineSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'engine.ts'), 'utf8');
    expect(engineSource).not.toMatch(/OPS_COMPONENTS_BY_PORT/);
    // The named-port silent fallback is gone with it:
    expect(engineSource).not.toMatch(/\?\? OPS_COMPONENTS_BY_PORT\.helsingborg/);
  });

  it('YAML null normalizes to undefined (the blank = not-entered contract, spec v0.2.28)', () => {
    // Gothenburg/Helsingborg declare tug_count: null; the merged default
    // call carries undefined - a pinned toBeUndefined() must never see
    // YAML null.
    expect(defaultCall('gothenburg').tug_count).toBeUndefined();
    expect(defaultCall('helsingborg').tug_count).toBeUndefined();
    expect(defaultCall('hamburg').engine_tier).toBeUndefined();
  });
});

describe('OPS component descriptor data (spec v0.2.57, data-authored v0.2.59)', () => {
  it('Gothenburg: no connection-fee component; electricity/demand/per-GT present in SEK', () => {
    const c = opsComponentsForPort('gothenburg');
    expect(c.connection.enabled).toBe(false);
    expect(c.electricity).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/kWh' });
    expect(c.demand).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/call' });
    expect(c.per_gt).toEqual({ enabled: true, currency: 'SEK', unit: 'SEK/GT' });
  });

  it('Hamburg: no demand, no per-GT; electricity/connection present in EUR', () => {
    const c = opsComponentsForPort('hamburg');
    expect(c.demand.enabled).toBe(false);
    expect(c.per_gt.enabled).toBe(false);
    expect(c.electricity).toEqual({ enabled: true, currency: 'EUR', unit: 'EUR/kWh' });
    expect(c.connection).toEqual({ enabled: true, currency: 'EUR', unit: 'EUR/call' });
  });

  it('Helsingborg: all four components present (least-defined public posture), SEK', () => {
    const c = opsComponentsForPort('helsingborg');
    expect(c.electricity.enabled).toBe(true);
    expect(c.demand.enabled).toBe(true);
    expect(c.connection.enabled).toBe(true);
    expect(c.per_gt.enabled).toBe(true);
    expect(c.electricity.currency).toBe('SEK');
  });

  it('the descriptor is data: every real port file\'s ops_speculative section matches the loaded descriptor', () => {
    for (const id of PORT_IDS) {
      const port = loadPort(id);
      expect(opsComponentsForPort(id)).toEqual(port.ops_speculative);
    }
  });

  it('the loaded port carries its own descriptor (engine path reads the port object, not a code table)', () => {
    for (const id of PORT_IDS) {
      const port = loadPort(id);
      expect(port.ops_speculative).toBeDefined();
      expect(port.ops_speculative!.electricity).toBeDefined();
    }
    // The engine prices a port whose descriptor differs from any other
    // port's - the fixture port proves the posture is the port's own:
    registerPortDefinition(FIXTURE_PORT);
    const result = calculatePortCallCost(FIXTURE_PORT, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('fixture_port'), ops_kwh_consumption: 1000, ops_electricity_price: 2 }
    });
    expect(result.ops_speculative).toBeDefined();
    // Only the fixture's enabled components priced:
    expect(result.ops_speculative!.lines.map(l => l.id)).toEqual(['ops_spec_electricity']);
  });

  it('the descriptor remains configuration only: no OPS rates and no OPS price inputs enter any port file', () => {
    for (const id of PORT_IDS) {
      const raw = fs.readFileSync(path.join(DATA_DIR, `${id}_2026.yaml`), 'utf8');
      expect(raw).not.toMatch(/ops_electricity_price\s*:/);
      expect(raw).not.toMatch(/ops_demand_charge\s*:/);
      expect(raw).not.toMatch(/ops_connection_charge\s*:/);
      expect(raw).not.toMatch(/ops_per_gt_charge\s*:/);
    }
  });
});

describe('registry mechanics (spec v0.2.59)', () => {
  it('registration is idempotent per port id and visible to the lookups', () => {
    expect(isPortDataRegistered('gothenburg')).toBe(true);
    registerPortDefinition(loadPort('gothenburg'));
    expect(isPortDataRegistered('gothenburg')).toBe(true);
    expect(defaultCall('gothenburg').towage_cost_per_tug).toBe(60000);
  });

  it('a cleared registry fails loudly until re-registered (the loud-failure contract at the mechanism level)', () => {
    __clearPortDataRegistry();
    expect(() => defaultCall('gothenburg')).toThrow(/no per-port default-call data registered/);
    // Re-register from the data files (the jest setup's own path):
    for (const id of PORT_IDS) {
      registerPortDefinition(loadPort(id));
    }
    expect(defaultCall('gothenburg').towage_cost_per_tug).toBe(60000);
  });
});

// Port-specific reset fields (spec v0.2.60, refactor pass 2 item 3).
//
// The last hand-kept per-port array (the web's PORT_SPECIFIC_CALL_FIELDS)
// is data now: each port's input_profile declares its reset_fields, the
// App reset effect iterates the registry union, and a new port's reset
// fields ship with its authoring.
//
// Pins:
//  - per-port exactness: each real port declares exactly its own reset
//    fields - the lists are derived from each port's rendered inputs and
//    tariff-specific call parameters, not copied around;
//  - union equality: the union across the registry equals the retired
//    hand-kept array exactly (both directions), so the reset behavior is
//    byte-equivalent to the code-authored array it replaces;
//  - loud failure: an unregistered port throws at portResetFields - never
//    a silent reset of nothing (the silent-failure defect class);
//  - generalization: the never-committed fixture port's reset fields join
//    the union with zero code edit - a new port is a data edit.
describe('port-specific reset fields (spec v0.2.60)', () => {
  const EXPECTED_RESET_FIELDS: Record<string, string[]> = {
    gothenburg: [
      'engine_tier', 'engine_tier_estimated', 'clean_shipping_index_class',
      'towage_cost_per_tug', 'tug_count', 'csi_class',
      'fossil_free_fuel_percentage', 'pilotage_hours', 'pilotage_extra_pilot',
      'pilotage_ordering_lead_time_hours', 'hatch_cover_count',
      'gearbox_count', 'lay_up_days', 'ops_electricity_price',
      'ops_demand_charge', 'ops_connection_charge', 'ops_per_gt_charge'
    ],
    hamburg: [
      'engine_tier', 'engine_tier_estimated', 'esi_noise_score',
      'towage_amount', 'handling_rate_per_move', 'gangway_class',
      'gangway_count', 'gangway_supervision_hours', 'hpa_berth_usage',
      'berth_type', 'berth_hours', 'quantum_prior_year_gt',
      'pilotage_segment_pct', 'waste_short_sea_reduction',
      'waste_alternative_fuel_reduction', 'waste_sustainable_waste_reduction',
      'ops_electricity_price', 'ops_demand_charge', 'ops_connection_charge',
      'ops_per_gt_charge'
    ],
    helsingborg: [
      'engine_tier', 'engine_tier_estimated', 'esi_score', 'esi_noise_score',
      'issc_valid', 'clean_shipping_index_class', 'ees_rate_per_move',
      'towage_cost_per_tug', 'tug_count', 'csi_class',
      'fossil_free_fuel_percentage', 'pilotage_hours', 'pilotage_extra_pilot',
      'pilotage_ordering_lead_time_hours', 'hatch_cover_count',
      'gearbox_count', 'lay_up_days', 'ops_electricity_price',
      'ops_demand_charge', 'ops_connection_charge', 'ops_per_gt_charge'
    ]
  };

  it('each real port declares exactly its own reset_fields (per-port exactness)', () => {
    for (const id of PORT_IDS) {
      expect(portResetFields(id)).toEqual(EXPECTED_RESET_FIELDS[id]);
    }
  });

  it('the registry union equals the retired hand-kept array exactly (both directions)', () => {
    // The PORT_SPECIFIC_CALL_FIELDS array as it stood at spec v0.2.59
    // (web/src/App.tsx): the reset contract this data replaces.
    const legacy = [
      'engine_tier', 'engine_tier_estimated', 'esi_score', 'esi_noise_score',
      'issc_valid', 'clean_shipping_index_class', 'ees_rate_per_move',
      'towage_cost_per_tug', 'tug_count', 'quantum_prior_year_gt',
      'pilotage_segment_pct', 'towage_amount', 'handling_rate_per_move',
      'gangway_class', 'gangway_count', 'gangway_supervision_hours',
      'hpa_berth_usage', 'berth_type', 'berth_hours',
      'waste_short_sea_reduction', 'waste_alternative_fuel_reduction',
      'waste_sustainable_waste_reduction', 'csi_class',
      'fossil_free_fuel_percentage', 'pilotage_hours', 'pilotage_extra_pilot',
      'pilotage_ordering_lead_time_hours', 'hatch_cover_count',
      'gearbox_count', 'lay_up_days', 'ops_electricity_price',
      'ops_demand_charge', 'ops_connection_charge', 'ops_per_gt_charge'
    ];
    const union = allPortResetFields();
    expect([...union].sort()).toEqual([...legacy].sort());
    expect(union.length).toBe(legacy.length);
  });

  it('loud failure: portResetFields throws for an unregistered port - never a silent reset of nothing', () => {
    expect(() => portResetFields('dk_aarhus')).toThrow(/no port data registered for 'dk_aarhus'/);
  });

  it('a new port\'s reset fields join the union with no code edit (the test-fixture port, never committed)', () => {
    const fixtureWithResets: PortDefinition = {
      ...FIXTURE_PORT,
      input_profile: {
        ...FIXTURE_PORT.input_profile!,
        reset_fields: ['towage_cost_per_tug', 'ees_rate_per_move', 'dkk_harbour_dues']
      }
    };
    registerPortDefinition(fixtureWithResets);
    expect(portResetFields('fixture_port')).toEqual(['towage_cost_per_tug', 'ees_rate_per_move', 'dkk_harbour_dues']);
    expect(allPortResetFields()).toContain('dkk_harbour_dues');
    // Re-register the real fixture without reset fields: registry restored.
    registerPortDefinition(FIXTURE_PORT);
    expect(portResetFields('fixture_port')).toEqual([]);
  });

  it('red proof: a hand-kept array ignoring the data must fail - App.tsx no longer declares one', () => {
    const appSource = fs.readFileSync(path.join(__dirname, '..', '..', 'web', 'src', 'App.tsx'), 'utf8');
    expect(appSource).not.toMatch(/PORT_SPECIFIC_CALL_FIELDS/);
    // The union must be derived from the registry at the call site, not
    // merely imported: a hardcoded array substituted for the call turns
    // this pin red.
    expect(appSource).toMatch(/allPortResetFields\(\)/);
    expect(appSource).not.toMatch(/portSpecificCallFields\s*=\s*\[/);
  });
});
