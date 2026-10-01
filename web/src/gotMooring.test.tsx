// GOT mooring disclosure — web pins (spec v0.3.1, the mooring-disclosure
// pass).
//
// The surface pins: the notice renders at every GOT call (the exclusion is
// visible — its own badge, zero-amount, never additive); the optional
// user-specified mooring input renders inside the gothenburg_ancillary
// section only (per-port; HAM and HEL render nothing mooring-related); the
// blank charge line collapses through isCollapsibleZeroLine (the
// amendment pin — presentation edges are pinned, never assumed); an
// entered charge adds exactly the entered amount (zero drift both states).
//
// Authorities of record: docs/GOT_MOORING_DISCLOSURE_AUDIT.md and
// docs/sources/sweden/gothenburg/klippan/.

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, FeeResult, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, portResetFields } from '@port-cost/core';
import { stageForFamily } from './chargeTypes';
import { badgesForFlags } from './flagBadges';
import { isCollapsibleZeroLine } from './zeroCollapse';
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

describe('GOT mooring disclosure — data and stage pins (spec v0.3.1)', () => {
  it('only Gothenburg carries mooring rules; HAM and HEL carry none (data isolation)', () => {
    expect(GOTHENBURG.fee_rules.filter(r => r.fee_family === 'mooring').map(r => r.id).sort())
      .toEqual(['gothenburg_mooring_charge', 'gothenburg_mooring_notice']);
    for (const port of [HAMBURG, HELSINGBORG]) {
      expect(port.fee_rules.filter(r => r.fee_family === 'mooring')).toEqual([]);
      expect(port.billers.some(b => /klippan/i.test(b.id + b.name))).toBe(false);
    }
  });

  it('the mooring family maps to the reach-berth stage (the audit\'s stage adjudication: the final act of the nautical sequence)', () => {
    expect(stageForFamily('mooring')).toBe('reach_berth');
    const src = fs.readFileSync(path.join(__dirname, 'chargeTypes.ts'), 'utf8');
    expect(src).toContain("mooring: 'reach_berth'");
  });

  it('the mooring_charge input is per-port state at GOT only (the reset_fields routing; the §7 union sentence honored)', () => {
    expect(portResetFields('gothenburg')).toContain('mooring_charge');
    expect(portResetFields('hamburg')).not.toContain('mooring_charge');
    expect(portResetFields('helsingborg')).not.toContain('mooring_charge');
  });

  it('the mooring input renders only inside the gothenburg_ancillary section (source-level routing pin)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    const mooringAt = src.indexOf('mooring_charge');
    const sectionAt = src.indexOf("profileSections.has('gothenburg_ancillary')");
    expect(mooringAt).toBeGreaterThan(-1);
    expect(sectionAt).toBeGreaterThan(-1);
    // The mooring input lives inside the gothenburg_ancillary block: the
    // section guard appears before it, and no other profileSections guard
    // intervenes between them.
    const between = src.slice(sectionAt, mooringAt);
    expect(between).not.toMatch(/profileSections\.has\('(?!gothenburg_ancillary)/);
  });
});

describe('GOT mooring disclosure — the notice and zero-drift pins (spec v0.3.1)', () => {
  it('the notice renders zero-amount at the default GOT call with its own badge carrying the exclusion disclosure (visible at every GOT call, not only when the input is used)', () => {
    const result = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput });
    const notice = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_mooring_notice')!;
    expect(notice).toBeDefined();
    expect(notice.amount).toBe(0);
    const badges = badgesForFlags(notice.quality_flags);
    const badge = badges.find(b => b.label === 'Mooring notice');
    expect(badge).toBeDefined();
    expect(badge!.title).toContain('AB Klippans Båtmansstation');
    expect(badge!.title).toContain('mandatory');
    expect(badge!.title).toContain('billed separately');
    expect(badge!.title).toContain('no published rate');
    expect(badge!.title).toContain('total excludes it');
    // Never additive: the notice line contributes zero to the total.
    expect(result.total).toBe(3275851.15);
  });

  it('the notice is never collapsible (flags survive the zero-line collapse — nothing hides behind an entry)', () => {
    const result = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput });
    const notice = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_mooring_notice')!;
    const rule = { id: notice.fee_rule_id };
    expect(isCollapsibleZeroLine(notice as never, rule)).toBe(false);
  });

  it('zero drift at the blank input: the pre-existing baselines hold byte-identically (GOT 3,275,851.15 / HAM 2,204,910.90 / HEL 8,750,057.40)', () => {
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const call = defaultCall(port.metadata.id) as CallInput;
      expect(call.mooring_charge).toBeUndefined();
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(result.total).toBe(expected);
    }
  });

  it('an entered mooring_charge adds exactly the entered amount at GOT (the additive contract; the notice stays zero-amount — no double count)', () => {
    const blank = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput });
    const entered = calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), mooring_charge: 25000 } as CallInput
    });
    expect(entered.total).toBe(Math.round((blank.total + 25000) * 100) / 100);
    const notice = feeLines(entered).find(f => f.fee_rule_id === 'gothenburg_mooring_notice')!;
    expect(notice.amount).toBe(0);
    const charge = feeLines(entered).find(f => f.fee_rule_id === 'gothenburg_mooring_charge')!;
    expect(charge.amount).toBe(25000);
    // The entered line carries the user-specified badge, never an estimate badge.
    const badges = badgesForFlags(charge.quality_flags);
    expect(badges.some(b => b.label === 'user-specified')).toBe(true);
    expect(badges.some(b => b.label === 'est.')).toBe(false);
  });

  it('HAM/HEL isolation: a mooring entry at either port moves nothing and no mooring line renders (the red-proof base: forcing the family elsewhere is inert)', () => {
    for (const [port, expected] of [
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: { ...defaultCall(port.metadata.id), mooring_charge: 25000 } as CallInput
      });
      expect(result.total).toBe(expected);
      expect(feeLines(result).filter(f => f.fee_family === 'mooring')).toEqual([]);
    }
  });
});

