/**
 * Environmental-default pin tests (spec v0.2.28 default-call contract).
 *
 * Principle: the default call is the worst-case published-rate call. No
 * environmental lever (ESI score, CSI class, fossil-free share, quantum
 * volume) may reduce any figure unless the user explicitly enters it.
 *
 * These tests pin two layers:
 * 1. The default form state itself (core/src/defaults.ts - the exact object
 *    the web form initializes from): ESI blank, fossil-free blank,
 *    Sjofartsverket class E (not registered), Clean Shipping Index blank,
 *    quantum prior-year GT 0, waste reductions off.
 * 2. The engine outcome: a default call at every port yields zero
 *    environmental discount - the default result is identical to the
 *    explicitly no-discount computation, and no line carries a discount
 *    adjustment or a negative discount amount.
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { PortDefinition, CostCalculationInput, FeeResult, Adjustment } from '../src/types';
import * as path from 'path';

const PORT_IDS = ['gothenburg', 'hamburg', 'helsingborg'];

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(__dirname, '..', 'data', `${id}_2026.yaml`)).port;
}

function defaultInputFor(port: PortDefinition): CostCalculationInput {
  return { vessel: DEFAULT_VESSEL, call: defaultCall(port.metadata.id) };
}

// Every discount-looking adjustment or negative line at any port
function discountLines(result: ReturnType<typeof calculatePortCallCost>): { rule: string; detail: string }[] {
  const found: { rule: string; detail: string }[] = [];
  for (const biller of result.billers) {
    for (const fee of biller.fees) {
      const discounts = (fee.adjustments_applied ?? []).filter(
        (a: Adjustment) => a.type === 'discount'
      );
      for (const d of discounts) {
        found.push({ rule: fee.fee_rule_id, detail: `adjustment ${d.type} ${d.percentage}%` });
      }
      if (fee.amount < 0) {
        found.push({ rule: fee.fee_rule_id, detail: `negative amount ${fee.amount}` });
      }
    }
  }
  return found;
}

describe('Environmental default-call contract (spec v0.2.28)', () => {
  describe('default form state (core/src/defaults.ts)', () => {
    it('ESI score defaults to blank (undefined), never a numeric score', () => {
      for (const id of PORT_IDS) {
        expect(defaultCall(id).esi_score).toBeUndefined();
      }
    });

    it('fossil-free fuel share defaults to blank (undefined), never a zero that could misread as entered', () => {
      for (const id of PORT_IDS) {
        expect(defaultCall(id).fossil_free_fuel_percentage).toBeUndefined();
      }
    });

    it('Sjofartsverket environmental class defaults to E (not registered, least favourable)', () => {
      for (const id of PORT_IDS) {
        expect(defaultCall(id).csi_class).toBe('E');
      }
    });

    it('Clean Shipping Index class defaults to blank (no port discount)', () => {
      expect(defaultCall('gothenburg').clean_shipping_index_class).toBeUndefined();
      expect(defaultCall('helsingborg').clean_shipping_index_class).toBeUndefined();
    });

    it('Hamburg levers default to no-discount: ESI noise blank, quantum 0, waste reductions off, OPS off', () => {
      const call = defaultCall('hamburg');
      expect(call.esi_noise_score).toBeUndefined();
      expect(call.quantum_prior_year_gt).toBe(0);
      expect(call.waste_short_sea_reduction).toBe(false);
      expect(call.waste_alternative_fuel_reduction).toBe(false);
      expect(call.waste_sustainable_waste_reduction).toBe(false);
      expect(call.ops_usage).toBe(false);
    });

    it('NOx Tier defaults to worst case: not entered, inference never invoked (spec v0.2.29)', () => {
      const call = defaultCall('hamburg');
      expect(call.engine_tier).toBeUndefined();
      expect(call.engine_tier_estimated).toBeUndefined();
      expect(call.infer_engine_tier_from_build_year).toBe(false);
    });

    it('Helsingborg levers default to list price: valid ISSC, EES at the tariff level', () => {
      const call = defaultCall('helsingborg');
      expect(call.issc_valid).toBe(true);
      expect(call.ees_rate_per_move).toBe(35);
    });
  });

  describe('default call yields zero environmental discount at every port', () => {
    it.each(PORT_IDS)('%s: no discount adjustment or negative line on a default call', (id) => {
      const port = loadPort(id);
      const result = calculatePortCallCost(port, defaultInputFor(port));
      const discounts = discountLines(result);
      if (discounts.length > 0) {
        throw new Error(
          `Default call carries discounts at ${id}: ${discounts.map(d => `${d.rule} (${d.detail})`).join(', ')}`
        );
      }
    });

    it.each(PORT_IDS)('%s: default result equals the explicitly no-discount computation', (id) => {
      const port = loadPort(id);
      const defaultResult = calculatePortCallCost(port, defaultInputFor(port));
      // Explicit worst-case: every environmental lever forced to its
      // no-discount value, with the same vessel and remaining call data.
      const worstCaseInput: CostCalculationInput = {
        vessel: DEFAULT_VESSEL,
        call: {
          ...defaultCall(port.metadata.id),
          esi_score: undefined,
          esi_noise_score: undefined,
          clean_shipping_index_class: undefined,
          csi_class: 'E',
          fossil_free_fuel_percentage: undefined,
          quantum_prior_year_gt: 0,
          ops_usage: false
        }
      };
      const worstCaseResult = calculatePortCallCost(port, worstCaseInput);
      expect(defaultResult.total).toBe(worstCaseResult.total);
      expect(defaultResult.total).toBeGreaterThan(0);
    });

    it('hamburg: blank build year keeps the Tier 0 worst-case computation with a named assumed-parameter flag (v0.2.44; re-pinned v0.2.48)', () => {
      const port = loadPort('hamburg');
      // The v0.2.48 default vessel carries a build year (Maren Maersk, 2014
      // → inferred Tier II), so the worst-case contract is pinned with the
      // build year removed — the blank-year case it governs. The worst case
      // stands for truly unknown vessels (spec v0.2.44).
      const result = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, built_year: undefined },
        call: defaultCall('hamburg')
      });
      const explicit = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, built_year: undefined },
        call: { ...defaultCall('hamburg'), engine_tier: 'Tier 0', engine_tier_estimated: false }
      });
      expect(result.total).toBe(explicit.total);
      const flag = result.quality_flags.find(
        f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier'
      );
      expect(flag).toBeDefined();
      expect(flag!.description).toContain('NOx Tier not entered; worst case (Tier 0) applied');
      // The assumed-Tier flag must not contaminate the estimated-parameters
      // subtotal: Tier is a classification, not an estimated charge
      // (re-pinned for the v0.2.48 default profile: 4,000 moves x 358 =
      // 1,432,000 handling + 15,000 towage; old pin 731,000).
      expect(result.total_estimated_parameters).toBe(1447000);
      const handling = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hhla_container_handling');
      expect(handling!.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
      const portFee = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_port_fee')!;
      expect(portFee.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(false);
      expect(portFee.quality_flags.some(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier')).toBe(true);
    });

    it('hamburg: build year present infers the tier per Regulation 13 with a named flag; explicit entry wins (v0.2.44)', () => {
      const port = loadPort('hamburg');
      // Certified tier entered: no flag, lower total
      const certified = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, built_year: 2024 },
        call: { ...defaultCall('hamburg'), engine_tier: 'Tier II', engine_tier_estimated: false }
      });
      expect(certified.quality_flags.some(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier')).toBe(false);
      // No tier entered + build year present: the engine infers Tier III
      // (2024 per Regulation 13) and flags it — the old pin asserted the
      // inference must NOT happen (deliberate change, v0.2.44)
      const defaulted = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, built_year: 2024 },
        call: defaultCall('hamburg')
      });
      expect(defaulted.quality_flags.some(
        f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier' && f.description.includes('engine tier inferred from build year')
      )).toBe(true);
      // Tier III (-20%) < Tier II (+5%) on the environmental component:
      // the inferred call is now cheaper than the certified-Tier-II call
      expect(defaulted.total).toBeLessThan(certified.total);
      // Explicit entry beats inference: Tier 0 entered over a 2024 build
      // year removes the inference flag and applies Tier 0
      const explicitT0 = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, built_year: 2024 },
        call: { ...defaultCall('hamburg'), engine_tier: 'Tier 0', engine_tier_estimated: false }
      });
      expect(explicitT0.quality_flags.some(f => f.type === 'assumed_parameter' && f.parameter === 'engine_tier')).toBe(false);
      expect(explicitT0.total).toBeGreaterThan(defaulted.total);
    });

    it.each(PORT_IDS)('%s: entering an ESI score actually discounts (guard against a dead input)', (id) => {
      // The pin must not be satisfiable by wiring the input out entirely:
      // an explicit ESI 40 entry still triggers the environmental discount
      // where the tariff grants one (Gothenburg/Helsingborg port dues,
      // Hamburg HPA port fee ESI-air band).
      const port = loadPort(id);
      const base = calculatePortCallCost(port, defaultInputFor(port));
      const discounted = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(port.metadata.id), esi_score: 40 }
      });
      expect(discounted.total).toBeLessThan(base.total);
    });
  });
});
