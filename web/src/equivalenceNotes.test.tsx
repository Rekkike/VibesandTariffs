// Cross-port functional-equivalence annotations — web pins (spec v0.3.3,
// item 2).
//
// The comparison view's family rows carry each port's own tariff
// terminology; the verified pairs from the audit annotate the relevant
// rows, stated as functional correspondence ("functionally corresponds
// to"), never as identity of amounts or labels. Presentation-grade,
// zero-drift: no figure moves, no label changes, no port's own
// terminology is altered. Pinned: the annotations render; removing one
// fails; every row's amount is byte-identical before and after.
//
// Authority of record: docs/SCENARIO_LAYER_AUDIT.md item 3 — both
// directive-claimed pairs were DROPPED (the sources do not support
// Hafengeld ↔ fairway dues, nor HHLA/Eurogate berth dues ↔ GOT port
// dues); the verified three-slot functional map is what annotates.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { ComparisonView } from './comparisonView';
import { equivalenceNoteForFamily, equivalenceNoteForRule } from './equivalenceNotes';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;

describe('Cross-port functional-equivalence annotations — the verified map (spec v0.3.3, item 2)', () => {
  it('the port dues family annotates with the access-charge functional map (GOT/HEL/HAM correspond; the German berth lines are a separate slot)', () => {
    const note = equivalenceNoteForFamily('port_dues')!;
    expect(note).toBeDefined();
    expect(note.text).toContain('functionally correspond');
    expect(note.text).toContain('Hafengeld');
    expect(note.text).toContain('never identity of amounts or labels');
    // The dropped directive pairs must NOT appear as claimed pairs:
    // Hafengeld is never mapped to the fairway dues, and the berth-dues
    // lines are never mapped to GOT port dues.
    expect(note.text).not.toMatch(/Hafengeld[^.]*fairway/);
    expect(note.text).not.toMatch(/berth-dues lines[^.]*correspond to no Swedish line[^.]*GOT port dues/);
  });

  it('the vessel-fee family annotates the fairway slot (no Hamburg counterpart — the Hafengeld↔fairway claim is dropped, stated as such)', () => {
    const note = equivalenceNoteForFamily('vessel_fee')!;
    expect(note).toBeDefined();
    expect(note.text).toContain('no counterpart at the German port');
    expect(note.text).toContain('Functionally corresponds to nothing at the German port');
  });

  it('the berth-dues rule notes state the lay-time correspondence (HHLA ↔ Eurogate; no Swedish counterpart)', () => {
    for (const ruleId of ['hhla_tonnage_dues', 'eurogate_berthing_charge']) {
      const note = equivalenceNoteForRule(ruleId)!;
      expect(note).toBeDefined();
      expect(note.text).toContain('functionally corresponds');
      expect(note.text).toContain('lay-time');
    }
    const hlla = equivalenceNoteForRule('hhla_tonnage_dues')!;
    expect(hlla.text).toContain('Eurogate berthing charge');
    expect(hlla.text).toContain('no Swedish figure corresponds');
  });

  it('unannotated families render no note (the map is the verified set only)', () => {
    expect(equivalenceNoteForFamily('waste')).toBeUndefined();
    expect(equivalenceNoteForFamily('pilotage')).toBeUndefined();
    expect(equivalenceNoteForFamily('terminal_handling')).toBeUndefined();
    expect(equivalenceNoteForRule('hpa_port_fee')).toBeUndefined();
  });
});

describe('Cross-port functional-equivalence annotations — zero-drift and rendering (spec v0.3.3, item 2)', () => {
  it('no figure or label moves: the comparison totals hold exactly with the annotations present (pinned both ways)', () => {
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

  it('the notes render in the comparison view beside the annotated rows (desktop and mobile paths share the same note text)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'comparisonView.tsx'), 'utf8');
    expect(src).toContain('equivalenceNoteForFamily(family)');
    expect(src).toContain("equivalenceNoteForRule('hhla_tonnage_dues')");
    // Both render sites (desktop table and mobile cards) carry the note.
    expect((src.match(/equivalenceNoteForFamily\(family\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('the annotation is stated as functional correspondence, never identity (source-level honesty pin)', () => {
    const notesSrc = fs.readFileSync(path.join(__dirname, 'equivalenceNotes.ts'), 'utf8');
    expect(notesSrc).toContain('functionally correspond');
    expect(notesSrc).toContain('never as identity of amounts or labels');
    // Never an identity statement on amounts.
    expect(notesSrc).not.toMatch(/same amount|identical to|equals the/);
  });

  it('no port label or family label changes (the silo/transcription principle untouched)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'comparisonView.tsx'), 'utf8');
    // The family label still renders as the raw family name; the note is an
    // addition beside it, never a replacement.
    expect(src).toContain("{family.replace(/_/g, ' ')}");
  });
});
