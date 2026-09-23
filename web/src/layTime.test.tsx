// Hamburg lay-time wiring and two-clock tier display tests (spec v0.2.46).
// The lay-time input (Lay Time at Berth hours) feeds hhla_tonnage_dues
// (tiered_per_period, S4 clause 1.2) and — via fallback_hours — the HPA
// demurrage (per_commenced_period, cat. 31 item B). These pins hold the
// UI wiring (changing the input changes the Hamburg result) and the
// two-clock derivation display (initial and subsequent tiers as distinct
// labeled steps with citations).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, CostCalculationInput, FeeResult, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

const feeByRule = (result: ReturnType<typeof calculatePortCallCost>, ruleId: string): FeeResult => {
  const fee = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === ruleId);
  if (!fee) throw new Error(`Fee rule ${ruleId} not found`);
  return fee;
};

// DEFAULT_VESSEL is 55,000 GT; defaultCall('hamburg') seeds lay_time_hours: 16.
const engineRun = (lay: number | undefined): ReturnType<typeof calculatePortCallCost> => {
  const call = { ...defaultCall('hamburg'), port_id: 'hamburg', lay_time_hours: lay } as CallInput;
  const input: CostCalculationInput = { vessel: DEFAULT_VESSEL, call };
  return calculatePortCallCost(HAMBURG, input);
};

describe('Hamburg lay-time wiring — engine figures (S4 clause 1.2 hand-computed)', () => {
  // 55,000 GT, hand-computed from clause 1.2:
  //   first 24 h: 55,000 × 1.25 = 68,750
  //   per commenced 12 h thereafter: 55,000 × 0.80 = 44,000 per period
  it('24 h: initial tier only — 55,000 × 1.25 = 68,750', () => {
    const td = feeByRule(engineRun(24), 'hhla_tonnage_dues');
    expect(td.amount).toBe(68750);
  });
  it('50 h: 24 h + 3 commenced 12-h periods — 68,750 + 132,000 = 200,750', () => {
    const td = feeByRule(engineRun(50), 'hhla_tonnage_dues');
    expect(td.amount).toBe(200750);
  });
  it('120 h: 24 h + 8 commenced 12-h periods — 68,750 + 352,000 = 420,750', () => {
    const td = feeByRule(engineRun(120), 'hhla_tonnage_dues');
    expect(td.amount).toBe(420750);
  });
  it('130 h: tonnage 464,750 and the HPA demurrage boundary fires at 10 h excess', () => {
    // 130 h: 24 h + 9 commenced 12-h periods (108 h beyond) = 68,750 + 396,000
    const td = feeByRule(engineRun(130), 'hhla_tonnage_dues');
    expect(td.amount).toBe(464750);
    // Demurrage (cat. 31 item B): excess = 130 − 120 = 10 h -> 1 commenced
    // 12-h period at 0.0165 EUR/GT: 55,000 × 0.0165 = 907.50
    const dem = feeByRule(engineRun(130), 'hpa_demurrage');
    expect(dem.amount).toBe(907.5);
  });
  it('blank lay time: tonnage dues absent (zero), zero-collapse behavior', () => {
    const r = engineRun(undefined);
    const fees = r.billers.flatMap(b => b.fees);
    expect(fees.find(f => f.fee_rule_id === 'hhla_tonnage_dues')).toBeUndefined();
    expect(fees.find(f => f.fee_rule_id === 'hpa_demurrage')).toBeUndefined();
  });
  it('demurrage stays silent at or below 120 h and fires past it', () => {
    expect(engineRun(120).billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hpa_demurrage')).toBeUndefined();
    expect(feeByRule(engineRun(120.01), 'hpa_demurrage').amount).toBe(907.5);
  });
});

describe('Two-clock tier display — derivation steps (spec v0.2.46)', () => {
  it('tonnage dues at 50 h: both tier steps labeled with rates, periods, amounts, and the citation', () => {
    const d = feeByRule(engineRun(50), 'hhla_tonnage_dues').derivation!;
    expect(d.structure_label).toBe('Tiered per period');
    const initial = d.steps.find(s => s.label === 'Initial tier')!;
    expect(initial.detail).toContain('First 24 hours of lay time');
    expect(initial.detail).toContain('1.25 EUR/GT');
    expect(initial.detail).toContain('quay-tariff-2026.pdf');
    expect(initial.amount).toBe(68750);
    const subsequent = d.steps.find(s => s.label === 'Subsequent tier')!;
    expect(subsequent.detail).toContain('per commenced 12 hours thereafter');
    expect(subsequent.detail).toContain('0.8 EUR/GT');
    expect(subsequent.detail).toContain('3 commenced periods');
    expect(subsequent.amount).toBe(132000);
    // Composition names both components
    const comp = d.steps.find(s => s.label === 'Components after tiers')!;
    expect(comp.components!.map(c => c.label)).toEqual([
      'First 24 h (1.25 EUR/GT)',
      'per commenced 12 h thereafter (0.8 EUR/GT)'
    ]);
    expect(comp.amount).toBe(200750);
  });
  it('24 h: only the initial-tier step, no subsequent-tier step', () => {
    const d = feeByRule(engineRun(24), 'hhla_tonnage_dues').derivation!;
    expect(d.steps.find(s => s.label === 'Initial tier')).toBeDefined();
    expect(d.steps.find(s => s.label === 'Subsequent tier')).toBeUndefined();
  });
  it('demurrage at 130 h: the tier step carries the rate, period, and citation (cat. 31 item B)', () => {
    const d = feeByRule(engineRun(130), 'hpa_demurrage').derivation!;
    expect(d.structure_label).toBe('Per commenced period');
    const tier = d.steps.find(s => s.label === 'Excess up to 120 h')!;
    expect(tier.detail).toContain('0.0165 EUR/GT');
    expect(tier.detail).toContain('per commenced 12 h');
    expect(tier.detail).toContain('pricelist-maritime-shipping-2026.pdf');
    expect(tier.amount).toBe(907.5);
  });
  it('the condensed comparison form states both components, not one merged number', () => {
    // condensedDerivation renders the composition components; the Hamburg
    // card/cell must read as two distinct charges.
    const { condensedDerivation } = require('./derivation');
    const td = feeByRule(engineRun(50), 'hhla_tonnage_dues');
    const c = condensedDerivation(td);
    expect(c!.composition).toContain('First 24 h (1.25 EUR/GT): 68,750');
    expect(c!.composition).toContain('per commenced 12 h thereafter (0.8 EUR/GT): 132,000');
    expect(c!.total).toBe('200,750.00');
  });
});

describe('Hamburg lay-time UI wiring (spec v0.2.46)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  let currentCall: CallInput;

  const rerender = async (vessel: VesselInput, call: CallInput) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={vessel}
          call={call}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
  };

  const settleCalculation = async () => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 650));
    });
  };

  const renderWorkspace = async (vessel: VesselInput, call: CallInput) => {
    currentCall = call;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await rerender(vessel, call);
  };

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('changing the lay-time input changes the Hamburg result and the derivation renders both tiers', async () => {
    const vessel: VesselInput = { ...DEFAULT_VESSEL };
    await renderWorkspace(vessel, { ...defaultCall('hamburg'), lay_time_hours: 50 });
    await settleCalculation();
    const text = container!.textContent ?? '';
    // The rendered result carries the 50-h tonnage dues figure
    expect(text).toContain('200,750');
    // The derivation detail shows both clocks as distinct labeled steps
    expect(text).toContain('First 24 hours of lay time');
    expect(text).toContain('per commenced 12 hours thereafter');
  });
});
