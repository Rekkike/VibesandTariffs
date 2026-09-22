/**
 * Health-check pin tests (spec v0.2.35).
 *
 * Asserted-but-untested sweep of the recent passes' report claims: guarantees
 * stated in prose by the storage/towage pass (PR #1) that had no corresponding
 * assertion outside the Gothenburg suite.
 *
 * "A user-entered zero tug count is a value, not a missing entry: it computes
 * zero and suppresses the assumption flag" (spec 4.4.2, v0.2.33) was pinned for
 * Gothenburg only (storage_towage.test.ts). Helsingborg carries the same
 * tug-assist contract; its zero-suppresses-flag and blank-raises-flag
 * boundaries are pinned here. Hamburg is excluded by construction: its towage
 * is a per-call flat estimate with no tug-count input.
 *
 * The seeded-unit blanks and default-call zero-storage guarantees are NOT
 * re-pinned here; the surviving tests are storage_towage.test.ts:182
 * (default-call zero storage and zero yard surcharge at every port) and
 * storage_towage.test.ts:231-234 (seeded special-cargo unit counts blank).
 */
import { calculatePortCallCost } from '../src/engine';
import { loadAndValidatePort } from '../src/loader';
import { DEFAULT_VESSEL, defaultCall } from '../src/defaults';
import { PortDefinition, FeeResult } from '../src/types';
import * as path from 'path';

const TOWAGE_RULE_IDS: Record<string, string> = {
  gothenburg: 'gothenburg_towage_estimate',
  helsingborg: 'poh_towage_estimate'
};

function loadPort(id: string): PortDefinition {
  return loadAndValidatePort(path.join(__dirname, '..', 'data', `${id}_2026.yaml`)).port;
}

function feesOf(result: ReturnType<typeof calculatePortCallCost>): FeeResult[] {
  return result.billers.flatMap(b => b.fees);
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult | undefined {
  return feesOf(result).find(f => f.fee_rule_id === ruleId);
}

describe('tug-count zero-value and blank-assumption boundaries at every tug-assist port (v0.2.35 health-check pins)', () => {
  Object.entries(TOWAGE_RULE_IDS).forEach(([portId, ruleId]) => {
    it(`${portId}: a user-entered zero tug count computes zero towage and suppresses the assumed_parameter flag`, () => {
      const port = loadPort(portId);
      const result = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, loa_m: 290 },
        call: { ...defaultCall(portId), tug_count: 0 }
      });
      const towage = feeByRule(result, ruleId);
      expect(towage).toBeDefined();
      expect(towage!.amount).toBe(0);
      expect(towage!.quality_flags.some(f => f.type === 'assumed_parameter')).toBe(false);
    });

    it(`${portId}: a blank tug count with a tug-needing LOA raises the named assumed_parameter flag and computes the LOA-class default`, () => {
      const port = loadPort(portId);
      const result = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, loa_m: 290 },
        call: defaultCall(portId)
      });
      const towage = feeByRule(result, ruleId);
      expect(towage).toBeDefined();
      expect(towage!.quality_flags.some(f => f.type === 'assumed_parameter')).toBe(true);
      expect(towage!.amount).toBeGreaterThan(0);
    });
  });
});
