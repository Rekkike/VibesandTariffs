// Derivation transparency (spec v0.2.42, section 4.8 Derivation
// Transparency contract).
//
// Presentation-only: this module renders the derivation steps the engine
// already computed (FeeResult.derivation) and never recomputes a figure.
// One pattern across all three ports — the same component renders the
// HPA composite port fee (tranche bands → per-component adjustment stack
// → composition), the Gothenburg/Helsingborg progressive dues and storage
// day ladders, and every flat fee's single computation.
//
// Every fee line exposes its derivation in both the per-port view and the
// comparison view (condensed there); flags render adjacent to the figure
// they affected, never in a distant section; a fee whose structure is flat
// shows its single computation, not an empty panel.
import React from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { DerivationStep, FeeResult, QualityFlag } from '@port-cost/core/types';
import { badgesForFlags } from './flagBadges';

// The flags that belong to a fee's derivation render adjacent to the
// step they affected — assumed-parameter notices sit inside the detail,
// next to the figure, not in a distant quality-flag section.
const FlagBadges: React.FC<{ flags: QualityFlag[] }> = ({ flags }) => {
  const badges = badgesForFlags(flags);
  if (badges.length === 0) return null;
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap', verticalAlign: 'baseline' }}>
      {badges.map((b, i) => (
        <span
          key={i}
          className={`status-badge ${b.kind === 'estimated' ? 'status-warning' : b.kind === 'assumed' ? 'status-info' : b.kind === 'caveat' ? 'status-caveat' : 'status-info'}`}
          title={b.title}
        >
          {b.label}
        </span>
      ))}
    </Box>
  );
};

const formatAmount = (amount: number, currency: string) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + currency;

const StepBands: React.FC<{ step: DerivationStep; currency: string }> = ({ step, currency }) => (
  <Table size="small" className="band-table derivation-band-table">
    <TableHead>
      <TableRow>
        <TableCell>Band</TableCell>
        <TableCell align="right">Quantity</TableCell>
        <TableCell>Components (rate × quantity)</TableCell>
        <TableCell align="right">Band amount</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {(step.bands ?? []).map((row, i) => (
        <TableRow key={i}>
          <TableCell>{row.label}</TableCell>
          <TableCell align="right">{row.quantity.toLocaleString('en-US')}</TableCell>
          <TableCell>
            {row.components.map(c => (
              <span key={c.label} className="source-ref" style={{ display: 'block' }}>
                {c.label}: {c.rate} × {row.quantity.toLocaleString('en-US')} = {c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            ))}
          </TableCell>
          <TableCell align="right">{row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
        </TableRow>
      ))}
      {step.amount !== undefined && (
        <TableRow>
          <TableCell colSpan={3}><strong>Band sum</strong></TableCell>
          <TableCell align="right"><strong>{step.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

// One derivation step: heading, one-line detail, and the step's figure where
// it has one. Bands render as the band table; adjustments carry their delta
// (negative = a reduction); components list each component's amount.
const DerivationStepView: React.FC<{ step: DerivationStep; currency: string }> = ({ step, currency }) => (
  <Box className="derivation-step">
    <Box className="derivation-step-head">
      <Typography component="span" variant="body2" className="derivation-step-label">{step.label}</Typography>
      {step.detail && (
        <Typography component="span" variant="body2" className="derivation-step-detail">{step.detail}</Typography>
      )}
      {step.amount !== undefined && step.kind !== 'bands' && !(step.kind === 'composition' && step.components && step.components.length > 0) && (
        <Typography component="span" variant="body2" className={`derivation-step-amount ${step.amount < 0 ? 'amount-negative' : ''}`}>
          {step.amount < 0 ? '−' : ''}{formatAmount(Math.abs(step.amount), currency)}
        </Typography>
      )}
    </Box>
    {step.kind === 'bands' && <StepBands step={step} currency={currency} />}
    {step.components && step.components.length > 0 && (
      <Box className="derivation-step-components">
        {step.components.map(c => (
          <Box key={c.label} className="derivation-component-line">
            <span>{c.label}</span>
            <span className="derivation-component-amount">{formatAmount(c.amount, currency)}</span>
          </Box>
        ))}
      </Box>
    )}
  </Box>
);

// The full derivation detail for the per-port fee-line expansion: structure
// label, every step in the engine's order, flags adjacent to the figure
// they affected, and the fee total as the last step.
export const DerivationDetail: React.FC<{ fee: FeeResult }> = ({ fee }) => {
  const d = fee.derivation;
  if (!d) return null;
  return (
    <Box className="derivation-detail" component="section" aria-label="Fee derivation">
      <Typography variant="body2" className="derivation-structure-label">
        {d.structure_label}
      </Typography>
      {d.steps.map((step, i) => (
        <DerivationStepView key={i} step={step} currency={fee.currency} />
      ))}
      <Box className="derivation-flags">
        <FlagBadges flags={fee.quality_flags} />
        {fee.quality_flags.map((flag, i) => (
          <Typography
            key={i}
            variant="body2"
            className={`derivation-flag-detail ${flag.severity === 'error' ? 'status-badge status-error' : flag.severity === 'warning' ? 'status-badge status-warning' : 'status-badge status-info'}`}
          >
            [{flag.severity.toUpperCase()}] {flag.description}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};

// Condensed derivation for the comparison view (desktop cells and mobile
// cards): the structure label plus the composition line — components after
// adjustments — rendered compactly. The full band detail stays on the
// per-port view; the comparison cell states the composition and the total
// so an opaque number never appears there.
export const condensedDerivation = (
  fee: FeeResult
): { structure: string; composition: string; total: string } | null => {
  const d = fee.derivation;
  if (!d) return null;
  const composition = d.steps.find(s => s.kind === 'composition' && s.components && s.components.length > 0);
  const total = d.steps[d.steps.length - 1];
  const parts: string[] = [];
  if (composition && composition.components) {
    for (const c of composition.components) {
      parts.push(`${c.label}: ${c.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    }
  } else {
    // No component composition (progressive, flat, per-unit fees): state the
    // computation and the applied adjustments with their deltas instead —
    // never the raw band arithmetic string.
    for (const s of d.steps) {
      if (s.kind === 'bands') continue;
      if (s.kind === 'adjustment' && s.amount !== undefined) {
        parts.push(`${s.label}: ${s.amount < 0 ? '\u2212' : ''}${Math.abs(s.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      } else if (s.label === 'Computation' && s.detail) {
        parts.push(s.detail);
      }
    }
  }
  return {
    structure: d.structure_label,
    composition: parts.join(' + '),
    total: total && total.amount !== undefined
      ? total.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })
      : fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })
  };
};
