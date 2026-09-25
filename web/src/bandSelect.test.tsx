// Banded-input dual-mode pins (spec v0.2.65).
//
// Phase A audit (docs/BANDED_INPUTS_AUDIT.md) ruled three inputs band-worthy —
// Hamburg's quantum (STC 4.1.2.11, special tariff 280: >1.5m and ≤10m → 2.5%,
// >10m and ≤25m → 5.0%, >25m → 7.5%), ESI air (4.1.1.1, tariff 140) and ESI
// noise (4.1.1.2, tariff 141). Phase B gives each a control pair: a tier select
// whose options derive from the port file's own band data, plus the existing
// free numeric field. Contract pins:
//  - One underlying value: the select writes only the numeric field; the
//    numeric field is the engine's, the persistence's, and the pins' contract.
//  - Selecting a band populates the numeric field with the band's threshold
//    value per the engine's own consumption side and fires the discount;
//    editing the numeric re-bands the select live; boundary values land in
//    the correct band; "none" renders below the first threshold and blank.
//  - Zero drift: the fresh load is byte-identical to the v0.2.64 baseline —
//    GOT 3,275,851.15 SEK / HAM 2,313,489.31 EUR / HEL 8,750,057.40 SEK;
//    per-GT 16.81 / 133.87 / 44.91.
//  - Data boundary: the select's options match the engine's band data (a
//    desynchronizing mutation must fail); nothing is hardcoded.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  BandSelect,
  bandedInputsForPort,
  bandForValue,
  thresholdValue,
  bandRangeLabel,
  type BandDef
} from './bandSelect';
import portsRegistry from './data/ports.json';
import { defaultCall, calculatePortCallCost, DEFAULT_VESSEL } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;

const fmt = (n: number) => n.toFixed(2);

// ---- zero-drift baselines (the v0.2.64 pins are the reference) ----
describe('banded-input zero drift (spec v0.2.65; HAM re-baselined v0.2.66)', () => {
  it('the fresh load reproduces the pinned baselines at all three ports (GOT/HEL byte-identical; HAM re-baselined by the Eurogate promotion, §17.5)', () => {
    // v0.2.66 promotion re-baseline: HAM 2,313,489.31 -> 2,204,910.90 and the
    // converted per-GT 133.87 -> 127.59 (terminal layer replaced; GOT/HEL
    // byte-identical — the isolation contract, pinned).
    for (const [port, total, perGt] of [
      [GOTHENBURG, '3275851.15', '16.81'],
      [HAMBURG, '2204910.90', '127.59'],
      [HELSINGBORG, '8750057.40', '44.91']
    ] as [PortDefinition, string, string][]) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(port.metadata.id) }
      });
      expect(fmt(result.total)).toBe(total);
      // HAM converts through the 11.275 rate input for the per-GT figure
      if (port.metadata.id === 'hamburg') {
        expect(fmt((result.total * 11.275) / DEFAULT_VESSEL.gt)).toBe(perGt);
      } else {
        expect(fmt(result.total / DEFAULT_VESSEL.gt)).toBe(perGt);
      }
    }
  });

  it('the Hamburg default call renders the band selects in the "none" state (no band selected, numeric untouched)', async () => {
    const { PortWorkspace } = await import('./App');
    let container: HTMLDivElement | null = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | null = createRoot(container);
    let currentCall: CallInput = defaultCall('hamburg');
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={DEFAULT_VESSEL}
          call={currentCall}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
    const selects = container.querySelectorAll('[data-testid^="band-select-"]');
    expect(selects.length).toBe(3);
    // default call: esi_score null, esi_noise_score null, quantum 0 — all none
    for (const s of Array.from(selects)) {
      expect((s.textContent ?? '')).toContain('None');
    }
    await act(async () => { root!.unmount(); });
    container.remove();
  });
});

