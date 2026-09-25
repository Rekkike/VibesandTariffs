import React from 'react';
import { Box } from '@mui/material';
import type { VesselInput } from '@port-cost/core';
import { toComparisonBasis, formatRate } from './conversion';
import type { ComparisonBasisContext, ExchangeRateInfo } from './conversion';
import type { ComparisonFamilyEntry } from './comparisonModel';

export type AmountCell = (
  entry: ComparisonFamilyEntry | undefined,
  fallbackCurrency: string,
  showDerivation: boolean
) => React.ReactNode;
export type ConvCell = (nativeAmount: number, currency: string) => React.ReactNode;
export type GrandTotalPerGtCell = (
  total: number,
  currency: string,
  opsPresent: boolean
) => React.ReactNode;

export interface ComparisonCellsProps {
  rateInfo: ExchangeRateInfo;
  comparisonBasisContext: ComparisonBasisContext;
  isMobile: boolean;
  conversionsVisible: boolean;
  vessel: VesselInput;
  formatCurrency: (amount: number, currency: string) => string;
}

// Shared comparison cell renderers (spec v0.2.60 decomposition, audit item
// B boundary 1): amountCell / convCell / grandTotalPerGtCell as a props-in
// factory - the same closures as before, extracted without behavior change.
export const makeComparisonCells = (props: ComparisonCellsProps) => {
  const {
    rateInfo,
    comparisonBasisContext,
    isMobile,
    conversionsVisible,
    vessel,
    formatCurrency
  } = props;
  const vesselGt = vessel.gt;
  const amountCell = (
    entry: { amount: number; currency: string; flags: number; effective_per_gt?: number; lines: { name: string; ruleId: string; biller: string; amount: number; flags: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[] } | undefined,
    fallbackCurrency: string,
    showDerivation: boolean
  ) => {
    if (!entry) {
      // Explicit absence (spec v0.2.52): a fee family a port does not levy
      // renders "not levied at this port" — never hidden, so an absence of
      // cost is not mistaken for missing data (spec 4.3.1 comparability
      // rules; pinned choice, per-port and comparison alike).
      return <span className="comparison-not-charged">not levied at this port</span>;
    }
    const conv = toComparisonBasis(entry.amount, entry.currency || fallbackCurrency, rateInfo, comparisonBasisContext);
    return (
      <Box sx={{ textAlign: 'right' }}>
        <span className="comparison-figure">
          {formatCurrency(entry.amount, entry.currency || fallbackCurrency)}
          {entry.flags > 0 && (
            <span className="status-badge status-warning" style={{ marginLeft: '6px' }}>
              {entry.flags} flag{entry.flags > 1 ? 's' : ''}
            </span>
          )}
        </span>
        {conv.converted && (isMobile ? (
          // Narrow screens (spec v0.2.39): the converted figure collapses
          // behind the view's conversion disclosure.
          conversionsVisible && (
            <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
              ≈ {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted</span>
            </Box>
          )
        ) : (
          // Converted-secondary figure (spec v0.2.31): native primary, then
          // the converted approximation, always with its rate basis.
          <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
            ≈ {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted</span>
          </Box>
        ))}
        {entry.effective_per_gt !== undefined && (
          <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
            {entry.effective_per_gt.toFixed(2)} {entry.currency || fallbackCurrency}/GT effective — derived, not a published rate
            {conv.converted && (
              <span> (≈ {(entry.effective_per_gt * rateInfo.rate).toFixed(2)} SEK/GT converted)</span>
            )}
          </Box>
        )}
        {entry.lines.map((line, index) => (
          <Box key={index} sx={{ fontSize: '0.75rem', mt: 0.25 }} className="comparison-secondary">
            {line.name} · {line.biller}: {formatCurrency(line.amount, entry.currency || fallbackCurrency)}
            {line.estimated && (
              <span className="status-badge status-warning" style={{ marginLeft: 'var(--space-1)' }}>est.</span>
            )}
            {/* Condensed derivation (spec v0.2.42): the comparison states the
                fee's structure and composition so no figure is opaque there;
                the full band detail stays on the per-port view. */}
            {showDerivation && line.derivation && (
              <Box component="span" className="comparison-derivation-condensed" style={{ display: 'block' }}>
                {line.derivation.composition && line.derivation.composition.startsWith(`${line.derivation.structure}:`) ? (
                  <span className="comparison-derivation-composition">{line.derivation.composition}</span>
                ) : (
                  <>
                    <span className="comparison-derivation-structure">{line.derivation.structure}</span>
                    {line.derivation.composition && line.derivation.composition !== line.derivation.structure && (
                      <span className="comparison-derivation-composition"> — {line.derivation.composition}</span>
                    )}
                  </>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  // Native-primary / converted-secondary aggregate cell (spec v0.2.31):
  // the port's native-currency figure first, then the converted comparison
  // basis (SEK) as a derived secondary figure for non-SEK ports. A converted
  // figure never appears without its rate-and-date basis.
  const convCell = (nativeAmount: number, currency: string) => {
    const conv = toComparisonBasis(nativeAmount, currency, rateInfo, comparisonBasisContext);
    if (!conv.converted) {
      return <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>;
    }
    // Narrow screens (spec v0.2.39): the converted figure collapses behind
    // the view's conversion disclosure; the native-primary figure stays
    // readable. The disclosure state is per-comparison-view, never global.
    if (isMobile && !conversionsVisible) {
      return (
        <Box sx={{ textAlign: 'right' }}>
          <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>
          <span className="comparison-converted-hidden-tag">converted figure hidden</span>
        </Box>
      );
    }
    return (
      <Box sx={{ textAlign: 'right' }}>
        <span className="comparison-figure">{formatCurrency(nativeAmount, currency)}</span>
        <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
          {'≈'} {formatCurrency(conv.amount, 'SEK')} <span className="comparison-converted-tag">converted {'—'} {formatRate(rateInfo)}</span>
        </Box>
      </Box>
    );
  };

  // Derived per-GT on the Grand Total (spec v0.2.58): the comparison's
  // cross-port comparability bridge — Grand Total ÷ vessel GT, the same
  // derived-metric convention as the vessel-access effective per-GT (spec
  // v0.2.30: labeled derived, never a published rate). The Swedish ports
  // are pure division (SEK total ÷ GT); Hamburg converts through the same
  // EUR/SEK rate input as every converted figure (EUR total × rate ÷ GT)
  // and names the rate input as a dependency per the derived-and-converted
  // disclosure convention. When OPS user-specified values are entered the
  // figure uses the Grand Total as presented (including OPS) — the
  // comparison is about the total cost of the call as the user speculates
  // it — and the note states that inclusion so the label never implies the
  // total is tariff-derived when it is not. Zero or missing GT renders
  // nothing (no division artifact). Secondary line under the total per the
  // v0.2.56 rhythm; the mobile converted collapse (spec v0.2.39) applies
  // to the converted Hamburg figure exactly as to every converted figure.
  const grandTotalPerGtCell = (total: number, currency: string, opsPresent: boolean) => {
    if (!vesselGt || vesselGt <= 0) return null;
    const opsNote = opsPresent ? ' (includes user-specified OPS)' : '';
    if (currency === 'SEK') {
      const perGt = total / vesselGt;
      return (
        <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary comparison-total-pergt">
          {perGt.toFixed(2)} SEK/GT effective — derived, not a published rate{opsNote}
        </Box>
      );
    }
    const conv = toComparisonBasis(total, currency, rateInfo, comparisonBasisContext);
    if (!conv.converted) return null;
    if (isMobile && !conversionsVisible) {
      return (
        <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary comparison-total-pergt">
          <span className="comparison-converted-hidden-tag">converted per-GT figure hidden</span>
        </Box>
      );
    }
    const perGtConv = conv.amount / vesselGt;
    return (
      <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary comparison-total-pergt">
        {perGtConv.toFixed(2)} SEK/GT effective — derived, not a published rate; converted at the exchange-rate input ({formatRate(rateInfo)}){opsNote}
      </Box>
    );
  };

  return { amountCell, convCell, grandTotalPerGtCell };
};
