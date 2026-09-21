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
  Adjustment,
  PortDefinition,
  Biller,
  SourceReference
} from './types';

/**
 * Evaluates a single fee rule against the input
 */
export function evaluateFeeRule(
  rule: FeeRule,
  input: CostCalculationInput,
  qualityFlags: QualityFlag[]
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
    
    // Handle NT class condition for Sjfartsverket
    if (rule.applicable_conditions.nt_class) {
      const nt = vessel.nt !== undefined ? vessel.nt : vessel.gt * 0.55;
      const ntClass = getNetTonnageClass(nt);
      if (ntClass !== rule.applicable_conditions.nt_class) {
        return null;
      }
    }
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
        return vessel.gt * 0.55;
      case 'loa': return vessel.loa_m;
      case 'draft': return vessel.draft_m;
      case 'teu': return vessel.teu_capacity;
      default: return undefined;
    }
  };
  
  // Calculate base amount based on rate structure
  let baseAmount = 0;
  let rateApplied = '';
  let bandOrBasis = '';
  
  const rate = rule.rate_structure;
  
  switch (rate.type) {
    case 'flat':
      baseAmount = (rate as FlatRate).amount;
      rateApplied = `Flat rate: ${baseAmount} ${rule.source_reference.document_name}`;
      bandOrBasis = 'flat';
      break;
      
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
        bandOrBasis = `Band: ${lastBand.min ?? 0}-${lastBand.max ?? '\u221e'}`;
      } else {
        baseAmount = applicableBand.rate * basisValue;
        rateApplied = `Banded rate: ${applicableBand.rate} * ${basisValue}`;
        bandOrBasis = `Band: ${applicableBand.min ?? 0}-${applicableBand.max ?? '\u221e'}`;
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
      
      baseAmount = unitCount * perUnit.unit_rate;
      rateApplied = `Per unit: ${unitCount} * ${perUnit.unit_rate}`;
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
    
    default:
      qualityFlags.push({
        type: 'fallback_value',
        description: `Unknown rate structure type: ${(rate as RateStructure).type}`,
        severity: 'error'
      });
      return null;
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
    amount: adjustedAmount,
    currency: 'SEK', // All Gothenburg fees are in SEK
    rate_applied: rateApplied,
    band_or_basis: bandOrBasis,
    source_reference: rule.source_reference,
    adjustments_applied: adjustmentsApplied,
    quality_flags: qualityFlags
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
 * Calculates the net tonnage class for Sjfartsverket
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
  
  // Process each fee rule
  for (const rule of port.fee_rules) {
    const result = evaluateFeeRule(rule, input, [...qualityFlags]);
    if (result) {
      feeResults.push(result);
      matchedFeeFamilies.add(rule.fee_family);
      // Merge quality flags
      qualityFlags.push(...result.quality_flags);
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
  
  // Group by biller  // Group by biller
  const billerMap = new Map<string, BillerBreakdown>();
  
  for (const fee of feeResults) {
    if (!billerMap.has(fee.biller)) {
      billerMap.set(fee.biller, {
        biller: fee.biller,
        currency: 'SEK',
        fees: [],
        subtotal: 0
      });
    }
    
    const billerBreakdown = billerMap.get(fee.biller)!;
    billerBreakdown.fees.push(fee);
    billerBreakdown.subtotal += fee.amount;
  }
  
  // Convert map to array
  const billers: BillerBreakdown[] = Array.from(billerMap.values());
  
  // Calculate total
  const total = billers.reduce((sum, biller) => sum + biller.subtotal, 0);
  
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
