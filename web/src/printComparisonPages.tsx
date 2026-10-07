// The printed comparison page set (spec v0.6.1): one self-contained page
// per three port columns (the settled constant in printPages.ts). Pure
// presentation over the already-computed comparison model - the page table
// re-derives nothing: it reads the same rowsBySegment/rateInfo/composition
// the screen view computed and renders the page's own column slice with
// every charge line, stage subtotal, Grand Total, and per-GT disclosure
// repeated on every page (a printed comparison is unfalsifiable without
// its parameters - the mandatory header carries them all).
import React from 'react';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import type { CallInput, PortDefinition, QualityFlag, VesselInput } from '@port-cost/core';
import { formatRate } from './conversion';
import type { ComparisonBasisContext, ExchangeRateInfo } from './conversion';
import { printContinuationNote, printPagesFor } from './printPages';
import type { PrintPage } from './printPages';
import { APP_VERSION } from './version';

export interface PrintFlagLine {
  label: string;
  description: string;
}

// The screen comparison's own flag surface, printed: every quality flag a
// page's ports carry renders as short printed text - hover does not exist
// on paper, so the title text (the flag's own description) prints beside
// the badge label. Every flag visible on screen has a printed counterpart.
export const printFlagLinesFor = (flags: QualityFlag[]): PrintFlagLine[] =>
  flags.map(flag => ({
    label: flag.severity === 'error' ? `[${flag.severity.toUpperCase()}]` : flag.severity === 'warning' ? '[WARNING]' : '[INFO]',
    description: flag.description
  }));

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
      perPort: Map<string, { amount: number; currency: string } | undefined>;
      leviedAt: string[];
    }[];
    familyRows: {
      family: string;
      perPort: Map<string, { amount: number; currency: string } | undefined>;
    }[];
  }[];
  vessel: VesselInput;
  call: CallInput;
  rateInfo: ExchangeRateInfo;
  comparisonBasisContext: ComparisonBasisContext;
  declaredRows: { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[];
  activeVessel: string;
  formatCurrency: (amount: number, currency: string) => string;
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
  formatCurrency
}) => {
  const pages = printPagesFor(ports.map(p => ({ id: p.metadata.id, name: p.metadata.name })));
  const totalPorts = ports.length;
  const portById = new Map(ports.map(p => [p.metadata.id, p]));
  const flagLinesByPortId = new Map(
    portResults.map(pr => [
      pr.port.metadata.id,
      printFlagLinesFor(((pr as { result?: { quality_flags?: QualityFlag[] } | null }).result?.quality_flags ?? []) as QualityFlag[])
    ])
  );
  const cheapestPortId = null;
  const mostExpensivePortId = null;

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
                          <span className="comparison-figure">
                            {formatCurrency(perPort.get(id)?.amount ?? 0, portById.get(id)!.metadata.currency)}
                          </span>
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
                          <span className="comparison-figure">
                            {formatCurrency(perPort.get(id)!.amount, portById.get(id)!.metadata.currency)}
                          </span>
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
            {page.ports.some(({ id }) => (flagLinesByPortId.get(id)?.length ?? 0) > 0) && (
              <TableRow className="print-flag-row">
                <TableCell>
                  <strong>Flags (printed text \u2014 hover does not exist on paper)</strong>
                </TableCell>
                {page.ports.map(({ id }) => {
                  const lines = flagLinesByPortId.get(id) ?? [];
                  return (
                    <TableCell key={id} align="right" className="amount">
                      {lines.length === 0
                        ? '\u2014'
                        : lines.map((l, i) => (
                          <span key={i} className="print-flag-text" style={{ display: 'block' }}>
                            {l.label} {l.description}
                          </span>
                        ))}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
            {cheapestPortId === null && mostExpensivePortId === null && null}
          </TableBody>
        </Table>
        {renderFooter(page)}
      </Box>
    );
  };

  if (totalPorts === 0) return null;
  return (
    <Box className="print-pages" data-testid="print-pages">
      {pages.map(renderPage)}
    </Box>
  );
};
