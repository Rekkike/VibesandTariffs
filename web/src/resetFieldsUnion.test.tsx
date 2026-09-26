// reset_fields union-semantics pins (spec v0.2.68, item 4 — the data
// contract stated in spec §7).
//
// The union rule the persistence depends on: the App's split consumes the
// UNION of every loaded port's reset_fields — a field is per-port
// everywhere as soon as any port declares it, and a field is shared across
// port switches unless a port explicitly resets it. Adding an input to any
// port's reset_fields is therefore a data-contract change: it moves that
// field from the shared half to the per-port half of the split for every
// port at once, and requires the persistence pins to be updated in the
// same change.
//
// Pins (the expressible form of the item-4 sentence):
//  - union membership governs: a field declared by a fixture port routes
//    per-port in the split even though the real ports never declare it;
//  - the split follows the union exactly (losslessly, both halves);
//  - red proof: a per-port-declaration split (only fields the editing
//    port's own port declares) is a DIFFERENT data contract — the pin
//    fails it, which is what makes the union semantics a pinned contract
//    rather than an implementation accident.
import { registerPortDefinition, allPortResetFields } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

// The never-committed fixture port (the port_generalization pattern): a
// minimal definition whose reset_fields declare a field no real port
// declares — the union grows, and the split's routing must follow.
const UNION_FIXTURE_PORT: PortDefinition = {
  metadata: { id: 'union_fixture_port', name: 'Union Fixture', country: 'SE', currency: 'SEK' },
  billers: [],
  fee_rules: [],
  default_call: {},
  ops_speculative: {
    electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
    demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
    connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
    per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
  },
  input_profile: {
    fields: [],
    sections: [{ id: 'union_fixture_section', heading: 'Union Fixture Section' }],
    reset_fields: ['dkk_harbour_dues']
  }
} as unknown as PortDefinition;

describe('reset_fields union semantics (spec v0.2.68, item 4)', () => {
  afterEach(() => {
    // The registry must never carry the fixture past a test.
    try { registerPortDefinition(LOADED_PORTS[0]); } catch (e) { /* no-op */ }
  });

  it('the data contract: a field declared by any port routes per-port at every port (union membership governs)', () => {
    registerPortDefinition(UNION_FIXTURE_PORT);
    expect(allPortResetFields()).toContain('dkk_harbour_dues');
    // The App builds its split set from the registry union at module load;
    // the fixture's registration is a data-contract change, and the split
    // in a freshly-loaded App follows the grown union. (The setup registry
    // loaded App against the real ports only; isolating the module re-loads
    // it against the grown registry — the same mechanics a real
    // reset_fields addition triggers on the next page load.)
    const holder: { split?: (call: CallInput) => { perPort: Record<string, unknown>; shared: Record<string, unknown> } } = {};
    jest.isolateModules(() => {
      // The isolated require graph re-creates the core registry AND the App
      // module scope — the fixture must be registered inside the isolation
      // (after the setup ports re-register via portRegistry) so the fresh
      // App consumes the grown union: exactly the data-contract mechanics a
      // reset_fields addition triggers on the next page load.
      const core = require('@port-cost/core');
      core.registerPortDefinition(UNION_FIXTURE_PORT);
      const appModule = require('./App');
      holder.split = appModule.splitCallByPersistence;
    });
    const call = {
      port_id: 'gothenburg',
      dkk_harbour_dues: 1200,
      lay_time_hours: 50
    } as unknown as CallInput;
    const { perPort, shared } = holder.split!(call);
    expect(perPort['dkk_harbour_dues']).toBe(1200);
    expect(shared['dkk_harbour_dues']).toBeUndefined();
    // The shared field (in no port's reset_fields) stays shared.
    expect(shared['lay_time_hours']).toBe(50);
    expect(perPort['lay_time_hours']).toBeUndefined();
    // port_id never routes to either half.
    expect(perPort['port_id']).toBeUndefined();
    expect(shared['port_id']).toBeUndefined();
  });

  it('the union contract at the real data: a real per-port field routes per-port, a real shared field stays shared', () => {
    const call = {
      port_id: 'hamburg',
      ops_electricity_price: 2.5,
      ops_kwh_consumption: 1250
    } as unknown as CallInput;
    const split = require('./App').splitCallByPersistence;
    const { perPort, shared } = split(call);
    // ops_electricity_price: declared by all three real ports — per-port.
    expect(perPort['ops_electricity_price']).toBe(2.5);
    // ops_kwh_consumption: declared by no port — shared at every port.
    expect(shared['ops_kwh_consumption']).toBe(1250);
  });

  it('red proof: a per-port-declaration split is a different data contract and must fail this pin', () => {
    // The mutation this pin guards against: the split consulting only the
    // editing port's own declaration (a per-port-declaration contract)
    // instead of the union. The union semantics are the contract —
    // simulate the mutation by checking the split's routing source: the
    // App must build PER_PORT_CALL_FIELDS from allPortResetFields() (the
    // union), never from a single port's portResetFields.
    const fs = require('fs');
    const path = require('path');
    const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
    expect(appSource).toMatch(/PER_PORT_CALL_FIELDS[\s\S]{0,80}allPortResetFields\(\)/);
    expect(appSource).not.toMatch(/PER_PORT_CALL_FIELDS[^=]*=\s*new Set\(portResetFields\(/);
  });
});
