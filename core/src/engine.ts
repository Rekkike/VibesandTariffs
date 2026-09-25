// Port Call Cost Analyzer - Rule Evaluation Engine
// Core engine that evaluates fee rules against vessel/call inputs

import {
  CostCalculationInput,
  CostCalculationResult,
  FeeRule,
  FeeResult,
  BillerBreakdown,
  QualityFlag,
  RateStructure,
  FlatRate,
  BandedRate,
  ProgressiveRate,
  PerCommencedDayRate,
  PerUnitRate,
  BandedByTimeRate,
  BandedFlatRate,
  CompositeTrancheRate,
  TieredPerPeriodRate,
  PerCommencedPeriodRate,
  ProgressiveDailyRate,
  FlatByInputRate,
  Adjustment,
  PortDefinition,
  Biller,
  Currency,
  SourceReference,
  BandRow,
  FeeDerivation,
  DerivationStep,
  OpsSpeculativeLine,
  OpsSpeculativeBlock,
  OpsComponentsSpec
} from './types';
import { classifyRule } from './classification';
import { portOpsComponents } from './port_data';

// Round half-up to the cent (tariff-line precision). The toPrecision(12) guard
// strips binary-float noise (e.g. 8890 * 0.0135 = 120.01499999999999) so exact
// half-cent products round as printed in the tariff.
export function roundToCent(value: number): number {
  return Math.round(Number((value * 100).toPrecision(12))) / 100;
}

// Round up (ceil) to the cent - used for discount amounts so a rebate never
// overstates a benefit, matching the S1 worked example's printed figures.
function ceilToCent(value: number): number {
  return Math.ceil(Number((value * 100).toPrecision(12))) / 100;
}

// Engine NOx Tier inference, per MARPOL Annex VI Regulation 13 construction
// dates (spec v0.2.44): a ship constructed on or after 1 January 2000 is
// Tier I; on or after 1 January 2011 Tier II; on or after 1 January 2016
// Tier III (Tier III is an in-NECA standard — the inference states the
// construction-date class and the flag tells the user to verify against the
// IAPP certificate). Ships constructed before 2000, and unknown build
// years, fall back to Tier 0 (the pre-Regulation-13 class, and the v0.2.28
// worst-case default for truly unknown vessels).
export function inferEngineTier(builtYear: number | undefined): 'Tier 0' | 'Tier I' | 'Tier II' | 'Tier III' {
  if (builtYear === undefined || builtYear < 2000) return 'Tier 0';
  if (builtYear <= 2010) return 'Tier I';
  if (builtYear <= 2015) return 'Tier II';
  return 'Tier III';
}

/**
 * Evaluates a single fee rule against the input
 */
