// Call-frequency what-if panel (spec v0.2.63): a per-port, workspace-side
// speculation surface showing how frequent calls at this port change the
// port's charges. Presentation-layer only, in the OPS speculation
// tradition: the panel's input is user-specified, lives outside the call
// model, never feeds the engine, and never touches the persistence split
// (not in any reset_fields list, not a call field — local React state that
// resets on remount, exactly like a disclosure's open state).
//
// Swedish panel (GOT, HEL): the Sjöfartsverket frequency rabatt (prislista
// farleds- och lotsavgifter 2026 p.4 "Frekvent trafik"; Föreskrift 2025:6
// om farledsavgift §§13/15 — readiness fee charged for the first five calls
// of a calendar month, third 75%, fourth 50%, fifth 25%; from the sixth call
// only the gods- och passageraravgift continues). The panel itemizes, for a
// representative call N ≥ 1 in the calendar month, which components the
// scale waives and which continue, the per-call total for that call, the
// delta versus the current single-call model, and the percentage against
// the current call total. All arithmetic is derived from the engine's own
// result lines (the vessel_fee and readiness_fee amounts of the
// frequency-discount biller) — the panel never recomputes an engine rule
// and never re-prices the call model.
//
// Hamburg panel: the audit (spec v0.2.63) shows HAM's frequency-dependent
// discount — the Quantum rabatt (STC 4.1.2.11, retrospective on the
// previous calendar year's accumulated paid GT in price category 31) — is
// already an engine input (quantum_prior_year_gt, the Hamburg call
// parameters section); it already fires through the engine. Duplicating it
// as a speculation figure would double-count. HAM's panel therefore renders
// documentation only: the call-property discounts that already fire and a
// notice pointing at the existing quantum input — an honest pointer beats
// a speculative figure.
import React, { useState } from 'react';
import { Box, Typography, TextField, Grid } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import type { CostCalculationResult, PortDefinition } from '@port-cost/core';

// The frequency scale as the price list states it (prislista 2026 p.4):
// call 1–2 → 100% payable, 3 → 75%, 4 → 50%, 5 → 25%, 6+ → 0% of the
// vessel-based and readiness fees. The bands are the tariff's own; the
// engine's per-biller frequency_discount section carries the same scale
// (pinned by the core suite) — the panel renders this table from the same
// source of truth, the port file's biller definition, never a second copy.
const R2 = (n: number) => Math.round(n * 100) / 100;

export interface FrequencyScenarioLine {
  label: string;
  detail: string;
  amount: number;
}
export interface FrequencyScenario {
  calls: number;
  payablePct: number | null;      // null when the port's biller carries no scale
  waivedLines: FrequencyScenarioLine[]; // components the scale waives (amounts = waived share)
  continuingLines: FrequencyScenarioLine[]; // components that keep charging (godsavgift etc.)
  waivedTotal: number;
  continuingTotal: number;
  scenarioPerCallTotal: number;   // current total minus the waiver
  deltaVsCurrent: number;         // scenarioPerCallTotal - result.total (<= 0)
  pctOfCurrentTotal: number;      // waivedTotal / result.total * 100
  currency: string;
  basisNote: string;              // tariff citations
}

// Resolves the biller carrying a frequency_discount section and its scale,
// from the port definition (data, not code). Returns null at ports without
// one (Hamburg today).
interface FrequencyBillerDef {
  billerName: string;
  applyFamilies: string[];
  bands: { min_calls: number; max_calls: number | null; payable_pct: number }[];
  sourceClause: string;
  sourceDoc: string;
}
export function frequencyBillerFor(port: PortDefinition): FrequencyBillerDef | null {
  for (const biller of port.billers ?? []) {
    const fd = (biller as unknown as { frequency_discount?: {
      apply_families: string[];
      bands: { min_calls: number; max_calls: number | null; payable_pct: number }[];
      source_reference?: { document_name?: string; clause?: string };
    } }).frequency_discount;
    if (!fd || !Array.isArray(fd.bands) || fd.bands.length === 0) continue;
    return {
      billerName: biller.name,
      applyFamilies: fd.apply_families ?? [],
      bands: fd.bands,
      sourceClause: fd.source_reference?.clause ?? '',
      sourceDoc: fd.source_reference?.document_name ?? ''
    };
  }
  return null;
}

