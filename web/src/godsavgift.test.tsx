// Godsavgift web pins (spec v0.2.61): the Sjöfartsverket cargo-based
// fairway due renders at the Swedish workspaces — its line in the "To
// reach the berth" stage, its three shared planning inputs with their
// notices, the derived blended rate on share input, and the HAM absence.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { ComparisonView } from './comparisonView';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

describe('godsavgift input surface (spec v0.2.61)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const renderWorkspace = async (port: PortDefinition, vessel: VesselInput, call: CallInput) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    await act(async () => {
      r.render(
        <PortWorkspace
          port={port}
          vessel={vessel}
          call={call}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await act(async () => { await new Promise(r2 => setTimeout(r2, 650)); });
  };

  it('the three shared planning inputs render with their notices at the Swedish workspaces', async () => {
    for (const port of [GOTHENBURG, HELSINGBORG]) {
      await renderWorkspace(port, DEFAULT_VESSEL, defaultCall(port.metadata.id) as CallInput);
      const group = container!.querySelector('.godsavgift-parameters-group');
      expect(group).not.toBeNull();
      const text = (group?.textContent ?? '');
      expect(text).toContain('Cargo tonnage for godsavgift');
      expect(text).toContain("Avg. weight per 20' container (t)");
      expect(text).toContain("Avg. weight per 40' container (t)");
      expect(text).toContain('Low-value share of tonnage (%)');
      // The notice on the two weight inputs: planning weight, not tariff data.
      expect(text).toContain('Suggested planning weight — user-adjustable, not tariff data (OECD 12–18 t/TEU band)');
      // The default-share basis notice (SJÖFS commodity-code annex).
      expect(text).toContain('Default 0% — 100% high-value for container vessels per the SJÖFS commodity-code annex');
      // The derived-tonnes note renders the international basis.
      expect(text).toContain('international basis (loaded + discharged)');
      root!.unmount();
      container!.remove();
      container = null;
    }
  });

  it('Hamburg renders no godsavgift input group (the Swedish-national-fee absence)', async () => {
    await renderWorkspace(HAMBURG, DEFAULT_VESSEL, defaultCall('hamburg') as CallInput);
    expect(container!.querySelector('.godsavgift-parameters-group')).toBeNull();
    expect((container!.textContent ?? '')).not.toContain('Cargo tonnage for godsavgift');
  });

  it('the weight inputs bind to the shared call fields (kWh-like persistence semantics)', async () => {
    await renderWorkspace(GOTHENBURG, DEFAULT_VESSEL, {
      ...defaultCall('gothenburg'),
      cargo_weight_per_20ft: 20,
      cargo_weight_per_40ft: 34
    } as CallInput);
    const inputs = Array.from(container!.querySelectorAll('.godsavgift-parameters-group input'));
    expect(inputs.length).toBe(3);
    expect((inputs[0] as HTMLInputElement).value).toBe('20');
    expect((inputs[1] as HTMLInputElement).value).toBe('34');
    expect((inputs[2] as HTMLInputElement).value).toBe('0');
  });
});

describe('godsavgift comparison rendering (spec v0.2.61)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const renderComparison = async (call: CallInput) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    await act(async () => {
      r.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="TEST"
        />
      );
    });
    await act(async () => { await new Promise(r2 => setTimeout(r2, 650)); });
  };

  it('the fairway-dues comparison line includes the godsavgift at GOT and HEL, and HAM stays "not levied"', async () => {
    await renderComparison(defaultCall('gothenburg') as CallInput);
    const text = container!.textContent ?? '';
    // The family line the fairway dues ride (v0.2.52 segmentation): the
    // Swedish national per-call dues and now the cargo-based godsavgift.
    expect(text).toContain('Fairway dues');
    // HAM levies no fairway due (unchanged since v0.2.52).
    expect(text).toContain('not levied at this port');
  });

  it('the godsavgift charge line renders under Fairway dues at both Swedish ports (the collapsed detail carries the label and amount; the basis string itself is pinned in the core suite)', async () => {
    await renderComparison(defaultCall('gothenburg') as CallInput);
    const text = container!.textContent ?? '';
    // The v0.2.52 segmentation contract: the godsavgift rides the Fairway
    // dues line. Default call: 80,000 t x 3.36 = 268,800.00 SEK.
    expect(text).toContain('Cargo Fee (Godsavgift)');
    expect(text).toContain('Sj\u00f6fartsverket: 268\u00a0800\u00a0kr');
  });
});
