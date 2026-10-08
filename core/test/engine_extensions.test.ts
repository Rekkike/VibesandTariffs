/**
 * Engine extensions (spec v0.7.0, Rotterdam Unit 2a).
 *
 * Two data-driven extensions, engine-generic and per-port honest:
 *
 * 1. flat_plus_per_gt on FlatRate: flat amount + GT x per_gt_rate, with
 *    per_gt_maximum capping the whole fee (flat + per-GT together — proven by
 *    the MAREN arithmetic: the verified total 82,803.88 less the dues lines
 *    29,422.20 + 13,054.88 and the capped cargo 38,326.80 leaves exactly
 *    2,000, the published maximum as the whole waste line, never 2,220).
 *    Break-even at (2,000 - 220) / 0.05 = 35,600 GT. The MAREN vessel
 *    (194,849 GT, DEFAULT_VESSEL.gt) is capped by design; the uncapped case
 *    needs a small vessel (GT < 35,600).
 *
 * 2. gt_efficiency_cap on PerUnitRate: charged = min(count x rate,
 *    GT x cap_pct/100 x rate); when the cap binds, the line shows the
 *    uncapped figure, the capped figure, and the delta as a discount
 *    (ceil on discounts), never a silent reduction.
 *
 * 7 pins, each red-proven by reverting the implementation (not the fixture).
 */
import { calculatePortCallCost } from '../src/engine';
import { DEFAULT_VESSEL } from '../src/defaults';
import { validatePort } from '../src/loader';
import {
  FeeResult,
  VesselInput,
  CallInput,
  CostCalculationInput,
  FeeRule,
  PortDefinition,
  SourceReference
} from '../src/types';

const MAREN_GT = DEFAULT_VESSEL.gt; // 194,849 — capped by design

const source: SourceReference = {
  document_name: 'Unit 2a extension test source',
  document_url: 'https://example.invalid/unit2a',
  document_issued: '2026-01-01',
  page: '1',
  clause: 'Unit 2a test',
  verified_on: '2026-01-01',
  verified_by: 'Unit 2a test'
};

function makePort(rules: FeeRule[]): PortDefinition {
  return {
    metadata: {
      id: 'test_ext_port',
      name: 'Test Extension Port',
      country: 'Test',
      currency: 'EUR',
      validity_start: '2026-01-01',
      validity_end: '2026-12-31'
    },
    billers: [
      { id: 'port_authority', name: 'Port Authority', currency: 'EUR' }
    ],
    fee_rules: rules,
    ops_speculative: {
      electricity: { enabled: false, currency: 'EUR', unit: 'EUR/kWh' },
      demand: { enabled: false, currency: 'EUR', unit: 'EUR/call' },
      connection: { enabled: false, currency: 'EUR', unit: 'EUR/call' },
      per_gt: { enabled: false, currency: 'EUR', unit: 'EUR/GT' }
    }
  } as PortDefinition;
}

function makeInput(
  vesselOverrides: Partial<VesselInput> = {},
  callOverrides: Partial<CallInput> = {}
): CostCalculationInput {
  return {
    vessel: { ...DEFAULT_VESSEL, ...vesselOverrides },
    call: {
      port_id: 'test_ext_port',
      date: '2026-06-01',
      ...callOverrides
    } as CallInput
  };
}

