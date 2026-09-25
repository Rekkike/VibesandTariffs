// Charge-type re-segmentation and comparison-stage grouping (spec v0.2.52).
// Presentation-layer mapping only: no engine, data, or figure change. The
// charge-type dimension is a web-layer constant keyed by rule-id patterns
// (not fee family - the family collides across billers: Sjofartsverket
// vessel_fee is fairway dues, HHLA/Eurogate vessel_fee is berth dues).
//
// The three charge-type lines, mapped with the tariff citations carried by
// the engine's functional classification (core/src/classification.ts):
//
// Fairway dues - national per-call fairway dues (Sjofartsverket):
//   Fartygsavgift - per call by NT class x CSI class (prislista p.3);
//   Beredskapsavgift - per call by NT class (prislista p.4). Levied at
//   Gothenburg and Helsingborg (per-port rule ids under the shared
//   sjofartsverket_* / sfv_* prefixes); the frequency-discount lines
//   adjust these fees and ride the same line. Hamburg levies none.
//
// Berth dues - ship's dues for use of the berth/handling facility,
// GT x lay time (never cargo):
//   HHLA tonnage dues (Quay Tariff section 1.2; vessel-fee character per
//   section 9.1.1) and Eurogate berthing charge 2.1.1-2.1.2 (same
//   economic animal - lay days first 24 h then per commenced 12 h per GT).
//   Gothenburg and Helsingborg levy no lay-time berth charge.
//
// Cargo dues - per unit/tonne of cargo handled:
//   Helsingborg Port Dues Cargo (tariff-2026.pdf p.6; the General cargo
//   line prices "goods in containers, on loading platforms, a trailer or
//   other cargo carrier" at 625.00 SEK per unit - unitized container
//   calls pay it; the "with the exception of unitized goods" opening
//   governs the conventional/tonnage rates, not this line). The Swedish
//   Sjofartsverket godsavgift (spec v0.2.61: cargo-based component of
//   the national farledsavgift, Foreskrift 2025:6) is a *fairway* due by
//   its funding statute, not a port cargo due - it rides the Fairway
//   dues line above and stacks with Helsingborg's Port Dues Cargo as
//   separate charges. Hamburg levies no cargo due (its cargo_fee-family
//   rules are container *services* under Quay Tariff section 8, not
//   cargo dues).

export type ChargeTypeId = 'fairway_dues' | 'berth_dues' | 'cargo_dues';

export interface ChargeTypeLine {
  id: ChargeTypeId;
  label: string;
  description: string;
}

export const CHARGE_TYPE_LINES: ChargeTypeLine[] = [
  {
    id: 'fairway_dues',
    label: 'Fairway dues',
    description:
      'National per-call fairway dues: Fartygsavgift + Beredskapsavgift (Sjofartsverket prislista p.3-p.4)'
  },
  {
    id: 'berth_dues',
    label: 'Berth dues',
    description:
      "Ship's dues for the berth/handling facility, GT x lay time: HHLA tonnage dues (Quay Tariff 1.2/9.1.1) + Eurogate berthing (P&C 2.1.1-2.1.2)"
  },
  {
    id: 'cargo_dues',
    label: 'Cargo dues',
    description:
      'Per unit/tonne of cargo handled: Helsingborg Port Dues Cargo (tariff-2026.pdf p.6)'
  }
];

// Rule-id membership, by pattern (the Swedish national tables are
// transcribed per port under shared prefixes; frequency discounts adjust
// these dues and ride the line).
const FAIRWAY_RULE_PATTERNS: RegExp[] = [
  /^(sjofartsverket|sfv)_vessel_fee_/,
  /^(sjofartsverket|sfv)_readiness_fee_/,
  /^(sjofartsverket|sfv)_godsavgift$/,
  /frequency_discount/
];

const BERTH_RULE_IDS = new Set(['hhla_tonnage_dues', 'eurogate_berthing_charge']);
const CARGO_RULE_IDS = new Set(['poh_cargo_due']);