export function evaluateFeeRule(
  rule: FeeRule,
  input: CostCalculationInput,
  qualityFlags: QualityFlag[],
  currency: Currency = 'SEK'
): FeeResult | null {
  const vessel = input.vessel;
  const call = input.call;
  
  // Check if rule is applicable based on conditions
  if (rule.applicable_conditions) {
    // Arrival origin (spec v0.2.50): the waste-dues split dimension is the
    // previous port of call's region, never the flag (Port Tariff 2026
    // "Vessels arriving from European ports"). Values 'europe' /
    // 'outside-europe'; absent or unrecognized defaults to 'outside-europe',
    // the worst case, and that fallback is always visible, never silent
    // (spec 4.4.2). flag_state is no longer a gating condition: the 2026
    // tariffs price no rule on the flag, and any data rule that still
    // carries one is ignored with a visible notice rather than silently
    // mis-priced on the wrong dimension.
    if (rule.applicable_conditions.arrival_origin) {
      const required = rule.applicable_conditions.arrival_origin;
      const entered = call.arrival_origin;
      const known = ['europe', 'outside-europe'];
      const origin = entered && known.includes(entered) ? entered : 'outside-europe';
      if (origin !== required) {
        return null;
      }
      if (entered !== origin || !entered) {
        qualityFlags.push({
          type: 'fallback_value',
          description: entered
            ? `Arrival origin "${entered}" not recognized; priced as an arrival from outside Europe, the worst case (spec v0.2.50 waste-dues origin dimension)`
            : 'Arrival origin not selected; priced as an arrival from outside Europe, the worst case — set \'From a European port\' for the intra-Europe leg (spec v0.2.50)',
          severity: 'info'
        });
      }
    }
    
    if (rule.applicable_conditions.ops_usage && 
        rule.applicable_conditions.ops_usage !== call.ops_usage) {
      return null;
    }
    
    if (rule.applicable_conditions.esi_score) {
      const minScore = rule.applicable_conditions.esi_score;
      if (!call.esi_score || call.esi_score < minScore) {
        return null;
      }
    }
    
    if (rule.applicable_conditions.csi_class) {
      const requiredClass = rule.applicable_conditions.csi_class;
      // Missing environmental class defaults to E (not registered) per spec
      // 4.4.2: least favourable value, with a visible notice. Sjöfartsverket's
      // own tables make E the not-registered rate, so an absent input never
      // silently skips the national vessel fee.
      if (call.csi_class === undefined || call.csi_class === '') {
        if (requiredClass !== 'E') {
          return null;
        }
        qualityFlags.push({
          type: 'fallback_value',
          description: 'Environmental class not supplied; defaulted to E (not registered), the least favourable rate (spec 4.4.2)',
          severity: 'info'
        });
      } else if (call.csi_class !== requiredClass) {
        return null;
      }
    }
    
    if (rule.applicable_conditions.fuel_percentage) {
      const minPercentage = rule.applicable_conditions.fuel_percentage;
      if (!call.fossil_free_fuel_percentage || call.fossil_free_fuel_percentage < minPercentage) {
        return null;
      }
    }
    
    // Handle NT class condition for Sjöfartsverket
    if (rule.applicable_conditions.nt_class) {
      const nt = vessel.nt !== undefined ? vessel.nt : vessel.gt * 0.55;
      const ntClass = getNetTonnageClass(nt);
      if (ntClass !== rule.applicable_conditions.nt_class) {
        return null;
      }
    }
    
    // Handle vessel type condition (e.g. tanker-only OPS at Energy Port jetties)
    if (rule.applicable_conditions.vessel_type) {
      const allowedTypes = rule.applicable_conditions.vessel_type;
      if (!call.vessel_type || !allowedTypes.includes(call.vessel_type)) {
        return null;
      }
    }
    
    // Ordering-fee lead-time band (best\u00e4llningsavgift): a national bracket
    // derived from the call's ordering lead time, analogous to nt_class.
    // Bands are lower-inclusive / upper-exclusive (<1, 1-2, 2-3, 3-4, 4-5 h);
    // a lead of 5 h or more charges nothing (SJOFS 2025:5 sec 11) and
    // matches no ordering-fee rule.
    if (rule.applicable_conditions.ordering_lead_time_band) {
      const hours = call.pilotage_ordering_lead_time_hours;
      const band = getOrderingLeadTimeBandId(hours);
      if (band !== rule.applicable_conditions.ordering_lead_time_band) {
        return null;
      }
      // Spec 4.4.2: a missing lead time falls back to the least favourable
      // band, which must be visible, never silent.
      if (typeof hours !== 'number' || isNaN(hours) || hours < 0) {
        qualityFlags.push({
          type: 'fallback_value',
          description: 'Pilotage ordering lead time not supplied; defaulted to the under-1-hour band, the least favourable rate (spec 4.4.2)',
          severity: 'warning'
        });
      }
    }
    
    // Hamburg terminal scope (spec v0.2.49): a Hamburg call is priced against
    // a named terminal operator. HHLA ship's-dues items apply only to HHLA
    // calls; EUROGATE items only to Eurogate calls. An absent or unrecognized
    // operator falls back to HHLA, the model's reference operator, and that
    // fallback is always visible, never silent (spec 4.4.2).
    if (rule.applicable_conditions.terminal_operator) {
      const required = Array.isArray(rule.applicable_conditions.terminal_operator)
        ? rule.applicable_conditions.terminal_operator
        : [rule.applicable_conditions.terminal_operator];
      const known = ['HHLA', 'Eurogate'];
      const entered = call.terminal_operator;
      const op = entered && known.includes(entered) ? entered : 'HHLA';
      if (!required.includes(op)) {
        return null;
      }
      if (entered !== op || !entered) {
        qualityFlags.push({
          type: 'fallback_value',
          description: entered
            ? `Terminal operator "${entered}" not recognized; defaulted to HHLA (the reference operator for the Hamburg model — spec v0.2.49 terminal scope)`
            : 'Terminal operator not selected; defaulted to HHLA (the reference operator for the Hamburg model — spec v0.2.49 terminal scope)',
          severity: 'info'
        });
      }
    }
    
    // ISSC status (spec 4.4.2 least-favourable rule; SOLAS XI-2/ISPS): a
    // blank (undefined) status is "not entered", and the least favourable
    // value applies — the doubled no-ISSC security fee — with a visible
    // fallback flag, never silently. An explicit false is the user's own
    // attestation and carries the SOLAS XI-2/ISPS consequence sentence
    // instead of a fallback flag (the user stated the absence; nothing was
    // assumed). An explicit valid certificate carries no flag at all.
    if (rule.applicable_conditions.issc_valid !== undefined) {
      const entered = call.issc_valid;
      // Blank (not entered) resolves to the least favourable value — no
      // valid ISSC — so the doubled rule fires and the single-rate rule
      // does not (spec 4.4.2).
      const effective = entered === undefined ? false : entered;
      if (entered === undefined && rule.applicable_conditions.issc_valid === false) {
        qualityFlags.push({
          type: 'fallback_value',
          description: 'ISSC status not entered; priced without a valid ISSC — the doubled security fee, the least favourable value (spec 4.4.2). A valid International Ship Security Certificate halves this fee back to the single rate',
          severity: 'info'
        });
      }
      if (entered === false && rule.applicable_conditions.issc_valid === false) {
        qualityFlags.push({
          type: 'fallback_value',
          description: "No valid ISSC attested; the security fee is doubled per the tariff's ISPS condition (SOLAS XI-2/ISPS Code — vessels without a valid International Ship Security Certificate are charged double)",
          severity: 'info'
        });
      }
      if (effective !== rule.applicable_conditions.issc_valid) {
        return null;
      }
    }
    
    // Generic conditions: any other key must match the call input exactly
    // (e.g. hpa_berth_usage: true, berth_type: 'quay'). flag_state is
    // deliberately absent from the handled set: no 2026 tariff prices a rule
    // on the flag (the Gothenburg waste rules' split dimension is the arrival
    // origin, spec v0.2.50), so a data rule carrying the retired condition
    // must reach the warning branch below and be ignored visibly, never pass
    // through the generic matcher (the v0.2.50 contract text promised a
    // reachable warning; making it reachable is the v0.2.53 repair).
    const handled = new Set(['arrival_origin', 'ops_usage', 'esi_score', 'csi_class', 'fuel_percentage', 'nt_class', 'vessel_type', 'ordering_lead_time_band', 'terminal_operator', 'issc_valid']);
    for (const [key, value] of Object.entries(rule.applicable_conditions)) {
      if (handled.has(key)) continue;
      if (key === 'flag_state') {
        qualityFlags.push({
          type: 'fallback_value',
          description: `Rule "${rule.id}" still carries a retired flag_state condition; flag-based gating was removed in spec v0.2.50 (the waste-dues dimension is the arrival origin) and the condition is ignored`,
          severity: 'warning'
        });
        continue;
      }
      const callValue = (call as any)[key];
      if (value === true) {
        if (callValue !== true) return null;
      } else if (value === false) {
        if (callValue === true) return null;
      } else if (Array.isArray(value)) {
        if (!value.includes(callValue)) return null;
      } else if (value === 'present') {
        // Presence gate: a numeric call input must be supplied and positive
        // (e.g. fresh water m3 with a per-supply minimum).
        if (typeof callValue !== 'number' || callValue <= 0) return null;
      } else if (callValue !== value) {
        return null;
      }
    }
  }
  
  // Estimated-parameter flag: always carried on the result line (spec: never
  // rendered as verified data)
  if (rule.estimated_parameter) {
    qualityFlags.push({
      type: 'estimated_parameter',
      description: rule.estimated_parameter.description,
      severity: rule.estimated_parameter.severity ?? 'info'
    });
  }
  // Contract-vs-published caveat (spec v0.2.4): the published list price may
  // differ from shipping-line contract rates; carried as a visible flag.
  if (rule.contract_vs_published) {
    qualityFlags.push({
      type: 'contract_vs_published',
      description: rule.contract_vs_published.description,
      severity: rule.contract_vs_published.severity ?? 'warning'
    });
  }
  
  // Get the value for the basis
  const getBasisValue = (basis: string): number | undefined => {
    switch (basis) {
      case 'gt': return vessel.gt;
      case 'nt': 
        if (vessel.nt !== undefined) return vessel.nt;
        // Fallback: estimate NT from GT with conservative factor
        qualityFlags.push({
          type: 'estimated_nt',
          description: `Net Tonnage estimated as 0.55 * GT (${vessel.gt})`,
          severity: 'warning'
        });
        vessel.nt = vessel.gt * 0.55;
        return vessel.nt;
      case 'loa': return vessel.loa_m;
      case 'draft': return vessel.draft_m;
      case 'teu': return vessel.teu_capacity;
      default: {
        // Call-input bases (e.g. lay_time_hours, storage days)
        const v = (call as any)[basis];
        return typeof v === 'number' ? v : undefined;
      }
    }
  };
  
  // Resolve engine Tier (spec v0.2.29 default-call contract, amended
  // v0.2.44). Tier is a classification the tariff always applies — there is
  // no "no Tier" state. Explicit entry always wins. When no tier is entered
  // and a build year is present, the tier is inferred from the build year
  // per MARPOL Annex VI Regulation 13 construction dates (1 Jan 2000 →
  // Tier I, 1 Jan 2011 → Tier II, 1 Jan 2016 → Tier III; pre-2000/unknown
  // → Tier 0), with a named assumed-parameter flag telling the user to verify
  // against the IAPP certificate. A blank build year keeps the v0.2.28
  // worst-case Tier 0 default with its existing flag — the worst-case
  // contract stands for truly unknown vessels.
  const resolveEngineTier = (): { tier: string; estimated: boolean } => {
    if (call.engine_tier) return { tier: call.engine_tier, estimated: !!call.engine_tier_estimated };
    if (vessel.built_year !== undefined) {
      const inferred = inferEngineTier(vessel.built_year);
      qualityFlags.push({
        type: 'assumed_parameter',
        parameter: 'engine_tier',
        description: `engine tier inferred from build year — verify against IAPP certificate (NOx Tier "${inferred}" from build year ${vessel.built_year}; Regulation 13 construction dates)`,
        severity: 'info'
      });
      return { tier: inferred, estimated: true };
    }
    qualityFlags.push({
      type: 'assumed_parameter',
      parameter: 'engine_tier',
      description: 'NOx Tier not entered; worst case (Tier 0) applied; enter the certified IAPP tier to override',
      severity: 'info'
    });
    return { tier: 'Tier 0', estimated: true };
  };
  
  // Calculate base amount based on rate structure
  let baseAmount = 0;
  let rateApplied = '';
  let bandOrBasis = '';
  let pendingComponents: { label: string; amount: number }[] | undefined = undefined;
  let pendingBandRows: BandRow[] | undefined = undefined;
  // Derivation transparency (spec v0.2.42): presentation-only record of the
  // computation steps, built alongside the arithmetic it describes. Never
  // feeds back into any amount.
  let pendingStructureLabel = 'Flat rate';
  let pendingBandSteps: DerivationStep[] | undefined = undefined;
  let pendingCompositionSteps: DerivationStep[] | undefined = undefined;
  let pendingAdjustmentSteps: DerivationStep[] | undefined = undefined;
  // Per-unit context for excess-units reductions (spec v0.2.37): the unit
  // count and unit rate behind the base amount, so an adjustment can
  // discount only the units beyond a threshold (SJÖFS 2025:5 §25).
  let ruleUnitCount: number | undefined = undefined;
  let ruleUnitRate: number | undefined = undefined;
  
  const rate = rule.rate_structure;
  
  switch (rate.type) {
    case 'flat': {
      const flat = rate as FlatRate;
      baseAmount = flat.amount;
      rateApplied = `Flat rate: ${baseAmount}`;
      if (flat.amount_input) {
        const override = (call as any)[flat.amount_input];
        if (typeof override === 'number' && override >= 0) {
          baseAmount = override;
          rateApplied = `Flat rate: ${baseAmount} (input override: ${flat.amount_input}=${override})`;
        } else {
          qualityFlags.push({
            type: 'estimated_parameter',
            description: rule.estimated_parameter?.description ?? `Amount defaults to ${baseAmount} (no user value in ${flat.amount_input})`,
            severity: rule.estimated_parameter?.severity ?? 'warning'
          });
        }
      }
      bandOrBasis = 'flat';
      break;
    }
      
    case 'banded': {
      const banded = rate as BandedRate;
      const basisValue = getBasisValue(banded.basis);
      if (basisValue === undefined) {
        qualityFlags.push({
          type: 'missing_optional_param',
          description: `Missing basis value for ${banded.basis}`,
          severity: 'warning'
        });
        return null;
      }
      
      // Find the applicable band
      const applicableBand = banded.bands.find(band => {
        const minOk = band.min === null || basisValue >= band.min;
        const maxOk = band.max === null || basisValue <= band.max;
        return minOk && maxOk;
      });
      
      if (!applicableBand) {
        qualityFlags.push({
          type: 'fallback_value',
          description: `No band found for ${banded.basis}=${basisValue}, using highest band`,
          severity: 'warning'
        });
        // Use the last band (highest)
        const lastBand = banded.bands[banded.bands.length - 1];
        baseAmount = lastBand.rate * basisValue;
        rateApplied = `Banded rate: ${lastBand.rate} * ${basisValue}`;
        bandOrBasis = lastBand.min === 0 && lastBand.max === null ? `per ${banded.basis}` : `Band: ${lastBand.min ?? 0}-${lastBand.max ?? '\u221e'}`;
      } else {
        baseAmount = applicableBand.rate * basisValue;
        rateApplied = `Banded rate: ${applicableBand.rate} * ${basisValue}`;
        bandOrBasis = applicableBand.min === 0 && applicableBand.max === null ? `per ${banded.basis}` : `Band: ${applicableBand.min ?? 0}-${applicableBand.max ?? '\u221e'}`;
      }
      break;
    }
    
    case 'progressive': {
      const progressive = rate as ProgressiveRate;
      const basisValue = getBasisValue(progressive.basis);
      if (basisValue === undefined) {
        qualityFlags.push({
          type: 'missing_optional_param',
          description: `Missing basis value for ${progressive.basis}`,
          severity: 'warning'
        });
        return null;
      }
      
      // Progressive: split across bands
      let accumulatedAmount = 0;
      const appliedBands: string[] = [];
      const bandRows: BandRow[] = [];
      
      // Sort bands by min to handle out-of-order definitions
      const sortedBands = [...progressive.bands].sort((a, b) => (a.min ?? 0) - (b.min ?? 0));
      
      for (const band of sortedBands) {
        const bandMin = band.min ?? 0;
        const bandMax = band.max ?? Infinity;
        
        // Calculate how much of the basisValue falls in this band
        // The band covers [bandMin, bandMax), so the portion is:
        // max(0, min(basisValue, bandMax) - bandMin)
        const valueInBand = Math.max(0, Math.min(basisValue, bandMax) - bandMin);
        if (valueInBand > 0) {
          const bandAmount = valueInBand * band.rate;
          accumulatedAmount += bandAmount;
          appliedBands.push(`${bandMin}-${bandMax === Infinity ? '\u221e' : bandMax}: ${valueInBand} * ${band.rate}`);
          bandRows.push({
            label: `${progressive.basis} ${bandMin.toLocaleString('en-US')}\u2013${bandMax === Infinity ? '\u221e' : bandMax.toLocaleString('en-US')}`,
            quantity: valueInBand,
            components: [{ label: 'Rate', rate: band.rate, amount: roundToCent(bandAmount) }],
            amount: roundToCent(bandAmount)
          });
        }
      }
      baseAmount = accumulatedAmount;
      rateApplied = `Progressive: ${appliedBands.join(' + ')}`;
      bandOrBasis = `${progressive.basis}=${basisValue}`;
      pendingBandRows = bandRows;
      pendingStructureLabel = `Progressive by ${progressive.basis.toUpperCase()}`;
      pendingBandSteps = [{
        kind: 'bands',
        label: 'Bands charged',
        detail: appliedBands.join(' + '),
        bands: bandRows,
        amount: roundToCent(accumulatedAmount)
      }];
      break;
    }
    
    case 'per_commenced_day': {
      const perDay = rate as PerCommencedDayRate;
      let days: number | undefined;
      
      // Check if basis is a vessel property - this means we need days from a different source
      const vesselProps = ['gt', 'nt', 'loa_m', 'beam_m', 'draft_m'];
      if (vesselProps.includes(perDay.basis)) {
        // For vessel-based per_commenced_day, get days from lay_up_days
        days = call.lay_up_days;
      } else {
        days = call[perDay.basis as keyof typeof call] as number | undefined;
      }
      
      if (days === undefined) {
        qualityFlags.push({
          type: 'missing_optional_param',
          description: `Missing days value for ${perDay.basis}`,
          severity: 'warning'
        });
        return null;
      }
      
      // "Commenced day" means each day or part thereof counts as a full day
      // So 1 day = 1, 1.5 days = 2, etc.
      const commencedDays = Math.ceil(days);
      let freeDays = perDay.free_days ?? 0;
      const chargeableDays = Math.max(0, commencedDays - freeDays);
      
      // Per-unit-per-day pricing (spec v0.2.33): when the rule declares a
      // unit_input, the amount is days x rate x units. A blank unit input is
      // "not entered" and charges zero (clean-baseline principle: the default
      // call never manufactures special-cargo counts); a user-entered zero is
      // a value and also charges zero.
      const unitCountFromInput = perDay.unit_input
        ? (call as any)[perDay.unit_input]
        : undefined;
      const perDayUnits = typeof unitCountFromInput === 'number' && unitCountFromInput > 0
        ? unitCountFromInput
        : 0;
      
      // For vessel-based per_commenced_day, multiply by the vessel property
      if (vesselProps.includes(perDay.basis)) {
        const vesselValue = (vessel as any)[perDay.basis as keyof typeof vessel] as number | undefined;
        if (vesselValue !== undefined) {
          baseAmount = chargeableDays * perDay.daily_rate * vesselValue;
          rateApplied = `Per commenced day: ${chargeableDays} * ${perDay.daily_rate} * ${vesselValue} (${perDay.basis})`;
          bandOrBasis = `${perDay.basis}=${vesselValue}, days=${days} (${chargeableDays} chargeable)`;
        } else {
          baseAmount = chargeableDays * perDay.daily_rate;
          rateApplied = `Per commenced day: ${chargeableDays} * ${perDay.daily_rate}`;
          bandOrBasis = `${perDay.basis}=N/A, days=${days} (${chargeableDays} chargeable)`;
        }
      } else if (perDay.unit_input) {
        baseAmount = chargeableDays * perDay.daily_rate * perDayUnits;
        rateApplied = `Per commenced day: ${chargeableDays} days * ${perDay.daily_rate} * ${perDayUnits} units`;
        bandOrBasis = `${perDay.basis}=${days} (${chargeableDays} chargeable), ${perDay.unit_input}=${perDayUnits}`;
      } else {
        baseAmount = chargeableDays * perDay.daily_rate;
        rateApplied = `Per commenced day: ${chargeableDays} * ${perDay.daily_rate}`;
        bandOrBasis = `${perDay.basis}=${days} (${chargeableDays} chargeable)`;
      }
      break;
    }
    
    case 'per_unit': {
      const perUnit = rate as PerUnitRate;
      let unitCount = 0;
      
      switch (perUnit.unit_type) {
        case 'container_le20ft':
          unitCount = call.containers_loaded_le20ft + call.containers_discharged_le20ft;
          break;
        case 'container_gt20ft':
          unitCount = call.containers_loaded_gt20ft + call.containers_discharged_gt20ft;
          break;
        case 'container_total':
          unitCount = call.containers_loaded_le20ft + call.containers_loaded_gt20ft + 
                     call.containers_discharged_le20ft + call.containers_discharged_gt20ft;
          break;
        case 'move':
          unitCount = call.containers_loaded_le20ft + call.containers_loaded_gt20ft + 
                     call.containers_discharged_le20ft + call.containers_discharged_gt20ft;
          break;
        case 'teu':
          unitCount = (call.containers_loaded_le20ft + call.containers_discharged_le20ft) * 1 +
                     (call.containers_loaded_gt20ft + call.containers_discharged_gt20ft) * 2;
          break;
        case 'reefer':
          unitCount = call.reefer_units ?? 0;
          break;
        case 'oog':
          unitCount = call.oog_units ?? 0;
          break;
        case 'dangerous_goods':
          unitCount = call.dangerous_goods_units ?? 0;
          break;
        case 'gt':
          unitCount = vessel.gt;
          break;
        case 'nt':
          unitCount = vessel.nt !== undefined ? vessel.nt : vessel.gt * 0.55;
          break;
        case 'loa_m':
          unitCount = vessel.loa_m ?? 0;
          break;
        case 'hatch_cover_count':
          unitCount = call.hatch_cover_count ?? 0;
          break;
        case 'gearbox_count':
          unitCount = call.gearbox_count ?? 0;
          break;
        case 'draft_m':
          unitCount = vessel.draft_m ?? 0;
          break;
        case 'beam_m':
          unitCount = vessel.beam_m ?? 0;
          break;
        case 'pilotage_half_hour':
          unitCount = typeof call.pilotage_hours === 'number' && call.pilotage_hours > 0
            ? Math.ceil(call.pilotage_hours * 2)
            : 0;
          break;
        case 'tug_count':
          unitCount = call.tug_count ?? 0;
          break;
        default:
          // Try to get from call directly
          unitCount = (call as any)[perUnit.unit_type] ?? 0;
      }
      
      // Explicit count input overrides the derived unit-type count (e.g.
      // Helsingborg ancillaries with dedicated unit-count fields).
      if (perUnit.count_input) {
        const explicit = (call as any)[perUnit.count_input];
        if (typeof explicit === 'number') {
          unitCount = explicit;
        }
      }
      
      // LOA-class default for the count itself (spec 3.3: tug/pilotage-hour
      // suggestions are data, user-overridable). Applied only when the user
      // supplied no count; raised as a flagged estimate, never verified data.
      if (perUnit.default_by_loa && vessel.loa_m !== undefined) {
        const userCount = (call as any)[perUnit.unit_type] ?? (perUnit.count_input ? (call as any)[perUnit.count_input] : undefined);
        if (typeof userCount !== 'number') {
          const loa = vessel.loa_m;
          const band = perUnit.default_by_loa.bands.find(b =>
            (b.min_m === undefined || loa >= b.min_m) &&
            (b.max_m === undefined || loa < b.max_m)
          );
          if (band) {
            unitCount = band.count;
            qualityFlags.push({
              type: 'assumed_parameter',
              parameter: perUnit.unit_type,
              description: `Tug requirement not entered; port default of ${band.count} tugs applied; enter the actual requirement to override`,
              severity: 'info'
            });
          }
        }
      }
      
      

      let effectiveRate = perUnit.unit_rate;
      rateApplied = '';
      if (perUnit.unit_rate_input) {
        const override = (call as any)[perUnit.unit_rate_input];
        if (typeof override === 'number' && override >= 0) {
          effectiveRate = override;
          rateApplied = `Per unit: ${unitCount} * ${effectiveRate} (input override: ${perUnit.unit_rate_input}=${override})`;
        } else {
          qualityFlags.push({
            type: 'estimated_parameter',
            description: rule.estimated_parameter?.description ?? `Rate defaults to ${perUnit.unit_rate} (no user value in ${perUnit.unit_rate_input})`,
            severity: rule.estimated_parameter?.severity ?? 'warning'
          });
        }
      }
      baseAmount = unitCount * effectiveRate;
      rateApplied += `Per unit: ${unitCount} * ${effectiveRate}`;
      bandOrBasis = `${perUnit.unit_type}=${unitCount}`;
      ruleUnitCount = unitCount;
      ruleUnitRate = effectiveRate;
      break;
    }
    
    case 'banded_by_time': {
      const bandedTime = rate as BandedByTimeRate;
      const days = call[bandedTime.basis as keyof typeof call] as number | undefined;
      
      if (days === undefined) {
        qualityFlags.push({
          type: 'missing_optional_param',
          description: `Missing days value for ${bandedTime.basis}`,
          severity: 'warning'
        });
        return null;
      }
      
      // Ladder semantics (spec v0.2.33): a storage day count is a cumulative
      // timeline, and each day charges exactly once, at the first band whose
      // [min_days, max_days] interval covers that day number. Days below the
      // first band's minimum are free time and charge zero — never the full
      // day count at a band rate. This handles both data shapes: the single
      // ladder rule (free time encoded as a zero-rate band from day 0) and
      // split single-band rules (free time implicit below the minimum; the
      // rule charges only the day numbers its own band covers, so a count
      // spanning several split rules bills each rule for its portion).
      const sortedTimeBands = [...bandedTime.bands]
        .sort((a, b) => a.min_days - b.min_days);
      const firstMin = sortedTimeBands[0].min_days;
      const commenced = Math.ceil(days);
      let bandedAccum = 0;
      const bandedParts: { label: string; days: number; rate: number }[] = [];
      for (let dayNo = Math.max(1, firstMin); dayNo <= commenced; dayNo++) {
        const band = sortedTimeBands.find(b => dayNo >= b.min_days && (b.max_days === null || dayNo <= b.max_days));
        if (!band) continue;
        bandedAccum += band.daily_rate;
        const label = `${band.min_days}-${band.max_days ?? '\u221e'}`;
        const existing = bandedParts.find(p => p.label === label);
        if (existing) existing.days += 1; else bandedParts.push({ label, days: 1, rate: band.daily_rate });
      }
      baseAmount = roundToCent(bandedAccum);
      const chargeableDays = bandedParts.reduce((s, p) => s + p.days, 0);
      // Derivation transparency (spec v0.2.42): the ladder's band rows — one
      // row per time band that actually fired, days charged in that band.
      const ladderBandRows: BandRow[] = bandedParts.map(p => ({
        label: `Days ${p.label}`,
        quantity: p.days,
        components: [{ label: 'Daily rate', rate: p.rate, amount: roundToCent(p.days * p.rate) }],
        amount: roundToCent(p.days * p.rate)
      }));
      pendingStructureLabel = 'Storage day ladder';
      if (chargeableDays > 0) {
        rateApplied = `Banded by time: ${bandedParts.map(p => `${p.days} * ${p.rate} (days ${p.label})`).join(' + ')}`;
        pendingBandSteps = [{
          kind: 'bands',
          label: 'Days charged per band',
          detail: `free through day ${Math.max(0, firstMin - 1)}, ${chargeableDays} chargeable`,
          bands: ladderBandRows,
          amount: roundToCent(bandedAccum)
        }];
      } else {
        rateApplied = `Banded by time: 0 chargeable days (free time, first band starts at day ${firstMin})`;
        pendingBandSteps = [{
          kind: 'bands',
          label: 'Days charged per band',
          detail: `free time, first band starts at day ${firstMin}`,
          bands: [],
          amount: 0
        }];
      }
      bandOrBasis = `Days: ${days} (free through day ${Math.max(0, firstMin - 1)}, ${chargeableDays} chargeable)`;
      break;
    }
    
    case 'banded_flat': {
      const bf = rate as BandedFlatRate;
      const basisValue = getBasisValue(bf.basis);
      if (basisValue === undefined) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing basis value for ${bf.basis}`, severity: 'warning' });
        return null;
      }
      // Half-open bands: lower exclusive, upper inclusive
      const applicableBand = bf.bands.find(band => {
        const minOk = band.min === null || basisValue > band.min;
        const maxOk = band.max === null || basisValue <= band.max;
        return minOk && maxOk;
      });
      if (!applicableBand) {
        qualityFlags.push({ type: 'fallback_value', description: `No band found for ${bf.basis}=${basisValue}`, severity: 'warning' });
        return null;
      }
      if (applicableBand.amount !== undefined) {
        baseAmount = applicableBand.amount;
        rateApplied = `Banded flat: ${applicableBand.amount} (band ${applicableBand.min ?? '-\u221e'}-${applicableBand.max ?? '\u221e'})`;
      } else {
        const effBasis = applicableBand.cap_at_max ? Math.min(basisValue, applicableBand.max ?? basisValue) : basisValue;
        baseAmount = applicableBand.rate! * effBasis;
        rateApplied = `Banded flat: ${applicableBand.rate} * ${effBasis} (band ${applicableBand.min ?? '-\u221e'}-${applicableBand.max ?? '\u221e'})`;
      }
      bandOrBasis = `${bf.basis}=${basisValue}`;
      
      if (bf.linear_extension && basisValue > bf.linear_extension.from_basis) {
        const extraUnits = Math.ceil((basisValue - bf.linear_extension.from_basis) / bf.linear_extension.per_basis_units);
        const extensionAmount = extraUnits * bf.linear_extension.amount;
        baseAmount += extensionAmount;
        rateApplied += ` + extension ${extraUnits} * ${bf.linear_extension.amount}`;
      }
      break;
    }
    
    case 'composite_tranche': {
      const ct = rate as CompositeTrancheRate;
      const gtRaw = getBasisValue(ct.basis);
      if (gtRaw === undefined) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing basis value for ${ct.basis}`, severity: 'warning' });
        return null;
      }
      const gtCap = ct.gt_cap ?? Infinity;
      const gt = Math.min(gtRaw, gtCap);
      
      // Dual chains per component: "disp" rounds at each step (tranche sums,
      // surcharges half-up, discount amounts rounded up) - the invoice display;
      // "full" never rounds mid-stack - the authority's multi-decimal internal
      // computation. Components display the disp chain; the fee total is the
      // greater of the two sums, so the total is never less than the sum of its
      // printed components (reproduces S1's printed figures, incl. the CP1
      // one-cent hidden-decimals artifact, and the per-step CP2-CP5 figures).
      const compIds: string[] = [];
      for (const tranche of ct.tranches) {
        for (const id of Object.keys(tranche.components)) {
          if (!compIds.includes(id)) compIds.push(id);
        }
      }
      const disp: Record<string, number> = {};
      const full: Record<string, number> = {};
      for (const id of compIds) { disp[id] = 0; full[id] = 0; }
      const ctBandRows: BandRow[] = [];
      for (const tranche of ct.tranches) {
        const trancheMin = tranche.min ?? 0;
        const trancheMax = tranche.max ?? Infinity;
        const valueInTranche = Math.max(0, Math.min(gt, trancheMax) - trancheMin);
        if (valueInTranche <= 0) continue;
        const trancheComponents: { label: string; rate: number; amount: number }[] = [];
        for (const id of compIds) {
          if (tranche.components[id] === undefined) continue;
          full[id] += valueInTranche * tranche.components[id];
          const compAmt = roundToCent(valueInTranche * tranche.components[id]);
          disp[id] += compAmt;
          trancheComponents.push({
            label: ct.component_labels?.[id] ?? id,
            rate: tranche.components[id],
            amount: compAmt
          });
        }
        if (trancheComponents.length > 0) {
          ctBandRows.push({
            label: `${ct.basis} ${trancheMin.toLocaleString('en-US')}\u2013${trancheMax === Infinity ? '\u221e' : trancheMax.toLocaleString('en-US')}`,
            quantity: valueInTranche,
            components: trancheComponents,
            amount: trancheComponents.reduce((sum, c) => sum + c.amount, 0)
          });
        }
      }
      
      const componentAmounts: { label: string; amount: number }[] = [];
      const stackDescriptions: string[] = [];
      // Derivation transparency (spec v0.2.42): per-component adjustment
      // steps in the tariff's stated order, each with the delta it produced.
      const compLabel = (id: string) => ct.component_labels?.[id] ?? id;
      const derivationComponents: DerivationStep[] = [];
      const derivationAdjustments: DerivationStep[] = [];
      for (const compId of compIds) {
        const stack = ct.component_adjustments?.[compId] ?? [];
        derivationComponents.push({
          kind: 'components',
          label: compLabel(compId),
          detail: 'band sum before adjustments',
          amount: roundToCent(disp[compId])
        });
        for (const adj of stack) {
          if (adj.condition_input && !(call as any)[adj.condition_input]) continue;
          const beforeAdj = disp[compId];
          switch (adj.kind) {
            case 'tier_pct': {
              const { tier, estimated } = resolveEngineTier();
              const pct = adj.map?.[tier];
              if (pct === undefined) {
                qualityFlags.push({ type: 'missing_optional_param', description: `No Tier mapping for "${tier}"; adjustment not applied (least favourable value assumed)`, severity: 'warning' });
                break;
              }
              if (pct >= 0) {
                disp[compId] = roundToCent(disp[compId] * (1 + pct / 100));
                full[compId] = full[compId] * (1 + pct / 100);
              } else {
                const frac = -pct / 100;
                disp[compId] = roundToCent(disp[compId] - ceilToCent(disp[compId] * frac));
                full[compId] = full[compId] * (1 - frac);
              }
              stackDescriptions.push(`${compId}: ${tier} ${pct >= 0 ? '+' : ''}${pct}%${estimated ? ' (estimated)' : ''}`);
              derivationAdjustments.push({
                kind: 'adjustment',
                label: `${compLabel(compId)} — Tier adjustment`,
                detail: `${tier} ${pct >= 0 ? '+' : ''}${pct}%${estimated ? ' (estimated)' : ''}`,
                amount: roundToCent(disp[compId] - beforeAdj)
              });
              break;
            }
            case 'score_discount_pct_with_cap': {
              const score = (call as any)[adj.input ?? 'esi_score'];
              if (typeof score !== 'number') break; // least favourable: no discount
              const band = (adj.bands ?? []).find(b => score >= b.min && (b.max === null || score < b.max));
              if (!band) break;
              const dFull = Math.min(full[compId] * band.pct / 100, band.cap ?? Infinity);
              const dDisp = Math.min(disp[compId] * band.pct / 100, band.cap ?? Infinity);
              disp[compId] = roundToCent(disp[compId] - ceilToCent(dDisp));
              full[compId] -= dFull;
              stackDescriptions.push(`${compId}: ${adj.description ?? adj.input} ${score} -${band.pct}% (cap ${band.cap ?? '\u221e'})`);
              derivationAdjustments.push({
                kind: 'adjustment',
                label: `${compLabel(compId)} — ${adj.description ?? adj.input}`,
                detail: `score ${score}: -${band.pct}% (cap ${band.cap ?? '\u221e'})`,
                amount: roundToCent(disp[compId] - beforeAdj)
              });
              break;
            }
            case 'per_gt_rebate': {
              const rebate = gt * (adj.rate_per_gt ?? 0);
              disp[compId] = roundToCent(disp[compId] - ceilToCent(rebate));
              full[compId] -= rebate;
              stackDescriptions.push(`${compId}: ${adj.description ?? 'rebate'} ${gt} * ${adj.rate_per_gt}`);
              derivationAdjustments.push({
                kind: 'adjustment',
                label: `${compLabel(compId)} — ${adj.description ?? 'rebate'}`,
                detail: `${gt} × ${adj.rate_per_gt} per ${ct.basis}`,
                amount: roundToCent(disp[compId] - beforeAdj)
              });
              break;
            }
            case 'pct_discount_banded': {
              const prior = (call as any)[adj.input ?? 'quantum_prior_year_gt'];
              if (typeof prior !== 'number' || prior <= 0) break;
              const band = (adj.bands ?? []).find(b => prior > b.min && (b.max === null || prior <= b.max));
              if (!band) break;
              disp[compId] = roundToCent(disp[compId] - ceilToCent(disp[compId] * band.pct / 100));
              full[compId] = full[compId] * (1 - band.pct / 100);
              stackDescriptions.push(`${compId}: ${adj.description ?? 'discount'} ${prior} -${band.pct}%`);
              derivationAdjustments.push({
                kind: 'adjustment',
                label: `${compLabel(compId)} — ${adj.description ?? 'discount'}`,
                detail: `${prior} prior-year GT: -${band.pct}%`,
                amount: roundToCent(disp[compId] - beforeAdj)
              });
              break;
            }
          }
        }
        componentAmounts.push({ label: ct.component_labels?.[compId] ?? compId, amount: roundToCent(disp[compId]) });
      }
      
      const totalDisp = componentAmounts.reduce((s, c) => s + c.amount, 0);
      const totalFull = compIds.reduce((s, id) => s + full[id], 0);
      baseAmount = roundToCent(Math.max(totalFull, totalDisp));
      rateApplied = `Composite tranches${gtRaw > gtCap ? ` (GT capped at ${gtCap})` : ''}: ${stackDescriptions.length ? stackDescriptions.join('; ') : 'no adjustments'}`;
      bandOrBasis = `${ct.basis}=${gtRaw}`;
      pendingComponents = componentAmounts;
      pendingBandRows = ctBandRows;
      pendingStructureLabel = `Composite tranches by ${ct.basis.toUpperCase()}`;
      pendingBandSteps = [{
        kind: 'bands',
        label: 'Tranche bands charged',
        detail: gtRaw > gtCap ? `basis capped at ${gtCap.toLocaleString('en-US')}` : undefined,
        bands: ctBandRows,
        amount: roundToCent(ctBandRows.reduce((s, r) => s + r.amount, 0))
      }];
      pendingCompositionSteps = [
        ...derivationComponents,
        ...derivationAdjustments,
        {
          kind: 'composition',
          label: 'Components after adjustments',
          components: componentAmounts,
          amount: roundToCent(totalDisp)
        }
      ];
      break;
    }
    
    case 'tiered_per_period': {
      const tp = rate as TieredPerPeriodRate;
      const basisValue = getBasisValue(tp.basis);
      if (basisValue === undefined) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing basis value for ${tp.basis}`, severity: 'warning' });
        return null;
      }
      let hours = (call as any)[tp.hours_input] as number | undefined;
      if (typeof hours !== 'number' || hours < 0) {
        if (tp.default_hours !== undefined) {
          hours = tp.default_hours;
          qualityFlags.push({ type: 'fallback_value', description: `Missing ${tp.hours_input}; defaulted to ${hours} h`, severity: 'warning' });
        } else {
          qualityFlags.push({ type: 'missing_optional_param', description: `Missing value for ${tp.hours_input}`, severity: 'warning' });
          return null;
        }
      }
      if (hours <= 0) return null;
      let ratePerBasis = tp.initial_tier.rate_per_basis;
      let extraDesc = '';
      // Two-clock tier display (spec v0.2.46): each tier is exposed as its
      // own labeled step — the initial tier covering the first N hours at
      // its rate, the subsequent tier per commenced period thereafter —
      // plus a composition step naming both components. Presentation-only:
      // the amounts are the same arithmetic already performed.
      const initialAmount = roundToCent(basisValue * tp.initial_tier.rate_per_basis);
      const tierCitation = `${rule.source_reference.document_name} ${rule.source_reference.clause ? `\u00a7${rule.source_reference.clause}` : ''}`.trim();
      const tierSteps: DerivationStep[] = [{
        kind: 'components',
        label: 'Initial tier',
        detail: `First ${tp.initial_tier.hours} hours of lay time — ${tp.initial_tier.rate_per_basis} ${currency}/GT (${tierCitation})`,
        amount: initialAmount
      }];
      let subsequentAmount = 0;
      let subsequentDesc = '';
      if (tp.subsequent_tier && hours > tp.initial_tier.hours) {
        const extraPeriods = Math.ceil((hours - tp.initial_tier.hours) / tp.subsequent_tier.period_hours);
        ratePerBasis += extraPeriods * tp.subsequent_tier.rate_per_basis;
        extraDesc = ` + ${extraPeriods} * ${tp.subsequent_tier.rate_per_basis}`;
        subsequentAmount = roundToCent(basisValue * extraPeriods * tp.subsequent_tier.rate_per_basis);
        subsequentDesc = `per commenced ${tp.subsequent_tier.period_hours} hours thereafter — ${tp.subsequent_tier.rate_per_basis} ${currency}/GT: ${hours - tp.initial_tier.hours} h beyond in ${extraPeriods} commenced period${extraPeriods === 1 ? '' : 's'} (${tierCitation})`;
        tierSteps.push({
          kind: 'components',
          label: 'Subsequent tier',
          detail: subsequentDesc,
          amount: subsequentAmount
        });
      }
      baseAmount = roundToCent(basisValue * ratePerBasis);
      rateApplied = `Tiered per period: ${basisValue} * ${ratePerBasis} (${hours} h: ${tp.initial_tier.rate_per_basis}${extraDesc})`;
      bandOrBasis = `${tp.basis}=${basisValue}, ${hours} h`;
      pendingStructureLabel = 'Tiered per period';
      pendingCompositionSteps = [
        ...tierSteps,
        {
          kind: 'composition',
          label: 'Components after tiers',
          components: [
            { label: `First ${tp.initial_tier.hours} h (${tp.initial_tier.rate_per_basis} ${currency}/GT)`, amount: initialAmount },
            ...(subsequentAmount > 0 ? [{ label: `per commenced ${tp.subsequent_tier!.period_hours} h thereafter (${tp.subsequent_tier!.rate_per_basis} ${currency}/GT)`, amount: subsequentAmount }] : [])
          ],
          amount: baseAmount
        }
      ];
      break;
    }
    
    case 'per_commenced_period': {
      const pp = rate as PerCommencedPeriodRate;
      const basisValue = getBasisValue(pp.basis);
      if (basisValue === undefined) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing basis value for ${pp.basis}`, severity: 'warning' });
        return null;
      }
      let hours = (call as any)[pp.hours_input] as number | undefined;
      if ((typeof hours !== 'number' || hours < 0) && pp.fallback_hours) {
        hours = (call as any)[pp.fallback_hours] as number | undefined;
      }
      if (typeof hours !== 'number' || hours < 0) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing value for ${pp.hours_input}`, severity: 'warning' });
        return null;
      }
      const excess = hours - pp.free_hours;
      if (excess <= 0) return null;
      // Tiers: first tier up to up_to_excess_hours, then next tier beyond.
      // Two-clock tier display (spec v0.2.46): each charged tier is exposed
      // as its own labeled derivation step — periods commenced, rate per
      // period per basis, amount — so a multi-tier demurrage reads as its
      // distinct charges. Presentation-only; the arithmetic is unchanged.
      let amount = 0;
      let remaining = excess;
      let prevBound = 0;
      const tierSteps: DerivationStep[] = [];
      for (const tier of pp.tiers) {
        const tierSpan = tier.up_to_excess_hours === null ? remaining : Math.max(0, Math.min(remaining, tier.up_to_excess_hours - prevBound));
        if (tierSpan > 0) {
          const periods = Math.ceil(tierSpan / pp.period_hours);
          const raw = periods * tier.rate_per_period_per_basis * basisValue;
          const perPeriodMin = pp.minimum_per_period;
          amount += perPeriodMin !== undefined ? Math.max(raw, periods * perPeriodMin) : raw;
          remaining -= tierSpan;
          const periodCitation = `${rule.source_reference.document_name} ${rule.source_reference.clause ? `\u00a7${rule.source_reference.clause}` : ''}`.trim();
          const basisLabel = pp.basis.toUpperCase();
          tierSteps.push({
            kind: 'components',
            label: tier.up_to_excess_hours === null ? 'Beyond' : `Excess up to ${tier.up_to_excess_hours} h`,
            detail: `${tier.rate_per_period_per_basis} ${currency}/${basisLabel} per commenced ${pp.period_hours} h — ${periods} period${periods === 1 ? '' : 's'} commenced (${periodCitation})`,
            amount: roundToCent(perPeriodMin !== undefined ? Math.max(raw, periods * perPeriodMin) : raw)
          });
          if (remaining <= 0) break;
          prevBound = tier.up_to_excess_hours ?? prevBound;
        }
      }
      baseAmount = roundToCent(amount);
      rateApplied = `Per commenced ${pp.period_hours} h: excess ${excess} h over ${pp.free_hours} h at ${pp.tiers.map(t => t.rate_per_period_per_basis).join('/')}`;
      bandOrBasis = `${pp.basis}=${basisValue}, excess ${excess} h`;
      pendingStructureLabel = 'Per commenced period';
      pendingCompositionSteps = [
        ...tierSteps,
        {
          kind: 'composition',
          label: 'Components after tiers',
          components: tierSteps.map(s => ({
            label: `${s.label} (${s.detail})`,
            amount: s.amount!
          })),
          amount: baseAmount
        }
      ];
      break;
    }
    
    case 'progressive_daily': {
      const pd = rate as ProgressiveDailyRate;
      const days = (call as any)[pd.days_input] as number | undefined;
      if (typeof days !== 'number' || days < 0) {
        qualityFlags.push({ type: 'missing_optional_param', description: `Missing value for ${pd.days_input}`, severity: 'warning' });
        return null;
      }
      const chargeable = days - pd.free_days;
      if (chargeable <= 0) return null;
      // Escalation: each day charged at the band covering that day number
      let amount = 0;
      const sortedBands = [...pd.bands].sort((a, b) => a.min_days - b.min_days);
      for (let d = 1; d <= chargeable; d++) {
        const band = sortedBands.find(b => d >= b.min_days && (b.max_days === null || d <= b.max_days));
        if (band) {
          const containers = getBasisValue(pd.container_count_input);
          amount += (containers ?? 0) * band.rate_per_container_per_day;
        }
      }
      // Fallback to banded flat if no band fits
      if (amount === 0 && chargeable > 0) {
        const containers = getBasisValue(pd.container_count_input);
        if (containers === undefined) {
          qualityFlags.push({ type: 'missing_optional_param', description: `Missing value for ${pd.container_count_input}`, severity: 'warning' });
          return null;
        }
      }
      baseAmount = roundToCent(amount);
      rateApplied = `Progressive daily: ${chargeable} chargeable days (free ${pd.free_days}) x containers`;
      bandOrBasis = `${pd.days_input}=${days}, ${pd.container_count_input}`;
      break;
    }
    
    case 'flat_by_input': {
      const fi = rate as FlatByInputRate;
      const raw = (call as any)[fi.input_field];
      let optionValue = typeof raw === 'string' && fi.options.some(o => o.value === raw) ? raw : undefined;
      if (!optionValue) {
        optionValue = fi.fallback_option;
        qualityFlags.push({ type: 'fallback_value', description: `Missing or unknown ${fi.input_field}; defaulted to "${optionValue}"`, severity: 'info' });
      }
      const option = fi.options.find(o => o.value === optionValue)!;
      const count = fi.count_field ? ((call as any)[fi.count_field] ?? 1) : 1;
      baseAmount = roundToCent(option.amount * count);
      rateApplied = `Flat by input: ${optionValue} = ${option.amount}${count > 1 ? ` x ${count}` : ''}`;
      bandOrBasis = `${fi.input_field}=${optionValue}`;
      break;
    }
    
    default:
      qualityFlags.push({
        type: 'fallback_value',
        description: `Unknown rate structure type: ${(rate as RateStructure).type}`,
        severity: 'error'
      });
      return null;
  }
  
  // Apply scale_by (e.g. pilotage segment percentage)
  if (rule.scale_by) {
    const pct = (call as any)[rule.scale_by.input_field];
    const effPct = typeof pct === 'number' && pct >= 0 ? pct : rule.scale_by.default_value;
    if (effPct !== 100) {
      baseAmount = roundToCent(baseAmount * effPct / 100);
      rateApplied += `; scaled ${effPct}% (${rule.scale_by.input_field})`;
    }
  }
  
  // Apply minimum if specified
  if (rule.minimum !== undefined && baseAmount < rule.minimum) {
    baseAmount = rule.minimum;
    rateApplied += ` (min applied: ${rule.minimum})`;
  }
  
  // Apply maximum if specified
  if (rule.maximum !== undefined && baseAmount > rule.maximum) {
    baseAmount = rule.maximum;
    rateApplied += ` (max applied: ${rule.maximum})`;
  }
  
  // Apply adjustments (discounts/surcharges)
  const adjustmentsApplied: Adjustment[] = [];
  let adjustedAmount = baseAmount;
  
  // Derivation transparency (spec v0.2.42): per-adjustment deltas recorded
  // where they are computed.
  const adjSteps: DerivationStep[] = [];
  if (rule.adjustments) {
    // Sort by stacking order if specified
    const sortedAdjustments = [...rule.adjustments].sort((a, b) => {
      const aOrder = a.stacking_order ?? 0;
      const bOrder = b.stacking_order ?? 0;
      return aOrder - bOrder;
    });
    
    // Additive adjustments (stack_method: additive) accumulate their
    // percentages off the pre-adjustment base (e.g. Helsingborg's two 10%
    // environmental discounts stack to 20%, not 19%); multiplicative
    // (default, the spec 4.4.1 fallback) adjustments apply to the running
    // result in stacking order.
    let additiveDiscountPct = 0;
    let additiveSurchargePct = 0;
    
    for (const adjustment of sortedAdjustments) {
      const beforeAdjStep = adjustedAmount;
      // Check if condition is met
      if (adjustment.condition) {
        // Simple condition evaluation
        // For now, we'll check against the input
        // This is a simplified approach - in production, use a proper expression evaluator
        const conditionMet = evaluateCondition(adjustment.condition, input);
        if (!conditionMet) continue;
      }
      
      // Flat per-GT amount (spec v0.2.50): a tariff-denominated SEK/GT
      // adjustment (Gothenburg waste-certificate discount, tariff §10)
      // prices as rate x basis GT — never a percentage of the line, so a
      // rate change on the base line cannot distort the discount.
      if (adjustment.amount_per_gt !== undefined && ruleUnitCount !== undefined && ruleUnitRate !== undefined) {
        // ruleUnitCount/ruleUnitRate carry the per-unit basis (GT for the
        // waste lines); amount = per-GT rate x GT, signed by type.
        const flatAmount = adjustment.amount_per_gt * ruleUnitCount;
        adjustedAmount += adjustment.type === 'discount' ? -Math.abs(flatAmount) : Math.abs(flatAmount);
        rateApplied += ` (${adjustment.type} ${adjustment.amount_per_gt} SEK/GT x ${ruleUnitCount} GT)`;
        adjSteps.push({
          kind: 'adjustment',
          label: adjustment.description,
          detail: `${adjustment.type} ${adjustment.amount_per_gt} SEK/GT x ${ruleUnitCount} GT`,
          amount: roundToCent(adjustedAmount - beforeAdjStep)
        });
        adjustmentsApplied.push(adjustment);
        continue;
      }
      
      if (adjustment.stack_method === 'additive') {
        if (adjustment.type === 'discount') {
          additiveDiscountPct += adjustment.percentage ?? 0;
        } else if (adjustment.type === 'surcharge') {
          additiveSurchargePct += adjustment.percentage ?? 0;
        }
      } else if (adjustment.apply_to === 'excess_units') {
        // Excess-units reduction (spec v0.2.37, SJÖFS 2025:5 §25): only the
        // units beyond the threshold are discounted; the first
        // threshold_units bill at the full rate, and the start fee is
        // never touched by this adjustment.
        const threshold = adjustment.threshold_units ?? 0;
        if (ruleUnitCount !== undefined && ruleUnitRate !== undefined) {
          const excess = Math.max(0, ruleUnitCount - threshold);
          if (excess > 0) {
            const pct = adjustment.percentage ?? 0;
            const excessFactor = adjustment.type === 'discount'
              ? (1 - pct / 100)
              : (1 + pct / 100);
            adjustedAmount -= excess * ruleUnitRate;
            adjustedAmount += excess * ruleUnitRate * excessFactor;
            rateApplied += ` (excess-units ${adjustment.type}: ${excess} units beyond ${threshold} at ${pct}%)`;
          }
        }
      } else if (adjustment.type === 'discount') {
        adjustedAmount *= (1 - (adjustment.percentage ?? 0) / 100);
      } else if (adjustment.type === 'surcharge') {
        adjustedAmount *= (1 + (adjustment.percentage ?? 0) / 100);
      }
      
      if (adjustment.stack_method !== 'additive') {
        adjSteps.push({
          kind: 'adjustment',
          label: adjustment.description,
          detail: `${adjustment.type} ${adjustment.percentage}%${adjustment.apply_to === 'excess_units' ? ` on units beyond ${adjustment.threshold_units ?? 0}` : ''}`,
          amount: roundToCent(adjustedAmount - beforeAdjStep)
        });
      }
      adjustmentsApplied.push(adjustment);
    }
    
    if (additiveDiscountPct !== 0 || additiveSurchargePct !== 0) {
      const beforeAdditive = adjustedAmount;
      adjustedAmount = baseAmount
        * (1 - additiveDiscountPct / 100)
        * (1 + additiveSurchargePct / 100)
        * (adjustedAmount / baseAmount);
      adjSteps.push({
        kind: 'adjustment',
        label: 'Additive discounts/surcharges (off the pre-adjustment base)',
        detail: `${additiveDiscountPct !== 0 ? `-${additiveDiscountPct}%` : ''}${additiveDiscountPct !== 0 && additiveSurchargePct !== 0 ? ' ' : ''}${additiveSurchargePct !== 0 ? `+${additiveSurchargePct}%` : ''} additive`,
        amount: roundToCent(adjustedAmount - beforeAdditive)
      });
    }
  }
  pendingAdjustmentSteps = adjSteps.length > 0 ? adjSteps : undefined;
  
  // Effective per-GT derived metric (spec v0.2.30): rendered on every
  // per-GT or per-call dues-type line, labeled as derived, never a
  // published rate. Distorting-factor notes name the basis effect where a
  // floor, cap, or per-call class banding materially binds.
  let effectiveRate: { effective_per_gt: number; note?: string } | undefined = undefined;
  const gt = vessel.gt;
  const duesLikeFamilies = new Set([
    'port_dues', 'fairway_dues', 'vessel_fee', 'readiness_fee', 'lay_up',
    'idle_berth', 'hafenfonds', 'connection_fee'
  ]);
  if (duesLikeFamilies.has(rule.fee_family) && gt > 0) {
    const perGt = roundToCent(adjustedAmount / gt);
    const notes: string[] = [];
    if (rule.minimum !== undefined && roundToCent(adjustedAmount) <= rule.minimum + 1e-9 && rateApplied.includes('min applied')) {
      notes.push(`fee at its ${rule.minimum} minimum`);
    }
    if (rule.maximum !== undefined && rateApplied.includes('max applied')) {
      notes.push(`fee capped at ${rule.maximum}`);
    }
    const ct = rate as CompositeTrancheRate;
    if (ct.type === 'composite_tranche' && ct.gt_cap !== undefined && getBasisValue(ct.basis) !== undefined && (getBasisValue(ct.basis) as number) > ct.gt_cap) {
      notes.push(`GT above the ${ct.gt_cap.toLocaleString('en-US')} tranche cap`);
    }
    if (rule.applicable_conditions?.nt_class !== undefined) {
      notes.push('per-call fee by NT class, not per GT');
    }
    effectiveRate = { effective_per_gt: perGt, note: notes.length > 0 ? notes.join('; ') : undefined };
  }

  // Derivation transparency (spec v0.2.42), final assembly. The steps are
  // presentation-only: they describe the arithmetic already performed, in
  // order — base computation (bands where the structure is progressive or a
  // day ladder), per-component composition where the rule is composite, the
  // adjustment stack with each step's delta, cap/minimum notes, and the fee
  // total. The UI renders them and never recomputes.
  const derivation: FeeDerivation = (() => {
    const steps: DerivationStep[] = [];
    if (pendingBandSteps) {
      steps.push(...pendingBandSteps);
    }
    if (pendingCompositionSteps) {
      steps.push(...pendingCompositionSteps);
    }
    if (!pendingBandSteps && !pendingCompositionSteps) {
      // Flat/simple structures: a single base-computation step so every fee
      // line shows its one computation rather than an empty panel.
      steps.push({
        kind: 'composition',
        label: 'Computation',
        detail: rateApplied.split(' (')[0],
        amount: roundToCent(baseAmount)
      });
    }
    if (pendingAdjustmentSteps) {
      steps.push(...pendingAdjustmentSteps);
    }
    if (rule.minimum !== undefined && rateApplied.includes('min applied')) {
      steps.push({ kind: 'adjustment', label: 'Minimum applied', detail: `fee at its ${rule.minimum} minimum`, amount: roundToCent(rule.minimum - baseAmount) });
    }
    if (rule.maximum !== undefined && rateApplied.includes('max applied')) {
      steps.push({ kind: 'adjustment', label: 'Cap applied', detail: `fee capped at ${rule.maximum}`, amount: roundToCent(rule.maximum - baseAmount) });
    }
    steps.push({
      kind: 'composition',
      label: 'Fee total',
      components: pendingComponents,
      amount: roundToCent(adjustedAmount)
    });
    return { structure_label: pendingStructureLabel, steps };
  })();
  const classification = classifyRule(rule.id);

  return {
    fee_rule_id: rule.id,
    fee_family: rule.fee_family,
    biller: rule.biller,
    amount: roundToCent(adjustedAmount),
    currency: currency,
    rate_applied: rateApplied,
    band_or_basis: bandOrBasis,
    source_reference: rule.source_reference,
    adjustments_applied: adjustmentsApplied,
    quality_flags: qualityFlags,
    component_amounts: pendingComponents,
    band_rows: pendingBandRows,
    derivation: derivation,
    effective_rate: effectiveRate,
    functional_class: classification?.functional_class,
    functional_basis_note: classification?.basis_note
  };
}

/**
 * Simple condition evaluator (simplified for now)
 */
function evaluateCondition(condition: string, input: CostCalculationInput): boolean {
  // For now, handle simple conditions
  // In production, use a proper expression evaluator
  
  // Disjunction: 'a || b' is met when either side is met (e.g. ESI >= 30 or
  // CSI class 4 for Helsingborg's environmental discount)
  if (condition.includes('||')) {
    return condition.split('||').some(part => evaluateCondition(part.trim(), input));
  }
  
  const call = input.call;
  const vessel = input.vessel;
  
  // Check for ESI score conditions
  if (condition.includes('esi_score >= ')) {
    const match = condition.match(/esi_score >= (\d+)/);
    if (match && call.esi_score !== undefined) {
      const minScore = parseInt(match[1]);
      return call.esi_score >= minScore;
    }
  }
  
  if (condition.includes('csi_class == ')) {
    const match = condition.match(/csi_class == '([^']+)'/);
    if (match && call.csi_class) {
      return call.csi_class === match[1];
    }
  }
  
  // Clean Shipping Index class (1-5 index scale, port-side discount input);
  // distinct from Sjöfartsverket's environmental class A-E, which is keyed on
  // csi_class in port files but never via this condition form (spec v0.2.21:
  // the port's CSI-4 discount and the national A-E classes must not conflate).
  if (condition.includes('clean_shipping_index_class == ')) {
    const match = condition.match(/clean_shipping_index_class == '([^']+)'/);
    if (match && call.clean_shipping_index_class) {
      return call.clean_shipping_index_class === match[1];
    }
  }
  
  if (condition.includes('fossil_free_fuel_percentage >= ')) {
    const match = condition.match(/fossil_free_fuel_percentage >= (\d+)/);
    if (match && call.fossil_free_fuel_percentage !== undefined) {
      const minPercentage = parseInt(match[1]);
      return call.fossil_free_fuel_percentage >= minPercentage;
    }
  }
  
  if (condition === 'ops_usage') {
    return call.ops_usage === true;
  }
  
  // Bare call-boolean fields (e.g. waste reduction toggles)
  const bare = (call as unknown as Record<string, unknown>)[condition];
  if (typeof bare === 'boolean') {
    return bare === true;
  }
  
  if (condition.includes('calls_this_month >= ')) {
    const match = condition.match(/calls_this_month >= (\d+)/);
    if (match) {
      const minCalls = parseInt(match[1]);
      return call.calls_this_month >= minCalls;
    }
  }
  
  // Generic numeric comparison on call inputs: 'field > N' and 'field >= N'
  // (e.g. pilotage_hours > 7 for the national pilotage-time discount).
  const gtMatch = condition.match(/^(\w+) > (\d+(?:\.\d+)?)$/);
  if (gtMatch) {
    const value = (call as any)[gtMatch[1]];
    return typeof value === 'number' && value > parseFloat(gtMatch[2]);
  }
  const gteMatch = condition.match(/^(\w+) >= (\d+(?:\.\d+)?)$/);
  if (gteMatch) {
    const value = (call as any)[gteMatch[1]];
    return typeof value === 'number' && value >= parseFloat(gteMatch[2]);
  }
  
  // Default: condition not met
  return false;
}

/**
 * Ordering-fee lead-time band (beställningsavgift) from the call's pilotage
 * ordering lead time. National Sjöfartsverket brackets: <1 h, 1-2 h, 2-3 h,
 * 3-4 h, ≥4 h; lower-inclusive, upper-exclusive, last band inclusive.
 * Missing lead time falls back to the least favourable band (spec 4.4.2).
 */
export function getOrderingLeadTimeBandId(hours: number | undefined): string {
  // SJÖFS 2025:5 §11: the ordering fee is charged only when the pilot is
  // ordered less than 5 hours before the desired time. Bands: <1 h, 1-2 h,
  // 2-3 h, 3-4 h, 4-5 h (lower-inclusive, upper-exclusive); a lead of
  // 5 hours or more charges nothing — '5h_plus' matches no ordering-fee
  // rule. Missing lead time falls back to the least favourable band
  // (spec 4.4.2).
  if (typeof hours !== 'number' || isNaN(hours) || hours < 0) return 'under_1h';
  if (hours < 1) return 'under_1h';
  if (hours < 2) return '1_2h';
  if (hours < 3) return '2_3h';
  if (hours < 4) return '3_4h';
  if (hours < 5) return '4_5h';
  return '5h_plus';
}

/**
 * Calculates the net tonnage class for Sjöfartsverket
 * Classes: 1:0, 2:1000, 3:2000, 4:3000, 5:6000, 6:10000, 7:15000, 8:30000, 9:60000, 10:100000
 */
export function getNetTonnageClass(nt: number): number {
  if (nt >= 100000) return 10;
  if (nt >= 60000) return 9;
  if (nt >= 30000) return 8;
  if (nt >= 15000) return 7;
  if (nt >= 10000) return 6;
  if (nt >= 6000) return 5;
  if (nt >= 3000) return 4;
  if (nt >= 2000) return 3;
  if (nt >= 1000) return 2;
  return 1; // Class 1: 0+ nt
}

/**
 * Gets the CSI class index (A=0, B=1, C=2, D=3, E=4)
 */
export function getCsiClassIndex(csiClass: string | undefined): number {
  if (!csiClass) return 4; // E (not registered)
  const classes = ['A', 'B', 'C', 'D', 'E'];
  return classes.indexOf(csiClass) !== -1 ? classes.indexOf(csiClass) : 4;
}

/**
 * OPS speculative component descriptor (spec v0.2.57): per-port shape of
 * the user-speculation input group — component presence, currency, and
 * unit only, configuration not rates. The per-port posture reflects each
 * port's public OPS position: Gothenburg publishes an OPS connection fee
 * only for the tanker-segment Energy Port jetties (no container connection
 * component, so no connection box; electricity, demand, and per-GT remain
 * speculable); Hamburg bills electricity through its energy ecosystem with
 * no published demand or per-GT component (electricity and connection only);
 * Helsingborg publishes nothing OPS-specific, so all four components stay
 * open (least-defined public posture). This is web-layer configuration in
 * spirit but lives beside the single calculation path so the engine prices
 * exactly the components a port's surface offers; it is never in ports.json
 * and carries no rates.
 */
// OPS component descriptor (spec v0.2.57, data-authored at v0.2.59): the
// per-port shape lives in the port's data file (ops_speculative section -
// presence, currency, unit; no rates), carried into the engine through the
// port definition. The descriptor is configuration only; the user-specified
// numbers live only in the call input, never in a rate table. A port
// without a declared section fails loudly below - the old named-port
// fallback (silently receiving Helsingborg's posture) is removed.
export function opsComponentsForPort(portId: string): OpsComponentsSpec {
  return portOpsComponents(portId);
}

/**
 * Calculates the total cost for a port call
 */
export function calculatePortCallCost(
  port: PortDefinition,
  input: CostCalculationInput
): CostCalculationResult {
  // The descriptor is data (spec v0.2.59): the port's own declared OPS
  // posture, present on the loaded port. Absent on a malformed fixture -
  // a loud failure, never a silent default posture.
  if (!port.ops_speculative) {
    throw new Error(
      `calculatePortCallCost: port '${port.metadata?.id}' carries no ops_speculative descriptor - ` +
      `every port data file must declare its OPS component posture (spec v0.2.59)`
    );
  }
  const opsComponents = port.ops_speculative;
  const call = input.call;
  const qualityFlags: QualityFlag[] = [];
  const feeResults: FeeResult[] = [];
  const matchedFeeFamilies = new Set<string>();
  const allExpectedFamilies = new Set<string>();
  
  // Calculate NT if not provided (conservative estimate)
  let nt = input.vessel.nt;
  let estimatedNt = false;
  if (nt === undefined) {
    nt = input.vessel.gt * 0.55;
    estimatedNt = true;
    qualityFlags.push({
      type: 'estimated_nt',
      description: `Net Tonnage estimated as 0.55 * GT (${input.vessel.gt}) = ${nt}`,
      severity: 'warning'
    });
  }
  
  // Collect all expected fee families from the ports rules
  for (const rule of port.fee_rules) {
    allExpectedFamilies.add(rule.fee_family);
  }
  
  // Calculate NT class for Sjöfartsverket
  const ntClass = getNetTonnageClass(nt);
  
  // Process each fee rule. Each rule evaluates with a fresh flag collector;
  // the flags it raised are merged into the call-level list (passing the
  // shared array directly would both mutate it and break the merge).
  for (const rule of port.fee_rules) {
    const billerDef = port.billers?.find(b => b.id === rule.biller || b.name === rule.biller);
    const ruleCurrency = billerDef?.currency ?? port.metadata.currency;
    const ruleFlags: QualityFlag[] = [];
    const result = evaluateFeeRule(rule, input, ruleFlags, ruleCurrency);
    if (result) {
      feeResults.push(result);
      matchedFeeFamilies.add(rule.fee_family);
      qualityFlags.push(...ruleFlags);
    }
  }
  
  // Check for unmatched expected fee families (section 4.3 validation)
  for (const family of allExpectedFamilies) {
    if (!matchedFeeFamilies.has(family)) {
      qualityFlags.push({
        type: 'unmatched_fee_family',
        description: `Fee family '${family}' has no matching rule for the current input conditions`,
        severity: 'warning'
      });
    }
  }
  
  // Group by biller
  const billerMap = new Map<string, BillerBreakdown>();
  
  for (const fee of feeResults) {
    if (!billerMap.has(fee.biller)) {
      const billerDef = port.billers?.find(b => b.id === fee.biller || b.name === fee.biller);
      billerMap.set(fee.biller, {
        biller: fee.biller,
        currency: billerDef?.currency ?? port.metadata.currency,
        fees: [],
        subtotal: 0
      });
    }
    
    const billerBreakdown = billerMap.get(fee.biller)!;
    billerBreakdown.fees.push(fee);
    billerBreakdown.subtotal += fee.amount;
  }
  
  // Apply per-biller surcharges (e.g. HHLA Hafenfonds 1.5% excluding storage):
  // a single uplift on the biller's non-excluded fees, data-driven per biller.
  for (const billerDef of port.billers ?? []) {
    const surcharge = billerDef.surcharge;
    if (!surcharge) continue;
    const breakdown = billerMap.get(billerDef.name) ?? (billerDef.id === billerDef.name ? billerMap.get(billerDef.id) : undefined);
    const target = breakdown ?? billerMap.get(billerDef.id);
    if (!target) continue;
    const excluded = new Set<string>(surcharge.exclude_families ?? []);
    const surchargeBase = target.fees
      .filter(f => !excluded.has(f.fee_family))
      .reduce((sum, f) => sum + f.amount, 0);
    if (surchargeBase <= 0) continue;
    const surchargeAmount = roundToCent(surchargeBase * surcharge.percentage / 100);
    target.fees.push({
      fee_rule_id: surcharge.id,
      fee_family: surcharge.fee_family,
      biller: target.biller,
      amount: surchargeAmount,
      currency: target.currency,
      rate_applied: `Biller surcharge: ${surcharge.percentage}% of ${roundToCent(surchargeBase).toFixed(2)} (excl. ${[...excluded].join(', ') || 'none'})`,
      band_or_basis: `${surcharge.percentage}% on non-excluded fees`,
      source_reference: surcharge.source_reference,
      adjustments_applied: [],
      quality_flags: [],
      derivation: {
        structure_label: 'Biller surcharge',
        steps: [
          { kind: 'components', label: 'Base (non-excluded fees)', amount: roundToCent(surchargeBase) },
          { kind: 'adjustment', label: surcharge.name, detail: `+${surcharge.percentage}%`, amount: roundToCent(surchargeAmount) },
          { kind: 'composition', label: 'Fee total', amount: surchargeAmount }
        ]
      },
      functional_class: classifyRule(surcharge.id)?.functional_class,
      functional_basis_note: classifyRule(surcharge.id)?.basis_note
    });
    target.subtotal += surchargeAmount;
  }
  
  // Apply per-biller frequency discounts (e.g. Sjöfartsverket vessel +
  // readiness fees: percentage payable keyed on calls this calendar month).
  // Itemized as its own negative line on the biller; never folded silently.
  for (const billerDef of port.billers ?? []) {
    const fd = billerDef.frequency_discount;
    if (!fd) continue;
    const target = billerMap.get(billerDef.name) ?? billerMap.get(billerDef.id);
    if (!target) continue;
    const applySet = new Set<string>(fd.apply_families);
    const base = target.fees
      .filter(f => applySet.has(f.fee_family))
      .reduce((sum, f) => sum + f.amount, 0);
    if (base <= 0) continue;
    const calls = input.call.calls_this_month;
    const band = fd.bands.find(b =>
      calls >= b.min_calls && (b.max_calls === null || calls <= b.max_calls)
    );
    if (!band) continue;
    if (band.payable_pct >= 100) continue;
    const discountAmount = roundToCent(base * (band.payable_pct - 100) / 100);
    target.fees.push({
      fee_rule_id: fd.id,
      fee_family: fd.fee_family,
      biller: target.biller,
      amount: discountAmount,
      currency: target.currency,
      rate_applied: `Frequency discount: ${band.payable_pct}% payable (${calls} calls this month) on ${roundToCent(base).toFixed(2)}`,
      band_or_basis: `calls_this_month=${calls}, ${band.payable_pct}% of ${[...applySet].join(' + ')}`,
      source_reference: fd.source_reference,
      adjustments_applied: [],
      quality_flags: [],
      derivation: {
        structure_label: 'Biller frequency discount',
        steps: [
          { kind: 'components', label: 'Base fees payable', detail: `${calls} calls this month`, amount: roundToCent(base) },
          { kind: 'adjustment', label: fd.name, detail: `${band.payable_pct}% payable`, amount: discountAmount },
          { kind: 'composition', label: 'Fee total', amount: discountAmount }
        ]
      },
      functional_class: classifyRule(fd.id)?.functional_class,
      functional_basis_note: classifyRule(fd.id)?.basis_note
    });
    target.subtotal += discountAmount;
  }
  
  // Convert map to array; round biller subtotals to the cent (per-line cent
  // rounding makes each fee exact; the sum is rounded to strip float noise)
  for (const breakdown of billerMap.values()) {
    breakdown.subtotal = roundToCent(breakdown.subtotal);
  }
  const billers: BillerBreakdown[] = Array.from(billerMap.values());
  
  // Calculate total
  const total = roundToCent(billers.reduce((sum, biller) => sum + biller.subtotal, 0));
  // Generic estimated-parameter separation (spec v0.2.24): any fee line
  // carrying an estimated-parameter flag counts into the estimated-parameters
  // subtotal, so each view can show total, estimate subtotal, and the
  // total-without-estimates side by side. Port-agnostic: driven entirely by
  // the flags each port file's rules emit.
  const totalEstimatedParameters = roundToCent(
    billers
      .flatMap(b => b.fees)
      .filter(f => f.amount > 0 && f.quality_flags.some(flag => flag.type === 'estimated_parameter'))
      .reduce((sum, f) => sum + f.amount, 0)
  );
  const totalWithoutEstimates = roundToCent(total - totalEstimatedParameters);

  // Vessel-access aggregate (spec v0.2.30): the sum of this call's amounts
  // for all rules classified berth/terminal infrastructure, waterway/fairway
  // access, or readiness/safety capacity. The effective per-GT is the
  // derived comparability bridge — the Swedish national fees are per-call
  // by NT class, not per-GT, and the note says so where it matters.
  const accessClasses = new Set(['berth_terminal_infrastructure', 'waterway_fairway_access', 'readiness_safety_capacity']);
  const accessFees = billers
    .flatMap(b => b.fees)
    .filter(f => (f.functional_class !== undefined && accessClasses.has(f.functional_class)) && f.amount !== 0);
  const accessAmount = roundToCent(accessFees.reduce((sum, f) => sum + f.amount, 0));
  const accessRuleIds = accessFees.map(f => f.fee_rule_id);
  const accessClassesPresent = Array.from(new Set(accessFees.map(f => f.functional_class!)));
  const accessBasisNotes = Array.from(new Set(accessFees.map(f => f.functional_basis_note).filter((n): n is string => n !== undefined)));
  const vesselAccess = input.vessel.gt > 0 ? {
    amount: accessAmount,
    effective_per_gt: roundToCent(accessAmount / input.vessel.gt),
    rule_ids: accessRuleIds,
    classes: accessClassesPresent,
    basis_notes: accessBasisNotes
  } : undefined;

  // OPS speculative block (spec v0.2.57): free-number user speculation on
  // onshore power supply, deliberately outside the tariff-traceability
  // contract — no in-scope published tariff prices container-terminal OPS
  // (AFIR/FuelEU make it effectively mandatory at key EU ports from 2030).
  // The numbers live only in the call input, never in a rate table. Blank
  // contributes zero and renders nothing (the block is undefined when no
  // component is entered). Electricity requires the shared enabling input
  // (estimated kWh); without it no electricity line fires even if a price
  // is entered. Every line carries its arithmetic in its basis string so
  // the "user-specified, not tariff-derived" label is the only provenance.
  const opsLines: OpsSpeculativeLine[] = [];
  if (opsComponents.electricity.enabled) {
    const kwh = call.ops_kwh_consumption;
    const price = call.ops_electricity_price;
    if (typeof kwh === 'number' && kwh > 0 && typeof price === 'number' && price > 0) {
      opsLines.push({
        id: 'ops_spec_electricity',
        label: `OPS electricity (user-specified, ${opsComponents.electricity.currency}/kWh)`,
        amount: roundToCent(kwh * price),
        basis: `${kwh.toLocaleString('en-US', { maximumFractionDigits: 2 })} kWh × ${price.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${opsComponents.electricity.currency}/kWh (user-specified, not tariff-derived)`
      });
    }
  }
  if (opsComponents.demand.enabled && typeof call.ops_demand_charge === 'number' && call.ops_demand_charge !== 0) {
    opsLines.push({
      id: 'ops_spec_demand',
      label: 'OPS demand charge (user-specified)',
      amount: roundToCent(call.ops_demand_charge),
      basis: `flat per call (user-specified, not tariff-derived; ${opsComponents.demand.currency})`
    });
  }
  if (opsComponents.connection.enabled && typeof call.ops_connection_charge === 'number' && call.ops_connection_charge !== 0) {
    opsLines.push({
      id: 'ops_spec_connection',
      label: 'OPS service/connection charge (user-specified)',
      amount: roundToCent(call.ops_connection_charge),
      basis: `flat per call (user-specified, not tariff-derived; ${opsComponents.connection.currency})`
    });
  }
  if (opsComponents.per_gt.enabled && typeof call.ops_per_gt_charge === 'number' && call.ops_per_gt_charge !== 0 && input.vessel.gt > 0) {
    opsLines.push({
      id: 'ops_spec_per_gt',
      label: 'OPS per-GT charge (user-specified)',
      amount: roundToCent(input.vessel.gt * call.ops_per_gt_charge),
      basis: `${input.vessel.gt.toLocaleString('en-US')} GT × ${call.ops_per_gt_charge.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${opsComponents.per_gt.currency}/GT (user-specified, not tariff-derived)`
    });
  }
  const opsSpeculative: OpsSpeculativeBlock | undefined = opsLines.length > 0 ? {
    lines: opsLines,
    amount: roundToCent(opsLines.reduce((s, l) => s + l.amount, 0)),
    currency: port.metadata.currency
  } : undefined;

  // The Grand Total includes the OPS block (spec v0.2.57): user-specified
  // contributions add to the same figure the surfaces present, with the
  // block kept structurally separate so every surface can distinguish
  // tariff-derived from user-specified. Blank OPS changes nothing.
  const grandTotal = opsSpeculative ? roundToCent(total + opsSpeculative.amount) : total;
  const grandWithoutEstimates = roundToCent(grandTotal - totalEstimatedParameters);

  return {
    port_id: port.metadata.id,
    port_name: port.metadata.name,
    currency: port.metadata.currency,
    date: input.call.date,
    vessel_summary: {
      gt: input.vessel.gt,
      nt: nt,
      loa_m: input.vessel.loa_m,
      estimated_nt: estimatedNt
    },
    billers,
    total: grandTotal,
    total_estimated_parameters: totalEstimatedParameters,
    total_without_estimates: grandWithoutEstimates,
    quality_flags: qualityFlags,
    vessel_access: vesselAccess,
    ops_speculative: opsSpeculative,
    calculation_timestamp: new Date().toISOString()
  };
}
