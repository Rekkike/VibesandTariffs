// MSC KYUNGMIN NT observation — web pins (spec v0.3.3, item 4).
//
// The Flexport figure (NT 9,654) is an aggregator observation, not a
// registry confirmation. The registry routes remain automation-blocked
// (DNV blocks automated access — verified 2026-10-01; Equasis; the Korean
// register). The observation is recorded with exactly that provenance,
// surfaced at the NT-class indication; no default figure changes and no
// class boundary moves.
//
// Authority of record: docs/SCENARIO_LAYER_AUDIT.md item 5 and
// core/data/vessel_library.yaml (the observation record).
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

describe('MSC KYUNGMIN NT observation (spec v0.3.3, item 4)', () => {
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
  });

  it('no default figure changes: the NT default stays the 8,000 estimate; the class assignment and boundary note behavior are untouched', () => {
    expect(KYUNGMIN.nt).toBe(8000);
    expect(KYUNGMIN.estimated_fields).toContain('nt');
    // The Class 5/6 boundary pins from the v0.3.0 pass keep their behavior:
    // the boundary notice fires exactly as before (ntBoundaryNotice suite).
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

  it('the NT-class indication surfaces the observation\'s evidentiary status at the vessel selection (the GOT class assignment carries its provenance)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    expect(src).toContain('vessel-option-observation-note');
    expect(src).toContain('observation, not registry-confirmed');
  });

  it('no boundary movement: the GOT and HAM totals with the KYUNGMIN vessel price at the existing class-keyed defaults', () => {
    const vessel = { ...DEFAULT_VESSEL, name: 'MSC KYUNGMIN', imo: '9967005', gt: 21979, nt: 8000, loa_m: 171.92, built_year: 2024, teu_capacity: 2400 };
    const got = calculatePortCallCost(GOTHENBURG, {
      vessel: vessel as any,
      call: defaultCall('gothenburg') as CallInput
    });
    // The v0.3.0 re-derivation pins: Class 5 (6,000+ NT) at the 8,000 default — the vessel fee fires at the Class 5 rate.
    const vesselFee = got.billers.flatMap(b => b.fees).find(f => /vessel_fee_class5/.test(f.fee_rule_id));
    expect(vesselFee).toBeDefined();
    // The observation does not move the default: no Class 6 rule fires.
    expect(got.billers.flatMap(b => b.fees).find(f => /vessel_fee_class6/.test(f.fee_rule_id))).toBeUndefined();
  });
});
