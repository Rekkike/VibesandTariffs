// Hamburg terminal-scope UI pins (spec v0.2.49). A Hamburg call is priced
// against a named terminal operator: HHLA items only for HHLA calls (the
// reference default), Eurogate items only for Eurogate calls, port-wide
// charges either way. These pins hold the UI wiring (the operator selector
// drives the gate), the comparison strip's honest operator statement, the
// mobile cards, and the default-call invariance (HHLA default unchanged).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace, ComparisonView } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, CostCalculationInput, FeeResult, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

const feeLines = (result: ReturnType<typeof calculatePortCallCost>): FeeResult[] =>
  result.billers.flatMap(b => b.fees);

const engineRun = (op: string | undefined): ReturnType<typeof calculatePortCallCost> => {
  const call = { ...defaultCall('hamburg'), lay_time_hours: 50 } as CallInput;
  if (op !== undefined) call.terminal_operator = op;
  const input: CostCalculationInput = { vessel: DEFAULT_VESSEL, call };
  return calculatePortCallCost(HAMBURG, input);
};

describe('Hamburg terminal scope — engine gate via the web-resolved registry (spec v0.2.49)', () => {
  it('the registry (ports.json) carries the three Eurogate rules and the operator gates', () => {
    const ids = HAMBURG.fee_rules.map(r => r.id);
    expect(ids).toContain('eurogate_berthing_charge');
    expect(ids).toContain('eurogate_container_handling');
    expect(ids).toContain('eurogate_security_charge');
    const eg = HAMBURG.fee_rules.find(r => r.id === 'eurogate_berthing_charge')!;
    expect((eg as any).applicable_conditions?.terminal_operator).toBe('Eurogate');
    const td = HAMBURG.fee_rules.find(r => r.id === 'hhla_tonnage_dues')!;
    expect((td as any).applicable_conditions?.terminal_operator).toBe('HHLA');
  });

  it('the seeded default call (Eurogate) bills the promotion structure: berthing 553,371.16, no HHLA line (v0.2.66 re-baseline)', () => {
    const r = engineRun(undefined);
    const ids = feeLines(r).map(f => f.fee_rule_id as string);
    expect(ids.some(id => id.startsWith('hhla_'))).toBe(false);
    const berthing = feeLines(r).find(f => f.fee_rule_id === 'eurogate_berthing_charge')!;
    expect(berthing.amount).toBe(553371.16);
  });

  it('an HHLA call (the switchable variant) bills tonnage dues 711,198.85 and no Eurogate line (v0.2.66 re-point)', () => {
    const r = engineRun('HHLA');
    const ids = feeLines(r).map(f => f.fee_rule_id as string);
    expect(ids.some(id => id.startsWith('eurogate_'))).toBe(false);
    const tonnage = feeLines(r).find(f => f.fee_rule_id === 'hhla_tonnage_dues')!;
    expect(tonnage.amount).toBe(711198.85);
  });
});

describe('Hamburg terminal-scope UI wiring (spec v0.2.49)', () => {
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
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });
  };
  const renderWorkspace = async (vessel: VesselInput, call: CallInput) => {
    currentCall = call;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await rerender(vessel, call);
  };
  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const openOperatorMenu = async () => {
    const disclosures = Array.from(container!.querySelectorAll('button.disclosure-header'));
    const portSpecific = disclosures.find(b => (b.textContent ?? '').includes('Port-Specific Parameters'));
    if (portSpecific) {
      await act(async () => { portSpecific.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    const opLabel = Array.from(container!.querySelectorAll('label'))
      .find(l => (l.textContent ?? '') === 'Terminal Operator');
    expect(opLabel).toBeDefined();
    const opSelect = opLabel!.closest('.MuiFormControl-root')!.querySelector('.MuiSelect-select') as HTMLElement | null;
    expect(opSelect).toBeDefined();
    await act(async () => { opSelect!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  };
  const selectOption = async (label: string) => {
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const option = options.find(o => (o.textContent ?? '').startsWith(label));
    expect(option).toBeDefined();
    await act(async () => { option!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  };

  it('the operator selector renders both operators and the default call prices the Eurogate figures (v0.2.66 re-baseline)', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('hamburg'), lay_time_hours: 50 } as CallInput);
    await settleCalculation();
    const text = container!.textContent ?? '';
    // v0.2.66 promotion: the seeded default operator is Eurogate; the default
    // call bills the Eurogate structure (berthing 553,371.16 — script-computed,
    // §17.5; the HHLA figures price under the entered variant below).
    expect(text).toContain('553,371.16');
    expect(text).toContain('Berthing Charge / Tonnage Dues');
    await openOperatorMenu();
    const options = Array.from(document.querySelectorAll('li[role="option"]')).map(o => o.textContent ?? '');
    expect(options.some(o => o.startsWith('HHLA (CTA/CTB/CTT'))).toBe(true);
    expect(options.some(o => o.startsWith('EUROGATE Container Terminal Hamburg'))).toBe(true);
  });

  it('selecting HHLA suppresses the Eurogate lines and bills the HHLA structure (the wiring pin, v0.2.66 re-point)', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('hamburg'), lay_time_hours: 50 } as CallInput);
    await settleCalculation();
    expect(container!.textContent).toContain('553,371.16');
    await openOperatorMenu();
    await selectOption('HHLA (CTA/CTB/CTT');
    // onCallChange captured the new operator; rerender with it (the parent
    // owns the call state in production; the harness mirrors it)
    await act(async () => { await rerender({ ...DEFAULT_VESSEL }, { ...currentCall, terminal_operator: 'HHLA' }); });
    await settleCalculation();
    const text = container!.textContent ?? '';
    expect(text).toContain('711,198.85');
    expect(text).toContain('Tonnage Dues (Ship\'s Dues)');
    expect(text).not.toContain('553,371.16');
    expect(text).not.toContain('Berthing Charge / Tonnage Dues');
  });
});

describe('comparison context strip states the priced operator (spec v0.2.49)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  it('the default call strip states HHLA (default — the reference operator)', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...defaultCall('hamburg') } as CallInput}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
        />
      );
    });
    const strip = container!.querySelector('.comparison-context-strip');
    expect(strip).not.toBeNull();
    const text = strip!.textContent ?? '';
    expect(text).toContain('EUROGATE (default — the reference operator, published Prices and Conditions)');
    expect(text).not.toContain('HHLA (entered');
  });

  it('an entered HHLA call strip states HHLA (entered — switchable terminal variant)', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...defaultCall('hamburg'), terminal_operator: 'HHLA' } as CallInput}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
        />
      );
    });
    const strip = container!.querySelector('.comparison-context-strip');
    expect(strip).not.toBeNull();
    const text = strip!.textContent ?? '';
    expect(text).toContain('HHLA (entered — switchable terminal variant, Quay Tariff)');
    expect(text).not.toContain('EUROGATE (default');
  });
});
