import type {
  CallInput,
  CostCalculationResult,
  PortDefinition,
  VesselInput
} from '@port-cost/core';
import { calculatePortCallCost, defaultCall } from '@port-cost/core';
import { rankByConvertedBasis, rankOrderByConvertedBasis } from './conversion';
import type { ComparisonBasisContext, ExchangeRateInfo } from './conversion';
import { condensedDerivation } from './derivation';
import {
  CHARGE_TYPE_LINES,
  COMPARISON_STAGES,
  chargeTypeForRule,
  stageForFamily,
  STAGE_BY_CHARGE_TYPE
} from './chargeTypes';
import type { ChargeTypeId } from './chargeTypes';
import { partitionFees } from './zeroCollapse';

export interface PortResultEntry {
  port: PortDefinition;
  result: CostCalculationResult | null;
  error: string | null;
}

export interface ComparisonLine {
  name: string;
  ruleId: string;
  biller: string;
  amount: number;
  flags: number;
  estimated: boolean;
  derivation?: { structure: string; composition: string; total: string } | null;
}

export interface ComparisonFamilyEntry {
  amount: number;
  currency: string;
  flags: number;
  effective_per_gt?: number;
  // Published-flat-rate labeling (v0.2.68, item 3): set exactly when the
  // family's figure is a single per-GT rule with no adjustments firing —
  // the tariff basis itself is per-GT, so the effective per-GT figure is
  // the published rate, not a derivation. Absent for every aggregating
  // family (multiple rules, firing adjustments, non-per-GT basis).
  published_per_gt?: { rate: number; citation: string };
  lines: ComparisonLine[];
}

export interface RuleAttributes {
  minimum?: number;
  maximum?: number;
  applicable_conditions?: Record<string, unknown>;
  estimated_parameter?: unknown;
  contract_vs_published?: unknown;
  // v0.2.68 item 3: the published-flat-rate condition reads the rule's
  // own rate structure and citation; carried beside the collapse-
  // classifier attributes, never changing them.
  rate_structure?: { type?: string; unit_type?: string; unit_rate?: number };
  source_reference?: { document_name: string; page: string | number };
}

export type RuleAttributesByPortAndId = Map<string, Map<string, RuleAttributes>>;
export type RuleNamesByPortAndId = Map<string, Map<string, string>>;

// Comparison model (spec v0.2.60 decomposition, audit item B): the
// comparison's memo bodies as pure functions - the view composes them in
// useMemo with the same dependencies as before; behavior is identical.

export const computePortResults = (
  selectedPorts: PortDefinition[],
  vessel: VesselInput,
  call: CallInput,
  rateInfo: ExchangeRateInfo,
  comparisonBasisContext: ComparisonBasisContext,
  // Per-port call overrides (spec v0.2.60): each port's own entered
  // port-specific values, keyed by port id. Optional and defaulting to
  // none: the merge is the v0.2.53 contract exactly — per-port defaults
  // under the shared call — with the port's own entries layered last, so
  // a port's column consumes only what was entered at that port.
  perPortCallOverrides?: Record<string, Record<string, unknown>>
): PortResultEntry[] => {
    const results = selectedPorts.map(port => {
      try {
        const portDefaults = defaultCall(port.metadata.id) as unknown as Record<string, unknown>;
        const merged: Record<string, unknown> = {
          ...portDefaults,
          ...call,
          ...(perPortCallOverrides?.[port.metadata.id] ?? {}),
          port_id: port.metadata.id
        };
        const result = calculatePortCallCost(port, { vessel, call: merged as unknown as CallInput });
        return { port, result, error: null as string | null };
      } catch (err) {
        return { port, result: null, error: `Calculation failed: ${err}` };
      }
    });
    // Ranked column order (spec v0.2.59): cheapest-first by Grand Total on
    // the converted comparison basis - the same single ranking rule as the
    // cheapest/most-expensive markers (spec v0.2.31), now carrying the
    // full order instead of only the two extremes. Ports whose computation
    // errored keep their position at the end, after the priced columns.
    const priced = results.filter(pr => pr.result);
    const unpriced = results.filter(pr => !pr.result);
    const ranked = rankOrderByConvertedBasis(
      priced.map(pr => ({ portId: pr.result!.port_id, amount: pr.result!.total, currency: pr.result!.currency })),
      rateInfo,
      comparisonBasisContext
    ).map(entry => priced.find(pr => pr.port.metadata.id === entry.portId)!);
    return [...ranked, ...unpriced];
  };

