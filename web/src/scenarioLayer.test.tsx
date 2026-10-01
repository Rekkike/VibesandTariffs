// Scenario-adjustment layer — web pins (spec v0.3.3).
//
// The deferred queue's long-standing feature item, built: the Eurogate
// ch. 7 storage schedules and ch. 3-4 shift/equipment rates price the
// user's scenario parameters over the pinned published rates. Adjust,
// never re-transcribe; scenario-off byte-identical; scenario figures
// labeled scenario-derived, never tariff-transcribed.
//
// Authority of record: docs/SCENARIO_LAYER_AUDIT.md (item 0) and
// docs/sources/germany/hamburg/eurogate/prices-and-conditions-2026.pdf.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, FeeResult, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall, portResetFields } from '@port-cost/core';
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

const SCENARIO_RULE_IDS = [
  'eurogate_storage_import_20ft',
  'eurogate_storage_import_40ft',
  'eurogate_storage_export_20ft',
  'eurogate_storage_export_40ft',
  'eurogate_shift_surcharges',
  'eurogate_equipment_hire'
];

const SCENARIO_INPUT_FIELDS = [
  'shift_gangs',
  'scenario_shifts_weekday_3rd', 'scenario_shifts_saturday_12',
  'scenario_shifts_saturday_34', 'scenario_shifts_sunday_12',
  'scenario_shifts_sunday_34', 'scenario_shifts_preholiday_weekday_1',
  'scenario_shifts_preholiday_saturday_1',
  'scenario_overtime_hours_weekday_1', 'scenario_overtime_hours_weekday_2',
  'scenario_overtime_hours_saturday_1', 'scenario_overtime_hours_saturday_2',
  'scenario_overtime_hours_saturday_3', 'scenario_overtime_hours_sunday_12',
  'scenario_overtime_hours_sunday_34', 'scenario_waiting_man_hours',
  'scenario_staff_hours', 'scenario_crane_hours',
  'scenario_van_carrier_hours', 'scenario_mafi_hours',
  'scenario_forklift_small_hours', 'scenario_forklift_large_hours',
  'scenario_reachstacker_hours', 'scenario_security_vehicle_hours',
  'scenario_security_inspector_hours', 'scenario_mafi_trailer_days'
];