describe('GOT mooring disclosure — the blank-input collapse pin (spec v0.3.1, the amendment)', () => {
  it('the blank mooring_charge line collapses at GOT via isCollapsibleZeroLine (amount 0, no flags, no estimated_parameter, no conditions — the profile pinned, never assumed)', () => {
    const result = calculatePortCallCost(GOTHENBURG, { vessel: DEFAULT_VESSEL, call: defaultCall('gothenburg') as CallInput });
    const charge = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_mooring_charge')!;
    expect(charge).toBeDefined();
    expect(charge.amount).toBe(0);
    expect(charge.quality_flags).toEqual([]);
    const rule = GOTHENBURG.fee_rules.find(r => r.id === 'gothenburg_mooring_charge');
    expect(isCollapsibleZeroLine(charge as never, rule as never)).toBe(true);
  });

  it('the entered line never collapses (an amount-bearing line is a visible charge line)', () => {
    const result = calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL,
      call: { ...defaultCall('gothenburg'), mooring_charge: 25000 } as CallInput
    });
    const charge = feeLines(result).find(f => f.fee_rule_id === 'gothenburg_mooring_charge')!;
    const rule = GOTHENBURG.fee_rules.find(r => r.id === 'gothenburg_mooring_charge');
    expect(isCollapsibleZeroLine(charge as never, rule as never)).toBe(false);
  });
});

describe('GOT mooring disclosure — the input surface (spec v0.3.1)', () => {
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

  it('the input renders at GOT, blank at default, labeled user-specified with the Klippan provenance and the no-published-rate disclosure in the helper', async () => {
    await rerender(GOTHENBURG, defaultCall('gothenburg') as CallInput);
    const labels = Array.from(container!.querySelectorAll('label')).map(l => l.textContent ?? '');
    expect(labels.some(l => l.includes('Mooring charge (SEK, user-specified)'))).toBe(true);
    const helper = Array.from(container!.querySelectorAll('.MuiFormHelperText-root')).map(h => h.textContent ?? '');
    const mooringHelper = helper.find(h => h.includes('Klippans'));
    expect(mooringHelper).toBeDefined();
    expect(mooringHelper!).toContain('no published rate exists');
    expect(mooringHelper!).toContain('user-specified, never estimated or tariff-derived');
    expect(mooringHelper!).toContain('billed separately from the Port of Gothenburg tariff');
    // Blank at default.
    const input = container!.querySelector('input[type="number"][value=""]') as HTMLInputElement | null;
    expect(currentCall.mooring_charge).toBeUndefined();
    expect(input === null || input.value === '').toBe(true);
  });

  it('the input writes exactly the mooring_charge field (no side effects on any other call field)', async () => {
    await rerender(GOTHENBURG, defaultCall('gothenburg') as CallInput);
    const before = { ...currentCall };
    const input = Array.from(container!.querySelectorAll('input'))
      .find(i => (i.closest('.MuiTextField-root')?.textContent ?? '').includes('Mooring charge')) as HTMLInputElement;
    expect(input).toBeTruthy();
    const setter = (Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set)!;
    await act(async () => {
      setter.call(input!, '25000');
      input!.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(currentCall.mooring_charge).toBe(25000);
    for (const key of Object.keys(before)) {
      if (key === 'mooring_charge') continue;
      expect((currentCall as never as Record<string, unknown>)[key]).toEqual((before as Record<string, unknown>)[key]);
    }
  });

  it('HAM and HEL render no mooring surface at all (no input, no label, no helper)', async () => {
    for (const port of [HAMBURG, HELSINGBORG]) {
      await rerender(port, defaultCall(port.metadata.id) as CallInput);
      const text = container!.textContent ?? '';
      expect(text).not.toMatch(/[Mm]ooring/);
      expect(text).not.toMatch(/Klippan/);
      const labels = Array.from(container!.querySelectorAll('label')).map(l => l.textContent ?? '');
      expect(labels.some(l => l.includes('Mooring'))).toBe(false);
    }
  });
});
