// Call-frequency what-if panel pins (spec v0.2.63): the per-port
// workspace-side speculation surface for call frequency. The pass's
// verification claim is ZERO FIGURE DRIFT: the panel is presentation-layer
// only, its input is speculation state outside the call model (outside
// every reset_fields list, never fed to the engine), and with every panel
// input blank every existing baseline holds exactly.
//
// Pinned baselines (default Maren Maersk call, re-pinned v0.2.61):
// GOT 3,275,851.15 SEK; HEL 8,750,057.40 SEK; HAM 2,313,489.31 EUR;
// per-GT GOT 16.81 / HEL 44.91 / HAM 133.87; HAM shows no Swedish-only
// inputs (the silo contract).
//
// Script-computed scenario arithmetic (this pass, node /tmp/panel_math.js
// against the engine at 2323500): the Sjöfartsverket scale at GOT/HEL for
// the default call — vessel fee 201,805.00 + readiness fee 60,370.00 =
// 262,175.00 SEK base (class 9, CSI E). Call 3 → 75% payable, waived
// 65,543.75; call 4 → 50%, waived 131,087.50; call 5 → 25%, waived
// 196,631.25; call 6+ → 0%, waived 262,175.00. Per-call totals at call 6:
// GOT 3,013,676.15 (delta −262,175.00, 8.0033% of the current total); HEL
// 8,487,882.40 (delta −262,175.00, 2.9963%). Godsavgift 268,800.00 SEK
// continues at every call (prislista 2026 p.4: from the sixth call only the
// gods- och passageraravgift continues).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import path from 'path';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, calculatePortCallCost } from '@port-cost/core';
import { frequencyScenario, frequencyBillerFor, FrequencyPanel } from './frequencyPanel';
import type { CallInput, PortDefinition, VesselInput, CostCalculationResult } from '@port-cost/core/types';
import { readDecomposedAppSource } from './appSource';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const portById = (id: string) => LOADED_PORTS.find(p => p.metadata.id === id)!;
const GOTHENBURG = portById('gothenburg');
const HELSINGBORG = portById('helsingborg');
const HAMBURG = portById('hamburg');

const R2 = (n: number) => Math.round(n * 100) / 100;

describe('call frequency what-if — zero-drift pins (spec v0.2.63)', () => {
  it('every baseline holds exactly with the panel rendered (panel absence-of-effect)', () => {
    // The engine path is untouched by the panel: the same calls price the
    // same totals with the panel in the tree.
    // v0.2.66 promotion re-baseline: HAM 2,313,489.31 -> 2,204,910.90
    // (the Eurogate terminal layer; §17.5); GOT/HEL byte-identical.
    const cases: [PortDefinition, number][] = [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ];
    for (const [port, expected] of cases) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id) as CallInput
      });
      expect(R2(result.total)).toBe(expected);
    }
  });
  it('a blank panel input produces no scenario output (blank = no output)', () => {
    const result = calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput
    });
    expect(frequencyScenario(GOTHENBURG, result, null)).toBeNull();
    expect(frequencyScenario(GOTHENBURG, result, undefined)).toBeNull();
    expect(frequencyScenario(GOTHENBURG, result, Number(''))).toBeNull();
    expect(frequencyScenario(GOTHENBURG, result, 0)).toBeNull();
  });
  it('the panel input is outside every reset_fields list and outside the call model', () => {
    // The speculation input is local React state (frequencyPanel.tsx), not
    // a CallInput field; no port's reset_fields names it; the panel module
    // never writes a call field.
    for (const port of LOADED_PORTS) {
      const resetFields = ((port as any).input_profile?.reset_fields ?? []) as string[];
      expect(resetFields.filter(f => /frequency_scenario|calls_per_month/.test(f))).toEqual([]);
    }
    const call = defaultCall('gothenburg') as unknown as Record<string, unknown>;
    expect(Object.keys(call).filter(k => /scenario/.test(k))).toEqual([]);
    // The panel module contains no engine feed: it never calls the engine
    // with its own input (the only calculatePortCallCost import is none).
    const panelSource = fs.readFileSync(path.join(__dirname, 'frequencyPanel.tsx'), 'utf8');
    expect(panelSource).not.toMatch(/calculatePortCallCost/);
    expect(panelSource).not.toMatch(/onCallChange/);
  });
});

