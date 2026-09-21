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
  SourceReference
} from './types';

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

// Engine NOx Tier heuristic (STC 2.1.1 basis: certified tier of the most
// polluting engine; without IAPP proof, Tier 0 applies). Used only when the
// call does not carry a user-set tier.
export function inferEngineTier(builtYear: number | undefined): 'Tier 0' | 'Tier I' | 'Tier II' {
  if (builtYear === undefined || builtYear < 2000) return 'Tier 0';
  if (builtYear <= 2010) return 'Tier I';
  return 'Tier II';
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
    if (rule.applicable_conditions.flag_state && 
        rule.applicable_conditions.flag_state !== call.flag_state) {
      return null; // Not applicable
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
      if (!call.csi_class || call.csi_class !== requiredClass) {
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
    
    // Generic conditions: any other key must match the call input exactly
    // (e.g. hpa_berth_usage: true, berth_type: 'quay').
    const handled = new Set(['flag_state', 'ops_usage', 'esi_score', 'csi_class', 'fuel_percentage', 'nt_class', 'vessel_type']);
    for (const [key, value] of Object.entries(rule.applicable_conditions)) {
      if (handled.has(key)) continue;
      const callValue = (call as any)[key];
      if (value === true) {
        if (callValue !== true) return null;
      } else if (value === false) {
        if (callValue === true) return null;
      } else if (Array.isArray(value)) {
        if (!value.includes(callValue)) return null;
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
  
  // Resolve engine Tier with the build-year heuristic fallback
  const resolveEngineTier = (): { tier: string; estimated: boolean } => {
    if (call.engine_tier) return { tier: call.engine_tier, estimated: !!call.engine_tier_estimated };
    const inferred = inferEngineTier(vessel.built_year);
    qualityFlags.push({
      type: 'estimated_engine_tier',
      description: `Engine Tier "${inferred}" assumed by build-year heuristic (built ${vessel.built_year ?? 'unknown'}); enter the certified IAPP tier to override`,
      severity: 'info'
    });
    return { tier: inferred, estimated: true };
  };
  
  // Calculate base amount based on rate structure
  let baseAmount = 0;
  let rateApplied = '';
  let bandOrBasis = '';
  let pendingComponents: { label: string; amount: number }[] | undefined = undefined;
  
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
          accumulatedAmount += valueInBand * band.rate;
          appliedBands.push(`${bandMin}-${bandMax === Infinity ? '\u221e' : bandMax}: ${valueInBand} * ${band.rate}`);
        }
      }
      baseAmount = accumulatedAmount;
      rateApplied = `Progressive: ${appliedBands.join(' + ')}`;
      bandOrBasis = `${progressive.basis}=${basisValue}`;
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
        default:
          // Try to get from call directly
          unitCount = (call as any)[perUnit.unit_type] ?? 0;
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
      
      // Find applicable band
      const applicableBand = bandedTime.bands.find(band => {
        const minOk = days >= band.min_days;
        const maxOk = band.max_days === null || days <= band.max_days;
        return minOk && maxOk;
      });
      
      if (!applicableBand) {
        // Use highest band
        const lastBand = bandedTime.bands[bandedTime.bands.length - 1];
        const prevBand = bandedTime.bands[bandedTime.bands.length - 2];
        const daysInBand = days - (prevBand?.max_days ?? 0);
        baseAmount = Math.max(0, daysInBand) * lastBand.daily_rate;
        rateApplied = `Banded by time: ${Math.max(0, daysInBand)} * ${lastBand.daily_rate} (fallback)`;
        bandOrBasis = `Days: ${days} (fallback to highest band)`;
      } else {
        // Charge only days beyond the band minimum
        const daysInBand = days - applicableBand.min_days;
        baseAmount = Math.max(0, daysInBand) * applicableBand.daily_rate;
        rateApplied = `Banded by time: ${Math.max(0, daysInBand)} * ${applicableBand.daily_rate}`;
        bandOrBasis = `Days: ${applicableBand.min_days}-${applicableBand.max_days ?? '\u221e'}`;
      }
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
      for (const tranche of ct.tranches) {
        const trancheMin = tranche.min ?? 0;
        const trancheMax = tranche.max ?? Infinity;
        const valueInTranche = Math.max(0, Math.min(gt, trancheMax) - trancheMin);
        if (valueInTranche <= 0) continue;
        for (const id of compIds) {
          if (tranche.components[id] === undefined) continue;
          full[id] += valueInTranche * tranche.components[id];
          disp[id] += roundToCent(valueInTranche * tranche.components[id]);
        }
      }
      
      const componentAmounts: { label: string; amount: number }[] = [];
      const stackDescriptions: string[] = [];
      for (const compId of compIds) {
        const stack = ct.component_adjustments?.[compId] ?? [];
        for (const adj of stack) {
          if (adj.condition_input && !(call as any)[adj.condition_input]) continue;
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
              stackDescriptions.push(`${compId}: Tier ${tier} ${pct >= 0 ? '+' : ''}${pct}%${estimated ? ' (estimated)' : ''}`);
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
              break;
            }
            case 'per_gt_rebate': {
              const rebate = gt * (adj.rate_per_gt ?? 0);
              disp[compId] = roundToCent(disp[compId] - ceilToCent(rebate));
              full[compId] -= rebate;
              stackDescriptions.push(`${compId}: ${adj.description ?? 'rebate'} ${gt} * ${adj.rate_per_gt}`);
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
      if (tp.subsequent_tier && hours > tp.initial_tier.hours) {
        const extraPeriods = Math.ceil((hours - tp.initial_tier.hours) / tp.subsequent_tier.period_hours);
        ratePerBasis += extraPeriods * tp.subsequent_tier.rate_per_basis;
        extraDesc = ` + ${extraPeriods} * ${tp.subsequent_tier.rate_per_basis}`;
      }
      baseAmount = roundToCent(basisValue * ratePerBasis);
      rateApplied = `Tiered per period: ${basisValue} * ${ratePerBasis} (${hours} h: ${tp.initial_tier.rate_per_basis}${extraDesc})`;
      bandOrBasis = `${tp.basis}=${basisValue}, ${hours} h`;
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
      // Tiers: first tier up to up_to_excess_hours, then next tier beyond
      let amount = 0;
      let remaining = excess;
      let prevBound = 0;
      for (const tier of pp.tiers) {
        const tierSpan = tier.up_to_excess_hours === null ? remaining : Math.max(0, Math.min(remaining, tier.up_to_excess_hours - prevBound));
        if (tierSpan > 0) {
          const periods = Math.ceil(tierSpan / pp.period_hours);
          const raw = periods * tier.rate_per_period_per_basis * basisValue;
          const perPeriodMin = pp.minimum_per_period;
          amount += perPeriodMin !== undefined ? Math.max(raw, periods * perPeriodMin) : raw;
          remaining -= tierSpan;
          if (remaining <= 0) break;
          prevBound = tier.up_to_excess_hours ?? prevBound;
        }
      }
      baseAmount = roundToCent(amount);
      rateApplied = `Per commenced ${pp.period_hours} h: excess ${excess} h over ${pp.free_hours} h at ${pp.tiers.map(t => t.rate_per_period_per_basis).join('/')}`;
      bandOrBasis = `${pp.basis}=${basisValue}, excess ${excess} h`;
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
  
  if (rule.adjustments) {
    // Sort by stacking order if specified
    const sortedAdjustments = [...rule.adjustments].sort((a, b) => {
      const aOrder = a.stacking_order ?? 0;
      const bOrder = b.stacking_order ?? 0;
      return aOrder - bOrder;
    });
    
    for (const adjustment of sortedAdjustments) {
      // Check if condition is met
      if (adjustment.condition) {
        // Simple condition evaluation
        // For now, we'll check against the input
        // This is a simplified approach - in production, use a proper expression evaluator
        const conditionMet = evaluateCondition(adjustment.condition, input);
        if (!conditionMet) continue;
      }
      
      if (adjustment.type === 'discount') {
        adjustedAmount *= (1 - adjustment.percentage / 100);
      } else if (adjustment.type === 'surcharge') {
        adjustedAmount *= (1 + adjustment.percentage / 100);
      }
      
      adjustmentsApplied.push(adjustment);
    }
  }
  
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
    component_amounts: pendingComponents
  };
}

/**
 * Simple condition evaluator (simplified for now)
 */
function evaluateCondition(condition: string, input: CostCalculationInput): boolean {
  // For now, handle simple conditions
  // In production, use a proper expression evaluator
  
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
  
  // Default: condition not met
  return false;
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
 * Calculates the total cost for a port call
 */
export function calculatePortCallCost(
  port: PortDefinition,
  input: CostCalculationInput
): CostCalculationResult {
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
      quality_flags: []
    });
    target.subtotal += surchargeAmount;
  }
  
  // Convert map to array; round biller subtotals to the cent (per-line cent
  // rounding makes each fee exact; the sum is rounded to strip float noise)
  for (const breakdown of billerMap.values()) {
    breakdown.subtotal = roundToCent(breakdown.subtotal);
  }
  const billers: BillerBreakdown[] = Array.from(billerMap.values());
  
  // Calculate total
  const total = roundToCent(billers.reduce((sum, biller) => sum + biller.subtotal, 0));
  
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
    total,
    quality_flags: qualityFlags,
    calculation_timestamp: new Date().toISOString()
  };
}

