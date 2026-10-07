// The printed comparison page set (spec v0.6.2, amended v0.6.3): one self-contained page
// per three port columns (the settled constant in printPages.ts). Pure
// presentation over the already-computed comparison model - the page table
// re-derives nothing: it reads the same rowsBySegment/rateInfo/composition
// the screen view computed and renders the page's own column slice with
// every charge line, stage subtotal, Grand Total, and per-GT disclosure
// repeated on every page (a printed comparison is unfalsifiable without
// its parameters - the mandatory header carries them all).
// The print surface is the table, only the table (spec v0.6.2): the pages
// portal to the document body so the print stylesheet can hide the entire
// screen view (#root) - the print pages are the complete printed output,
// header, continuation note, table, footer, nothing else. The screen's
// flags block is an interactive-surface feature and does not print; the
// table stays self-describing through its own in-cell annotations (the
// derived-not-published per-GT note, the estimated-towage basis notes).
import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { CallInput, PortDefinition, QualityFlag, VesselInput } from '@port-cost/core';
import { formatRate } from './conversion';
import type { ComparisonBasisContext, ExchangeRateInfo } from './conversion';
import { printContinuationNote, printPagesFor } from './printPages';
import type { PrintPage } from './printPages';
import { APP_VERSION } from './version';

// One printed fee line (the comparison model's own line record, carried
// into print as-is): the charge-line name, its biller, its amount, and the
// condensed derivation (the screen's own subtitle text - structure and
// composition, spec v0.2.42) that the fee-derivation toggle gates.
export interface PrintComparisonLine {
  name: string;
  biller: string;
  amount: number;
  estimated: boolean;
  derivation?: { structure: string; composition: string; total: string } | null;
}

