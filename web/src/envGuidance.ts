// Environmental-input guidance (spec v0.2.29): a purely informative help
// affordance beside each environmental input - what the certificate or score
// is and who issues it; the decision rule in user terms; the port's current
// threshold bands from the port file, with source references; and the money
// consequence of entering each value on THIS call at THIS port, rendered
// before any value is entered. No auto-fill, no pre-selection, no persistence.
import type { CostCalculationResult, PortDefinition } from '@port-cost/core';
import { calculatePortCallCost } from '@port-cost/core';

export interface GuidanceBand {
  label: string;
  detail: string;
  source: string;
}

export interface GuidanceDelta {
  label: string;
  delta: string;
}

export interface InputGuide {
  key: string;
  title: string;
  what: string;
  issuer: string;
  issuerUrl?: string;
  rule: string;
  bands: GuidanceBand[];
  deltas: GuidanceDelta[];
  deltaNote: string;
}

export type ComputeCall = (
  port: PortDefinition,
  callOverrides: Record<string, unknown>
) => CostCalculationResult;

export function makeComputer(
  ports: PortDefinition[],
  vessel: import('@port-cost/core').VesselInput,
  call: import('@port-cost/core').CallInput
): ComputeCall {
  return (port, callOverrides) =>
    calculatePortCallCost(port, {
      vessel,
      call: { ...call, ...callOverrides, port_id: port.metadata.id } as import('@port-cost/core').CallInput
    });
}

const fmt = (n: number, currency: string) => {
  const sign = n < 0 ? '−' : n > 0 ? '+' : '';
  const abs = Math.abs(n).toLocaleString('sv-SE', { maximumFractionDigits: 2 });
  return `${sign}${abs} ${currency}`;
};

// Tier percentage ladder from the port file (hamburg_2026.yaml hpa_port_fee
// component_adjustments.env tier_pct map) with its source reference. This is
// the single source of truth for the tier percentages the guidance shows and
// the tier-field effect line renders (v0.2.45): one map, no duplicate copy.
export const TIER_PCT: Record<string, number> = {
  'Tier 0': 30, 'Tier I': 25, 'Tier II': 5, 'Tier III': -20
};

// Tier-field effect line (v0.2.45): the arithmetic consequence of the applied
// tier in the tier's own terms — the tier percentage and the component it
// acts on. Sourced from TIER_PCT (the guidance's own map), never a copy.
export function tierEffectLine(tier: string): string {
  const pct = TIER_PCT[tier];
  if (pct === undefined) return `Tier ${tier}: no published percentage mapping`;
  const sign = pct >= 0 ? '+' : '\u2212';
  return `Tier ${tier}: ${sign}${Math.abs(pct)}% on the environmental component`;
}

const ESI_AIR_BANDS: GuidanceBand[] = [
  { label: 'ESI air 20–24.99', detail: '−0.35% of env subtotal, max 175 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.1' },
  { label: 'ESI air 25–34.99', detail: '−0.7%, max 350 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.1' },
  { label: 'ESI air 35–49.99', detail: '−3.5%, max 700 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.1' },
  { label: 'ESI air 50+', detail: '−7%, max 1,050 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.1' }
];

