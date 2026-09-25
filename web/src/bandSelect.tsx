// Banded-input dual-mode control (spec v0.2.65): a tier select rendered beside
// the existing free numeric field for the banded tariff inputs the Phase A
// audit ruled band-worthy (Hamburg's quantum, ESI air, and ESI noise).
//
// Contract:
//  - One underlying value. The select writes the numeric field through the
//    same handleCallChange the free field uses; the numeric field remains the
//    engine's contract, the persistence's contract, and the pins' contract.
//    No parallel state: the component holds no value of its own, derives its
//    selected band from the numeric value it is handed, and renders nothing
//    when the port's data carries no bands for the input.
//  - Band data derives from the same data the engine applies - the
//    adjustment rules' band definitions in the port file, read from the
//    loaded PortDefinition (the same registry the engine prices from),
//    never a second hand-kept copy. A new port shipping bands in its fee
//    rules gets the control for free.
//  - Default unchanged: the select renders "none" when the numeric value
//    falls in no band (below the first threshold, or blank), and the fresh
//    load is byte-identical to the pre-v0.2.65 surface.
import React from 'react';
import { Select, MenuItem, FormControl, InputLabel, FormHelperText } from '@mui/material';
import type { PortDefinition } from '@port-cost/core';

// The band shape the engine's composite component adjustments carry
// (core/src/types.ts CompositeComponentAdjustment.bands).
export interface EngineBand {
  min: number;
  max: number | null;
  pct: number;
  cap?: number;
}

export interface BandDef {
  // The call input field the adjustment keys on (esi_score,
  // esi_noise_score, quantum_prior_year_gt) - the numeric field the select
  // writes.
  input: string;
  bands: EngineBand[];
  // The engine adjustment kind's consumption side, copied from the engine's
  // own predicates so the select's re-banding matches the engine exactly:
  // 'min_inclusive' - score >= min && (max === null || score < max)
  //   (score_discount_pct_with_cap, engine.ts)
  // 'min_exclusive' - value > min && (max === null || value <= max)
  //   (pct_discount_banded, engine.ts)
  operator: 'min_inclusive' | 'min_exclusive';
  description: string;
  citation: string;
}

// Resolves the banded adjustment definitions for a port's inputs from the
// port definition's own fee rules - the same band arrays the engine applies.
// Returns null where the port carries no such adjustment (the control then
// never renders).
export function bandedInputsForPort(port: PortDefinition): BandDef[] {
  const defs: BandDef[] = [];
  const seen = new Set<string>();
  for (const rule of port.fee_rules ?? []) {
    const rs = rule.rate_structure as unknown as {
      type?: string;
      component_adjustments?: Record<string, unknown[]>;
    };
    if (rs?.type !== 'composite_tranche') continue;
    const source = rule.source_reference;
    const citation = source
      ? `${source.document_name}${source.clause ? ` — ${source.clause}` : ''}`
      : '';
    for (const stack of Object.values(rs.component_adjustments ?? {})) {
      for (const adj of stack as Array<Record<string, unknown>>) {
        const kind = adj.kind;
        const input = typeof adj.input === 'string' ? adj.input : null;
        const bands = Array.isArray(adj.bands) ? (adj.bands as EngineBand[]) : null;
        if (!input || !bands || bands.length === 0) continue;
        if (kind === 'score_discount_pct_with_cap') {
          if (seen.has(input)) continue;
          seen.add(input);
          defs.push({
            input,
            bands,
            operator: 'min_inclusive',
            description: typeof adj.description === 'string' ? adj.description : input,
            citation
          });
        } else if (kind === 'pct_discount_banded') {
          if (seen.has(input)) continue;
          seen.add(input);
          defs.push({
            input,
            bands,
            operator: 'min_exclusive',
            description: typeof adj.description === 'string' ? adj.description : input,
            citation
          });
        }
      }
    }
  }
  return defs;
}