describe('Scenario-adjustment layer — data and persistence pins (spec v0.3.3)', () => {
  it('the six scenario rules exist, all operator-gated to Eurogate, all carrying the scenario_adjusted marker', () => {
    for (const id of SCENARIO_RULE_IDS) {
      const rule = HAMBURG.fee_rules.find(r => r.id === id);
      expect(rule).toBeDefined();
      expect((rule as any).applicable_conditions?.terminal_operator).toBe('Eurogate');
      expect((rule as any).scenario_adjusted).toBeDefined();
    }
    for (const port of [GOTHENBURG, HELSINGBORG]) {
      expect(port.fee_rules.filter(r => SCENARIO_RULE_IDS.includes(r.id))).toEqual([]);
    }
  });

  it('every scenario input is a per-port reset field at Hamburg only (the §7 union contract honored with same-change pins)', () => {
    const hamResets = portResetFields('hamburg');
    for (const field of SCENARIO_INPUT_FIELDS) {
      expect(hamResets).toContain(field);
      expect(portResetFields('gothenburg')).not.toContain(field);
      expect(portResetFields('helsingborg')).not.toContain(field);
    }
  });

  it('the scenario inputs render only inside the hamburg_scenario_parameters section (source-level routing pin)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    const guard = "profileSections.has('hamburg_scenario_parameters')";
    expect(src).toContain(guard);
    // Every scenario input lives inside the guarded block: the first
    // scenario input appears after the guard, and no other section guard
    // intervenes between the guard and the inputs.
    const guardAt = src.indexOf(guard);
    const firstInputAt = src.indexOf('scenario_shifts_weekday_3rd');
    expect(firstInputAt).toBeGreaterThan(guardAt);
    const between = src.slice(guardAt, firstInputAt);
    expect(between).not.toMatch(/profileSections\.has\('(?!hamburg_scenario_parameters)/);
  });

  it('the section is declared in the port data (the data-authored gate, never a port-id string in the code)', () => {
    const sections = (HAMBURG as any).input_profile.sections.map((s: any) => s.id);
    expect(sections).toContain('hamburg_scenario_parameters');
    for (const port of [GOTHENBURG, HELSINGBORG]) {
      expect(((port as any).input_profile.sections.map((s: any) => s.id))).not.toContain('hamburg_scenario_parameters');
    }
  });
});

describe('Scenario-adjustment layer — zero-drift and arithmetic pins (spec v0.3.3)', () => {
  it('scenario-off is byte-identical at all three ports (the zero-drift contract, pinned)', () => {
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const call = defaultCall(port.metadata.id) as CallInput;
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(result.total).toBe(expected);
      expect(feeLines(result).filter(f => SCENARIO_RULE_IDS.includes(f.fee_rule_id))).toEqual([]);
    }
  });

  it('the storage scenario prices exactly at the pinned ch. 7 arithmetic (import 10 days)', () => {
    const call = { ...defaultCall('hamburg'), storage_days_import: 10 } as CallInput;
    const result = calculatePortCallCost(HAMBURG, { vessel: DEFAULT_VESSEL, call });
    // 10 days, 3 free => 7 chargeable: 5 at the first band, 2 at the second.
    expect(feeLines(result).find(f => f.fee_rule_id === 'eurogate_storage_import_20ft')!.amount)
      .toBe(800 * (5 * 42 + 2 * 84));
    expect(feeLines(result).find(f => f.fee_rule_id === 'eurogate_storage_import_40ft')!.amount)
      .toBe(1200 * (5 * 84 + 2 * 168));
  });

  it('the shift/equipment scenario prices exactly at the pinned ch. 3/4 arithmetic (gangs multiply)', () => {
    const call = {
      ...defaultCall('hamburg'),
      shift_gangs: 2,
      scenario_shifts_saturday_12: 1,
      scenario_overtime_hours_sunday_12: 3,
      scenario_staff_hours: 4,
      scenario_crane_hours: 2
    } as CallInput;
    const result = calculatePortCallCost(HAMBURG, { vessel: DEFAULT_VESSEL, call });
    expect(feeLines(result).find(f => f.fee_rule_id === 'eurogate_shift_surcharges')!.amount)
      .toBe(1 * 4956 * 2 + 3 * 1639 * 2);
    expect(feeLines(result).find(f => f.fee_rule_id === 'eurogate_equipment_hire')!.amount)
      .toBe(4 * 142 + 2 * 1841);
  });

  it('every scenario line renders the scenario-derived badge, never an estimate badge (presentation honesty, pinned)', () => {
    const call = {
      ...defaultCall('hamburg'),
      storage_days_import: 10,
      scenario_staff_hours: 1
    } as CallInput;
    const result = calculatePortCallCost(HAMBURG, { vessel: DEFAULT_VESSEL, call });
    const storage20 = feeLines(result).find(f => f.fee_rule_id === 'eurogate_storage_import_20ft')!;
    const staff = feeLines(result).find(f => f.fee_rule_id === 'eurogate_equipment_hire')!;
    for (const line of [storage20, staff]) {
      const badges = badgesForFlags(line.quality_flags);
      expect(badges.some(b => b.label === 'scenario-derived')).toBe(true);
      expect(badges.some(b => b.label === 'est.')).toBe(false);
    }
    // The badge title states the scenario-derived contract.
    const badges = badgesForFlags(storage20.quality_flags);
    const badge = badges.find(b => b.label === 'scenario-derived')!;
    expect(badge.title).toContain('scenario-derived');
    expect(badge.title).toContain('never tariff-transcribed');
  });

  it('red proof base: a scenario input leaking into a non-Eurogate port fails — the Swedish baselines hold with the same inputs', () => {
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const call = {
        ...defaultCall(port.metadata.id),
        shift_gangs: 2,
        scenario_shifts_saturday_12: 1,
        scenario_staff_hours: 4
      } as CallInput;
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call });
      expect(result.total).toBe(expected);
      expect(feeLines(result).filter(f => SCENARIO_RULE_IDS.includes(f.fee_rule_id))).toEqual([]);
    }
  });

  it('the scenario group note renders with the scenario-derived disclosure (the honesty contract, source-level)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    const noteAt = src.indexOf('Eurogate scenario parameters (user-specified schedule');
    expect(noteAt).toBeGreaterThan(-1);
    const guardAt = src.indexOf("profileSections.has('hamburg_scenario_parameters')");
    expect(noteAt).toBeGreaterThan(guardAt);
    // The note carries the two disclosure sentences.
    const note = src.slice(noteAt, noteAt + 900);
    expect(note).toContain('scenario-derived');
    expect(note).toContain('never tariff-transcribed');
    expect(note).toContain('Blank inputs render no line');
  });
});

describe('Scenario-adjustment layer — rendered-surface pins (spec v0.3.3)', () => {
  let container: HTMLElement | null = null;
  let root: Root | null = null;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    if (root) {
      const r = root;
      await act(async () => { r.unmount(); });
    }
    container?.remove();
    container = null;
  });

  const renderWorkspace = async (port: PortDefinition, call: CallInput) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={port}
          vessel={DEFAULT_VESSEL}
          call={call}
          onVesselChange={() => {}}
          onCallChange={(c: CallInput) => { call = c; }}
          onResetPortFields={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    return container!;
  };

  it('the Hamburg workspace renders the scenario group with the scenario-derived disclosure', async () => {
    const rendered = await renderWorkspace(HAMBURG, defaultCall('hamburg') as CallInput);
    const text = rendered.textContent ?? '';
    expect(text).toContain('Eurogate scenario parameters');
    expect(text).toContain('scenario-derived');
    expect(text).toContain('never tariff-transcribed');
    expect(text).toContain('Shift gangs');
  });

  it('the Swedish workspaces render no scenario group (the data-authored gate)', async () => {
    for (const port of [GOTHENBURG, HELSINGBORG]) {
      const rendered = await renderWorkspace(port, defaultCall(port.metadata.id) as CallInput);
      const text = rendered.textContent ?? '';
      expect(text).not.toContain('Eurogate scenario parameters');
    }
  });
});
