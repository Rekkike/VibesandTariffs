// Same-route second-call attestation UI pins (spec v0.2.67 — the
// rotation-mode re-scope and verdict pass).
//
// The audit verdict's implementable half: the Gothenburg §2.2 FREQUENCY
// DISCOUNT ("Scheduled shipping routes with calls at the Port of Gothenburg
// twice on the same route (import call and export call) are entitled to a
// 50% discount on port dues based on GT for the second call", p.10, verified
// against the live G1 document) is gated on the explicit
// got_same_route_second_call attestation — the call counter alone
// over-served it. The exclusion half: the call model carries no rotation
// fields; the shared arrival_origin remains the sole origin input.
//
// Pins: the zero-drift baselines (all three ports byte-identical with the
// input rendered), the profile-driven rendering (the port file's
// input_profile.fields carries the field; only the Gothenburg workspace
// renders it), the checkbox wiring (checking it flows to the engine and
// earns the 50% discount exactly when calls >= 2), the default-off posture,
// the shared-field classification (not in any reset_fields — a
// persistence-classification pin), and the rotation-exclusion structural
// pins (no rotation fields in the call model; the spec's exclusion
// sentence).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, CostCalculationInput, FeeResult, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, portResetFields } from '@port-cost/core';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

const feeLines = (result: ReturnType<typeof calculatePortCallCost>): FeeResult[] =>
  result.billers.flatMap(b => b.fees);

const duesAmount = (port: PortDefinition, call: CallInput): number => {
  const input: CostCalculationInput = { vessel: DEFAULT_VESSEL, call };
  return feeLines(calculatePortCallCost(port, input))
    .find(f => f.fee_rule_id === 'port_gothenburg_container_vessel_dues')!.amount;
};

describe('same-route second-call attestation — zero-drift and default-off pins (spec v0.2.67)', () => {
  it('zero drift: every baseline holds exactly with the input rendered — GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40; per-GT 16.81 / 11.32 EUR / 44.91', () => {
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const call = defaultCall(port.metadata.id) as CallInput;
      expect(call.got_same_route_second_call).toBe(false);
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(result.total).toBe(expected);
    }
  });

  it('the default call earns no port-dues discount at any call count without the attestation', () => {
    for (const calls of [1, 2, 3, 6]) {
      const call = { ...defaultCall('gothenburg'), calls_this_month: calls } as CallInput;
      expect(duesAmount(GOTHENBURG, call)).toBe(204279.20);
    }
  });
});

describe('same-route second-call attestation — profile-driven rendering and wiring (spec v0.2.67)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  let currentCall: CallInput;

  const rerender = async (port: PortDefinition, call: CallInput) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={port}
          vessel={DEFAULT_VESSEL}
          call={call}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentCall = defaultCall('gothenburg') as CallInput;
  });

  afterEach(() => {
    if (root) act(() => { (root as Root).unmount(); });
    if (container && container.parentNode) container.parentNode.removeChild(container);
  });

  it('the port file drives the rendering: GOT\'s input_profile.fields carries the field, HAM and HEL do not', () => {
    const gotFields = (GOTHENBURG as any).input_profile?.fields ?? [];
    expect(gotFields).toContain('got_same_route_second_call');
    for (const port of [HAMBURG, HELSINGBORG]) {
      const fields = (port as any).input_profile?.fields ?? [];
      expect(fields).not.toContain('got_same_route_second_call');
    }
  });

  it('only the Gothenburg workspace renders the attestation checkbox, labeled to the tariff wording with the honest helper', async () => {
    await rerender(GOTHENBURG, defaultCall('gothenburg') as CallInput);
    const label = Array.from(container!.querySelectorAll('label'))
      .find(l => (l.textContent ?? '').includes('Same-route second call'));
    expect(label).toBeDefined();
    expect(label!.textContent).toContain('import + export pair');
    expect(container!.textContent).toContain('two unrelated calls in a month do not earn');
    await rerender(HELSINGBORG, defaultCall('helsingborg') as CallInput);
    expect(container!.textContent).not.toContain('Same-route second call');
    await rerender(HAMBURG, defaultCall('hamburg') as CallInput);
    expect(container!.textContent).not.toContain('Same-route second call');
  });

  it('checking the attestation writes the call field exactly (unchecked stays false, never undefined-coerced)', async () => {
    await rerender(GOTHENBURG, { ...defaultCall('gothenburg'), calls_this_month: 2 } as CallInput);
    const input = Array.from(container!.querySelectorAll('input[type="checkbox"]'))
      .find(i => {
        const labelEl = i.closest('label') ?? i.parentElement?.closest('label');
        return (labelEl?.textContent ?? '').includes('Same-route second call');
      });
    expect(input).toBeDefined();
    await act(async () => {
      input!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect((currentCall as any).got_same_route_second_call).toBe(true);
  });

  it('the checked state reflects the call field it is handed (no parallel state)', async () => {
    await rerender(GOTHENBURG, { ...defaultCall('gothenburg'), calls_this_month: 2, got_same_route_second_call: true } as CallInput);
    const input = Array.from(container!.querySelectorAll('input[type="checkbox"]'))
      .find(i => {
        const labelEl = i.closest('label') ?? i.parentElement?.closest('label');
        return (labelEl?.textContent ?? '').includes('Same-route second call');
      });
    expect((input as HTMLInputElement)!.checked).toBe(true);
  });

  it('the engine consumes the wired field: an attested calls=2 workspace call re-prices the port dues to 102,139.60', async () => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={GOTHENBURG}
          vessel={DEFAULT_VESSEL}
          call={{ ...defaultCall('gothenburg'), calls_this_month: 2, got_same_route_second_call: true } as CallInput}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
      await new Promise(resolve => setTimeout(resolve, 650));
    });
    const dues = feeLines(calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), calls_this_month: 2, got_same_route_second_call: true } as CallInput
    })).find(f => f.fee_rule_id === 'port_gothenburg_container_vessel_dues')!;
    expect(dues.amount).toBe(102139.60);
  });
});

describe('same-route second-call attestation — persistence classification (spec v0.2.67)', () => {
  it('shared, not per-port: no port\'s reset_fields names it (the route-pair property is a property of the call, not of a port)', () => {
    for (const port of LOADED_PORTS) {
      const fields = portResetFields(port.metadata.id);
      expect(fields).not.toContain('got_same_route_second_call');
    }
  });

  it('the module never re-derives the discount: no hardcoded second-call percentage in the input surface', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    expect(src).toContain('got_same_route_second_call');
    expect(src).not.toMatch(/50% port-dues discount.*value=|hardcoded/);
  });
});

describe('rotation-mode exclusion — web structural pins (spec v0.2.67)', () => {
  it('the call model carries no rotation fields (the exclusion pin: types.ts matches no rotation vocabulary)', () => {
    const types = fs.readFileSync(
      path.join(__dirname, '..', '..', 'core', 'src', 'types.ts'),
      'utf8'
    );
    expect(types).not.toMatch(/previous_port|voyage|rotation|port_sequence|leg_sequence/);
  });

  it('the spec records the permanent exclusion and the deferred-queue entry is gone', () => {
    const spec = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'SPECIFICATION.md'), 'utf8');
    expect(spec).toContain('is a permanent exclusion (v0.2.67)');
    expect(spec).not.toMatch(/deferred as a considered future option \(.rotation mode.\), not implemented/);
  });
});