export const buildRuleNamesByPort = (ports: PortDefinition[]): RuleNamesByPortAndId => {
    const map = new Map<string, Map<string, string>>();
    for (const port of ports) {
      const inner = new Map<string, string>();
      for (const rule of port.fee_rules) inner.set(rule.id, rule.name);
      map.set(port.metadata.id, inner);
    }
    return map;
  };

// Published-flat-rate condition (v0.2.68, item 3): a family figure is the
// published rate when it is one rule, per_unit on GT, no floor/cap, and no
// adjustment fired on the line (the engine's own adjustments_applied is
// empty). Anything else — multiple rules, a firing discount/surcharge, a
// band/composite/per-call basis — aggregates, and the derived label stays.
const publishedPerGtForFees = (
  fees: { fee_rule_id: string; adjustments_applied: unknown[] }[],
  ruleById: Map<string, RuleAttributes | undefined>
): { rate: number; citation: string } | undefined => {
  if (fees.length !== 1) return undefined;
  const fee = fees[0];
  if ((fee.adjustments_applied ?? []).length > 0) return undefined;
  const rule = ruleById.get(fee.fee_rule_id);
  if (!rule || !rule.rate_structure) return undefined;
  const rs = rule.rate_structure;
  if (rs.type !== 'per_unit' || rs.unit_type !== 'gt' || typeof rs.unit_rate !== 'number') return undefined;
  if (rule.minimum !== undefined && rule.minimum !== null) return undefined;
  if (rule.maximum !== undefined && rule.maximum !== null) return undefined;
  const src = rule.source_reference;
  const citation = src
    ? `${src.document_name} p.${src.page}`
    : '';
  return { rate: rs.unit_rate, citation };
};

export const buildRuleAttributesByPort = (ports: PortDefinition[]): RuleAttributesByPortAndId => {
    const map: RuleAttributesByPortAndId = new Map();
    for (const port of ports) {
      const inner = new Map<string, RuleAttributes>();
      for (const rule of port.fee_rules) {
        inner.set(rule.id, {
          minimum: rule.minimum,
          maximum: rule.maximum,
          applicable_conditions: rule.applicable_conditions,
          estimated_parameter: rule.estimated_parameter,
          contract_vs_published: rule.contract_vs_published,
          // v0.2.68 item 3: the published-flat-rate condition reads the
          // rule's own rate structure and citation; carried beside the
          // collapse-classifier attributes, never changing them.
          rate_structure: rule.rate_structure as { type?: string; unit_type?: string; unit_rate?: number },
          source_reference: rule.source_reference as { document_name: string; page: string | number }
        });
      }
      map.set(port.metadata.id, inner);
    }
    return map;
  };

