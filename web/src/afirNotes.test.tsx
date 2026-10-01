// AFIR regulatory-context notes — web pins (spec v0.3.3, item 3).
//
// AFIR levies no vessel-side charge; it is a port-side infrastructure
// mandate — context for why OPS exists and is being tariffed at these
// ports, the same treatment the ETS directive received (the v0.2.69
// regulatory block). The notes render at the OPS surfaces; zero-amount,
// never additive, never a fee rule. The notes carry no figures beyond
// the act's own dates and thresholds.
//
// Authority of record: docs/sources/eu/afir/regulation-2023-1804-extract.md
// (Regulation (EU) 2023/1804 Article 9 — a directive-premise correction:
// not Article 8; capability by 31 December 2029, minimum supply of 90% of
// port calls from 1 January 2030, thresholds >100 container / >40 ro-ro
// passenger / >25 cruise calls per year; the AFIR review is the watch
// item).
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import { guideFor, makeComputer, leversForPort } from './envGuidance';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;

describe('AFIR regulatory-context notes (spec v0.3.3, item 3)', () => {
  it('the extraction is archived and the reference entry recorded (docs-first)', () => {
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'docs', 'sources', 'eu', 'afir', 'regulation-2023-1804-extract.md'))).toBe(true);
    const reference = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'sources', 'eu', 'EU_REGULATORY_EXTRACTION_REFERENCE.md'), 'utf8');
    expect(reference).toContain('E9');
    expect(reference).toContain('2023/1804');
  });

  it('the extract cites Article 9 (the directive-premise correction) with the act\'s own dates and thresholds', () => {
    const extract = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'sources', 'eu', 'afir', 'regulation-2023-1804-extract.md'), 'utf8');
    expect(extract).toContain('Article 9');
    expect(extract).toContain('directive-premise correction');
    expect(extract).toContain('31 December 2029');
    expect(extract).toContain('1 January 2030');
    expect(extract).toContain('90%');
    expect(extract).toContain('100 calls/year');
    expect(extract).toContain('40 calls/year');
    expect(extract).toContain('25 calls/year');
    // The watch item is recorded.
    expect(extract).toContain('review');
    expect(extract).toContain('31 December 2026');
  });

  it('the per-port facts are recorded for all three ports', () => {
    const extract = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'sources', 'eu', 'afir', 'regulation-2023-1804-extract.md'), 'utf8');
    expect(extract).toContain('Gothenburg');
    expect(extract).toContain('Hamburg');
    expect(extract).toContain('Helsingborg');
    // GOT the pioneer; HAM equipped by end-2025; HEL commissioning autumn 2026.
    expect(extract).toContain('pioneer');
    expect(extract.replace(/\s+/g, ' ')).toContain('by the end of 2025');
    expect(extract).toContain('autumn 2026');
  });

  it('the AFIR note renders at the OPS speculation group at every port (the OPS surface)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    expect(src).toContain('afir-context-note');
    expect(src).toContain('Regulation (EU) 2023/1804');
    expect(src).toContain('31 December 2029');
    expect(src).toContain('90% of port calls');
    expect(src).toContain('levies no vessel-side fee');
  });

  it('the ops_usage guidance carries the AFIR context (the OPS lever\'s own surface)', () => {
    const computer = makeComputer([HAMBURG], DEFAULT_VESSEL, defaultCall('hamburg') as CallInput);
    const guide = guideFor('ops_usage', HAMBURG, computer) as any;
    expect(guide).toBeDefined();
    expect(guide.rule).toContain('AFIR');
    expect(guide.rule).toContain('2023/1804');
    expect(guide.rule).toContain('no vessel-side fee');
  });

  it('the notes carry no figures beyond the act\'s own dates and thresholds; no fee rule changes (zero-drift, pinned)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'portWorkspaceInputs.tsx'), 'utf8');
    const noteAt = src.indexOf('AFIR context (Regulation (EU) 2023/1804');
    const note = src.slice(noteAt, noteAt + 800);
    expect(note).not.toMatch(/EUR|SEK|€|kr/);
    // Zero-drift: no port total moves with the notes present.
    for (const [port, expected] of [
      [GOTHENBURG, 3275851.15],
      [HAMBURG, 2204910.90],
      [HELSINGBORG, 8750057.40]
    ] as [PortDefinition, number][]) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id) as CallInput
      });
      expect(result.total).toBe(expected);
    }
  });

  it('red proof base: no AFIR fee rule exists anywhere (AFIR adds context, never a charge)', () => {
    for (const port of [GOTHENBURG, HAMBURG, HELSINGBORG]) {
      expect(port.fee_rules.filter(r => /afir/i.test(r.id))).toEqual([]);
    }
  });
});
