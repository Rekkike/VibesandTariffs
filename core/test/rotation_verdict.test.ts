/**
 * Rotation-mode exclusion and the Gothenburg §2.2 same-route attestation
 * (spec v0.2.67 — the rotation-mode re-scope and verdict pass).
 *
 * The verdict this suite pins has two halves:
 *
 * (1) The §2.2 FREQUENCY DISCOUNT refinement. The Port Tariff 2026 (G1,
 *     §2.2 "OTHER DISCOUNTS — FREQUENCY DISCOUNT", p.10, verified against
 *     the live publisher document 2026-09-27) grants the 50% GT-based
 *     port-dues discount only for "Scheduled shipping routes with calls at
 *     the Port of Gothenburg twice on the same route (import call and
 *     export call) ... for the second call." The pre-v0.2.67 encoding
 *     keyed the discount on any call with calls_this_month >= 2 — an
 *     over-service: two unrelated calls in a month both discounted. The
 *     refinement gates the adjustment on
 *     calls_this_month >= 2 && got_same_route_second_call, where the
 *     second operand is an explicit user attestation of the same-route
 *     import/export pair, default false (the worst-case posture).
 *
 * (2) The rotation-mode exclusion. The per-port arrival-origin override
 *     formerly deferred as "rotation mode" is a permanent exclusion: no
 *     tariff in the container-call domain prices a port sequence; the
 *     Gothenburg waste rules are the only origin-gated rules anywhere.
 *     The pin class: the call model carries no rotation fields (no
 *     previous-port, voyage, or port-sequence input), and the shared
 *     arrival_origin remains the sole origin input — a mutation adding a
 *     per-port origin gate would have to change the types and the engine
 *     together, which this suite's structural pins observe.
 */
import { calculatePortCallCost } from '../src/engine';
import { defaultCall, DEFAULT_VESSEL } from '../src/defaults';
import { loadAndValidatePort } from '../src/loader';
import { portDefaultCall } from '../src/port_data';
import * as fs from 'fs';
import * as path from 'path';
import { CostCalculationInput, FeeResult, PortDefinition } from '../src/types';
import { registerPortDataFromYaml } from '../src/port_data_fs';

const GOT_PATH = path.join(__dirname, '..', 'data', 'gothenburg_2026.yaml');
const { port: gothenburg } = loadAndValidatePort(GOT_PATH);
registerPortDataFromYaml(GOT_PATH);
const { port: hamburg } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'hamburg_2026.yaml'));
const { port: helsingborg } = loadAndValidatePort(path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml'));

function makeCall(overrides: Record<string, any> = {}): CostCalculationInput['call'] {
  return {
    ...defaultCall('gothenburg'),
    ...overrides
  } as CostCalculationInput['call'];
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`fee rule ${ruleId} not found`);
}

const duesOf = (call: CostCalculationInput['call'], port: PortDefinition = gothenburg) =>
  calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call }).total;