export function chargeTypeForRule(ruleId: string): ChargeTypeId | null {
  if (BERTH_RULE_IDS.has(ruleId)) return 'berth_dues';
  if (CARGO_RULE_IDS.has(ruleId)) return 'cargo_dues';
  if (FAIRWAY_RULE_PATTERNS.some(p => p.test(ruleId))) return 'fairway_dues';
  return null;
}

// Comparison stages (spec v0.2.52): three operational stages a call's
// costs compose into, assigned per rule by economic function over
// port-specific naming. Stages nest above the charge-type lines in the
// comparison view: the three charge-type lines render as prominent rows
// inside their stage, and every other rule stays in its existing
// fee-family row, grouped under the stage its function belongs to. The
// per-port view keeps its existing segment structure (Vessel Call /
// Energy at Berth / Yard & Storage) - the stage grouping is a
// comparison-view presentation layer.
export type ComparisonStageId = 'reach_berth' | 'at_berth' | 'quayside_operations';

export interface ComparisonStage {
  id: ComparisonStageId;
  label: string;
  description: string;
}

export const COMPARISON_STAGES: ComparisonStage[] = [
  {
    id: 'reach_berth',
    label: 'To reach the berth',
    description: 'Port dues, fairway dues, pilotage, towage and similar nautical and call dues'
  },
  {
    id: 'at_berth',
    label: 'At the berth',
    description: "Berth/tonnage dues and other lay-time-based charges, energy at berth"
  },
  {
    id: 'quayside_operations',
    label: 'Quayside operations',
    description: 'Handling, security, cargo dues, storage and yard services'
  }
];

// Stage assignment by fee family. The three charge-type lines carry the
// rule-id mapping above and render inside their stage:
//   Fairway dues -> to reach the berth (the waterway is what the fairway
//     due funds - classification: waterway_fairway_access);
//   Berth dues -> at the berth (lay-time ship's dues);
//   Cargo dues -> quayside operations (a throughput levy on handled cargo).
// Remaining families assign by economic function:
//   port_dues, pilotage, ordering_fee (the pilotage's own ordering fee),
//   towage, waste, environmental_surcharge, lay_up (the cargo-tied idle
//   berth charge is not a lay-time berth due - it is gated on cargo
//   congestion, classification cargo_throughput_levy at Gothenburg), and
//   the biller fund surcharges (hafenfonds, social_fund) -> to reach the
//   berth (statutory call dues and their statutory surcharges, "and
//   similar" per the directive);
//   connection_fee (OPS shore power) -> at the berth;
//   terminal_handling, security, cargo_fee (container services, not
//   cargo dues), storage, yard_surcharge, gate_hazardous, hatch_cover,
//   gearbox_handling, ancillary_service -> quayside operations.
const STAGE_BY_FAMILY: Record<string, ComparisonStageId> = {
  port_dues: 'reach_berth',
  pilotage: 'reach_berth',
  ordering_fee: 'reach_berth',
  towage: 'reach_berth',
  waste: 'reach_berth',
  environmental_surcharge: 'reach_berth',
  lay_up: 'reach_berth',
  hafenfonds: 'reach_berth',
  social_fund: 'reach_berth',
  connection_fee: 'at_berth',
  terminal_handling: 'quayside_operations',
  security: 'quayside_operations',
  cargo_fee: 'quayside_operations',
  storage: 'quayside_operations',
  yard_surcharge: 'quayside_operations',
  gate_hazardous: 'quayside_operations',
  hatch_cover: 'quayside_operations',
  gearbox_handling: 'quayside_operations',
  ancillary_service: 'quayside_operations'
};

export const STAGE_BY_CHARGE_TYPE: Record<ChargeTypeId, ComparisonStageId> = {
  fairway_dues: 'reach_berth',
  berth_dues: 'at_berth',
  cargo_dues: 'quayside_operations'
};

export function stageForFamily(family: string): ComparisonStageId {
  return STAGE_BY_FAMILY[family] ?? 'reach_berth';
}