/**
 * Helper to check if a fee rule applies to a specific vessel type
 */
export function isRuleApplicable(rule: FeeRule, input: CostCalculationInput): boolean {
  if (!rule.applicable_conditions) return true;
  
  const call = input.call;
  const vessel = input.vessel;
  
  // Check vessel type
  if (rule.applicable_conditions.vessel_type) {
    // For now, we don't have vessel type in input, so assume applicable
    // This would need to be extended
  }
  
  // Check flag state
  if (rule.applicable_conditions.flag_state && 
      rule.applicable_conditions.flag_state !== call.flag_state) {
    return false;
  }
  
  // Check ESI score
  if (rule.applicable_conditions.esi_score) {
    if (!call.esi_score || call.esi_score < rule.applicable_conditions.esi_score) {
      return false;
    }
  }
  
  // Check CSI class
  if (rule.applicable_conditions.csi_class) {
    if (!call.csi_class || call.csi_class !== rule.applicable_conditions.csi_class) {
      return false;
    }
  }
  
  // Check fossil-free fuel percentage
  if (rule.applicable_conditions.fuel_percentage) {
    if (!call.fossil_free_fuel_percentage || 
        call.fossil_free_fuel_percentage < rule.applicable_conditions.fuel_percentage) {
      return false;
    }
  }
  
  // Check OPS usage
  if (rule.applicable_conditions.ops_usage !== undefined && 
      rule.applicable_conditions.ops_usage !== call.ops_usage) {
    return false;
  }
  
  return true;
}