// ---- dual-mode derivation pins ----
describe('banded-input dual-mode derivation (spec v0.2.65)', () => {
  const defs = bandedInputsForPort(HAMBURG);
  const quantum = defs.find(d => d.input === 'quantum_prior_year_gt')!;
  const esiAir = defs.find(d => d.input === 'esi_score')!;
  const esiNoise = defs.find(d => d.input === 'esi_noise_score')!;

  it('the port file yields exactly the three band-worthy inputs with the engine\'s band data', () => {
    expect(defs.map(d => d.input).sort()).toEqual(
      ['esi_noise_score', 'esi_score', 'quantum_prior_year_gt']
    );
    // quantum bands match the engine's own arrays (STC 4.1.2.11)
    expect(quantum.bands).toEqual([
      { min: 1500000, max: 10000000, pct: 2.5 },
      { min: 10000000, max: 25000000, pct: 5.0 },
      { min: 25000000, max: null, pct: 7.5 }
    ]);
    expect(quantum.operator).toBe('min_exclusive');
    // ESI air bands match the engine's own arrays (STC 4.1.1.1)
    expect(esiAir.bands).toEqual([
      { min: 20, max: 25, pct: 0.35, cap: 175 },
      { min: 25, max: 35, pct: 0.7, cap: 350 },
      { min: 35, max: 50, pct: 3.5, cap: 700 },
      { min: 50, max: null, pct: 7, cap: 1050 }
    ]);
    expect(esiAir.operator).toBe('min_inclusive');
    // ESI noise bands match the engine's own arrays (STC 4.1.1.2)
    expect(esiNoise.bands).toEqual([
      { min: 40, max: 45, pct: 0.15, cap: 75 },
      { min: 45, max: 55, pct: 0.3, cap: 150 },
      { min: 55, max: 70, pct: 1.5, cap: 300 },
      { min: 70, max: null, pct: 3, cap: 450 }
    ]);
  });

  it('selecting a band populates the numeric field with the threshold value the engine\'s own side consumes, and fires the exact discount', () => {
    // quantum: engine is lower-exclusive, so the threshold value is min + 1
    expect(thresholdValue(quantum, quantum.bands[0])).toBe(1500001);
    expect(thresholdValue(quantum, quantum.bands[1])).toBe(10000001);
    expect(thresholdValue(quantum, quantum.bands[2])).toBe(25000001);
    // ESI air / noise: engine is lower-inclusive, so the threshold is min
    expect(thresholdValue(esiAir, esiAir.bands[0])).toBe(20);
    expect(thresholdValue(esiNoise, esiNoise.bands[0])).toBe(40);

    // the fired discounts (script-derived, engine-observed)
    const q = calculatePortCallCost(HAMBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), quantum_prior_year_gt: 1500001 }
    });
    const adj = q.billers.flatMap(b => b.fees)
      .find(f => f.fee_rule_id === 'hpa_port_fee')!
      .derivation!.steps.find(s => s.label.includes('Quantum'))!;
    expect(fmt(adj.amount!)).toBe('-1228.25');
    expect(adj.detail).toContain('-2.5%');

    const e = calculatePortCallCost(HAMBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('hamburg'), esi_score: 20 }
    });
    const adjE = e.billers.flatMap(b => b.fees)
      .find(f => f.fee_rule_id === 'hpa_port_fee')!
      .derivation!.steps.find(s => s.label.includes('ESI air'))!;
    expect(fmt(adjE.amount!)).toBe('-45.16');
  });

  it('editing the numeric re-bands the select live; boundary values land in the correct band; "none" states render', () => {
    // boundary values per the engine's operators
    // quantum: exactly 1.5m in NO band (strict >); exactly 10m in 2.5% (<=); exactly 25m in 5.0% (<=)
    expect(bandForValue(quantum, 1500000)).toBeNull();
    expect(bandForValue(quantum, 1500001)!.pct).toBe(2.5);
    expect(bandForValue(quantum, 10000000)!.pct).toBe(2.5);
    expect(bandForValue(quantum, 10000001)!.pct).toBe(5.0);
    expect(bandForValue(quantum, 25000000)!.pct).toBe(5.0);
    expect(bandForValue(quantum, 25000001)!.pct).toBe(7.5);
    expect(bandForValue(quantum, undefined)).toBeNull();
    // ESI air: exactly 20 in 0.35% (>=); exactly 25 in 0.7% (< upper); 50 in 7%
    expect(bandForValue(esiAir, 20)!.pct).toBe(0.35);
    expect(bandForValue(esiAir, 24.999)!.pct).toBe(0.35);
    expect(bandForValue(esiAir, 25)!.pct).toBe(0.7);
    expect(bandForValue(esiAir, 50)!.pct).toBe(7);
    expect(bandForValue(esiAir, 19.999)).toBeNull();
    // ESI noise: exactly 40 in 0.15%; 45 in 0.3%; 70 in 3%
    expect(bandForValue(esiNoise, 40)!.pct).toBe(0.15);
    expect(bandForValue(esiNoise, 45)!.pct).toBe(0.3);
    expect(bandForValue(esiNoise, 70)!.pct).toBe(3);
    expect(bandForValue(esiNoise, 39.999)).toBeNull();
  });

  it('option labels carry the band\'s range and its discount percentage; citations render per the notice conventions', () => {
    // quantum labels per the STC's own step-table operators
    expect(bandRangeLabel(quantum, quantum.bands[0])).toBe('over 1,500,000 up to 10,000,000');
    expect(bandRangeLabel(quantum, quantum.bands[1])).toBe('over 10,000,000 up to 25,000,000');
    expect(bandRangeLabel(quantum, quantum.bands[2])).toBe('over 25,000,000');
    // ESI air labels per the "20 up to < 25" form
    expect(bandRangeLabel(esiAir, esiAir.bands[0])).toBe('20–24');
    expect(bandRangeLabel(esiAir, esiAir.bands[3])).toBe('50+');
    // the citation derives from the fee rule's own source reference (the
    // same schedule document the engine's derivation steps cite); the STC
    // clause itself rides in the rendered helper text (the label prop)
    expect(quantum.citation).toContain('pricelist-maritime-shipping-2026.pdf');
    expect(quantum.citation).toContain('item 115');
  });
});