describe('Gothenburg §2.2 second-call discount — the same-route attestation gate (spec v0.2.67)', () => {
  it('the tariff condition is quoted in the port file: the discount is the same-route import/export pair, not any second call', () => {
    const yaml = fs.readFileSync(GOT_PATH, 'utf8');
    expect(yaml).toContain('calls_this_month >= 2 && got_same_route_second_call');
    expect(yaml).toContain('twice on the same route');
  });

  it('the default call earns no port-dues discount: the attestation is off by default (worst case)', () => {
    const result = calculatePortCallCost(gothenburg, { vessel: DEFAULT_VESSEL, call: makeCall() });
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    // Zero drift: the v0.2.66 baseline figure, undiscounted.
    expect(dues.amount).toBe(204279.20);
  });

  it('two unattested calls this month earn no port-dues discount (the pre-v0.2.67 over-service, now corrected)', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: DEFAULT_VESSEL,
      call: makeCall({ calls_this_month: 2 })
    });
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(204279.20);
    // The national Sj\u00f6fartsverket scale is calls-based and still fires
    // at 2 calls only per its own bands (1-2: 100% payable) \u2014 no line.
    const national = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_family === 'frequency_discount');
    expect(national).toHaveLength(0);
  });

  it('the attested same-route second call earns the 50% discount: 204,279.20 \u2192 102,139.60', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: DEFAULT_VESSEL,
      call: makeCall({ calls_this_month: 2, got_same_route_second_call: true })
    });
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(102139.60);
  });

  it('the attestation alone at a single call earns nothing (both operands are required \u2014 the conjunction is real)', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: DEFAULT_VESSEL,
      call: makeCall({ calls_this_month: 1, got_same_route_second_call: true })
    });
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    expect(dues.amount).toBe(204279.20);
  });

  it('the discount stacks additively with the environmental discounts exactly as before when attested', () => {
    const result = calculatePortCallCost(gothenburg, {
      vessel: DEFAULT_VESSEL,
      call: makeCall({ calls_this_month: 2, got_same_route_second_call: true, esi_score: 40 })
    });
    const dues = feeByRule(result, 'port_gothenburg_container_vessel_dues');
    // 10% environmental off 204,279.20 = 183,851.28; then 50% frequency.
    expect(dues.amount).toBe(91925.64);
  });

  it('silos: Helsingborg and Hamburg port dues are untouched by the attestation at any call count', () => {
    for (const attested of [false, true]) {
      const hel = calculatePortCallCost(helsingborg, {
        vessel: DEFAULT_VESSEL,
        call: {
          ...defaultCall('helsingborg'),
          calls_this_month: 2,
          got_same_route_second_call: attested
        } as CostCalculationInput['call']
      });
      const ham = calculatePortCallCost(hamburg, {
        vessel: DEFAULT_VESSEL,
        call: {
          ...defaultCall('hamburg'),
          calls_this_month: 2,
          got_same_route_second_call: attested
        } as CostCalculationInput['call']
      });
      expect(hel.total).toBe(8750057.40);
      expect(ham.total).toBe(2204910.90);
    }
  });

  it('the national Sj\u00f6fartsverket scale is calls-based and unaffected by the attestation (4 attested or unattested calls both pay 50%)', () => {
    for (const attested of [false, true]) {
      const result = calculatePortCallCost(gothenburg, {
        vessel: DEFAULT_VESSEL,
        call: makeCall({ calls_this_month: 4, got_same_route_second_call: attested })
      });
      const discount = result.billers
        .flatMap(b => b.fees)
        .find(f => f.fee_rule_id === 'sjofartsverket_frequency_discount');
      expect(discount).toBeDefined();
      // base 262,175.00, 50% payable => -131,087.50
      expect(discount!.amount).toBe(-131087.50);
    }
  });
});

describe('Rotation-mode exclusion — the structural pins (spec v0.2.67)', () => {
  it('the call model carries no rotation fields: no previous-port, voyage, or port-sequence input exists', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'types.ts'), 'utf8');
    expect(src).not.toMatch(/previous_port|voyage|rotation|port_sequence|leg_sequence/);
  });

  it('arrival_origin remains the sole origin input, shared: it appears in no port\'s reset_fields (the v0.2.60 union keeps it shared)', () => {
    for (const file of ['gothenburg_2026.yaml', 'hamburg_2026.yaml', 'helsingborg_2026.yaml']) {
      const yaml = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8');
      const resetMatch = yaml.match(/reset_fields:([\s\S]*?)(\n  [a-z_]+:|$)/);
      expect(resetMatch).toBeTruthy();
      expect(resetMatch![1]).not.toContain('arrival_origin');
    }
  });

  it('exactly one port file carries origin-gated rules (Gothenburg waste); the other ports\' rules never consume arrival_origin', () => {
    const gotYaml = fs.readFileSync(GOT_PATH, 'utf8');
    const hamYaml = fs.readFileSync(path.join(__dirname, '..', 'data', 'hamburg_2026.yaml'), 'utf8');
    const helYaml = fs.readFileSync(path.join(__dirname, '..', 'data', 'helsingborg_2026.yaml'), 'utf8');
    expect(gotYaml).toContain('arrival_origin: europe');
    expect(hamYaml).not.toContain('arrival_origin:');
    expect(helYaml).not.toContain('arrival_origin:');
  });

  it('the spec records the exclusion: the deferred "rotation mode" option is gone and the exclusion sentence stands', () => {
    const spec = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'SPECIFICATION.md'), 'utf8');
    expect(spec).toContain('The per-port origin override formerly deferred as "rotation mode" is a permanent exclusion (v0.2.67)');
    expect(spec).not.toMatch(/deferred as a considered future option \(.rotation mode.\), not implemented/);
  });

  it('the extraction reference records the exclusion and the attestation gate at the port silo', () => {
    const ref = fs.readFileSync(
      path.join(__dirname, '..', '..', 'docs', 'sources', 'sweden', 'gothenburg', 'GOTHENBURG_EXTRACTION_REFERENCE.md'),
      'utf8'
    );
    expect(ref).toContain('**Rotation mode — permanently excluded (spec v0.2.67).**');
    expect(ref).toContain('got_same_route_second_call');
  });
});
