// Tier-field visibility tests (spec v0.2.45). The Engine Tier field shows
// the tier actually applied, not merely what was typed: entered, inferred
// from build year, or the restated worst-case label. The effect line states
// the tier percentage and the component it acts on, sourced from the same
// tier-percentage map the guidance uses (one source of truth). The field
// display and the derivation-detail adjustment step must name the same
// tier. Presentation only — the tierWiring suite (v0.2.44) pins behavior
// and must pass unchanged alongside these.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { TIER_PCT, tierEffectLine } from './envGuidance';
import { calculatePortCallCost } from '@port-cost/core';
import type { CostCalculationInput, FeeResult, PortDefinition, VesselInput, CallInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

const { defaultCall } = require('@port-cost/core');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

// The Select's rendered display element carries the applied-state label.
const tierFieldText = (container: HTMLElement): string | undefined => {
  const selects = Array.from(container.querySelectorAll('.MuiSelect-select')) as HTMLElement[];
  const tier = selects.find(s => (s.textContent ?? '').match(/Tier|Not entered/));
  return tier?.textContent ?? undefined;
};

describe('Tier-field visibility (spec v0.2.45)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  const renderWorkspace = async (vessel: VesselInput, call: CallInput) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={vessel}
          call={call}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
  };

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('build year present, tier blank: the field shows the inferred tier with its source', async () => {
    const vessel: VesselInput = { gt: 21979, built_year: 2018 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    expect(tierFieldText(container!)).toContain('Tier III — inferred from build year 2018');
    // The applied state is never read back as "not entered" while a tier
    // other than Tier 0 applies (contract sentence).
    expect(tierFieldText(container!)).not.toMatch(/^Not entered/);
  });

  it('tier explicitly entered: the field shows the entered state, distinct from inference', async () => {
    const vessel: VesselInput = { gt: 21979, built_year: 2012 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg'), engine_tier: 'Tier II', engine_tier_estimated: false });
    expect(tierFieldText(container!)).toContain('Tier II — entered');
    expect(tierFieldText(container!)).not.toContain('inferred');
  });

  it('both blank: the field keeps the worst-case label, restated to say what it means', async () => {
    const vessel: VesselInput = { gt: 21979 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    expect(tierFieldText(container!)).toContain('Not entered — worst case Tier 0 applied');
  });

  it('the effect line states the tier percentage and the component it acts on, for every tier in the map', () => {
    // The map is the guidance's own (envGuidance TIER_PCT, port-file
    // tier_pct), exported as the single source of truth for both surfaces.
    expect(TIER_PCT).toEqual({ 'Tier 0': 30, 'Tier I': 25, 'Tier II': 5, 'Tier III': -20 });
    for (const [tier, pct] of Object.entries(TIER_PCT)) {
      const line = tierEffectLine(tier);
      expect(line).toContain(tier);
      expect(line).toContain('environmental component');
      expect(line).toContain(`${pct < 0 ? '\u2212' : '+'}${Math.abs(pct)}%`);
    }
  });

  it('the field renders the effect line and the resolution-order helper sentence', async () => {
    const vessel: VesselInput = { gt: 21979, built_year: 2018 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    const text = container!.textContent ?? '';
    expect(text).toContain('Tier III: \u221220% on the environmental component');
    expect(text).toContain('Explicit entry wins; otherwise inferred from build year per Regulation 13; otherwise worst case Tier 0.');
  });

  it('the derivation adjustment step and the field name the same tier (agreement pin)', async () => {
    // Field display, built 2018, blank tier: "Tier III — inferred from
    // build year 2018". The engine derivation for the same call names
    // "Tier III" in its adjustment step — the two surfaces agree.
    const vessel: VesselInput = { gt: 21979, built_year: 2018 };
    const call = { ...defaultCall('hamburg'), port_id: 'hamburg' } as CallInput;
    const input: CostCalculationInput = { vessel, call };
    const result = calculatePortCallCost(HAMBURG, input);
    const portFee = result.billers
      .flatMap(b => b.fees)
      .find((f: FeeResult) => f.fee_rule_id === 'hpa_port_fee') as FeeResult;
    const tierStep = portFee.derivation!.steps.find(s => s.label.includes('Tier adjustment'))!;
    expect(tierStep.detail).toContain('Tier III');
    // The field, rendered for the same inputs, names the same tier
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    expect(tierFieldText(container!)).toContain('Tier III');
  });
});
