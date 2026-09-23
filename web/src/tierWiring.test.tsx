// Engine-tier wiring tests (spec v0.2.44): the Hamburg tier Select is wired
// to the engine — selecting a tier changes the Hamburg result. This pins the
// v0.2.44 defect: the control's three sequential handleCallChange calls each
// spread a stale call prop, so the selection was lost and the control did
// nothing to the calculation. The fix batches the fields per selection.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import type { PortDefinition, VesselInput, CallInput } from '@port-cost/core/types';

const { defaultCall } = require('@port-cost/core');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

describe('Hamburg engine-tier wiring (spec v0.2.44)', () => {
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
  // The workspace recomputes on a 500 ms debounce; settle it before reading
  // the rendered result.
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
  const openTierMenu = async () => {
    const disclosures = Array.from(container!.querySelectorAll('button.disclosure-header'));
    const portSpecific = disclosures.find(b => (b.textContent ?? '').includes('Port-Specific Parameters'));
    if (portSpecific) {
      await act(async () => {
        portSpecific.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
    // v0.2.45 field-display contract: the closed Select renders the applied
    // state ("Tier X — inferred from build year YYYY" / "Tier X — entered" /
    // "Not entered — worst case Tier 0 applied"), so the old text-based
    // locator ("Not entered") no longer identifies the field. Locate it via
    // its label instead — same control, same behavior pins below.
    const tierLabel = Array.from(container!.querySelectorAll('label'))
      .find(l => (l.textContent ?? '').includes('Engine Tier (IAPP, most polluting engine)'));
    expect(tierLabel).toBeDefined();
    const tierSelect = tierLabel!.closest('.MuiFormControl-root')!.querySelector('.MuiSelect-select') as HTMLElement | null;
    expect(tierSelect).toBeDefined();
    await act(async () => {
      tierSelect!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
  };
  const selectOption = async (label: string) => {
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const option = options.find(o => (o.textContent ?? '').startsWith(label));
    expect(option).toBeDefined();
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };
  it('selecting Tier II changes the Hamburg result and stores the tier (the defect pin)', async () => {
    const vessel: VesselInput = { gt: 21979, built_year: 2012 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    await settleCalculation();
    const before = container!.textContent ?? '';
    await openTierMenu();
    await selectOption('Tier II');
    expect(currentCall.engine_tier).toBe('Tier II');
    expect(currentCall.engine_tier_estimated).toBe(false);
    expect(currentCall.infer_engine_tier_from_build_year).toBe(false);
    // Re-render with the changed call (as the parent state would) and
    // verify the result moved: Tier 0 (+30%) -> Tier II (+5%) lowers the
    // environmental component and the port fee.
    await rerender(vessel, currentCall);
    await settleCalculation();
    const after = container!.textContent ?? '';
    expect(after).not.toBe(before);
    // 20,000 x 0.0214 + 1,979 x 0.0746 = 575.63 base; Tier II +5% -> 604.41
    expect(after).toContain('604.41');
  });
  it('the selection is atomic: no clobbering between the three wired fields', async () => {
    const vessel: VesselInput = { gt: 21979, built_year: 2012 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg') });
    await openTierMenu();
    await selectOption('Tier 0 / no IAPP');
    // All three fields set by the handler survive in one update — the
    // stale-prop defect lost engine_tier to the last handleCallChange call.
    expect(currentCall.engine_tier).toBe('Tier 0');
    expect(currentCall.engine_tier_estimated).toBe(false);
    expect(currentCall.infer_engine_tier_from_build_year).toBe(false);
  });
  it('not entered + build year present: the engine infers the tier per Regulation 13 and flags it in the UI', async () => {
    // 2012 per Regulation 13 -> Tier II (+5%), rendered with the inference
    // flag adjacent (v0.2.42 derivation contract): env 604.41.
    const vessel: VesselInput = { gt: 21979, built_year: 2012 };
    await renderWorkspace(vessel, { ...defaultCall('hamburg'), engine_tier: undefined });
    await settleCalculation();
    const text = container!.textContent ?? '';
    expect(text).toContain('604.41');
    expect(text).toContain('engine tier inferred from build year');
  });
});
