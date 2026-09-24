// Gothenburg waste-dues origin UI pins (spec v0.2.50). The waste dues split on
// the arrival origin — the previous port of call's region — never the flag.
// These pins hold: the registry's origin gates, the origin selector wiring
// (drives the waste figures), the comparison strip's honest origin statement,
// the compulsory-basis helper on the waste lines, the excess-input label to the
// tariff wording, the certificate checkbox, and the scrubber admin-only label.
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
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;

const feeLines = (result: ReturnType<typeof calculatePortCallCost>): FeeResult[] =>
  result.billers.flatMap(b => b.fees);

const engineRun = (origin: 'europe' | 'outside-europe' | undefined): ReturnType<typeof calculatePortCallCost> => {
  const call = { ...defaultCall('gothenburg') } as CallInput;
  if (origin !== undefined) call.arrival_origin = origin;
  else delete (call as any).arrival_origin;
  const input: CostCalculationInput = { vessel: DEFAULT_VESSEL, call };
  return calculatePortCallCost(GOTHENBURG, input);
};

describe('Gothenburg waste origin — engine gate via the web-resolved registry (spec v0.2.50)', () => {
  it('the registry (ports.json) carries the four origin-gated waste rules and no flag gate', () => {
    const ids = GOTHENBURG.fee_rules.map(r => r.id);
    expect(ids).toContain('port_gothenburg_waste_solid_eu');
    expect(ids).toContain('port_gothenburg_waste_solid_non_eu');
    expect(ids).toContain('port_gothenburg_waste_sludge_eu');
    expect(ids).toContain('port_gothenburg_waste_sludge_non_eu');
    for (const id of [
      'port_gothenburg_waste_solid_eu', 'port_gothenburg_waste_solid_non_eu',
      'port_gothenburg_waste_sludge_eu', 'port_gothenburg_waste_sludge_non_eu'
    ]) {
      const rule = GOTHENBURG.fee_rules.find(r => r.id === id)!;
      expect((rule as any).applicable_conditions?.arrival_origin).toBeDefined();
      expect((rule as any).applicable_conditions?.flag_state).toBeUndefined();
    }
  });

  it('the seeded default (outside Europe) prices sludge 0.31 / solid 0.24 on 194,849 GT with no fallback flag', () => {
    const r = engineRun('outside-europe');
    const sludge = feeLines(r).find(f => f.fee_rule_id === 'port_gothenburg_waste_sludge_non_eu')!;
    const solid = feeLines(r).find(f => f.fee_rule_id === 'port_gothenburg_waste_solid_non_eu')!;
    expect(sludge.amount).toBeCloseTo(194849 * 0.31, 2);
    expect(solid.amount).toBeCloseTo(194849 * 0.24, 2);
    expect(r.quality_flags.some(f => f.description.includes('Arrival origin'))).toBe(false);
  });

  it('a European arrival prices sludge 0.21 / solid 0.13 — and a US-flagged vessel on that leg pays the European rates (mismatch case)', () => {
    const call = { ...defaultCall('gothenburg'), arrival_origin: 'europe', flag_state: 'US' } as CallInput;
    const r = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call });
    expect(feeLines(r).find(f => f.fee_rule_id === 'port_gothenburg_waste_sludge_eu')!.amount)
      .toBeCloseTo(194849 * 0.21, 2);
    expect(feeLines(r).find(f => f.fee_rule_id === 'port_gothenburg_waste_solid_eu')!.amount)
      .toBeCloseTo(194849 * 0.13, 2);
  });

  it('an absent origin falls back to outside Europe with the visible fallback flag', () => {
    const r = engineRun(undefined);
    const ids = feeLines(r).map(f => f.fee_rule_id as string);
    expect(ids).toContain('port_gothenburg_waste_sludge_non_eu');
    expect(r.quality_flags.some(f =>
      f.type === 'fallback_value' && f.description.includes('Arrival origin not selected')
    )).toBe(true);
  });

  it('the EU 2022/91 certificate discounts the solid-waste line by 0.05 SEK/GT only', () => {
    const cert = { ...defaultCall('gothenburg'), waste_certificate_2022_91: true } as CallInput;
    const r = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: cert });
    const solid = feeLines(r).find(f => f.fee_rule_id === 'port_gothenburg_waste_solid_non_eu')!;
    expect(solid.amount).toBeCloseTo(194849 * (0.24 - 0.05), 2);
  });
});

