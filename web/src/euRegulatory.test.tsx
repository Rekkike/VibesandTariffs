// EU regulatory block — web pins (spec v0.2.69, the regulatory-block pass).
//
// The surface pins: the ETS input group renders at every port (the
// eu_regulatory profile section), the inputs are per-port persisted state
// (the reset_fields union), blank inputs render no line and change no total
// (zero drift), the FuelEU notice renders as its own badge with the
// instrument's figures, and the comparison carries the regulatory family in
// the reach-berth stage (the classification adjudication).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, CostCalculationInput, FeeResult, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, portResetFields, portInputProfile, allPortResetFields } from '@port-cost/core';
import { stageForFamily } from './chargeTypes';
import { badgesForFlags } from './flagBadges';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;

const feeLines = (result: ReturnType<typeof calculatePortCallCost>): FeeResult[] =>
  result.billers.flatMap(b => b.fees);

describe('EU regulatory block — data and rendering pins (spec v0.2.69)', () => {
  it('every port\'s input_profile carries the eu_regulatory section (the instruments are EU-wide and port-blind)', () => {
    for (const port of LOADED_PORTS) {
      const sections = (port as any).input_profile?.sections ?? [];
      expect(sections.some((s: any) => s.id === 'eu_regulatory')).toBe(true);
    }
  });

  it('both ETS inputs are per-port state at every port (the reset_fields union; a data-contract change carried with its pins)', () => {
    for (const port of LOADED_PORTS) {
      const rf = portResetFields(port.metadata.id);
      expect(rf).toContain('ets_emissions_tco2');
      expect(rf).toContain('ets_allowance_price');
    }
    const union = allPortResetFields();
    expect(union).toContain('ets_emissions_tco2');
    expect(union).toContain('ets_allowance_price');
  });

  it('zero drift: the pre-existing baselines hold byte-identically with the block (blank inputs render no ETS line; the FuelEU notice is zero-amount)', () => {
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const call = defaultCall(port.metadata.id) as CallInput;
      expect(call.ets_emissions_tco2).toBeUndefined();
      expect(call.ets_allowance_price).toBeUndefined();
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(result.total).toBe(expected);
      // The FuelEU notice line is present, zero-amount, flagged — never additive.
      const notice = feeLines(result).find(f => f.fee_rule_id.endsWith('_fueleu_notice'));
      expect(notice).toBeDefined();
      expect(notice!.amount).toBe(0);
      // The ETS line with blank inputs renders nothing.
      expect(feeLines(result).find(f => f.fee_rule_id.endsWith('_eu_ets_allowances'))).toBeUndefined();
    }
  });

  it('an entered ETS figure adds to the total by exactly the ETS amount at each port (the additive contract)', () => {
    for (const port of LOADED_PORTS) {
      const blank = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: defaultCall(port.metadata.id) as CallInput });
      const withEts = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(port.metadata.id), ets_emissions_tco2: 1000, ets_allowance_price: 70 } as CallInput
      });
      expect(withEts.total).toBe(Math.round((blank.total + 70000) * 100) / 100);
    }
  });

  it('the FuelEU notice badge: the regulatory_notice flag renders as its own badge (badge honesty, never a generic flag count)', () => {
    const result = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput });
    const notice = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_fueleu_notice')!;
    const badges = badgesForFlags(notice.quality_flags);
    const noticeBadge = badges.find(b => b.label === 'FuelEU notice');
    expect(noticeBadge).toBeDefined();
    expect(noticeBadge!.title).toContain('91.16 gCO2e/MJ');
    expect(noticeBadge!.title).toContain('2,400 EUR');
    expect(noticeBadge!.title).toContain('ANNUAL');
  });

  it('the ETS line badge names the user-specified basis (never a verified-data badge)', () => {
    const result = calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), ets_emissions_tco2: 1000, ets_allowance_price: 70 } as CallInput
    });
    const ets = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_eu_ets_allowances')!;
    const badges = badgesForFlags(ets.quality_flags);
    expect(badges.some(b => b.label === 'ETS user basis')).toBe(true);
  });

  it('the stage adjudication: the regulatory family maps to the reach-berth stage (statutory call dues; no new stage)', () => {
    expect(stageForFamily('regulatory')).toBe('reach_berth');
  });

  it('the comparison\'s stage description sentence still covers the family (the "and similar" statutory-dues company)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'chargeTypes.ts'), 'utf8');
    expect(src).toContain("regulatory: 'reach_berth'");
  });

  it('below 5,000 GT the block renders nothing at any port (the exemption is entire)', () => {
    for (const port of LOADED_PORTS) {
      const result = calculatePortCallCost(port, {
        vessel: { ...DEFAULT_VESSEL, gt: 4999 },
        call: { ...defaultCall(port.metadata.id), ets_emissions_tco2: 1000, ets_allowance_price: 70 } as CallInput
      });
      expect(feeLines(result).filter(f => f.fee_family === 'regulatory')).toEqual([]);
    }
  });
});

describe('EU regulatory block — the ETS input surface (spec v0.2.69)', () => {
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

  it('the input group renders at every port with the user-specified disclosure and the leg-scope note', async () => {
    for (const port of LOADED_PORTS) {
      await rerender(port, defaultCall(port.metadata.id) as CallInput);
      const labels = Array.from(container!.querySelectorAll('label')).map(l => l.textContent ?? '');
      expect(labels.some(l => l.includes('ETS in-scope emissions'))).toBe(true);
      expect(labels.some(l => l.includes('EUA allowance price'))).toBe(true);
      const note = container!.querySelector('.eu-regulatory-group-note');
      expect(note).toBeTruthy();
      expect(note!.textContent).toContain('user-specified basis');
      expect(note!.textContent).toContain('5,000 GT');
      expect(note!.textContent).toContain('50 percent');
    }
  });

  it('entering the inputs writes exactly the two call fields through the same change handler (no parallel state)', async () => {
    await rerender(GOTHENBURG, defaultCall('gothenburg') as CallInput);
    const emissionsField = Array.from(container!.querySelectorAll('input'))
      .find(i => (i.closest('.MuiTextField-root')?.textContent ?? '').includes('ETS in-scope emissions'));
    expect(emissionsField).toBeTruthy();
    const setter = (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set)!;
    await act(async () => {
      setter.call(emissionsField!, '1000');
      emissionsField!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(currentCall.ets_emissions_tco2).toBe(1000);
    expect(currentCall.ets_allowance_price).toBeUndefined();
  });

  it('the EUA helper text carries the market-basis disclosure with the observed 2024 band citation, and no default value', async () => {
    await rerender(GOTHENBURG, defaultCall('gothenburg') as CallInput);
    const helpers = Array.from(container!.querySelectorAll('.MuiFormHelperText-root')).map(h => h.textContent ?? '');
    const priceHelper = helpers.find(h => h.includes('EEX auction band'));
    expect(priceHelper).toBeTruthy();
    expect(priceHelper).toContain('49.50-75.35 EUR/tCO2');
    expect(priceHelper).toContain('never an encoded rate');
    // The input renders blank (undefined), never a seeded number.
    const priceField = Array.from(container!.querySelectorAll('input'))
      .find(i => (i.closest('.MuiTextField-root')?.textContent ?? '').includes('EUA allowance price'));
    expect((priceField as HTMLInputElement).value).toBe('');
  });
});