// The band a numeric value falls in, using the engine's own predicate for
// the adjustment kind. null when the value is in no band.
export function bandForValue(
  def: Pick<BandDef, 'bands' | 'operator'>,
  value: number | undefined | null
): EngineBand | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (def.operator === 'min_inclusive') {
    return (
      def.bands.find(b => value >= b.min && (b.max === null || value < b.max)) ?? null
    );
  }
  return (
    def.bands.find(b => value > b.min && (b.max === null || value <= b.max)) ?? null
  );
}

// The threshold value the select writes into the numeric field when a band
// is selected: the band's entry edge per the engine's own consumption side -
// min_inclusive bands fire at min; min_exclusive bands fire strictly above
// min, so the smallest whole-number threshold that lands in the band is
// min + 1 for integer scales and min itself never fires (the quantum case:
// 1,500,000 must select-populate a value that actually discounts).
export function thresholdValue(def: Pick<BandDef, 'bands' | 'operator'>, band: EngineBand): number {
  if (def.operator === 'min_inclusive') return band.min;
  return band.min + 1;
}

// Human band range per the tariff's own operators, for the option label.
export function bandRangeLabel(def: Pick<BandDef, 'bands' | 'operator'>, band: EngineBand): string {
  const fmt = (n: number) => n.toLocaleString('en-US');
  if (def.operator === 'min_inclusive') {
    const lower = fmt(band.min);
    const upper = band.max === null ? null : fmt(band.max - 1);
    return band.max === null ? `${lower}+` : `${lower}–${upper}`;
  }
  const lower = fmt(band.min);
  const upper = band.max === null ? null : fmt(band.max);
  return band.max === null ? `over ${lower}` : `over ${lower} up to ${upper}`;
}

export interface BandSelectProps {
  def: BandDef;
  // The numeric value of the underlying field (the engine's own contract).
  value: number | undefined;
  // The same change handler the free numeric field uses - the select writes
  // only the underlying field.
  onValueChange: (value: number | undefined) => void;
  label?: string;
  selectLabel?: string;
  helperText?: string;
}

// The dual-mode tier select. Renders one Select whose options are the port
// file's own bands (label: range + discount percentage, citation in the
// helper text) plus the "none" state. Selecting a band populates the
// numeric field with the band's threshold value; the numeric field's own
// edits re-band the select live through the derived `bandForValue`.
export const BandSelect: React.FC<BandSelectProps> = ({
  def,
  value,
  onValueChange,
  label,
  selectLabel,
  helperText
}) => {
  const activeBand = bandForValue(def, value);
  const selectedKey = activeBand
    ? `${activeBand.min}-${activeBand.max ?? 'null'}`
    : 'none';
  return (
    <FormControl fullWidth>
      <InputLabel>{selectLabel ?? `${def.description} tier`}</InputLabel>
      <Select
        value={selectedKey}
        onChange={(e) => {
          const key = e.target.value as string;
          if (key === 'none') {
            // "none" clears the underlying field to the no-band state the
            // engine already prices (blank = least favourable, no discount).
            onValueChange(undefined);
            return;
          }
          const band = def.bands.find(
            b => `${b.min}-${b.max ?? 'null'}` === key
          );
          if (band) onValueChange(thresholdValue(def, band));
        }}
        label={selectLabel ?? `${def.description} tier`}
        SelectDisplayProps={{ 'data-testid': `band-select-${def.input}` } as Partial<Record<string, string>>}
      >
        <MenuItem value="none">
          None{value !== undefined && value !== null && !activeBand
            ? ` (below first threshold)`
            : ' (not entered)'}
        </MenuItem>
        {def.bands.map((b, i) => (
          <MenuItem
            key={`${b.min}-${b.max ?? 'null'}`}
            value={`${b.min}-${b.max ?? 'null'}`}
            data-testid={`band-option-${def.input}-${i}`}
          >
            {bandRangeLabel(def, b)} ({b.pct}%{b.cap !== undefined ? `, max ${b.cap}` : ''})
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{label ?? def.citation}</FormHelperText>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
};