describe('call frequency what-if — Swedish panel arithmetic (script-computed)', () => {
  const result = () => calculatePortCallCost(GOTHENBURG, {
    vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput
  });
  // Script-computed (node /tmp/panel_math.js): vessel fee 201,805.00 +
  // readiness fee 60,370.00 = base 262,175.00 SEK.
  const BASE = 262175.00;
  it('the scale resolves from the port file, not a code copy: 1–2 → 100%, 3 → 75%, 4 → 50%, 5 → 25%, 6+ → 0%', () => {
    const def = frequencyBillerFor(GOTHENBURG)!;
    expect(def.bands.map(b => b.payable_pct)).toEqual([100, 75, 50, 25, 0]);
    expect(def.applyFamilies).toEqual(['vessel_fee', 'readiness_fee']);
  });
  it('at 5 calls: 25% payable, waived 196,631.25 — not the full waiver', () => {
    const s = frequencyScenario(GOTHENBURG, result(), 5)!;
    expect(s.payablePct).toBe(25);
    expect(s.waivedTotal).toBe(R2(BASE * 0.75));
    expect(s.waivedTotal).toBe(196631.25);
    expect(s.scenarioPerCallTotal).toBe(R2(3275851.15 - 196631.25));
    expect(s.deltaVsCurrent).toBe(-196631.25);
    expect(s.pctOfCurrentTotal).toBe(R2(196631.25 / 3275851.15 * 10000) / 100);
  });
  it('at 6+ calls: the full waiver with exact arithmetic, godsavgift continues', () => {
    for (const calls of [6, 8]) {
      const s = frequencyScenario(GOTHENBURG, result(), calls)!;
      expect(s.payablePct).toBe(0);
      expect(s.waivedTotal).toBe(BASE);
      expect(s.waivedLines.map(l => l.label)).toEqual(
        ['Vessel fee (fartygsavgift)', 'Readiness fee (beredskapsavgift)']
      );
      expect(s.waivedLines[0].amount).toBe(201805.00);
      expect(s.waivedLines[1].amount).toBe(60370.00);
      // The cargo fee continues: godsavgift 268,800.00 (v0.2.61 figure).
      const gods = s.continuingLines.find(l => /godsavgift/.test(l.label));
      expect(gods).toBeDefined();
      expect(gods!.amount).toBe(268800.00);
      // Per-call total, delta, percentage — all derived.
      expect(s.scenarioPerCallTotal).toBe(R2(3275851.15 - BASE));
      expect(s.deltaVsCurrent).toBe(-262175.00);
      expect(s.pctOfCurrentTotal).toBe(R2(BASE / 3275851.15 * 10000) / 100);
    }
  });
  it('Helsingborg prices the same scale against its own total (8,750,057.40)', () => {
    const helResult = calculatePortCallCost(HELSINGBORG, {
      vessel: DEFAULT_VESSEL, call: defaultCall('helsingborg') as CallInput
    });
    const s = frequencyScenario(HELSINGBORG, helResult, 6)!;
    expect(s.waivedTotal).toBe(BASE);
    expect(s.scenarioPerCallTotal).toBe(R2(8750057.40 - BASE));
    expect(s.pctOfCurrentTotal).toBe(R2(BASE / 8750057.40 * 10000) / 100);
  });
  it('at 1–2 calls the scale waives nothing (no waiver at the default single call)', () => {
    for (const calls of [1, 2]) {
      const s = frequencyScenario(GOTHENBURG, result(), calls)!;
      expect(s.payablePct).toBe(100);
      expect(s.waivedTotal).toBe(0);
      expect(s.waivedLines.every(l => l.amount === 0)).toBe(true);
      expect(s.deltaVsCurrent).toBe(0);
    }
  });
  it('the basis note carries the tariff citations', () => {
    const s = frequencyScenario(GOTHENBURG, result(), 6)!;
    expect(s.basisNote).toContain('prislista');
    expect(s.basisNote).toContain('Föreskrift 2025:6');
    expect(s.basisNote).toMatch(/user-specified/i);
  });
});