const ESI_NOISE_BANDS: GuidanceBand[] = [
  { label: 'ESI noise 40–44.99', detail: '−0.15% of env subtotal, max 75 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.2' },
  { label: 'ESI noise 45–54.99', detail: '−0.3%, max 150 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.2' },
  { label: 'ESI noise 55–69.99', detail: '−1.5%, max 300 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.2' },
  { label: 'ESI noise 70+', detail: '−3%, max 450 €', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.1.2' }
];

function tierBands(): GuidanceBand[] {
  return [
    { label: 'Tier 0 (no IAPP)', detail: '+30% on the environmental component', source: 'pricelist-maritime-shipping-2026.pdf, S1 item 115 (Tier); STC 2.1.1' },
    { label: 'Tier I', detail: '+25%', source: 'pricelist-maritime-shipping-2026.pdf, S1 item 115 (Tier)' },
    { label: 'Tier II', detail: '+5%', source: 'pricelist-maritime-shipping-2026.pdf, S1 item 115 (Tier)' },
    { label: 'Tier III+', detail: '−20%', source: 'pricelist-maritime-shipping-2026.pdf, S1 item 115 (Tier)' }
  ];
}

function quantumBands(): GuidanceBand[] {
  return [
    { label: '> 1.5m GT', detail: '−2.5% of GT subtotal', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.2.11' },
    { label: '> 10m GT', detail: '−5.0%', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.2.11' },
    { label: '> 25m GT', detail: '−7.5%', source: 'pricelist-maritime-shipping-2026.pdf, S2 4.1.2.11' }
  ];
}

const GOT_HBG_ENV_DISCOUNT: GuidanceBand[] = [
  { label: 'ESI ≥ 30 or CSI class 4', detail: '−10% port dues', source: 'Gothenburg Port Tariff 2026 §2.1 / Helsingborg Tariff 2026 (port dues clause)' },
  { label: 'Fossil-free ≥ 30% of annual consumption', detail: 'further −10%, additive (total −20%)', source: 'Gothenburg Port Tariff 2026 §2.1 / Helsingborg Tariff 2026 (environmental clause)' }
];

const SFV_ENV_CLASSES: GuidanceBand[] = [
  { label: 'A', detail: '80% reduction of fairway/vessel fee', source: 'Sjöfartsverket price list fairway & pilot fees 2026 (environmental incentives, CSI classification)' },
  { label: 'B', detail: '55% reduction', source: 'Sjöfartsverket price list fairway & pilot fees 2026' },
  { label: 'C', detail: '10% reduction', source: 'Sjöfartsverket price list fairway & pilot fees 2026' },
  { label: 'D / E (not registered)', detail: '0% reduction', source: 'Sjöfartsverket price list fairway & pilot fees 2026' }
];

// Levers that apply per port, for the compact overview
export function leversForPort(portId: string): string[] {
  switch (portId) {
    case 'hamburg': return ['NOx Tier', 'ESI air', 'ESI noise', 'Quantum (prior-year GT)', 'OPS rebate'];
    case 'gothenburg': return ['ESI score (air)', 'Clean Shipping Index class', 'Fossil-free fuel share', 'Sjöfartsverket environmental class', 'OPS'];
    case 'helsingborg': return ['ESI score (air)', 'Clean Shipping Index class', 'Fossil-free fuel share', 'Sjöfartsverket environmental class', 'EES rate', 'ISSC validity'];
    default: return [];
  }
}

export function guideFor(
  key: string,
  port: PortDefinition,
  computer: ComputeCall
): InputGuide | null {
  const currency = port.metadata.currency;
  const portId = port.metadata.id;
  const portName = port.metadata.name;
  const deltaNote = `Deltas are per this call, per this port (${portName}), computed against the current form state.`;

  const delta = (computeOverrides: Record<string, unknown>): string => {
    try {
      const baseline = computer(port, {});
      const withLever = computer(port, computeOverrides);
      const d = roundToC2(withLever.total - baseline.total);
      if (d === 0) return 'no change on this call';
      return fmt(d, currency);
    } catch {
      return 'unavailable';
    }
  };

  switch (key) {
    case 'engine_tier':
      if (portId !== 'hamburg') return null;
      return {
        key,
        title: 'NOx Tier (IAPP, most polluting engine)',
        what: 'The certified NOx emission tier of the ship\'s most polluting engine, from the IAPP certificate supplement (MARPOL Annex VI, Regulation 13).',
        issuer: 'IMO under MARPOL Annex VI; certified by the flag state / Recognized Organization and recorded in the IAPP certificate supplement',
        issuerUrl: 'https://www.imo.org/en/ourwork/environment/pages/nitrogen-oxides-(nox)-–-regulation-13.aspx',
        rule: 'Tier = most polluting engine per the IAPP supplement. When no certified tier is entered and a build year is present, the tier is inferred from the build year per MARPOL Annex VI Regulation 13 construction dates (2016+ → Tier III, 2011–2015 → Tier II, 2000–2010 → Tier I, earlier → Tier 0), flagged as an assumed parameter to verify against the IAPP certificate; a blank build year keeps the worst-case Tier 0 default (+30% on the environmental component). An entered tier always wins.',
        bands: tierBands(),
        deltas: (Object.keys(TIER_PCT) as string[]).map(t => ({
          label: t,
          delta: `entering ${t} changes this call by ${delta({ engine_tier: t, engine_tier_estimated: false, infer_engine_tier_from_build_year: false })}`
        })),
        deltaNote
      };
    case 'esi_score':
      if (portId === 'hamburg') {
        return {
          key,
          title: 'ESI Air Score (0–100)',
          what: 'The Environmental Ship Index air score — a voluntary index of a ship\'s environmental performance, scored 0–100.',
          issuer: 'Environmental Ship Index (ESI), issued by the IAPH (International Association of Ports and Harbors) community',
          issuerUrl: 'https://www.environmentalshipindex.org/',
          rule: 'Only ships registered in the ESI database have a score; blank = not entered, never a score. The discount applies per band on the tier-adjusted environmental component, capped in euros.',
          bands: ESI_AIR_BANDS,
          deltas: [25, 40, 60].map(s => ({
            label: `ESI ${s}`,
            delta: `entering ESI ${s} changes this call by ${delta({ esi_score: s })}`
          })),
          deltaNote
        };
      }
      return {
        key,
        title: 'ESI Score',
        what: 'The Environmental Ship Index air score (0–100) — a voluntary environmental-performance index for ships.',
        issuer: 'Environmental Ship Index (ESI), IAPH community',
        issuerUrl: 'https://www.environmentalshipindex.org/',
        rule: 'Blank = not entered (no discount); the score must be registered in the ESI database to apply. ESI ≥ 30 (or CSI class 4) gives −10% on port dues; a further fossil-free share ≥ 30% stacks additively (−20% total).',
        bands: GOT_HBG_ENV_DISCOUNT,
        deltas: [30, 50].map(s => ({
          label: `ESI ${s}`,
          delta: `entering ESI ${s} changes this call by ${delta({ esi_score: s })}`
        })),
        deltaNote
      };
    case 'esi_noise_score':
      if (portId !== 'hamburg') return null;
      return {
        key,
        title: 'ESI Noise Score (0–100)',
        what: 'The ESI noise sub-score (0–100), separate from the air score.',
        issuer: 'Environmental Ship Index (ESI), IAPH community',
        issuerUrl: 'https://www.environmentalshipindex.org/',
        rule: 'Separate discount; only if registered. Blank = not entered (no discount).',
        bands: ESI_NOISE_BANDS,
        deltas: [45, 60].map(s => ({
          label: `ESI noise ${s}`,
          delta: `entering ESI noise ${s} changes this call by ${delta({ esi_noise_score: s })}`
        })),
        deltaNote
      };
    case 'csi_class':
      return {
        key,
        title: 'Sjöfartsverket Environmental Class (A–E)',
        what: 'The Swedish Maritime Administration\'s environmental classification (A–E) applied to the national fairway and vessel fees. Class is granted per the environmental incentives in the Sjöfartsverket price list (CSI-based).',
        issuer: 'Sjöfartsverket (Swedish Maritime Administration), based on Clean Shipping Index classification',
        issuerUrl: 'https://www.sjofartsverket.se/en/services/port-call-support/dues-and-fees/',
        rule: 'Not registered = class E, the least favourable published rate (0% reduction). Classes A–C give reductions on the national vessel fee, readiness fee, and fairway dues. This is a different scale from the port\'s CSI class 1–5 discount input and must never be conflated.',
        bands: SFV_ENV_CLASSES,
        deltas: ['A', 'B', 'C'].map(c => ({
          label: `Class ${c}`,
          delta: `entering class ${c} changes this call by ${delta({ csi_class: c })}`
        })),
        deltaNote
      };
    case 'clean_shipping_index_class':
      if (portId !== 'gothenburg' && portId !== 'helsingborg') return null;
      return {
        key,
        title: 'Clean Shipping Index Class (port discount, 1–5)',
        what: 'The Clean Shipping Index class (1–5), a voluntary environmental label ranking ships on five parameters (150 points total).',
        issuer: 'Clean Shipping Index (non-profit; IVL Swedish Environmental Research Institute)',
        issuerUrl: 'https://cleanshippingindex.com/',
        rule: 'Class 4 or 5 gives the port\'s −10% environmental discount on port dues (same lever as ESI ≥ 30 — one discount, not both). Blank = not entered (no discount). A different scale from the Sjöfartsverket A–E classes.',
        bands: GOT_HBG_ENV_DISCOUNT,
        deltas: [
          {
            label: 'CSI class 4',
            delta: `entering CSI class 4 changes this call by ${delta({ clean_shipping_index_class: '4' })}`
          }
        ],
        deltaNote
      };
    case 'fossil_free_fuel_percentage':
      return {
        key,
        title: 'Fossil-Free Fuel %',
        what: 'The share of fossil-free fuel in the ship\'s annual consumption.',
        issuer: 'per the port tariff (self-declared per the tariff clause; verification per port rules)',
        rule: 'Blank = not entered (no discount); a share ≥ 30% gives a further −10% on port dues, stacking additively with the ESI/CSI discount (total −20%).',
        bands: GOT_HBG_ENV_DISCOUNT,
        deltas: [
          {
            label: '35% fossil-free',
            delta: `entering 35% changes this call by ${delta({ fossil_free_fuel_percentage: 35 })}`
          }
        ],
        deltaNote
      };
    case 'quantum_prior_year_gt':
      if (portId !== 'hamburg') return null;
      return {
        key,
        title: 'Quantum discount (prior-year paid GT)',
        what: 'The prior calendar year\'s accumulated paid GT at HPA ports, for the volume (Quantum) discount on the GT component.',
        issuer: 'HPA tariff (self-reported per S2 4.1.2.11)',
        rule: '0 = no discount (default). Bands apply to the GT subtotal after the OPS rebate: >1.5m GT → −2.5%, >10m → −5%, >25m → −7.5%.',
        bands: quantumBands(),
        deltas: [1500001, 11000000, 26000000].map(gt => ({
          label: `${gt.toLocaleString('sv-SE')} GT`,
          delta: `entering ${gt.toLocaleString('sv-SE')} GT changes this call by ${delta({ quantum_prior_year_gt: gt })}`
        })),
        deltaNote
      };
    case 'ops_usage':
      return {
        key,
        title: 'OPS (onshore power) usage',
        what: 'Whether the ship connects to onshore power at berth.',
        issuer: 'per the port tariff (OPS connection per call)',
        rule: 'Off by default. At Hamburg, OPS connection gives a rebate of 0.015 €/GT on the GT component of the port fee.',
        bands: [
          { label: 'Hamburg OPS rebate', detail: '−0.015 €/GT on the GT component', source: 'pricelist-maritime-shipping-2026.pdf, S1 item 217' }
        ],
        deltas: [
          {
            label: 'OPS on',
            delta: `turning OPS on changes this call by ${delta({ ops_usage: true })}`
          }
        ],
        deltaNote
      };
    default:
      return null;
  }
}

function roundToC2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