// The pure derivation. Renders nothing (null) when the input is blank —
// blank means no panel output, and the panel is absent from every total.
export function frequencyScenario(
  port: PortDefinition,
  result: CostCalculationResult,
  callsPerMonth: number | null | undefined
): FrequencyScenario | null {
  if (callsPerMonth === null || callsPerMonth === undefined
    || !Number.isFinite(callsPerMonth) || callsPerMonth < 1) {
    return null;
  }
  const calls = Math.floor(callsPerMonth);
  const def = frequencyBillerFor(port);
  if (!def) return null;
  const band = def.bands.find(b =>
    calls >= b.min_calls && (b.max_calls === null || calls <= b.max_calls));
  if (!band) return null;
  const payablePct = band.payable_pct;
  const biller = result.billers.find(b => b.biller === def.billerName)
    ?? result.billers.find(b => /sjöfartsverket/i.test(b.biller));
  if (!biller) return null;
  // Waived base: the engine's own fee lines in the scale's apply families.
  const baseFees = biller.fees.filter(f => def.applyFamilies.includes(f.fee_family));
  const base = R2(baseFees.reduce((s, f) => s + f.amount, 0));
  const waived = R2(base * (100 - payablePct) / 100);
  const waivedLines: FrequencyScenarioLine[] = baseFees.map(f => ({
    label: f.fee_family === 'vessel_fee'
      ? 'Vessel fee (fartygsavgift)'
      : f.fee_family === 'readiness_fee'
        ? 'Readiness fee (beredskapsavgift)'
        : f.fee_family,
    detail: `${payablePct}% payable at call ${calls} — ${R2(f.amount * (100 - payablePct) / 100)} ${result.currency} waived of ${R2(f.amount)}`,
    amount: R2(f.amount * (100 - payablePct) / 100)
  }));
  // Continuing components: the same biller's other cargo-based lines — the
  // godsavgift keeps charging from the sixth call (prislista 2026 p.4:
  // "Från och med det sjätte anlöpet ... endast gods- och passageraravgift").
  const continuingFees = biller.fees.filter(
    f => !def.applyFamilies.includes(f.fee_family) && f.amount > 0);
  const continuingLines: FrequencyScenarioLine[] = continuingFees.map(f => ({
    label: /godsavgift/.test(f.fee_rule_id)
      ? 'Cargo fee (godsavgift)'
      : f.fee_rule_id,
    detail: 'cargo-based fee — continues at every call',
    amount: R2(f.amount)
  }));
  const continuingTotal = R2(continuingFees.reduce((s, f) => s + f.amount, 0));
  const scenarioPerCallTotal = R2(result.total - waived);
  const deltaVsCurrent = R2(scenarioPerCallTotal - result.total);
  const pctOfCurrentTotal = result.total > 0
    ? R2(waived / result.total * 10000) / 100
    : 0;
  return {
    calls,
    payablePct,
    waivedLines,
    continuingLines,
    waivedTotal: waived,
    continuingTotal,
    scenarioPerCallTotal,
    deltaVsCurrent,
    pctOfCurrentTotal,
    currency: result.currency,
    basisNote: `Basis: ${def.sourceDoc}, "${def.sourceClause}" — Sjöfartsverket prislista farleds- och lotsavgifter 2026 p.4 (Frekvent trafik); Föreskrift 2025:6 om farledsavgift. User-specified call frequency; the call model itself is unchanged (spec v0.2.63).`
  };
}

// The Hamburg documentation panel (audit outcome: the retrospective
// quantum discount is already an engine input, quantum_prior_year_gt —
// never duplicated as a speculation figure).
const HAM_DOC = {
  title: 'Call frequency what-if — discounts that already apply',
  lines: [
    {
      label: 'Quantum discount (previous-year volume)',
      detail: 'STC 4.1.2.11, special tariff 280: retrospective on the previous calendar year\'s accumulated paid GT in price category 31 — >1.5m GT → −2.5%, >10m → −5.0%, >25m → −7.5% on the GT component. Already an engine input: enter the prior-year GT in this workspace\'s Hamburg call parameters (Quantum discount field) — it fires through the port fee line; no separate speculation figure is rendered here.'
    },
    {
      label: 'Second call discount (special tariff 221)',
      detail: 'STC 4.1.2.5: price categories 11, 12, 21 and 37T only — a repeat call within 120 hours with no intermediate commercial port call. Not price category 31 (full container ships): does not apply to the container model.'
    },
    {
      label: 'Call-property discounts that already fire',
      detail: 'Tier adjustment (S1 item 115), ESI air/noise (STC 4.1.1.1/4.1.1.2), GT cap 225,000 (item 210), OPS rebate (item 217) — all are engine rules keyed on this call\'s inputs; none depends on call frequency.'
    }
  ] as { label: string; detail: string }[]
};