function feeByRule(result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult {
  for (const biller of result.billers) {
    const fee = biller.fees.find(f => f.fee_rule_id === ruleId);
    if (fee) return fee;
  }
  throw new Error(`rule ${ruleId} did not fire`);
}

function stepsOf(fee: FeeResult) {
  return fee.derivation?.steps ?? [];
}

const wasteRule = (maximum?: number): FeeRule => ({
  id: 'waste_fee',
  fee_family: 'waste' as any,
  biller: 'port_authority',
  name: 'Waste fee',
  rate_structure: {
    type: 'flat',
    amount: 220,
    flat_plus_per_gt: {
      per_gt_rate: 0.05,
      ...(maximum !== undefined ? { per_gt_maximum: maximum } : {})
    }
  },
  source_reference: source
});

const cargoRule = (capPct?: number): FeeRule => ({
  id: 'cargo_dues',
  fee_family: 'cargo' as any,
  biller: 'port_authority',
  name: 'Cargo dues',
  rate_structure: {
    type: 'per_unit',
    unit_rate: 0.562,
    unit_type: 'cargo_tonnage_from_containers',
    ...(capPct !== undefined
      ? {
          cargo_tonnage: {
            weight_20_input: 'planning_weight_20ft',
            weight_40_input: 'planning_weight_40ft',
            round_to_whole_tonnes: true
          },
          gt_efficiency_cap: { cap_pct: capPct }
        }
      : {
          cargo_tonnage: {
            weight_20_input: 'planning_weight_20ft',
            weight_40_input: 'planning_weight_40ft',
            round_to_whole_tonnes: true
          }
        })
  },
  source_reference: source
});

describe('flat_plus_per_gt (spec v0.7.0, Rotterdam waste fee shape)', () => {
  it('uncapped: charges flat + GT x per_gt_rate for a small vessel (below the 35,600 GT break-even)', () => {
    // 20,000 GT: 220 + 20,000 x 0.05 = 1,220.00 — uncapped by design.
    const port = makePort([wasteRule(2000)]);
    const result = calculatePortCallCost(port, makeInput({ gt: 20000 }));
    const fee = feeByRule(result, 'waste_fee');
    expect(fee.amount).toBe(1220.00);
  });

  it('capped: the per_gt_maximum caps the whole fee at the MAREN GT — 220 + 194,849 x 0.05 = 9,962.45 uncapped, charged 2,000.00', () => {
    const port = makePort([wasteRule(2000)]);
    const result = calculatePortCallCost(port, makeInput({ gt: MAREN_GT }));
    const fee = feeByRule(result, 'waste_fee');
    // The maximum caps the WHOLE fee (flat + per-GT), never the per-GT
    // component alone: the MAREN total arithmetic leaves exactly 2,000.
    expect(fee.amount).toBe(2000.00);
  });

  it('composes the derivation steps: flat component, per-GT component, and the cap line when capped', () => {
    const port = makePort([wasteRule(2000)]);
    const result = calculatePortCallCost(port, makeInput({ gt: MAREN_GT }));
    const fee = feeByRule(result, 'waste_fee');
    const steps = stepsOf(fee);
    const labels = steps.map(s => s.label).join(' | ');
    expect(labels).toContain('Flat component');
    expect(labels).toContain('Per-GT component');
    expect(labels).toContain('Maximum applied');
    const capStep = steps.find(s => s.label === 'Maximum applied');
    expect(capStep!.detail).toContain('9962.45');
    expect(capStep!.detail).toContain('2000');
  });

  it('no maximum declared: the flat + per-GT charge stands uncapped at any GT', () => {
    const port = makePort([wasteRule()]); // no per_gt_maximum
    const result = calculatePortCallCost(port, makeInput({ gt: MAREN_GT }));
    const fee = feeByRule(result, 'waste_fee');
    expect(fee.amount).toBe(9962.45); // 220 + 194,849 x 0.05 = 9,742.45 + 220, uncapped
  });
});

describe('gt_efficiency_cap (spec v0.7.0, Rotterdam cargo dues shape)', () => {
  it('cap non-binding: a basis below the GT-implied ceiling charges uncapped — 20,000 t vs the 68,197.15 t MAREN ceiling, no cap step', () => {
    const port = makePort([cargoRule(35)]);
    const result = calculatePortCallCost(
      port,
      makeInput({}, {
        containers_loaded_le20ft: 250,
        containers_loaded_gt20ft: 250,
        containers_discharged_le20ft: 250,
        containers_discharged_gt20ft: 250,
        planning_weight_20ft: 14,
        planning_weight_40ft: 26
      } as any)
    );
    const fee = feeByRule(result, 'cargo_dues');
    // Tonnes: boxes20 = 500 x 14 + boxes40 = 500 x 26 = 20,000 t; uncapped
    // 20,000 x 0.562 = 11,240.00. GT ceiling: 194,849 x 35% = 68,197.15 t —
    // the entered basis is below the ceiling, so the cap does not bind: the
    // direction is pinned (the cap reduces only when the basis EXCEEDS the
    // ceiling).
    expect(fee.amount).toBe(11240.00);
    expect(stepsOf(fee).find(s => s.label === 'GT efficiency cap')).toBeUndefined();
  });

  it('cap binding: the MAREN shape — 194,849 GT x 35% ceiling, a basis above it capped to the verified 38,326.80 with the delta as a discount', () => {
    // The verified MAREN capped figure: 194,849 x 35% = 68,197.15 chargeable
    // tonnes x 0.562 = 38,326.80. An entered basis above the ceiling (here
    // 100,000 t, x 0.562 = 56,200.00 uncapped) is capped to 38,326.80; the
    // delta is shown as a discount (ceil on discounts).
    const port = makePort([cargoRule(35)]);
    const result = calculatePortCallCost(
      port,
      makeInput({}, {
        containers_loaded_le20ft: 1250,
        containers_loaded_gt20ft: 1250,
        containers_discharged_le20ft: 1250,
        containers_discharged_gt20ft: 1250,
        planning_weight_20ft: 14,
        planning_weight_40ft: 26
      } as any)
    );
    const fee = feeByRule(result, 'cargo_dues');
    // Tonnes: boxes20 = 2,500 x 14 + boxes40 = 2,500 x 26 = 100,000 t;
    // uncapped 100,000 x 0.562 = 56,200.00; capped 68,197.15 x 0.562 =
    // 38,326.80 (the verified figure).
    expect(fee.amount).toBe(38326.80);
    const capStep = stepsOf(fee).find(s => s.label === 'GT efficiency cap');
    expect(capStep).toBeDefined();
    expect(capStep!.detail).toContain('56200');
    expect(capStep!.detail).toContain('38326.8');
    expect(capStep!.amount).toBe(-17873.20);
  });
});

describe('loader validation (spec v0.7.0 extension shapes)', () => {
  it('rejects a negative per_gt_rate and a per_gt_maximum below the flat amount, and a cap_pct outside (0, 100]', () => {
    const badWaste = wasteRule(100); // maximum 100 < flat 220 — invalid
    (badWaste.rate_structure as any).flat_plus_per_gt.per_gt_rate = -0.05;
    const portA = makePort([badWaste]);
    const errorsA = validatePort(portA).errors.filter(e =>
      (e.path ?? '').startsWith('rate_structure.flat_plus_per_gt')
    );
    expect(errorsA.length).toBe(2); // negative rate + maximum below flat

    const badCargo = cargoRule(150); // cap_pct 150 > 100 — invalid
    const portB = makePort([badCargo]);
    const errorsB = validatePort(portB).errors.filter(e =>
      (e.path ?? '').startsWith('rate_structure.gt_efficiency_cap')
    );
    expect(errorsB.length).toBe(1);
  });
});