export interface PrintComparisonPagesProps {
  ports: PortDefinition[];
  portResults: {
    port: PortDefinition;
    result: {
      total: number;
      currency: string;
      quality_flags: QualityFlag[];
    } | null;
  }[];
  rowsByStage: {
    stage: { id: string; label: string };
    chargeTypeRows: {
      chargeType: { id: string; label: string; description: string };
      perPort: Map<string, { amount: number; currency: string; lines?: PrintComparisonLine[] } | undefined>;
      leviedAt: string[];
    }[];
    familyRows: {
      family: string;
      perPort: Map<string, { amount: number; currency: string; lines?: PrintComparisonLine[] } | undefined>;
    }[];
  }[];
  vessel: VesselInput;
  call: CallInput;
  rateInfo: ExchangeRateInfo;
  comparisonBasisContext: ComparisonBasisContext;
  declaredRows: { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[];
  activeVessel: string;
  formatCurrency: (amount: number, currency: string) => string;
  // Fee-derivation detail toggle (spec v0.6.3, unit 1): the print path
  // reads the toggle from live state - the paper inherits the session, it
  // never applies its own default. ON: the printed fee rows carry their
  // derivation subtitles (the screen's own condensed text). OFF: charge-line
  // names only, clean - byte-identical to the v0.6.2 print.
  derivationsVisible: boolean;
}

// The rate-basis note (the unfalsifiability rule's currency line): every
// rate the printed pages carry, both published pairs, with the as_of.
export const printRateBasisNote = (
  declaredRows: { from_currency: string; to_currency: string; rate: number; as_of: string }[]
): string => {
  const pairs = declaredRows.map(r => `EUR\u2192${r.to_currency} ${r.rate} (${r.as_of})`);
  return `Rate basis: ${pairs.join('; ')}`;
};

export const PrintComparisonPages: React.FC<PrintComparisonPagesProps> = ({
  ports,
  portResults,
  rowsByStage,
  vessel,
  call,
  rateInfo,
  declaredRows,
  activeVessel,
  formatCurrency,
  derivationsVisible
}) => {
  const pages = printPagesFor(ports.map(p => ({ id: p.metadata.id, name: p.metadata.name })));
  const totalPorts = ports.length;
  const portById = new Map(ports.map(p => [p.metadata.id, p]));
  const cheapestPortId = null;
  const mostExpensivePortId = null;

  // The printed fee-line detail (spec v0.6.3, unit 1): rendered only while
  // the session's fee-derivation toggle is ON - each charge line beneath the
  // row's figure as the screen renders it (name \u00b7 biller: amount),
  // with its derivation subtitle using the screen's own strings and the
  // same composition/structure wording rules. OFF renders none of it - the
  // printed fee rows keep charge-line names only, clean.
  const printLineDetail = (
    entry: { amount: number; currency: string; lines?: PrintComparisonLine[] } | undefined,
    currency: string
  ) =>
    derivationsVisible &&
    entry?.lines?.map((line, index) => (
      <Box key={index} className="print-line-detail" sx={{ fontSize: '0.75rem' }}>
        <Box component="span" className="print-line-name">
          {line.name} · {line.biller}: {formatCurrency(line.amount, entry.currency || currency)}
        </Box>
        {line.derivation && (
          <Box component="span" className="print-derivation-detail" style={{ display: 'block' }}>
            {line.derivation.composition && line.derivation.composition.startsWith(`${line.derivation.structure}:`) ? (
              <span className="comparison-derivation-composition">{line.derivation.composition}</span>
            ) : (
              <>
                <span className="comparison-derivation-structure">{line.derivation.structure}</span>
                {line.derivation.composition && line.derivation.composition !== line.derivation.structure && (
                  <span className="comparison-derivation-composition"> \u2014 {line.derivation.composition}</span>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    ));

  const renderHeader = (page: PrintPage) => (
    <Box className="print-header" component="section" aria-label="Printed comparison parameters">
      <p className="print-header-title">
        Port Call Cost Analyzer — Port Comparison (printed)
      </p>
      <span>Version: {APP_VERSION}</span>{' '}
      <span>Tariff year: {ports.map(p => p.metadata.validity_start?.slice(0, 4)).filter((y, i, a) => a.indexOf(y) === i).join('/')}</span>{' '}
      <span>Vessel profile: {activeVessel}</span>{' '}
      <span>GT: {vessel.gt.toLocaleString('en-US')}</span>{' '}
      <span>ESI: {call.esi_score != null ? `${call.esi_score} (entered)` : 'not entered'}</span>{' '}
      <span>Container moves: {((call.containers_loaded_le20ft || 0) + (call.containers_loaded_gt20ft || 0) +
        (call.containers_discharged_le20ft || 0) + (call.containers_discharged_gt20ft || 0)).toLocaleString('en-US')} (loaded + discharged)</span>{' '}
      <span>Lay time: {call.lay_time_hours != null ? `${call.lay_time_hours} h at berth` : 'not entered'}</span>{' '}
      <span>{printRateBasisNote(declaredRows)}</span>{' '}
      <span>
        Converted figures (the comparison basis): {formatRate(rateInfo)}; the EUR\u2192DKK pair
        carries the Danish column's conversion at its published as_of.
      </span>
    </Box>
  );

  const renderFooter = (page: PrintPage) => (
    <Box className="print-footer" component="section">
      Page {page.pageNumber} of {page.totalPages}
    </Box>
  );

  const renderPage = (page: PrintPage) => {
    const continuation = printContinuationNote(page, totalPorts);
    return (
      <Box key={`print-page-${page.pageNumber}`} className="print-page" data-testid={`print-page-${page.pageNumber}`}>
        {renderHeader(page)}
        {continuation && (
          <Box className="print-continuation" data-testid={`print-continuation-${page.pageNumber}`}>
            {continuation}
          </Box>
        )}
        <Table size="small" className="comparison-table">
          <TableHead>
            <TableRow>
              <TableCell>Cost item</TableCell>
              {page.ports.map(({ id }) => (
                <TableCell key={id} align="right">
                  <span className="comparison-port-name">{portById.get(id)?.metadata.name}</span>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rowsByStage.map(({ stage, chargeTypeRows, familyRows }) => (
              <React.Fragment key={stage.id}>
                <TableRow className="comparison-stage-row">
                  <TableCell>
                    <strong>{stage.label}</strong>
                  </TableCell>
                  {page.ports.map(({ id }) => {
                    const stageTotal =
                      chargeTypeRows.reduce((s, r) => s + (r.perPort.get(id)?.amount ?? 0), 0) +
                      familyRows.reduce((s, r) => s + (r.perPort.get(id)?.amount ?? 0), 0);
                    const port = portById.get(id)!;
                    return (
                      <TableCell key={id} align="right" className="comparison-subtotal">
                        <span className="comparison-figure">{formatCurrency(stageTotal, port.metadata.currency)}</span>
                      </TableCell>
                    );
                  })}
                </TableRow>
                {chargeTypeRows.map(({ chargeType, perPort, leviedAt }) => (
                  <TableRow key={chargeType.id} className="comparison-chargetype-row">
                    <TableCell className="comparison-family-cell">
                      <span className="comparison-chargetype-label">{chargeType.label}</span>
                      <span className="comparison-chargetype-desc">{chargeType.description}</span>
                    </TableCell>
                    {page.ports.map(({ id }) => (
                      <TableCell key={id} align="right" className="amount">
                        {leviedAt.includes(id) ? (
                          <>
                            <span className="comparison-figure">
                              {formatCurrency(perPort.get(id)?.amount ?? 0, portById.get(id)!.metadata.currency)}
                            </span>
                            {printLineDetail(perPort.get(id), portById.get(id)!.metadata.currency)}
                          </>
                        ) : (
                          <span className="comparison-not-levied">not levied at this port</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {familyRows.map(({ family, perPort }) => (
                  <TableRow key={`${stage.id}-${family}`}>
                    <TableCell className="comparison-family-cell">
                      <span className="comparison-family-label">{family.replace(/_/g, ' ')}</span>
                    </TableCell>
                    {page.ports.map(({ id }) => (
                      <TableCell key={id} align="right" className="amount">
                        {perPort.get(id) ? (
                          <>
                            <span className="comparison-figure">
                              {formatCurrency(perPort.get(id)!.amount, portById.get(id)!.metadata.currency)}
                            </span>
                            {printLineDetail(perPort.get(id), portById.get(id)!.metadata.currency)}
                          </>
                        ) : (
                          <span className="comparison-not-levied">not levied at this port</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
            <TableRow className="comparison-total-row">
              <TableCell>
                <strong>Grand Total</strong>
              </TableCell>
              {page.ports.map(({ id }) => {
                const pr = portResults.find(p => p.port.metadata.id === id);
                const result = pr?.result;
                return (
                  <TableCell key={id} align="right" className="comparison-subtotal">
                    {result ? (
                      <Box sx={{ textAlign: 'right' }}>
                        <span className="comparison-figure">
                          {formatCurrency(result.total, result.currency)}
                        </span>
                        {result.currency !== 'SEK' && (
                          <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                            {'\u2248'} {formatCurrency(
                              result.currency === 'DKK'
                                ? result.total * (rateInfo.rate / (declaredRows.find(r => r.to_currency === 'DKK')?.rate ?? 1))
                                : result.total * rateInfo.rate,
                              'SEK'
                            )}
                          </Box>
                        )}
                        <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                          {(result.total / vessel.gt).toFixed(2)} {result.currency}/GT effective — derived, not a published rate
                        </Box>
                      </Box>
                    ) : (
                      <span className="comparison-error">error</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            {cheapestPortId === null && mostExpensivePortId === null && null}
          </TableBody>
        </Table>
        {renderFooter(page)}
      </Box>
    );
  };

  if (totalPorts === 0) return null;
  // The pages portal to the document body (spec v0.6.2): the print
  // stylesheet hides the entire screen view (#root), so the pages must
  // live outside it - the print pages are the complete printed output.
  return createPortal(
    <Box className="print-pages" data-testid="print-pages">
      {pages.map(renderPage)}
    </Box>,
    document.body
  );
};