describe('Gothenburg waste-origin UI wiring (spec v0.2.50)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  let currentCall: CallInput;

  const rerender = async (vessel: VesselInput, call: CallInput) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={GOTHENBURG}
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

  const openOriginMenu = async () => {
    const originLabel = Array.from(container!.querySelectorAll('label'))
      .find(l => (l.textContent ?? '') === 'Arrival Origin');
    expect(originLabel).toBeDefined();
    const originSelect = originLabel!.closest('.MuiFormControl-root')!.querySelector('.MuiSelect-select') as HTMLElement | null;
    expect(originSelect).toBeDefined();
    await act(async () => { originSelect!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  };
  const selectOption = async (label: string) => {
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const option = options.find(o => (o.textContent ?? '').startsWith(label));
    expect(option).toBeDefined();
    await act(async () => { option!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  };

  it('the origin selector renders with the default (outside Europe), the plain-words flag, and the default figures', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('gothenburg') } as CallInput);
    await settleCalculation();
    const text = container!.textContent ?? '';
    // Default (outside Europe) figures: sludge 60,403.19, solid 46,763.76 (194,849 GT)
    expect(text).toContain('60,403.19');
    expect(text).toContain('46,763.76');
    // The plain-words scenario statement
    expect(text).toContain("priced as an arrival from outside Europe — set 'From a European port' for the intra-Europe leg");
    await openOriginMenu();
    const options = Array.from(document.querySelectorAll('li[role="option"]')).map(o => o.textContent ?? '');
    expect(options.some(o => o.startsWith('From outside Europe'))).toBe(true);
    expect(options.some(o => o.startsWith('From a European port'))).toBe(true);
  });

  it('selecting "From a European port" reprices the waste lines to the European rates (the wiring pin)', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('gothenburg') } as CallInput);
    await settleCalculation();
    expect(container!.textContent).toContain('60,403.19'); // sludge non-EU
    await openOriginMenu();
    await selectOption('From a European port');
    await act(async () => { await rerender({ ...DEFAULT_VESSEL }, { ...currentCall, arrival_origin: 'europe' }); });
    await settleCalculation();
    const text = container!.textContent ?? '';
    // European rates on 194,849 GT: sludge 40,918.29, solid 25,330.37
    expect(text).toContain('40,918.29');
    expect(text).toContain('25,330.37');
    expect(text).not.toContain('60,403.19');
    expect(text).not.toContain('46,763.76');
  });

  it('the compulsory-basis helper sentence renders on the sludge and solid-waste lines (and never implies an optional fee)', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('gothenburg') } as CallInput);
    await settleCalculation();
    const helpers = container!.querySelectorAll('.waste-compulsory-helper');
    expect(helpers.length).toBeGreaterThanOrEqual(2);
    expect(helpers[0].textContent).toContain(
      'charged to all calling vessels in accordance with Swedish legislation; only a Transport Agency exemption relieves it (tariff §12)'
    );
  });

  it('the excess input is labeled to the tariff wording and the certificate checkbox renders off by default', async () => {
    await renderWorkspace({ ...DEFAULT_VESSEL }, { ...defaultCall('gothenburg') } as CallInput);
    await settleCalculation();
    // Port-specific disclosure carries the ancillary services
    const disclosures = Array.from(container!.querySelectorAll('button.disclosure-header'));
    const portSpecific = disclosures.find(b => (b.textContent ?? '').includes('Port-Specific Parameters'));
    if (portSpecific) {
      await act(async () => { portSpecific.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    }
    const text = container!.textContent ?? '';
    expect(text).toContain('sludge exceeding the 11 m³ included volume — 2,400 SEK/m³');
    expect(text).toContain('EU 2022/91 waste certificate held (−0.05 SEK/GT off solid waste)');
    // Scrubber honesty label unchanged
    expect(text).toContain('Scrubber waste disposal (800 SEK admin; actual cost separate)');
  });
});

describe('comparison context strip states the arrival origin honestly (spec v0.2.50)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  it('the default strip states From outside Europe with the worst-case note', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...defaultCall('gothenburg') } as CallInput}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
        />
      );
    });
    const strip = container!.querySelector('.comparison-context-strip');
    expect(strip).not.toBeNull();
    const text = strip!.textContent ?? '';
    expect(text).toContain('From outside Europe (default — the worst case');
    expect(text).toContain("set 'From a European port' for the intra-Europe leg");
    expect(text).not.toContain('From a European port (entered)');
  });

  it('an entered European-leg call strip states From a European port (entered)', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={{ ...defaultCall('gothenburg'), arrival_origin: 'europe' } as CallInput}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="MAREN MAERSK (IMO 9632129)"
        />
      );
    });
    const strip = container!.querySelector('.comparison-context-strip');
    expect(strip).not.toBeNull();
    const text = strip!.textContent ?? '';
    expect(text).toContain('From a European port (entered)');
    expect(text).not.toContain('From outside Europe (default');
  });
});
