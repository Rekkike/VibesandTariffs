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
import type { HinterlandMode } from './handlingBasis';
import { containerThroughParts } from './handlingBasis';
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
  // Derived/converted sums toggle (spec v0.6.4, unit 3): the same
  // follow-through class - the print path reads the toggle from live state.
  // ON: the converted comparison-basis sums print as the screen shows them
  // (the native-primary figure with its converted SEK secondary). OFF: they
  // do not print - the native figures stand alone, exactly the screen's
  // OFF state. The paper never imposes its own default.
  conversionsVisible: boolean;
  // Compare container-through surface (spec v0.6.4, unit 3): the toggle
  // and its hinterland-mode selector follow through to print the same way
  // - ON prints the landside-legs row (the screen's own row, its mode
  // stated, presentation-only amounts never in the Grand Total); OFF
  // prints nothing of it, the screen's default-off state.
  containerThroughVisible: boolean;
  hinterlandMode: HinterlandMode;
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
  derivationsVisible,
  conversionsVisible,
  containerThroughVisible,
  hinterlandMode
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
                  <span className="comparison-derivation-composition"> — {line.derivation.composition}</span>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    ));

  // The printed header is a compact four-line block (spec v0.6.3, unit 3),
  // never a run-on: line 1 the app name, version, tariff year; line 2 the
  // vessel profile (name, IMO, GT, TEU), ESI, and the environmental classes
  // exactly as the screen's context strip states them; line 3 the call
  // parameters as set (live values); line 4 the rate basis, both published
  // pairs with their as_of dates. Every line on every page. The JSX text
  // uses real characters (· — →) - an escaped \uXXXX sequence in JSX text
  // renders as a literal backslash sequence on paper.
  const renderHeader = (page: PrintPage) => (
    <Box className="print-header" component="section" aria-label="Printed comparison parameters">
      <p className="print-header-title print-header-line" data-testid="print-header-line-1">
        Port Call Cost Analyzer — Port Comparison (printed) · Version: {APP_VERSION} · Tariff year:{' '}
        {ports.map(p => p.metadata.validity_start?.slice(0, 4)).filter((y, i, a) => a.indexOf(y) === i).join('/')}
      </p>
      <p className="print-header-line" data-testid="print-header-line-2">
        Vessel profile: {activeVessel || vessel.name} · GT: {vessel.gt.toLocaleString('en-US')} · TEU capacity:{' '}
        {vessel.teu_capacity ? vessel.teu_capacity.toLocaleString('en-US') : 'not entered'} · ESI:{' '}
        {call.esi_score != null ? `${call.esi_score} (entered)` : 'not entered'} · CSI:{' '}
        {call.clean_shipping_index_class
          ? `${call.clean_shipping_index_class} (entered)`
          : 'not entered'} · Sjöfartsverket class:{' '}
        {call.csi_class
          ? call.csi_class === 'E'
            ? `${call.csi_class} (default — not registered)`
            : `${call.csi_class} (entered)`
          : 'not entered'}
      </p>
      <p className="print-header-line" data-testid="print-header-line-3">
        Container moves:{' '}
        {((call.containers_loaded_le20ft || 0) + (call.containers_loaded_gt20ft || 0) +
          (call.containers_discharged_le20ft || 0) + (call.containers_discharged_gt20ft || 0)).toLocaleString('en-US')} (loaded + discharged) · Lay time:{' '}
        {call.lay_time_hours != null ? `${call.lay_time_hours} h at berth` : 'not entered'}
      </p>
      <p className="print-header-line" data-testid="print-header-line-4">
        {printRateBasisNote(declaredRows)} · Comparison basis: {formatRate(rateInfo)}
      </p>
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
                {containerThroughVisible && stage.id === 'quayside_operations' && (
                  <TableRow className="comparison-container-through-row print-container-through-row" data-testid="print-container-through-row">
                    <TableCell>
                      <strong>Container-through addition (user-selected comparison surface)</strong>
                      <span className="comparison-handling-basis-note" style={{ display: 'block', fontSize: '0.75rem' }}>
                        Hinterland mode: {hinterlandMode === 'truck' ? 'truck gate' : 'rail stack'} (comparison-scoped selector; never a call input)
                      </span>
                    </TableCell>
                    {page.ports.map(({ id }) => {
                      const port = portById.get(id)!;
                      const le = (call.containers_loaded_le20ft || 0) + (call.containers_discharged_le20ft || 0);
                      const gt = (call.containers_loaded_gt20ft || 0) + (call.containers_discharged_gt20ft || 0);
                      const part = containerThroughParts(id, hinterlandMode, le, gt);
                      return (
                        <TableCell key={id} align="right" className="amount" data-testid={`print-container-through-${id}`}>
                          <Box component="span" sx={{ fontSize: '0.75rem', display: 'block' }}>{part.note}</Box>
                          {part.addedAmount !== null
                            ? <span className="comparison-figure">+{formatCurrency(part.addedAmount, port.metadata.currency)}</span>
                            : <span className="comparison-not-levied">{part.bundled ? 'bundled rate unchanged' : 'not published'}</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )}
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
                        {result.currency !== 'SEK' && conversionsVisible && (
                          <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                            {'\u2248'} {formatCurrency(
                              result.currency === 'DKK'
                                ? result.total * (rateInfo.rate / (declaredRows.find(r => r.to_currency === 'DKK')?.rate ?? 1))
                                : result.total * rateInfo.rate,
                              'SEK'
                            )}
                          </Box>
                        )}
                        {derivationsVisible && (
                          <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                            {(result.total / vessel.gt).toFixed(2)} {result.currency}/GT effective — derived, not a published rate
                          </Box>
                        )}
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
        {/* Grand Total footnote (spec v0.6.3, unit 2.2): with the detail
            toggle OFF the per-GT derivation annotations render as a short
            footnote block beneath the table, not in-cell padding — the Grand
            Total row stays compact. With the toggle ON they render inline
            in the cell (the v0.6.2 shape). */}
        {!derivationsVisible && (
          <Box className="print-grand-total-footnote" data-testid={`print-grand-total-footnote-${page.pageNumber}`}>
            {page.ports
              .map(({ id }) => {
                const result = portResults.find(p => p.port.metadata.id === id)?.result;
                if (!result) return null;
                return `${portById.get(id)?.metadata.name}: ${(result.total / vessel.gt).toFixed(2)} ${result.currency}/GT effective — derived, not a published rate`;
              })
              .filter(Boolean)
              .join(' | ')}
          </Box>
        )}
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