export const FrequencyPanel: React.FC<{
  port: PortDefinition;
  result: CostCalculationResult | null;
  formatCurrency: (amount: number) => string;
}> = ({ port, result, formatCurrency }) => {
  const [open, setOpen] = useState(false);
  const [callsInput, setCallsInput] = useState<string>('');
  const hasScale = frequencyBillerFor(port) !== null;
  const isHamburg = port.metadata.id === 'hamburg';
  if (!result) return null;
  const calls = callsInput.trim() === '' ? null : Number(callsInput);
  const scenario = hasScale ? frequencyScenario(port, result, calls) : null;
  const panelId = `frequency-panel-${port.metadata.id}`;
  return (
    <Box className="frequency-panel disclosure-card" data-testid={panelId}>
      <button
        type="button"
        className="disclosure-header"
        aria-expanded={open}
        aria-controls={panelId + '-body'}
        onClick={() => setOpen(o => !o)}
      >
        <Box>
          Call frequency what-if (user-specified, not tariff-derived)
          <span className="disclosure-header-summary">
            {hasScale
              ? 'How the Sjöfartsverket frequency rabatt changes a frequent caller\'s per-call charges — speculation only, never changes the call model'
              : 'This port\'s frequency-dependent discounts, documented'}
          </span>
        </Box>
        <KeyboardArrowDown />
      </button>
      <div id={panelId + '-body'} className="disclosure-body" hidden={!open}>
        {hasScale ? (
          <Box className="frequency-panel-body">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Calls per month at this port (speculative)"
                  type="number"
                  value={callsInput}
                  onChange={e => setCallsInput(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: 1, 'data-testid': panelId + '-input' }}
                  helperText="User-specified scenario input — outside the call model; blank = no scenario output. The call model's own 'Calls This Month' field (which feeds the engine) is unchanged."
                />
              </Grid>
            </Grid>
            {scenario && (
              <Box className="frequency-scenario-output" data-testid={panelId + '-output'}>
                <Typography variant="subtitle2" className="frequency-scenario-heading">
                  Representative call {scenario.calls} of the month — {scenario.payablePct}% of the vessel-based and readiness fees payable
                </Typography>
                {scenario.waivedLines.map(l => (
                  <Box key={l.label} className="frequency-scenario-line">
                    <span className="frequency-scenario-line-label">Waived: {l.label}</span>
                    <span className="frequency-scenario-line-detail">{l.detail}</span>
                    <span className="frequency-scenario-line-amount">−{formatCurrency(l.amount)}</span>
                  </Box>
                ))}
                {scenario.continuingLines.map(l => (
                  <Box key={l.label} className="frequency-scenario-line">
                    <span className="frequency-scenario-line-label">Continues: {l.label}</span>
                    <span className="frequency-scenario-line-detail">{l.detail}</span>
                    <span className="frequency-scenario-line-amount">{formatCurrency(l.amount)}</span>
                  </Box>
                ))}
                <Box className="frequency-scenario-line frequency-scenario-total">
                  <span>Waived total (vessel + readiness): −{formatCurrency(scenario.waivedTotal)} {scenario.currency}</span>
                </Box>
                <Box className="frequency-scenario-line">
                  <span>Per-call total for this call (derived): {formatCurrency(scenario.scenarioPerCallTotal)} {scenario.currency}</span>
                </Box>
                <Box className="frequency-scenario-line">
                  <span>Delta versus the current single-call model: {formatCurrency(scenario.deltaVsCurrent)} {scenario.currency}</span>
                </Box>
                <Box className="frequency-scenario-line">
                  <span>Waiver as percentage of the current call total (derived, currency-neutral): {scenario.pctOfCurrentTotal.toFixed(2)}%</span>
                </Box>
                <Typography variant="caption" className="frequency-scenario-basis">
                  {scenario.basisNote}
                </Typography>
              </Box>
            )}
          </Box>
        ) : isHamburg ? (
          <Box className="frequency-panel-body" data-testid={panelId + '-doc'}>
            <Typography variant="caption" className="frequency-scenario-basis">
              Audit outcome (spec v0.2.63): Hamburg&apos;s frequency-dependent discount — the Quantum rabatt — is retrospective on the
              previous calendar year and already an engine input; no speculation figure is rendered for it. An honest gap notice beats a speculative figure.
            </Typography>
            {HAM_DOC.lines.map(l => (
              <Box key={l.label} className="frequency-scenario-line">
                <span className="frequency-scenario-line-label">{l.label}</span>
                <span className="frequency-scenario-line-detail">{l.detail}</span>
              </Box>
            ))}
          </Box>
        ) : (
          <Box className="frequency-panel-body">
            <Typography variant="caption" className="frequency-scenario-basis">
              No frequency-dependent discount exists at this port (verified against the port&apos;s tariff).
            </Typography>
          </Box>
        )}
      </div>
    </Box>
  );
};

