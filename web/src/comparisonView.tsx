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
import { equivalenceNoteForFamily, equivalenceNoteForRule, EQUIVALENCE_ANNOTATED_PORTS } from './equivalenceNotes';
import { makeComparisonCells } from './comparisonCells';
import {
  containerThroughParts,
  handlingBasisAnnotationFor,
  CONTAINER_THROUGH_DISCLOSURE,
  CONTAINER_THROUGH_BILLING_FOOTNOTE
} from './handlingBasis';
import type { HinterlandMode } from './handlingBasis';
import { buildDiscountLine } from './discountLine';

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
  activeVessel,
  assumedCallFields = []
}) => {
  const selectedPorts = ports.filter(p => selectedPortIds.includes(p.metadata.id));
  const isMobile = useIsMobile();
  const [conversionsVisible, setConversionsVisible] = useState(false);
  const [derivationsVisible, setDerivationsVisible] = useState(false);
  // Compare container-through toggle (spec v0.4.2, item 3): default OFF -
  // the off state is byte-identical to the pre-toggle view (pinned). ON
  // adds the published landside legs to the unbundled ports; the
  // hinterland mode rides a comparison-scoped selector (default truck; no
  // truck/rail call input exists on the call surface). Presentation-only:
  // never feeds the engine, never changes any Grand Total.
  const [containerThroughVisible, setContainerThroughVisible] = useState(false);
  const [hinterlandMode, setHinterlandMode] = useState<HinterlandMode>('truck');
  const [rateInput, setRateInput] = useState<string>('');
  const dataRate = (portsRegistry as { exchange_rates?: { from_currency: string; to_currency: string; rate: number; as_of: string; source: string }[] }).exchange_rates?.find(
    r => r.from_currency === 'EUR' && r.to_currency === 'SEK'
  );
  const rateInfo = useMemo(
    () => resolveExchangeRate(
      rateInput,
      dataRate ? { rate: dataRate.rate, date: dataRate.as_of, source: dataRate.source } : undefined,
),
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

      {selectedPorts.length === 0 && (
        <Paper className="comparison-section" elevation={2}>
          <Typography color="error">Select at least one port to compare.</Typography>
        </Paper>
      )}

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
              {call.terminal_operator === 'HHLA'
                ? 'HHLA (entered — switchable terminal variant, Quay Tariff)'
                : 'EUROGATE (default — the reference operator, published Prices and Conditions)'}
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
                                {chargeType.id === 'berth_dues' && equivalenceNoteForRule('hhla_tonnage_dues', port.metadata.id) && (
                                  <Box component="span" className="comparison-equivalence-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                    {equivalenceNoteForRule('hhla_tonnage_dues', port.metadata.id)!.text}
                                  </Box>
                                )}
                                {leviedAt.includes(port.metadata.id)
                                  ? amountCell(perPort.get(port.metadata.id), port.metadata.currency, true)
                                  : <span className="comparison-not-levied">not levied at this port</span>}
                              </Box>
                            ))}
                            {familyRows.map(({ family, perPort }) => (
                              <Box component="dd" key={`${stage.id}-${family}`} className="comparison-card-family">
                                <span className="comparison-card-family-name">{family.replace(/_/g, ' ')}</span>
                                {family === 'terminal_handling' && handlingBasisAnnotationFor(port.metadata.id) && (
                                  <Box component="span" className="comparison-handling-basis-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                    {handlingBasisAnnotationFor(port.metadata.id)!.text}
                                  </Box>
                                )}
                                {/* Cross-port functional-equivalence annotation
                                    (spec v0.3.3, item 2): the same verified
                                    note renders on the mobile card. */}
                                {equivalenceNoteForFamily(family, port.metadata.id) && (
                                  <Box component="span" className="comparison-equivalence-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                    {equivalenceNoteForFamily(family)!.text}
                                  </Box>
                                )}
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
          {/* Compare container-through toggle (spec v0.4.2, item 3):
              default OFF - the off state is byte-identical to the
              pre-toggle view (pinned). ON adds the published landside legs
              to the unbundled ports per the selected hinterland mode;
              presentation-only, never in any Grand Total. The naming
              decision is recorded in the spec: the industry term "door to
              door" appears nowhere - it covers first/last-mile road
              haulage, which no figure here includes. */}
          <Box className="comparison-container-through-toggle" data-testid="container-through-toggle-block" sx={{ mb: 1 }}>
            <label className="disclosure-header comparison-container-through-disclosure" aria-expanded={containerThroughVisible}>
              <input
                type="checkbox"
                checked={containerThroughVisible}
                onChange={(e) => setContainerThroughVisible(e.target.checked)}
                data-testid="container-through-checkbox"
              />
              {' '}Compare container-through (adds published landside legs; never in the Grand Total)
            </label>
            {containerThroughVisible && (
              <Box sx={{ fontSize: '0.75rem' }} className="comparison-container-through-mode">
                <label>
                  <input
                    type="radio"
                    name="hinterland-mode"
                    value="truck"
                    checked={hinterlandMode === 'truck'}
                    onChange={() => setHinterlandMode('truck')}
                    data-testid="hinterland-mode-truck"
                  />
                  {' '}truck gate (default)
                </label>
                <label style={{ marginLeft: 8 }}>
                  <input
                    type="radio"
                    name="hinterland-mode"
                    value="rail"
                    checked={hinterlandMode === 'rail'}
                    onChange={() => setHinterlandMode('rail')}
                    data-testid="hinterland-mode-rail"
                  />
                  {' '}rail stack
                </label>
                <Typography variant="caption" className="comparison-basis" sx={{ display: 'block' }} data-testid="container-through-disclosure">
                  {CONTAINER_THROUGH_DISCLOSURE}
                </Typography>
                <Typography variant="caption" className="comparison-basis" sx={{ display: 'block' }} data-testid="container-through-billing-footnote">
                  {CONTAINER_THROUGH_BILLING_FOOTNOTE}
                </Typography>
              </Box>
            )}
          </Box>
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
                          {/* Cross-port functional-equivalence annotation
                              (spec v0.3.3, item 2): the berth-dues line's
                              verified correspondence — stated as functional
                              correspondence, never identity. */}
                          {chargeType.id === 'berth_dues' && equivalenceNoteForRule('hhla_tonnage_dues') && portResults.some(({ port }) => EQUIVALENCE_ANNOTATED_PORTS.has(port.metadata.id)) && (
                            <Box component="span" className="comparison-equivalence-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                              {equivalenceNoteForRule('hhla_tonnage_dues')!.text}
                            </Box>
                          )}
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
                          <span className="comparison-family-label">{family.replace(/_/g, ' ')}</span>
                          {/* Cross-port functional-equivalence annotation
                              (spec v0.3.3, item 2): the verified pairs from
                              the audit render beside the family row — stated
                              as functional correspondence, never identity of
                              amounts or labels; no figure moves, no label
                              changes, no port's own terminology is altered. */}
                          {equivalenceNoteForFamily(family) && portResults.some(({ port }) => EQUIVALENCE_ANNOTATED_PORTS.has(port.metadata.id)) && (
                            <Box component="span" className="comparison-equivalence-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                              {equivalenceNoteForFamily(family)!.text}
                            </Box>
                          )}
                        </TableCell>
                        {portResults.map(({ port }) => {
                          const entry = perPort.get(port.metadata.id);
                          return (
                            <TableCell key={port.metadata.id} align="right" className="amount">
                              {entry
                                ? amountCell(entry, port.metadata.currency, derivationsVisible)
                                : <span className="comparison-not-levied">not levied at this port</span>}
                              {/* Handling-basis annotation (spec v0.4.2, item 2):
                                  a new annotation family, never an extension
                                  of the cargo-family equivalence notes - the
                                  port's own published basis, verbatim from
                                  the audit's basis table; "not stated in the
                                  document" where that is the finding. */}
                              {family === 'terminal_handling' && handlingBasisAnnotationFor(port.metadata.id) && (
                                <Box component="span" className="comparison-handling-basis-note" sx={{ fontSize: '0.75rem', display: 'block' }}>
                                  {handlingBasisAnnotationFor(port.metadata.id)!.text}
                                </Box>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                    {/* Compare container-through row (spec v0.4.2, item 3):
                        renders only when the toggle is ON (default-off,
                        off-state byte-identity pinned). Presentation-only:
                        the added landside legs never enter the Grand Total. */}
                    {containerThroughVisible && stage.id === 'quayside_operations' && (
                      <TableRow className="comparison-container-through-row" data-testid="container-through-row">
                        <TableCell>
                          <strong>Container-through addition (user-selected comparison surface)</strong>
                          <span className="comparison-handling-basis-note" style={{ display: 'block', fontSize: '0.75rem' }}>
                            Hinterland mode: {hinterlandMode === 'truck' ? 'truck gate' : 'rail stack'} (comparison-scoped selector; never a call input)
                          </span>
                        </TableCell>
                        {portResults.map(({ port }) => {
                          const le = (call.containers_loaded_le20ft || 0) + (call.containers_discharged_le20ft || 0);
                          const gt = (call.containers_loaded_gt20ft || 0) + (call.containers_discharged_gt20ft || 0);
                          const part = containerThroughParts(port.metadata.id, hinterlandMode, le, gt);
                          return (
                            <TableCell key={port.metadata.id} align="right" className="amount" data-testid={`container-through-${port.metadata.id}`}>
                              <Box component="span" sx={{ fontSize: '0.75rem', display: 'block' }}>{part.note}</Box>
                              {part.addedAmount !== null
                                ? <span className="comparison-figure">+{formatCurrency(part.addedAmount, port.metadata.currency)}</span>
                                : <span className="comparison-not-levied">{part.bundled ? 'bundled rate unchanged' : 'not published'}</span>}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )}
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
                    <span className="status-badge status-warning" style={{ marginRight: 'var(--space-1)' }}>est.</span>
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
                    <span className="status-badge status-caveat" style={{ marginLeft: 'var(--space-1)' }}>derived metric</span>
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

          {/* Rate input (spec v0.2.31, commit A; rate-refresh button at
              v0.3.2): the exchange rate behind every converted figure in
              this view. The pinned default is static, versioned data
              (core/data/exchange_rates.yaml, the published-pairs
              structure); the user may override it manually. The runtime
              fetch (v0.3.2, reversed at v0.4.0) was removed on live
              evidence — every candidate endpoint failed in the reporting
              user's browser (two network-blocked, one bot-checked,
              2026-10-01) — and replaced by the ECB's published-rates
              link below; a link cannot fail and needs no fetch machinery.
              Blank or invalid input falls back to the documented default
              with a visible flag. */}
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
              onChange={(e) => { setRateInput(e.target.value); }}
              sx={{ maxWidth: 280, mt: 1 }}
              InputLabelProps={{ shrink: true }}
              inputProps={{ step: 'any', 'aria-label': 'Exchange rate, kronor per euro' }}
              helperText={rateInfo.is_default
                ? `Default: ${dataRate?.rate ?? DEFAULT_EXCHANGE_RATE.rate} kr/EUR (${dataRate?.source ?? DEFAULT_EXCHANGE_RATE.source}, ${dataRate?.as_of ?? DEFAULT_EXCHANGE_RATE.date}). Blank uses the default.`
                : `User rate ${rateInfo.rate} kr/EUR in effect.`}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              <a
                href="https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ECB's published euro reference rates"
                data-testid="ecb-rates-link"
              >
                ECB's published euro reference rates
              </a>{' '}
              — the ECB's own page for the latest published rates (published on TARGET business days; the machine-readable daily XML sits alongside). The model's pinned default is verified against them at each pass.
            </Typography>
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
