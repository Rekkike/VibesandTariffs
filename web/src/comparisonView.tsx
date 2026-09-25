import React, { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import type {
  CallInput,
  PortDefinition,
  QualityFlag,
  VesselInput
} from '@port-cost/core';
import { DEFAULT_EXCHANGE_RATE, conversionLabel, formatRate, resolveExchangeRate, toComparisonBasis } from './conversion';
import portsRegistry from './data/ports.json';
import { useIsMobile } from './appTheme';
import { comparisonBasisContext } from './portRegistry';
import { portLabel } from './portLabel';
import { customVesselLabel } from './vesselOptions';
import {
  computePortResults,
  buildRuleNamesByPort,
  buildRuleAttributesByPort,
  buildRowsBySegment,
  computeRanking
} from './comparisonModel';
import { makeComparisonCells } from './comparisonCells';
import { buildDiscountLine } from './discountLine';
import { ComparisonPortSelection } from './comparisonPortSelection';

interface ComparisonViewProps {
  ports: PortDefinition[];
  vessel: VesselInput;
  call: CallInput;
  // Per-port call overrides (spec v0.2.60): each port's own entered
  // port-specific values, keyed by port id. Optional and defaulting to
  // none: without it the merge is exactly the v0.2.53 contract, so every
  // existing pin over the view holds unmodified.
  perPortCallOverrides?: Record<string, Record<string, unknown>>;
  selectedPortIds: string[];
  onSelectionChange: (portIds: string[]) => void;
  activeVessel: string;
  // Profile-assumption fields (spec v0.2.48): the strip states the seeded
  // assumptions once per the honesty contracts.
  assumedCallFields?: string[];
}

// The comparison screen (spec v0.2.60 decomposition, audit item B
// boundary 3): the memo composition, the shared cells, the desktop table
// and the mobile cards - extracted from App.tsx verbatim.
export const ComparisonView: React.FC<ComparisonViewProps> = ({
  ports,
  vessel,
  call,
  perPortCallOverrides,
  selectedPortIds,
  onSelectionChange,
  activeVessel,
  assumedCallFields = []
}) => {
  const selectedPorts = ports.filter(p => selectedPortIds.includes(p.metadata.id));
  const isMobile = useIsMobile();
  const [conversionsVisible, setConversionsVisible] = useState(false);
  const [derivationsVisible, setDerivationsVisible] = useState(false);
  const [rateInput, setRateInput] = useState<string>('');
  const dataRate = (portsRegistry as { exchange_rates?: { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[] }).exchange_rates?.find(
    r => r.from_currency === 'EUR' && r.to_currency === 'SEK'
  );
  const rateInfo = useMemo(
    () => resolveExchangeRate(rateInput, dataRate ? { rate: dataRate.rate, date: dataRate.as_of, source: dataRate.source } : undefined),
    [rateInput, dataRate]
  );
  const portResults = useMemo(
    () => computePortResults(selectedPorts, vessel, call, rateInfo, comparisonBasisContext, perPortCallOverrides),
    [selectedPorts, vessel, call, rateInfo, perPortCallOverrides]
  );
  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  const ruleNameByPortAndId = useMemo(() => buildRuleNamesByPort(ports), [ports]);
  const ruleAttributesByPortAndId = useMemo(() => buildRuleAttributesByPort(ports), [ports]);
  const rowsBySegment = useMemo(
    () => buildRowsBySegment(portResults, ruleNameByPortAndId, ruleAttributesByPortAndId, vessel.gt),
    [portResults, ruleNameByPortAndId, ruleAttributesByPortAndId, vessel.gt]
  );
  const ranking = useMemo(
    () => computeRanking(portResults, rateInfo, comparisonBasisContext),
    [portResults, rateInfo]
  );
  const cheapestTotalPortId = ranking.cheapestPortId;
  const mostExpensiveTotalPortId = ranking.mostExpensivePortId;
  // Discounts received (spec v0.2.64): the tariff-derived discount inventory
  // per port, rendered as a line before the Grand Total on both comparison
  // surfaces. Speculation inputs are structurally excluded — OPS amounts
  // carry no fee derivation and the frequency what-if panel never feeds the
  // engine, so no speculation value can enter the line at any input state.
  const discountLines = useMemo(
    () => new Map(portResults.map(({ result }) => [result?.port_id ?? '', result ? buildDiscountLine(result) : null])),
    [portResults]
  );
  // Per-GT OPS presence (spec v0.2.64, item 4): the derived per-GT metric's
  // GT-basis disclosure renders wherever the port's descriptor carries a
  // per-GT OPS component and the user entered a value.
  const opsPerGtPresent = (result: { ops_speculative?: { lines: { id: string }[] } | null }) =>
    Boolean(result.ops_speculative?.lines.some(l => l.id === 'ops_spec_per_gt'));
  const { amountCell, convCell, grandTotalPerGtCell } = makeComparisonCells({
    rateInfo,
    comparisonBasisContext,
    isMobile,
    conversionsVisible,
    vessel,
    formatCurrency
  });
  return (
    <Box className="container">
      <Paper className="header" elevation={3}>
        <Typography variant="h1" component="h1">
          Port Comparison
        </Typography>
        <Typography variant="subtitle1">
          Same vessel, same call - one column per selected port. List-price (published tariff) basis.
        </Typography>
      </Paper>

      <ComparisonPortSelection ports={ports} selectedPortIds={selectedPortIds} onSelectionChange={onSelectionChange} selectedCount={selectedPorts.length} />

      {selectedPorts.length > 0 && (
        <Paper className="comparison-section" elevation={2}>
          <Typography variant="body2" className="comparison-basis">
            Comparison basis: reference tariff rates (list prices). Rows group by economic function
            (fee family), never by biller name, so ports that charge the same function differently
            still line up. Data-quality flags from each port's computation are carried through.
            The comparison prices one identical call at every selected port — same vessel, lay time, moves,
            and classes — so the port is the only variable; per-port call-size variation is deliberately
            excluded, and the context strip above states the call's assumptions once.
          </Typography>

          {/* Call-context strip (spec v0.2.47): one compact strip stating the
              priced call so every figure in the table reads as "this call,
              priced at three ports." Vessel, GT, TEU capacity, total
              container moves, lay time, and entered environmental classes;
              defaults are shown honestly per the flag conventions ("not
              entered" / "default E — not registered"). The ranking strip
              (v0.2.39) is removed: the table's cheapest/most-expensive
              badges already carry the ranking (spec v0.2.47 changelog,
              duplication rationale). */}
          <Box className="comparison-context-strip" component="section" aria-label="Priced call context">
            <span className="comparison-context-item">
              <span className="comparison-context-label">Vessel:</span>{' '}
              <strong className="comparison-context-vessel">{activeVessel || customVesselLabel(vessel)}</strong>
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">GT:</span> {vessel.gt.toLocaleString('en-US')}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">TEU capacity:</span>{' '}
              {vessel.teu_capacity ? vessel.teu_capacity.toLocaleString('en-US') : 'not entered'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">Container moves:</span>{' '}
              {((call.containers_loaded_le20ft || 0) + (call.containers_loaded_gt20ft || 0) +
                (call.containers_discharged_le20ft || 0) + (call.containers_discharged_gt20ft || 0))
                .toLocaleString('en-US')} (loaded + discharged)
              {(assumedCallFields.includes('containers_loaded_le20ft') ||
                assumedCallFields.includes('lay_time_hours')) &&
                ' (assumed from vessel class — adjust for your actual call)'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">Lay time:</span>{' '}
              {call.lay_time_hours != null ? `${call.lay_time_hours} h at berth` : 'not entered'}
              {assumedCallFields.includes('lay_time_hours') &&
                ' (assumed from vessel class at Gothenburg-class productivity — adjust for your actual call)'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">ESI:</span>{' '}
              {call.esi_score != null ? `${call.esi_score} (entered)` : 'not entered'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">CSI:</span>{' '}
              {call.clean_shipping_index_class
                ? `${call.clean_shipping_index_class} (entered)`
                : 'not entered'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">Sjöfartsverket class:</span>{' '}
              {call.csi_class
                ? call.csi_class === 'E'
                  ? `${call.csi_class} (default — not registered)`
                  : `${call.csi_class} (entered)`
                : 'not entered'}
            </span>
            <span className="comparison-context-item">
              <span className="comparison-context-label">Hamburg terminal:</span>{' '}
              {call.terminal_operator === 'Eurogate'
                ? 'EUROGATE (entered — published Prices and Conditions)'
                : 'HHLA (default — the reference operator)'}
            </span>
            {/* Arrival origin (spec v0.2.50): a shared voyage-leg attribute —
                held constant across ports exactly like lay time and moves;
                the waste-dues dimension at Gothenburg. */}
            <span className="comparison-context-item">
              <span className="comparison-context-label">Arrival origin:</span>{' '}
              {call.arrival_origin === 'europe'
                ? 'From a European port (entered)'
                : 'From outside Europe (default — the worst case; set \'From a European port\' for the intra-Europe leg)'}
            </span>
          </Box>

          {/* The conversion disclosure (the ranking strip's one unique mobile
              element) moves here, into the table-header area above the
              table/cards (spec v0.2.47). */}
          {isMobile && portResults.some(pr => pr.result && toComparisonBasis(pr.result.total, pr.result.currency, rateInfo, comparisonBasisContext).converted) && (
            <button
              type="button"
              className="disclosure-header comparison-conversion-disclosure"
              aria-expanded={conversionsVisible}
              aria-controls="comparison-conversions-panel"
              onClick={() => setConversionsVisible(v => !v)}
            >
              {conversionsVisible ? 'Hide converted figures' : 'Show converted figures'}
            </button>
          )}
          {/* Mobile transposition (spec v0.2.39): below the stacking
              breakpoint the comparison renders one card per port, fee
              families listed with native-primary figures (converted
              secondary behind the disclosure). Never a horizontal-scroll
              fallback. */}
          {isMobile && (
            <Box id="comparison-conversions-panel" className="comparison-cards" component="section" aria-label="Port comparison cards">
              {portResults.map(({ port, result }) => {
                return (
                  <Paper key={port.metadata.id} className="comparison-port-card" elevation={1}>
                    <Typography variant="h6" component="h3" className="comparison-card-title">
                      {portLabel(port)}
                      {result && cheapestTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-cheapest">cheapest</span>
                      )}
                      {result && mostExpensiveTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-most-expensive">most expensive</span>
                      )}
                    </Typography>
                    {!result ? (
                      <Typography color="error" className="comparison-not-charged">error</Typography>
                    ) : (
                      <Box component="dl" className="comparison-card-list">
                        {/* Grand Total leads the per-port card (spec
                            v0.2.54): the total figure is the card's first
                            element, above the stage breakdown below — mirroring
                            the per-port workspace's total strip, where the
                            Grand Total is the first figure the reader sees. */}
                        <Box component="dt" className="comparison-card-total">
                          <strong>Grand Total</strong>
                          <Box sx={{ textAlign: 'right' }}>
                            {convCell(result.total, result.currency)}
                            {grandTotalPerGtCell(result.total, result.currency, Boolean(result.ops_speculative), opsPerGtPresent(result))}
                          </Box>
                        </Box>
                        {/* Stage grouping and charge-type lines (spec
                            v0.2.52): the mobile card carries the same
                            stage/charge-type structure as the desktop
                            table, consistently. */}
                        {rowsBySegment.rowsByStage.map(({ stage, chargeTypeRows, familyRows }) => (
                          <React.Fragment key={stage.id}>
                            <Box component="dt" className="comparison-card-segment">{stage.label}: {convCell(
                              chargeTypeRows.reduce((s, r) => s + (r.perPort.get(port.metadata.id)?.amount ?? 0), 0) +
                              familyRows.reduce((s, r) => s + (r.perPort.get(port.metadata.id)?.amount ?? 0), 0),
                              result.currency)}</Box>
                            {chargeTypeRows.map(({ chargeType, perPort, leviedAt }) => (
                              <Box component="dd" key={chargeType.id} className="comparison-card-family comparison-card-chargetype">
                                <span className="comparison-card-family-name">{chargeType.label}</span>
                                {leviedAt.includes(port.metadata.id)
                                  ? amountCell(perPort.get(port.metadata.id), port.metadata.currency, true)
                                  : <span className="comparison-not-levied">not levied at this port</span>}
                              </Box>
                            ))}
                            {familyRows.map(({ family, perPort }) => (
                              <Box component="dd" key={`${stage.id}-${family}`} className="comparison-card-family">
                                <span className="comparison-card-family-name">{family.replace(/_/g, ' ')}</span>
                                {perPort.get(port.metadata.id)
                                  ? amountCell(perPort.get(port.metadata.id), port.metadata.currency, true)
                                  : <span className="comparison-not-levied">not levied at this port</span>}
                              </Box>
                            ))}
                            {/* OPS placement (spec v0.2.64, item 3): the
                                user-specified OPS block renders inside the
                                "At the berth" stage block on the card,
                                before the Grand Total, labeled as included
                                in it — comparison-surface presentation
                                only; the input-side speculation notices
                                stay on the workspace inputs. Blank renders
                                nothing, and no absence wording renders
                                for ports without values (no user value is
                                not a tariff assertion). */}
                            {result.ops_speculative && stage.id === 'at_berth' && (
                              <Box component="dd" className="comparison-card-family comparison-card-ops">
                                <span className="comparison-card-family-name">OPS (user-specified, not tariff-derived) — included in the Grand Total</span>
                                {convCell(result.ops_speculative.amount, result.currency)}
                              </Box>
                            )}
                          </React.Fragment>
                        ))}
                        {/* Discounts received on the card (spec v0.2.64,
                            item 2): the tariff-derived discount sum before
                            the Grand Total, clearly labeled as included in
                            it (not additive). Zero renders the honest
                            zero; no firing discount renders the honest
                            no-discounts state. */}
                        <Box component="dd" className="comparison-card-family comparison-card-discount">
                          <span className="comparison-card-family-name">Discounts received (included in the Grand Total)</span>
                          {discountLines.get(port.metadata.id)!.components.length > 0
                            ? (
                              <Box sx={{ textAlign: 'right' }}>
                                {convCell(discountLines.get(port.metadata.id)!.sum, result.currency)}
                                <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                  {discountLines.get(port.metadata.id)!.percentage.toFixed(2)}% of gross (pre-discount) charges
                                </Box>
                              </Box>
                            )
                            : <span className="comparison-no-discount">no discounts at this call</span>}
                        </Box>
                        <Box component="dd" className="comparison-card-family">
                          <span className="comparison-card-family-name">Estimated parameters subtotal</span>
                          {convCell(result.total_estimated_parameters, result.currency)}
                        </Box>
                        <Box component="dd" className="comparison-card-family">
                          <span className="comparison-card-family-name">Total without estimates</span>
                          {convCell(result.total_without_estimates, result.currency)}
                        </Box>
                        {result.vessel_access && (
                          <Box component="dd" className="comparison-card-family">
                            <span className="comparison-card-family-name">Vessel Access Charges</span>
                            {convCell(result.vessel_access.amount, result.currency)}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
          {!isMobile && (
          <Box>
          <button
            type="button"
            className="disclosure-header comparison-derivation-disclosure"
            aria-expanded={derivationsVisible}
            aria-controls="comparison-derivation-panel"
            onClick={() => setDerivationsVisible(v => !v)}
          >
            {derivationsVisible ? 'Hide fee derivations' : 'Show fee derivations'}
          </button>
          <TableContainer id="comparison-derivation-panel" className="comparison-table-container">
            <Table size="small" className="comparison-table">
              <TableHead>
                <TableRow>
                  <TableCell>Cost item</TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right">
                      <span className="comparison-port-name">{portLabel(port)}</span>
                      {result && cheapestTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-cheapest">cheapest</span>
                      )}
                      {result && mostExpensiveTotalPortId === port.metadata.id && (
                        <span className="comparison-marker comparison-most-expensive">most expensive</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Stage grouping (spec v0.2.52): three operational stages
                    a call's costs compose into; the charge-type lines nest
                    under their stage as prominent rows, remaining fee
                    families follow inside the same stage. Stage subtotals
                    compose from the rendered lines (charge-type + family
                    rows), so a suppressed all-zero line contributes zero
                    and the visible sum plus suppressed zeros equals the
                    Grand Total. */}
                {rowsBySegment.rowsByStage.map(({ stage, chargeTypeRows, familyRows }) => (
                  <React.Fragment key={stage.id}>
                    <TableRow className="comparison-stage-row">
                      <TableCell>
                        <strong>{stage.label}</strong>
                      </TableCell>
                      {portResults.map(({ port }) => {
                        const stageTotal =
                          chargeTypeRows.reduce((s, r) => s + (r.perPort.get(port.metadata.id)?.amount ?? 0), 0) +
                          familyRows.reduce((s, r) => s + (r.perPort.get(port.metadata.id)?.amount ?? 0), 0);
                        return (
                          <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
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
                        {portResults.map(({ port }) => (
                          <TableCell key={port.metadata.id} align="right" className="amount">
                            {/* Absence structure (spec v0.2.52): a charge
                                type a port never levies is stated, not
                                hidden — GOT/HAM cargo dues, the Swedish
                                ports' and GOT's berth dues. */}
                            {leviedAt.includes(port.metadata.id)
                              ? amountCell(perPort.get(port.metadata.id), port.metadata.currency, derivationsVisible)
                              : <span className="comparison-not-levied">not levied at this port</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {familyRows.map(({ family, perPort }) => (
                      <TableRow key={`${stage.id}-${family}`}>
                        <TableCell className="comparison-family-cell">
                          {family.replace(/_/g, ' ')}
                        </TableCell>
                        {portResults.map(({ port }) => {
                          const entry = perPort.get(port.metadata.id);
                          return (
                            <TableCell key={port.metadata.id} align="right" className="amount">
                              {entry
                                ? amountCell(entry, port.metadata.currency, derivationsVisible)
                                : <span className="comparison-not-levied">not levied at this port</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* OPS placement (spec v0.2.64, item 3): the
                        user-specified OPS block renders inside the
                        "At the berth" stage block, before the Grand Total,
                        labeled as included in it — comparison-surface
                        presentation only; the input-side speculation
                        notices stay on the workspace inputs. Never
                        interleaved with tariff lines, and never with
                        absence wording in other ports' columns (no user
                        value is not a tariff assertion; blank simply
                        renders nothing). */}
                    {portResults.some(({ result }) => result?.ops_speculative) && stage.id === 'at_berth' && (
                      <TableRow className="comparison-ops-row">
                        <TableCell>
                          <strong>OPS (user-specified, not tariff-derived) — included in the Grand Total</strong>
                        </TableCell>
                        {portResults.map(({ port, result }) => (
                          <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                            {result?.ops_speculative
                              ? <Box sx={{ textAlign: 'right' }}>
                                  <span className="comparison-figure">{formatCurrency(result.ops_speculative.amount, result.currency)}</span>
                                  <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                    {result.ops_speculative.lines.map(l => l.label).join('; ')}
                                  </Box>
                                </Box>
                              : <span className="comparison-ops-absent">—</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {/* Discounts received (spec v0.2.64, item 2): the
                    tariff-derived discount inventory per port, before the
                    Grand Total, clearly labeled as included in it (not
                    additive). The sum follows the existing conversion
                    disclosure machinery; the percentage is currency-neutral
                    against the port's gross (pre-discount) charges. Zero
                    renders the honest zero; no firing discount renders the
                    honest no-discounts state. */}
                <TableRow className="comparison-discount-row">
                  <TableCell>
                    <strong>Discounts received</strong>
                    <span className="comparison-discount-included-note">included in the Grand Total</span>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? (() => {
                            const line = discountLines.get(port.metadata.id)!;
                            return (
                              <Box sx={{ textAlign: 'right' }} className="comparison-discount-cell">
                                {line.components.length > 0
                                  ? (
                                    <Box sx={{ textAlign: 'right' }}>
                                      {convCell(line.sum, result.currency)}
                                      <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                        {line.percentage.toFixed(2)}% of gross (pre-discount) charges
                                      </Box>
                                    </Box>
                                  )
                                  : <span className="comparison-no-discount">no discounts at this call</span>}
                                <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                  {line.components.map((c, i) => (
                                    <Box key={i} component="span" style={{ display: 'block' }}>
                                      {c.label}{c.detail ? ` (${c.detail})` : ''}: −{formatCurrency(c.amount, result.currency)} — {c.citation}
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                            );
                          })()
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="comparison-total-row">
                  <TableCell>
                    <strong>Grand Total</strong>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? <Box sx={{ textAlign: 'right' }}>
                            {convCell(result.total, result.currency)}
                            {grandTotalPerGtCell(result.total, result.currency, Boolean(result.ops_speculative), opsPerGtPresent(result))}
                          </Box>
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Estimated-parameter separation (spec v0.2.24): the total
                    minus its estimated-parameter lines, shown for every port
                    symmetrically (Hamburg handling/towage, Helsingborg
                    towage, Gothenburg none) so the port-fee-level comparison
                    is never dominated by estimates. */}
                <TableRow className="comparison-estimate-row">
                  <TableCell>
                    <span className="status-badge status-warning" style={{ marginRight: '6px' }}>est.</span>
                    Estimated parameters subtotal
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? convCell(result.total_estimated_parameters, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow className="comparison-estimate-row">
                  <TableCell>
                    <strong>Total without estimates</strong>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result
                        ? convCell(result.total_without_estimates, result.currency)
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Vessel-access aggregate row (spec v0.2.30): the sum of
                    berth/terminal infrastructure + waterway/fairway access
                    + readiness/safety capacity lines per port, with the
                    effective per-GT derived comparability bridge. */}
                <TableRow className="comparison-total-row">
                  <TableCell>
                    <strong>Vessel Access Charges</strong>
                    <span className="status-badge status-caveat" style={{ marginLeft: '6px' }}>derived metric</span>
                  </TableCell>
                  {portResults.map(({ port, result }) => (
                    <TableCell key={port.metadata.id} align="right" className="comparison-subtotal">
                      {result?.vessel_access
                        ? (() => {
                            const vaConv = toComparisonBasis(result.vessel_access.amount, result.currency, rateInfo, comparisonBasisContext);
                            return (
                              <Box sx={{ textAlign: 'right' }}>
                                <span>{formatCurrency(result.vessel_access.amount, result.currency)}</span>
                                {vaConv.converted && (
                                  <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                    {'≈'} {formatCurrency(vaConv.amount, 'SEK')} <span className="comparison-converted-tag">converted {'—'} {formatRate(rateInfo)}</span>
                                  </Box>
                                )}
                                <Box sx={{ fontSize: '0.75rem' }} className="comparison-secondary">
                                  {result.vessel_access.effective_per_gt.toFixed(2)} {result.currency}/GT effective — derived, not a published rate
                                  {vaConv.converted && (
                                    <span> ({'≈'} {(result.vessel_access.effective_per_gt * rateInfo.rate).toFixed(2)} SEK/GT converted)</span>
                                  )}
                                </Box>
                              </Box>
                            );
                          })()
                        : <span className="comparison-error">error</span>}
                    </TableCell>
                  ))}
                </TableRow>
                {/* Cross-country comparability note (spec v0.2.30): derived
                    from the functional classification — which functions each
                    country's figure covers and which are funded elsewhere —
                    never hard-coded prose. */}
                <TableRow>
                  <TableCell colSpan={portResults.length + 1}>
                    <Typography variant="caption" className="comparison-basis" sx={{ display: 'block' }}>
                      <strong>Vessel Access Charges — comparability:</strong>{' '}
                      <span style={{ display: 'block' }}>{conversionLabel(rateInfo)}.</span>
                      {portResults.map(({ port, result }) => {
                        const agg = result?.vessel_access;
                        if (!agg) return null;
                        const fn = agg.classes
                          .map(c => c === 'berth_terminal_infrastructure' ? 'berth/terminal infrastructure'
                            : c === 'waterway_fairway_access' ? 'waterway/fairway access'
                            : c === 'readiness_safety_capacity' ? 'readiness/safety capacity' : c)
                          .join(' + ');
                        return (
                          <span key={port.metadata.id} style={{ display: 'block' }}>
                            {port.metadata.name}: covers {fn}
                            {agg.classes.length < 3 && ' (functions not listed are funded outside this call’s charges — e.g. nationally from taxation)'}
                            .
                          </span>
                        );
                      })}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          </Box>
          )}

          {/* Rate input (spec v0.2.31, commit A): the exchange rate behind
              every converted figure in this view. Static, versioned data
              (core/data/exchange_rates.yaml — no runtime API calls);
              the user may override it. Blank or invalid input falls back to
              the documented default with a visible flag. */}
          <Box className="comparison-conversion" sx={{ mt: 3, p: 2, border: '1px solid var(--border)', borderRadius: 1 }}>
            <Typography variant="h6" component="h3">
              Exchange rate
            </Typography>
            <Typography variant="body2" className="comparison-basis">
              {conversionLabel(rateInfo)}{rateInfo.is_default ? ' — default rate in effect (editable)' : ''}
            </Typography>
            <TextField
              label="Exchange rate (kr per EUR)"
              type="number"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              sx={{ maxWidth: 280, mt: 1 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 'any', 'aria-label': 'Exchange rate, kronor per euro' }}
              helperText={rateInfo.is_default
                ? `Default: ${dataRate?.rate ?? DEFAULT_EXCHANGE_RATE.rate} kr/EUR (${dataRate?.source ?? DEFAULT_EXCHANGE_RATE.source}, ${dataRate?.as_of ?? DEFAULT_EXCHANGE_RATE.date}). Blank uses the default.`
                : `User rate ${rateInfo.rate} kr/EUR in effect.`}
            />
          </Box>
          {portResults.some(pr => pr.error) && (
            <Typography color="error" sx={{ mt: 2 }}>
              {portResults.filter(pr => pr.error).map(pr => `${pr.port.metadata.name}: ${pr.error}`).join('; ')}
            </Typography>
          )}

          {portResults.some(pr => pr.result && pr.result.quality_flags.length > 0) && (
            <Box className="quality-flags" sx={{ mt: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Quality Flags (carried through from per-port computations)
              </Typography>
              <ul>
                {portResults.map(pr =>
                  (pr.result?.quality_flags ?? []).map((flag: QualityFlag, index: number) => (
                    <li key={`${pr.port.metadata.id}-${index}`}>
                      <strong>{pr.port.metadata.name}:</strong>{' '}
                      <span className={flag.severity === 'error' ? 'status-badge status-error' : flag.severity === 'warning' ? 'status-badge status-warning' : 'status-badge status-info'}>
                        [{flag.severity.toUpperCase()}] {flag.description}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