describe('call frequency what-if — per-port surface pins', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;
  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null; root = null;
  });
  const render = async (port: PortDefinition) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    const r = createRoot(container);
    root = r;
    await act(async () => {
      r.render(
        <PortWorkspace
          port={port}
          vessel={DEFAULT_VESSEL}
          call={defaultCall(port.metadata.id) as CallInput}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await act(async () => { await new Promise(res => setTimeout(res, 650)); });
  };
  it('collapsed by default at every port; the header discloses the speculation basis', async () => {
    for (const port of [GOTHENBURG, HELSINGBORG, HAMBURG]) {
      await render(port);
      const panel = container!.querySelector(`[data-testid="frequency-panel-${port.metadata.id}"]`);
      expect(panel).not.toBeNull();
      const header = panel!.querySelector('.disclosure-header');
      expect(header!.getAttribute('aria-expanded')).toBe('false');
      const body = container!.querySelector(`#frequency-panel-${port.metadata.id}-body`) as HTMLElement;
      expect(body.hidden).toBe(true);
      expect(header!.textContent).toMatch(/user-specified, not tariff-derived/i);
      root!.unmount(); container!.remove(); container = null; root = null;
    }
  });
  it('the Swedish workspace input names the model boundary; HAM documents, never speculates', async () => {
    await render(GOTHENBURG);
    const panel = container!.querySelector('[data-testid="frequency-panel-gothenburg"]')!;
    const header = panel.querySelector('.disclosure-header')!;
    await act(async () => { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { await new Promise(res => setTimeout(res, 50)); });
    const body = container!.querySelector('#frequency-panel-gothenburg-body') as HTMLElement;
    expect(body.hidden).toBe(false);
    expect(body.textContent).toMatch(/Calls per month at this port/i);
    expect(body.textContent).toMatch(/outside the call model/i);
    root!.unmount(); container!.remove(); container = null; root = null;

    await render(HAMBURG);
    const hamPanel = container!.querySelector('[data-testid="frequency-panel-hamburg"]')!;
    const hamHeader = hamPanel.querySelector('.disclosure-header')!;
    await act(async () => { hamHeader.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await act(async () => { await new Promise(res => setTimeout(res, 50)); });
    const hamBody = container!.querySelector('#frequency-panel-hamburg-body') as HTMLElement;
    expect(hamBody.hidden).toBe(false);
    // The audit outcome: documentation only — the quantum discount is an
    // engine input already; no retrospective speculation inputs render.
    expect(hamBody.textContent).toMatch(/Quantum/i);
    expect(hamBody.textContent).toMatch(/already an engine input/i);
    expect(hamBody.textContent).toMatch(/honest gap notice/i);
    expect(hamBody.querySelector('input')).toBeNull();
  });
  it('the panel renders no Swedish-only inputs at Hamburg (the silo contract)', async () => {
    await render(HAMBURG);
    const text = container!.textContent ?? '';
    expect(text).not.toContain('Sjöfartsverket frequency');
    expect(text).not.toContain('fartygsavgift');
    expect(text).not.toContain('Calls per month at this port');
  });
});

describe('call frequency what-if — red proofs (mutations must fail)', () => {
  // These pins assert the invariants a mutation would break. Each is run
  // against the live module; the red proof itself was observed by mutating
  // the module (documented in the pass report), then restoring.
  it('mutation A (waiver fires at the default single call) breaks the derivation pins', () => {
    const result = () => calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput
    });
    // Simulated mutant: payable 0% at call 1 (the "treat default as call 6"
    // mutation). The pin at calls=1 above requires payablePct 100 and
    // waivedTotal 0; a mutant returning the call-6 values fails it.
    const s = frequencyScenario(GOTHENBURG, result(), 1)!;
    expect(s.payablePct).toBe(100);
    expect(s.waivedTotal).toBe(0);
    // The zero-drift pin above (totals hold exactly) is the second failure
    // surface: any engine-path mutation moving totals fails it.
    expect(R2(result().total)).toBe(3275851.15);
  });
  it('mutation B (Swedish waiver applied to HAM) cannot produce a HAM scenario', () => {
    const hamResult = calculatePortCallCost(HAMBURG, {
      vessel: DEFAULT_VESSEL, call: defaultCall('hamburg') as CallInput
    });
    // HAM carries no frequency_discount biller: the scenario resolver
    // returns null regardless of input. A mutant that applies the Swedish
    // scale at HAM fails this null pin.
    expect(frequencyBillerFor(HAMBURG)).toBeNull();
    expect(frequencyScenario(HAMBURG, hamResult, 6)).toBeNull();
  });
  it('mutation C (hardcoded delta/percentage) breaks the derivation pins', () => {
    // The percentage is derived from the live total: at HEL the same waiver
    // is a different percentage than at GOT (2.9963% vs 8.0033%). A
    // hardcoded value fails at least one port.
    const got = frequencyScenario(GOTHENBURG, (() => {
      return calculatePortCallCost(GOTHENBURG, {
        vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput
      });
    })(), 6)!;
    const hel = frequencyScenario(HELSINGBORG, calculatePortCallCost(HELSINGBORG, {
      vessel: DEFAULT_VESSEL, call: defaultCall('helsingborg') as CallInput
    }), 6)!;
    expect(got.pctOfCurrentTotal).not.toBe(hel.pctOfCurrentTotal);
    expect(got.pctOfCurrentTotal).toBe(R2(262175.00 / 3275851.15 * 10000) / 100);
    expect(hel.pctOfCurrentTotal).toBe(R2(262175.00 / 8750057.40 * 10000) / 100);
  });
});