export const buildRowsBySegment = (
  portResults: PortResultEntry[],
  ruleNameByPortAndId: RuleNamesByPortAndId,
  ruleAttributesByPortAndId: RuleAttributesByPortAndId,
  vesselGt: number
) => {
    const familyTotals = new Map<string, Map<string, {
      amount: number;
      currency: string;
      flags: number;
      effective_per_gt?: number;
      published_per_gt?: { rate: number; citation: string };
      lines: { name: string; ruleId: string; biller: string; amount: number; flags: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[];
    }>>();
    // v0.2.68 item 3: the family's own fee records keyed family|port, so
    // the charge-type split recomputes the published-flat-rate condition
    // from the remaining lines' own records (never from stale family state).
    const feesByFamilyRecord = new Map<string, {
      fees: { fee_rule_id: string; adjustments_applied: unknown[] }[];
      ruleAttrs: Map<string, unknown>;
    }>();
    for (const { port, result } of portResults) {
      if (!result) continue;
      // Zero-line collapse (spec v0.2.27): true zero lines collapse out of
      // the cell lines; informative zeros (flags, floors, condition gates,
      // estimate markers) stay visible. The family row itself is never
      // removed, so every fee family remains a row across all ports.
      const ruleAttrs = ruleAttributesByPortAndId.get(result.port_id);
      const { visible: visibleFees } = partitionFees(
        result.billers.flatMap(b => b.fees),
        ruleAttrs ?? new Map()
      );
      const feesByFamily = new Map<string, typeof visibleFees>();
      for (const fee of visibleFees) {
        const arr = feesByFamily.get(fee.fee_family) ?? [];
        arr.push(fee);
        feesByFamily.set(fee.fee_family, arr);
      }
      for (const fees of Array.from(feesByFamily.values())) {
        // v0.2.68 item 3: the published-flat-rate label applies per figure
        // — computed from this family's own fee lines at this port, so a
        // firing discount (an ESI entry, say) moves the figure back to the
        // derived label automatically.
        const familyPublishedPerGt = publishedPerGtForFees(fees, ruleAttrs ?? new Map());
        feesByFamilyRecord.set(
          `${fees[0].fee_family}|${result.port_id}`,
          { fees, ruleAttrs: ruleAttrs ?? new Map() });
        for (const fee of fees) {
          if (!familyTotals.has(fee.fee_family)) {
            familyTotals.set(fee.fee_family, new Map());
          }
          const perPort = familyTotals.get(fee.fee_family)!;
          const entry = perPort.get(result.port_id) || {
            amount: 0,
            currency: fee.currency,
            flags: 0,
            effective_per_gt: undefined,
            published_per_gt: familyPublishedPerGt,
            lines: []
          };
          entry.amount += fee.amount;
          entry.flags += fee.quality_flags.length;
          entry.lines.push({
            name: ruleNameByPortAndId.get(port.metadata.id)?.get(fee.fee_rule_id) ?? fee.fee_family,
            ruleId: fee.fee_rule_id,
            biller: fee.biller,
            amount: fee.amount,
            flags: fee.quality_flags.length,
            estimated: fee.quality_flags.some(flag => flag.type === 'estimated_parameter'),
            // Derivation transparency (spec v0.2.42): the condensed form rides
            // the line into every comparison surface — desktop cells and the
            // mobile card layout alike.
            derivation: condensedDerivation(fee)
          });
          perPort.set(result.port_id, entry);
        }
      }
    }
    // Charge-type re-segmentation (spec v0.2.52): the fairway / berth /
    // cargo due rules are pulled out of their fee families onto their own
    // named lines (rule-id mapping in chargeTypes.ts, not fee family —
    // the vessel_fee family collides across billers: Sjofartsverket's
    // is fairway dues, HHLA/Eurogate's is berth dues). Every rule lands
    // in exactly one comparison line: its charge-type line or its
    // remaining fee-family row.
    type PortEntry = {
      amount: number; currency: string; flags: number;
      lines: { name: string; ruleId: string; biller: string; amount: number; flags: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[];
    };
    const chargeTypeTotals = new Map<ChargeTypeId, Map<string, PortEntry>>();
    const remainingFamilies = new Map<string, Map<string, {
      amount: number; currency: string; flags: number; effective_per_gt?: number;
      published_per_gt?: { rate: number; citation: string };
      lines: { name: string; ruleId: string; biller: string; amount: number; flags: number; estimated: boolean; derivation?: { structure: string; composition: string; total: string } | null }[];
    }>>();
    for (const [family, perPort] of Array.from(familyTotals.entries())) {
      for (const [portId, entry] of Array.from(perPort.entries())) {
        const chargeLines = entry.lines.filter(line => chargeTypeForRule(line.ruleId) !== null);
        if (chargeLines.length === 0) {
          if (!remainingFamilies.has(family)) remainingFamilies.set(family, new Map());
          remainingFamilies.get(family)!.set(portId, entry);
          continue;
        }
        // A charge-type rule's family entry splits: the mapped rules go
        // to their charge-type line, any remaining rules of the same
        // family stay on the family row; a family whose every rule maps
        // to a charge-type line contributes no remaining row.
        const remainingLines = entry.lines.filter(line => chargeTypeForRule(line.ruleId) === null);
        for (const line of chargeLines) {
          const ctId = chargeTypeForRule(line.ruleId)!;
          if (!chargeTypeTotals.has(ctId)) chargeTypeTotals.set(ctId, new Map());
          const m = chargeTypeTotals.get(ctId)!;
          const e = m.get(portId) || { amount: 0, currency: entry.currency, flags: 0, lines: [] };
          e.amount += line.amount;
          e.flags += line.flags;
          e.lines.push(line);
          m.set(portId, e);
        }
        if (remainingLines.length > 0) {
          if (!remainingFamilies.has(family)) remainingFamilies.set(family, new Map());
          // v0.2.68 item 3: the remaining row keeps the published label only
          // if its own remaining lines satisfy the condition — recomputed
          // from the family's fee records, so a single remaining per-GT rule
          // with no fired adjustment still reads as published (HEL's port
          // dues after the cargo due splits off to its charge-type line).
          const record = feesByFamilyRecord.get(`${family}|${portId}`);
          const remainingFees = record
            ? record.fees.filter(f => chargeTypeForRule(f.fee_rule_id) === null)
            : [];
          remainingFamilies.get(family)!.set(portId, {
            amount: entry.amount - chargeLines.reduce((s, l) => s + l.amount, 0),
            currency: entry.currency,
            flags: entry.flags - chargeLines.reduce((s, l) => s + l.flags, 0),
            published_per_gt: record
              ? publishedPerGtForFees(remainingFees, record.ruleAttrs as never)
              : undefined,
            lines: remainingLines
          });
        }
      }
    }
    // Zero-line suppression (spec v0.2.52): a comparison line whose
    // amount is zero at every compared port for the current inputs does
    // not render in the comparison view. Display-only — rules still
    // fire, derivations still compute, the engine is untouched; any
    // input change making a line nonzero renders it immediately.
    const lineIsAllZero = (perPort: Map<string, { amount: number }>) =>
      portResults.every(({ result }) =>
        !result || (perPort.get(result.port_id)?.amount ?? 0) === 0);
    for (const [ctId, perPort] of Array.from(chargeTypeTotals.entries())) {
      if (lineIsAllZero(perPort)) chargeTypeTotals.delete(ctId);
    }
    for (const [family, perPort] of Array.from(remainingFamilies.entries())) {
      if (lineIsAllZero(perPort)) remainingFamilies.delete(family);
    }
    // Stages (spec v0.2.52): the three charge-type lines nest under their
    // stage as prominent rows; remaining fee families group under the
    // stage their economic function belongs to (mapping and citations in
    // chargeTypes.ts).
    const rowsByStage = COMPARISON_STAGES.map(stage => {
      const chargeTypeRows = CHARGE_TYPE_LINES
        .filter(line => STAGE_BY_CHARGE_TYPE[line.id] === stage.id)
        .filter(line => (chargeTypeTotals.get(line.id)?.size ?? 0) > 0)
        .map(line => ({
          chargeType: line,
          perPort: chargeTypeTotals.get(line.id)!,
          leviedAt: Array.from(chargeTypeTotals.get(line.id)!.keys())
        }));
      const familyRows = Array.from(remainingFamilies.entries())
        .filter(([family]) => stageForFamily(family) === stage.id)
        .map(([family, perPort]) => {
          if (family === 'port_dues') {
            for (const portId of Array.from(perPort.keys())) {
              const entry = perPort.get(portId)!;
              entry.effective_per_gt = vesselGt > 0
                ? Math.round((entry.amount / vesselGt) * 100) / 100
                : undefined;
            }
          }
          return { family, perPort };
        });
      return { stage, chargeTypeRows, familyRows };
    }).filter(group => group.chargeTypeRows.length > 0 || group.familyRows.length > 0);
    return { rowsByStage, chargeTypeTotals };
  };

export const computeRanking = (
  portResults: PortResultEntry[],
  rateInfo: ExchangeRateInfo,
  comparisonBasisContext: ComparisonBasisContext
) =>
  rankByConvertedBasis(
    portResults
      .filter(pr => pr.result)
      .map(pr => ({ portId: pr.result!.port_id, amount: pr.result!.total, currency: pr.result!.currency })),
    rateInfo,
    comparisonBasisContext);