// ---- data-boundary pins: the select writes only the underlying field; the
// options match the engine's band data ----
describe('banded-input data boundary (spec v0.2.65)', () => {
  const defs = bandedInputsForPort(HAMBURG);
  const quantum = defs.find(d => d.input === 'quantum_prior_year_gt')!;

  it('the select writes only the underlying numeric field (no parallel state)', async () => {
    let container: HTMLDivElement | null = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | null = createRoot(container);
    let written: Record<string, unknown> = {};
    await act(async () => {
      root!.render(
        <BandSelect
          def={quantum}
          value={undefined}
          onValueChange={(v) => { written['quantum_prior_year_gt'] = v; }}
        />
      );
    });
    const selectEl = container.querySelector('[data-testid="band-select-quantum_prior_year_gt"]')!;
    await act(async () => {
      selectEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const option = Array.from(document.querySelectorAll('li[role="option"]'))
      .find(o => (o.textContent ?? '').includes('over 10,000,000'))!;
    expect(option).toBeDefined();
    await act(async () => {
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // the select wrote the band's threshold value to the underlying field ONLY
    expect(written).toEqual({ quantum_prior_year_gt: 10000001 });
    await act(async () => { root!.unmount(); });
    container.remove();
  });

  it('editing the numeric re-bands the rendered select live (no parallel state: the display follows the value)', async () => {
    const quantum = bandedInputsForPort(HAMBURG).find(d => d.input === 'quantum_prior_year_gt')!;
    let container: HTMLDivElement | null = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | null = createRoot(container);
    let value: number | undefined = undefined;
    const renderIt = () => act(async () => {
      root!.render(
        <BandSelect
          def={quantum}
          value={value}
          onValueChange={(v) => { value = v; }}
        />
      );
    });
    await renderIt();
    const display = () =>
      container!.querySelector('[data-testid="band-select-quantum_prior_year_gt"]')!.textContent ?? '';
    // fresh: none
    expect(display()).toContain('None');
    // parent value changes (the free numeric field edited by the user): the
    // select's display follows the value — 12,000,000 lands in the 5.0% band
    value = 12000000;
    await renderIt();
    expect(display()).toContain('over 10,000,000 up to 25,000,000');
    // a below-first-threshold edit: back to none
    value = 900000;
    await renderIt();
    expect(display()).toContain('None');
    // an in-band edit again, then blank: none
    value = 30000000;
    await renderIt();
    expect(display()).toContain('over 25,000,000');
    value = undefined;
    await renderIt();
    expect(display()).toContain('None');
    await act(async () => { root!.unmount(); });
    container.remove();
  });

  it('the band options match the engine\'s band data — a desynchronizing mutation fails', async () => {
    // a port file whose quantum bands drift from the engine's own data
    const mutated: PortDefinition = JSON.parse(JSON.stringify(HAMBURG));
    const fee = mutated.fee_rules.find(r => r.id === 'hpa_port_fee')!;
    (fee.rate_structure as any).component_adjustments.gt.find(
      (a: any) => a.kind === 'pct_discount_banded'
    ).bands[0].pct = 9.9;
    const mutatedDefs = bandedInputsForPort(mutated);
    const mutatedQuantum = mutatedDefs.find(d => d.input === 'quantum_prior_year_gt')!;
    // the select derives from the port data, so the option label moves with
    // the data — a hardcoded copy would NOT move (red-proof (B) below).
    expect(mutatedQuantum.bands[0].pct).toBe(9.9);
    // render the mutated def: the option carries the mutated percentage
    let container: HTMLDivElement | null = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | null = createRoot(container);
    await act(async () => {
      root!.render(
        <BandSelect
          def={mutatedQuantum}
          value={undefined}
          onValueChange={() => {}}
        />
      );
    });
    const selectEl = container.querySelector('[data-testid="band-select-quantum_prior_year_gt"]')!;
    await act(async () => {
      selectEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const firstBandOption = options.find(o => (o.textContent ?? '').includes('over 1,500,000'))!;
    expect(firstBandOption).toBeDefined();
    expect(firstBandOption.textContent).toContain('9.9%');
    await act(async () => { root!.unmount(); });
    container.remove();
    // ...and the un-mutated port data still carries the engine's 2.5%
    const restored = bandedInputsForPort(HAMBURG).find(d => d.input === 'quantum_prior_year_gt')!;
    expect(restored.bands[0].pct).toBe(2.5);
    const restoredOption = `${bandRangeLabel(restored, restored.bands[0])} (${restored.bands[0].pct}%)`;
    expect(restoredOption).toContain('2.5%');
  });

  it('ports without banded adjustments render no select (the Swedish ports carry no score bands)', () => {
    // GOT/HEL have no composite_tranche score bands — their ESI rule is a
    // single threshold, and the fossil-free percentage a threshold (Phase A).
    // Their port files carry no score_discount_pct_with_cap / pct_discount_banded
    // adjustments, so bandedInputsForPort yields nothing.
    const got = bandedInputsForPort(GOTHENBURG).filter(d =>
      d.input === 'esi_score' || d.input === 'quantum_prior_year_gt' || d.input === 'esi_noise_score');
    expect(got).toEqual([]);
    const hel = bandedInputsForPort(HELSINGBORG).filter(d =>
      d.input === 'esi_score' || d.input === 'quantum_prior_year_gt' || d.input === 'esi_noise_score');
    expect(hel).toEqual([]);
  });
});
