// MSC KYUNGMIN NT observation — web pins (spec v0.3.3, item 4; re-baselined
// at v0.3.4 by the promotion — the v0.3.3 record-keeping pins survive, the
// model-NT pin is this pass's legitimate re-baseline, attributed in-test
// to the promotion).
//
// The Flexport figure (NT 9,654) is an aggregator observation, not a
// registry confirmation. The registry routes remain automation-blocked
// (DNV blocks automated access — verified 2026-10-01; Equasis; the Korean
// register). The v0.3.4 promotion: the observed figure is the model NT,
// carried under the observation-quality flag, honestly labeled at every
// rendering; both 8,000 and 9,654 are Class 5, so no dues movement (the
// verified absence is the pass's declared consequence, pinned here).
//
// Authority of record: docs/KYUNGMIN_NT_PROMOTION_AUDIT.md,
// docs/SCENARIO_LAYER_AUDIT.md item 5, and core/data/vessel_library.yaml
// (the observation record).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import vesselLibrary from './data/vessel_library.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import { LOADED_VESSELS } from './vesselOptions';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

const KYUNGMIN = (LOADED_VESSELS as any[]).find(v => v.name === 'MSC KYUNGMIN')!;

describe('MSC KYUNGMIN NT promotion (spec v0.3.4; the v0.3.3 observation pins survive)', () => {
  it('the observation is recorded with its provenance: source Flexport, verified 2026-10-01, flagged observation-not-confirmation', () => {
    const records = KYUNGMIN.nt_observation_records;
    expect(records).toBeDefined();
    expect(records.length).toBe(1);
    const r = records[0];
    expect(r.observed_nt).toBe(9654);
    expect(r.source).toContain('Flexport');
    expect(r.source).toContain('aggregator');
    expect(r.fetched).toBe('2026-10-01');
    expect(r.status).toBe('observation-not-confirmation');
    expect(r.note).toContain('not a registry confirmation');
    expect(r.note).toContain('DNV register blocks automated access');
    expect(r.note).toContain('registry confirmation remains the only closing evidence');
    // The v0.3.4 promotion is recorded in the observation's own history:
    expect(r.note).toContain('promoted the observed figure to the model NT');
    expect(r.note).toContain('re-opens the adjudication');
  });

  it('the promotion (re-baselined, attributed): the model NT is 9,654, carried under the observation-quality flag', () => {
    expect(KYUNGMIN.nt).toBe(9654);
    expect(KYUNGMIN.estimated_fields).toContain('nt');
    expect(KYUNGMIN.nt_observed).toBe(true);
    expect(KYUNGMIN.source_note).toContain('v0.3.4 promotion');
    expect(KYUNGMIN.source_note).toContain('observed, not registry-confirmed');
    // The former authored default (8,000, unknown provenance) is superseded:
    expect(KYUNGMIN.source_note).toContain('superseded');
  });

  it('the observation carries no registry-confirmation wording anywhere (presenting it as registry-confirmed fails)', () => {
    const yamlSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'core', 'data', 'vessel_library.yaml'), 'utf8');
    // The KYUNGMIN record block only (the schema header documents the
    // convention; the record itself must never read as a confirmation).
    const kyungminAt = yamlSrc.indexOf('name: MSC KYUNGMIN');
    const recordAt = yamlSrc.indexOf('nt_observation_records:', kyungminAt);
    expect(recordAt).toBeGreaterThan(-1);
    const record = yamlSrc.slice(recordAt, yamlSrc.indexOf('source_note:', recordAt));
    expect(record).not.toMatch(/registry-confirmed|confirmed by the register/);
  });

  it('the NT-class indication surfaces the observation status: the selection provenance note and the class-indication wording both carry it', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    expect(src).toContain('vessel-option-observation-note');
    expect(src).toContain('observation, not registry-confirmed');
    // v0.3.4: the class-indication helperText asserts the observation status
    // for an observed estimate (rendering it unflagged fails).
    expect(src).toContain('Observed value (aggregator observation, not registry-confirmed');
  });

  it('the class assignment is pinned with the verified absence of dues movement: Class 5 at both 8,000 and 9,654', () => {
    const vessel = { ...DEFAULT_VESSEL, name: 'MSC KYUNGMIN', imo: '9967005', gt: 21979, nt: 9654, loa_m: 171.92, built_year: 2024, teu_capacity: 2400 };
    const got = calculatePortCallCost(GOTHENBURG, {
      vessel: vessel as any,
      call: defaultCall('gothenburg') as CallInput
    });
    // Class 5 at the promoted 9,654 — the vessel fee fires at the Class 5 rate.
    const vesselFee = got.billers.flatMap(b => b.fees).find(f => /vessel_fee_class5/.test(f.fee_rule_id));
    expect(vesselFee).toBeDefined();
    // No Class 6 rule fires (9,654 < 10,000 — no boundary crossing).
    expect(got.billers.flatMap(b => b.fees).find(f => /vessel_fee_class6/.test(f.fee_rule_id))).toBeUndefined();
    // And the same at the superseded 8,000: both figures share Class 5, so the
    // promotion moves zero dues (the audit's item 0.2 finding, asserted).
    const atOld = calculatePortCallCost(GOTHENBURG, {
      vessel: { ...vessel, nt: 8000 } as any,
      call: defaultCall('gothenburg') as CallInput
    });
    const feeTotal = (r: any) => r.billers.flatMap((b: any) => b.fees).reduce((s: number, f: any) => s + f.amount, 0);
    expect(feeTotal(atOld)).toBe(feeTotal(got));
  });

  it('isolation: no other vessel carries the 8,000 figure or moves (the promotion is KYUNGMIN\'s alone)', () => {
    const others = (LOADED_VESSELS as any[]).filter(v => v.name !== 'MSC KYUNGMIN');
    expect(others.map(v => v.nt)).not.toContain(8000);
    expect(others.map(v => v.nt)).toEqual([3783, 16947, 79120].filter(n => others.some(v => v.nt === n)));
    // The library's other NT figures are byte-identical (no spillover):
    const byName = new Map((LOADED_VESSELS as any[]).map(v => [v.name, v.nt]));
    expect(byName.get('HELGAFELL')).toBe(3783);
    expect(byName.get('VISTULA MAERSK')).toBe(16947);
    expect(byName.get('MAREN MAERSK')).toBe(79120);
  });

  it('zero-drift isolation: the default vessel\'s (MAREN MAERSK) GOT/HAM figures are byte-identical to the standing baselines', () => {
    const got = calculatePortCallCost(GOTHENBURG, {
      vessel: DEFAULT_VESSEL as any,
      call: defaultCall('gothenburg') as CallInput
    });
    expect(got.total).toBe(3275851.15);
    expect(got.total / 194849).toBeCloseTo(16.81, 2);
    const ham = calculatePortCallCost(HAMBURG, {
      vessel: DEFAULT_VESSEL as any,
      call: defaultCall('hamburg') as CallInput
    });
    expect(ham.total).toBe(2204910.90);
    expect(ham.total / 194849).toBeCloseTo(11.32, 2);
  });
});
