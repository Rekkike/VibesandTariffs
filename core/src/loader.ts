// Port Call Cost Analyzer - Data Loader with Validation
// Loads and validates port definition files

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import {
  PortDefinition,
  FeeRule,
  RateStructure,
  BandedRate,
  ProgressiveRate,
  FlatRate,
  PerCommencedDayRate,
  PerUnitRate,
  BandedByTimeRate,
  BandedFlatRate,
  CompositeTrancheRate,
  TieredPerPeriodRate,
  PerCommencedPeriodRate,
  ProgressiveDailyRate,
  FlatByInputRate,
  SourceReference,
  ValidationError,
  PortValidationResult
} from './types';

// Known fee families
export const KNOWN_FEE_FAMILIES: Set<string> = new Set([
  'port_dues',
  'fairway_dues',
  'waste',
  'pilotage',
  'towage',
  'terminal_handling',
  'storage',
  'security',
  'environmental_surcharge',
  'connection_fee',
  'lay_up',
  'readiness_fee',
  'cargo_fee',
  'vessel_fee',
  'ordering_fee',
  'yard_surcharge',
  'gate_hazardous',
  'idle_berth',
  'hafenfonds',
  'frequency_discount',
  'ancillary_service'
]);

/**
 * Validates a source reference is complete
 */
export function validateSourceReference(
  reference: SourceReference,
  ruleId: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  const requiredFields = [
    'document_name',
    'document_url',
    'document_issued',
    'page',
    'clause',
    'verified_on',
    'verified_by'
  ];
  
  for (const field of requiredFields) {
    if (!reference[field as keyof SourceReference] || 
        reference[field as keyof SourceReference] === '') {
      errors.push({
        rule_id: ruleId,
        message: `Source reference missing required field: ${field}`,
        severity: 'error',
        path: `source_reference.${field}`
      });
    }
  }
  
  return errors;
}

/**
 * Validates a rate structure
 */
export function validateRateStructure(
  rate: RateStructure,
  ruleId: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  switch (rate.type) {
    case 'flat':
      const flat = rate as FlatRate;
      if (flat.amount === undefined || flat.amount === null) {
        errors.push({
          rule_id: ruleId,
          message: 'Flat rate missing amount',
          severity: 'error',
          path: 'rate_structure.amount'
        });
      }
      if (typeof flat.amount === 'number' && flat.amount < 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Flat rate amount cannot be negative',
          severity: 'error',
          path: 'rate_structure.amount'
        });
      }
      break;
      
    case 'banded': {
      const banded = rate as BandedRate;
      
      if (!banded.bands || banded.bands.length === 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Banded rate must have at least one band',
          severity: 'error',
          path: 'rate_structure.bands'
        });
        break;
      }
      
      // Check for gaps or overlaps
      const sortedBands = [...banded.bands].sort((a, b) => {
        const aMin = a.min ?? 0;
        const bMin = b.min ?? 0;
        return aMin - bMin;
      });
      
      let prevMax: number | null = null;
      for (let i = 0; i < sortedBands.length; i++) {
        const band = sortedBands[i];
        
        // Check band has valid rate
        if (band.rate === undefined || band.rate === null) {
          errors.push({
            rule_id: ruleId,
            message: `Band ${i} missing rate`,
            severity: 'error',
            path: `rate_structure.bands[${i}].rate`
          });
        }
        
        if (typeof band.rate === 'number' && band.rate < 0) {
          errors.push({
            rule_id: ruleId,
            message: `Band ${i} rate cannot be negative`,
            severity: 'error',
            path: `rate_structure.bands[${i}].rate`
          });
        }
        
        // Check for gaps
        if (i > 0) {
          const prevBand = sortedBands[i - 1];
          const prevBandMax = prevBand.max ?? Infinity;
          const currentBandMin = band.min ?? 0;
          
          if (currentBandMin > prevBandMax) {
            errors.push({
              rule_id: ruleId,
              message: `Gap between bands: ${prevBandMax} to ${currentBandMin}`,
              severity: 'error',
              path: `rate_structure.bands[${i}]`
            });
          }
          
          // Check for overlaps
          if (currentBandMin < prevBandMax) {
            errors.push({
              rule_id: ruleId,
              message: `Overlap between bands: band ${i-1} (max: ${prevBandMax}) and band ${i} (min: ${currentBandMin})`,
              severity: 'error',
              path: `rate_structure.bands[${i}]`
            });
          }
        }
        
        prevMax = band.max;
      }
      
      // Check basis is specified
      if (!banded.basis) {
        errors.push({
          rule_id: ruleId,
          message: 'Banded rate missing basis',
          severity: 'error',
          path: 'rate_structure.basis'
        });
      }
      break;
    }
    
    case 'progressive': {
      const progressive = rate as ProgressiveRate;
      
      if (!progressive.bands || progressive.bands.length === 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Progressive rate must have at least one band',
          severity: 'error',
          path: 'rate_structure.bands'
        });
        break;
      }
      
      // Check bands are in order and contiguous
      const sortedBands = [...progressive.bands].sort((a, b) => {
        const aMin = a.min ?? 0;
        const bMin = b.min ?? 0;
        return aMin - bMin;
      });
      
      // First band must start at 0 or null
      const firstBand = sortedBands[0];
      if (firstBand.min !== null && firstBand.min !== 0) {
        errors.push({
          rule_id: ruleId,
          message: 'First progressive band must start at 0 or have null min',
          severity: 'error',
          path: 'rate_structure.bands[0].min'
        });
      }
      
      let prevMax: number | null = null;
      for (let i = 0; i < sortedBands.length; i++) {
        const band = sortedBands[i];
        
        if (band.rate === undefined || band.rate === null) {
          errors.push({
            rule_id: ruleId,
            message: `Progressive band ${i} missing rate`,
            severity: 'error',
            path: `rate_structure.bands[${i}].rate`
          });
        }
        
        if (typeof band.rate === 'number' && band.rate < 0) {
          errors.push({
            rule_id: ruleId,
            message: `Progressive band ${i} rate cannot be negative`,
            severity: 'error',
            path: `rate_structure.bands[${i}].rate`
          });
        }
        
        // Check bands are contiguous (max of previous = min of current)
        if (i > 0) {
          const prevBand = sortedBands[i - 1];
          const prevBandMax = prevBand.max ?? Infinity;
          const currentBandMin = band.min ?? 0;
          
          if (currentBandMin !== prevBandMax) {
            errors.push({
              rule_id: ruleId,
              message: `Progressive bands not contiguous: band ${i-1} max (${prevBandMax}) != band ${i} min (${currentBandMin})`,
              severity: 'error',
              path: `rate_structure.bands[${i}]`
            });
          }
        }
        
        prevMax = band.max;
      }
      
      // Check basis
      if (!progressive.basis) {
        errors.push({
          rule_id: ruleId,
          message: 'Progressive rate missing basis',
          severity: 'error',
          path: 'rate_structure.basis'
        });
      }
      break;
    }
    
    case 'per_commenced_day': {
      const perDay = rate as PerCommencedDayRate;
      
      if (perDay.daily_rate === undefined || perDay.daily_rate === null) {
        errors.push({
          rule_id: ruleId,
          message: 'Per commenced day rate missing daily_rate',
          severity: 'error',
          path: 'rate_structure.daily_rate'
        });
      }
      
      if (typeof perDay.daily_rate === 'number' && perDay.daily_rate < 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Per commenced day daily_rate cannot be negative',
          severity: 'error',
          path: 'rate_structure.daily_rate'
        });
      }
      
      if (!perDay.basis) {
        errors.push({
          rule_id: ruleId,
          message: 'Per commenced day rate missing basis',
          severity: 'error',
          path: 'rate_structure.basis'
        });
      }
      break;
    }
    
    case 'per_unit': {
      const perUnit = rate as PerUnitRate;
      
      if (perUnit.unit_rate === undefined || perUnit.unit_rate === null) {
        errors.push({
          rule_id: ruleId,
          message: 'Per unit rate missing unit_rate',
          severity: 'error',
          path: 'rate_structure.unit_rate'
        });
      }
      
      if (typeof perUnit.unit_rate === 'number' && perUnit.unit_rate < 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Per unit unit_rate cannot be negative',
          severity: 'error',
          path: 'rate_structure.unit_rate'
        });
      }
      
      if (!perUnit.unit_type) {
        errors.push({
          rule_id: ruleId,
          message: 'Per unit rate missing unit_type',
          severity: 'error',
          path: 'rate_structure.unit_type'
        });
      }
      break;
    }
    
    case 'banded_by_time': {
      const bandedTime = rate as BandedByTimeRate;
      
      if (!bandedTime.bands || bandedTime.bands.length === 0) {
        errors.push({
          rule_id: ruleId,
          message: 'Banded by time rate must have at least one band',
          severity: 'error',
          path: 'rate_structure.bands'
        });
        break;
      }
      
      // Validate bands
      for (let i = 0; i < bandedTime.bands.length; i++) {
        const band = bandedTime.bands[i];
        
        if (band.daily_rate === undefined || band.daily_rate === null) {
          errors.push({
            rule_id: ruleId,
            message: `Banded by time band ${i} missing daily_rate`,
            severity: 'error',
            path: `rate_structure.bands[${i}].daily_rate`
          });
        }
        
        if (typeof band.daily_rate === 'number' && band.daily_rate < 0) {
          errors.push({
            rule_id: ruleId,
            message: `Banded by time band ${i} daily_rate cannot be negative`,
            severity: 'error',
            path: `rate_structure.bands[${i}].daily_rate`
          });
        }
        
        if (band.min_days === undefined || band.min_days === null) {
          errors.push({
            rule_id: ruleId,
            message: `Banded by time band ${i} missing min_days`,
            severity: 'error',
            path: `rate_structure.bands[${i}].min_days`
          });
        }
      }
      
      if (!bandedTime.basis) {
        errors.push({
          rule_id: ruleId,
          message: 'Banded by time rate missing basis',
          severity: 'error',
          path: 'rate_structure.basis'
        });
      }
      break;
    }
    
    case 'banded_flat': {
      const bf = rate as BandedFlatRate;
      if (!bf.bands || bf.bands.length === 0) {
        errors.push({ rule_id: ruleId, message: 'Banded flat rate must have at least one band', severity: 'error', path: 'rate_structure.bands' });
        break;
      }
      const sortedBands = [...bf.bands].sort((a, b) => (a.min ?? -Infinity) - (b.min ?? -Infinity));
      for (let i = 0; i < sortedBands.length; i++) {
        const band = sortedBands[i];
        if (band.rate === undefined && band.amount === undefined) {
          errors.push({ rule_id: ruleId, message: `Banded flat band ${i} needs rate or amount`, severity: 'error', path: `rate_structure.bands[${i}]` });
        }
        if (i > 0) {
          const prevMax = sortedBands[i - 1].max;
          if (prevMax !== null && prevMax !== undefined && band.min !== null && band.min !== undefined && (band.min < prevMax || band.min > prevMax)) {
            // half-open bands must abut exactly: previous max == current min
            if (band.min !== prevMax) {
              errors.push({ rule_id: ruleId, message: `Banded flat bands not contiguous at band ${i}: min ${band.min} != prev max ${prevMax}`, severity: 'error', path: `rate_structure.bands[${i}]` });
            }
          }
        }
      }
      if (!bf.basis) {
        errors.push({ rule_id: ruleId, message: 'Banded flat rate missing basis', severity: 'error', path: 'rate_structure.basis' });
      }
      if (bf.linear_extension) {
        const le = bf.linear_extension;
        if (typeof le.from_basis !== 'number' || typeof le.per_basis_units !== 'number' || typeof le.amount !== 'number') {
          errors.push({ rule_id: ruleId, message: 'Banded flat linear_extension requires from_basis, per_basis_units, amount', severity: 'error', path: 'rate_structure.linear_extension' });
        }
      }
      break;
    }
    
    case 'composite_tranche': {
      const ct = rate as CompositeTrancheRate;
      if (!ct.tranches || ct.tranches.length === 0) {
        errors.push({ rule_id: ruleId, message: 'Composite tranche rate must have at least one tranche', severity: 'error', path: 'rate_structure.tranches' });
        break;
      }
      let prevMax: number | null = null;
      for (let i = 0; i < ct.tranches.length; i++) {
        const tranche = ct.tranches[i];
        const min = tranche.min ?? 0;
        const max = tranche.max ?? Infinity;
        if (i > 0 && min !== (prevMax ?? Infinity)) {
          errors.push({ rule_id: ruleId, message: `Composite tranches not contiguous at tranche ${i}`, severity: 'error', path: `rate_structure.tranches[${i}]` });
        }
        if (!tranche.components || Object.keys(tranche.components).length === 0) {
          errors.push({ rule_id: ruleId, message: `Composite tranche ${i} missing components`, severity: 'error', path: `rate_structure.tranches[${i}].components` });
        }
        for (const [compId, compRate] of Object.entries(tranche.components ?? {})) {
          if (typeof compRate !== 'number' || compRate < 0) {
            errors.push({ rule_id: ruleId, message: `Composite tranche ${i} component ${compId} has invalid rate`, severity: 'error', path: `rate_structure.tranches[${i}].components` });
          }
        }
        prevMax = tranche.max;
      }
      if (!ct.basis) {
        errors.push({ rule_id: ruleId, message: 'Composite tranche rate missing basis', severity: 'error', path: 'rate_structure.basis' });
      }
      for (const [compId, stack] of Object.entries(ct.component_adjustments ?? {})) {
        if (!Array.isArray(stack)) {
          errors.push({ rule_id: ruleId, message: `Component adjustment stack for ${compId} must be an array`, severity: 'error', path: `rate_structure.component_adjustments.${compId}` });
        }
      }
      break;
    }
    
    case 'tiered_per_period': {
      const tp = rate as TieredPerPeriodRate;
      if (!tp.initial_tier || typeof tp.initial_tier.hours !== 'number' || typeof tp.initial_tier.rate_per_basis !== 'number') {
        errors.push({ rule_id: ruleId, message: 'Tiered per period rate requires initial_tier.hours and initial_tier.rate_per_basis', severity: 'error', path: 'rate_structure.initial_tier' });
      }
      if (tp.subsequent_tier && (typeof tp.subsequent_tier.period_hours !== 'number' || typeof tp.subsequent_tier.rate_per_basis !== 'number')) {
        errors.push({ rule_id: ruleId, message: 'Tiered per period subsequent_tier requires period_hours and rate_per_basis', severity: 'error', path: 'rate_structure.subsequent_tier' });
      }
      if (!tp.basis || !tp.hours_input) {
        errors.push({ rule_id: ruleId, message: 'Tiered per period rate requires basis and hours_input', severity: 'error', path: 'rate_structure' });
      }
      break;
    }
    
    case 'per_commenced_period': {
      const pp = rate as PerCommencedPeriodRate;
      if (!pp.tiers || pp.tiers.length === 0) {
        errors.push({ rule_id: ruleId, message: 'Per commenced period rate must have at least one tier', severity: 'error', path: 'rate_structure.tiers' });
        break;
      }
      for (let i = 0; i < pp.tiers.length; i++) {
        const tier = pp.tiers[i];
        if (typeof tier.rate_per_period_per_basis !== 'number' || tier.rate_per_period_per_basis < 0) {
          errors.push({ rule_id: ruleId, message: `Per commenced period tier ${i} has invalid rate`, severity: 'error', path: `rate_structure.tiers[${i}]` });
        }
      }
      if (!pp.basis || !pp.hours_input || typeof pp.free_hours !== 'number' || typeof pp.period_hours !== 'number') {
        errors.push({ rule_id: ruleId, message: 'Per commenced period rate requires basis, hours_input, free_hours, period_hours', severity: 'error', path: 'rate_structure' });
      }
      break;
    }
    
    case 'progressive_daily': {
      const pd = rate as ProgressiveDailyRate;
      if (!pd.bands || pd.bands.length === 0) {
        errors.push({ rule_id: ruleId, message: 'Progressive daily rate must have at least one band', severity: 'error', path: 'rate_structure.bands' });
        break;
      }
      for (let i = 0; i < pd.bands.length; i++) {
        const band = pd.bands[i];
        if (typeof band.rate_per_container_per_day !== 'number' || band.rate_per_container_per_day < 0) {
          errors.push({ rule_id: ruleId, message: `Progressive daily band ${i} has invalid rate`, severity: 'error', path: `rate_structure.bands[${i}]` });
        }
        if (typeof band.min_days !== 'number') {
          errors.push({ rule_id: ruleId, message: `Progressive daily band ${i} missing min_days`, severity: 'error', path: `rate_structure.bands[${i}]` });
        }
      }
      if (!pd.days_input || !pd.container_count_input || typeof pd.free_days !== 'number') {
        errors.push({ rule_id: ruleId, message: 'Progressive daily rate requires days_input, container_count_input, free_days', severity: 'error', path: 'rate_structure' });
      }
      break;
    }
    
    case 'flat_by_input': {
      const fi = rate as FlatByInputRate;
      if (!fi.options || fi.options.length === 0) {
        errors.push({ rule_id: ruleId, message: 'Flat by input rate must have at least one option', severity: 'error', path: 'rate_structure.options' });
        break;
      }
      for (let i = 0; i < fi.options.length; i++) {
        const opt = fi.options[i];
        if (!opt.value || typeof opt.amount !== 'number') {
          errors.push({ rule_id: ruleId, message: `Flat by input option ${i} requires value and amount`, severity: 'error', path: `rate_structure.options[${i}]` });
        }
      }
      if (!fi.input_field || !fi.fallback_option) {
        errors.push({ rule_id: ruleId, message: 'Flat by input rate requires input_field and fallback_option', severity: 'error', path: 'rate_structure' });
      } else if (!fi.options.some(o => o.value === fi.fallback_option)) {
        errors.push({ rule_id: ruleId, message: `Flat by input fallback_option "${fi.fallback_option}" is not among options`, severity: 'error', path: 'rate_structure.fallback_option' });
      }
      break;
    }
    
    default:
      errors.push({
        rule_id: ruleId,
        message: `Unknown rate structure type: ${(rate as RateStructure).type}`,
        severity: 'error',
        path: 'rate_structure.type'
      });
  }
  
  return errors;
}

/**
 * Validates a single fee rule
 */
export function validateFeeRule(rule: FeeRule): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Check required fields
  if (!rule.id) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing id',
      severity: 'error',
      path: 'id'
    });
  }
  
  if (!rule.fee_family) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing fee_family',
      severity: 'error',
      path: 'fee_family'
    });
  } else if (!KNOWN_FEE_FAMILIES.has(rule.fee_family)) {
    errors.push({
      rule_id: rule.id,
      message: `Unknown fee family: ${rule.fee_family}`,
      severity: 'warning',
      path: 'fee_family'
    });
  }
  
  if (!rule.biller) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing biller',
      severity: 'error',
      path: 'biller'
    });
  }
  
  if (!rule.name) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing name',
      severity: 'error',
      path: 'name'
    });
  }
  
  if (!rule.rate_structure) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing rate_structure',
      severity: 'error',
      path: 'rate_structure'
    });
  } else {
    errors.push(...validateRateStructure(rule.rate_structure, rule.id || 'unknown'));
  }
  
  if (!rule.source_reference) {
    errors.push({
      rule_id: rule.id,
      message: 'Fee rule missing source_reference',
      severity: 'error',
      path: 'source_reference'
    });
  } else {
    errors.push(...validateSourceReference(rule.source_reference, rule.id || 'unknown'));
  }
  
  return errors;
}

/**
 * Validates a complete port definition
 */
export function validatePort(port: PortDefinition): PortValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validate metadata
  if (!port.metadata) {
    errors.push({
      message: 'Port missing metadata',
      severity: 'error',
      path: 'metadata'
    });
  } else {
    if (!port.metadata.id) {
      errors.push({
        message: 'Port metadata missing id',
        severity: 'error',
        path: 'metadata.id'
      });
    }
    
    if (!port.metadata.name) {
      errors.push({
        message: 'Port metadata missing name',
        severity: 'error',
        path: 'metadata.name'
      });
    }
    
    if (!port.metadata.country) {
      errors.push({
        message: 'Port metadata missing country',
        severity: 'error',
        path: 'metadata.country'
      });
    }
    
    if (!port.metadata.currency) {
      errors.push({
        message: 'Port metadata missing currency',
        severity: 'error',
        path: 'metadata.currency'
      });
    }
    
    if (!port.metadata.validity_start) {
      errors.push({
        message: 'Port metadata missing validity_start',
        severity: 'error',
        path: 'metadata.validity_start'
      });
    }
    
    if (!port.metadata.validity_end) {
      errors.push({
        message: 'Port metadata missing validity_end',
        severity: 'error',
        path: 'metadata.validity_end'
      });
    }
  }
  
  // Validate billers
  if (!port.billers || port.billers.length === 0) {
    errors.push({
      message: 'Port must have at least one biller',
      severity: 'error',
      path: 'billers'
    });
  } else {
    const billerIds = new Set<string>();
    for (const biller of port.billers) {
      if (!biller.id) {
        errors.push({
          message: `Biller missing id`,
          severity: 'error',
          path: 'billers'
        });
      } else if (billerIds.has(biller.id)) {
        errors.push({
          message: `Duplicate biller id: ${biller.id}`,
          severity: 'error',
          path: 'billers'
        });
      } else {
        billerIds.add(biller.id);
      }
      
      if (!biller.name) {
        errors.push({
          message: `Biller ${biller.id} missing name`,
          severity: 'error',
          path: 'billers'
        });
      }
      
      if (!biller.currency) {
        errors.push({
          message: `Biller ${biller.id} missing currency`,
          severity: 'error',
          path: 'billers'
        });
      }
    }
  }
  
  // Validate fee rules
  if (!port.fee_rules || port.fee_rules.length === 0) {
    errors.push({
      message: 'Port must have at least one fee rule',
      severity: 'error',
      path: 'fee_rules'
    });
  } else {
    const ruleIds = new Set<string>();
    for (const rule of port.fee_rules) {
      const ruleErrors = validateFeeRule(rule);
      
      for (const error of ruleErrors) {
        if (error.severity === 'error') {
          errors.push(error);
        } else {
          warnings.push(error);
        }
      }
      
      // Check for duplicate rule IDs
      if (rule.id && ruleIds.has(rule.id)) {
        errors.push({
          rule_id: rule.id,
          message: `Duplicate fee rule id: ${rule.id}`,
          severity: 'error',
          path: 'fee_rules'
        });
      } else if (rule.id) {
        ruleIds.add(rule.id);
      }
      
      // Check that biller exists
      if (rule.biller) {
        const billerExists = port.billers?.some(b => b.id === rule.biller || b.name === rule.biller);
        if (!billerExists) {
          warnings.push({
            rule_id: rule.id,
            message: `Fee rule references unknown biller: ${rule.biller}`,
            severity: 'warning',
            path: 'fee_rules.biller'
          });
        }
      }
    }
  }
  
  // Per-port configuration sections (spec v0.2.59): every real port file
  // must carry its default_call, ops_speculative, and input_profile
  // sections - the generalization is proven by data, and a missing section
  // is a load-time error, never a silent fallback at first use.
  if (!port.default_call || typeof port.default_call !== 'object' || Array.isArray(port.default_call)) {
    errors.push({
      message: 'Port missing default_call section (per-port default-call data, spec v0.2.59)',
      severity: 'error',
      path: 'default_call'
    });
  }
  if (!port.ops_speculative || typeof port.ops_speculative !== 'object') {
    errors.push({
      message: 'Port missing ops_speculative section (OPS component descriptor, spec v0.2.59)',
      severity: 'error',
      path: 'ops_speculative'
    });
  } else {
    for (const component of ['electricity', 'demand', 'connection', 'per_gt']) {
      const spec = (port.ops_speculative as unknown as Record<string, unknown>)[component];
      if (!spec || typeof spec !== 'object'
        || typeof (spec as Record<string, unknown>).enabled !== 'boolean'
        || typeof (spec as Record<string, unknown>).currency !== 'string'
        || typeof (spec as Record<string, unknown>).unit !== 'string') {
        errors.push({
          message: `Port ops_speculative.${component} descriptor malformed (needs enabled/currency/unit, spec v0.2.59)`,
          severity: 'error',
          path: `ops_speculative.${component}`
        });
      }
    }
  }
  if (!port.input_profile || !Array.isArray(port.input_profile.sections) || port.input_profile.sections.length === 0) {
    errors.push({
      message: 'Port missing input_profile section (per-port workspace input profile, spec v0.2.59)',
      severity: 'error',
      path: 'input_profile'
    });
  } else {
    if (port.input_profile.fields !== undefined
      && (!Array.isArray(port.input_profile.fields) || port.input_profile.fields.some(f => typeof f !== 'string'))) {
      errors.push({
        message: 'Port input_profile.fields malformed (list of field ids, spec v0.2.59)',
        severity: 'error',
        path: 'input_profile.fields'
      });
    }
    if (port.input_profile.reset_fields !== undefined
      && (!Array.isArray(port.input_profile.reset_fields) || port.input_profile.reset_fields.some(f => typeof f !== 'string'))) {
      errors.push({
        message: 'Port input_profile.reset_fields malformed (list of field ids, spec v0.2.60)',
        severity: 'error',
        path: 'input_profile.reset_fields'
      });
    }
    for (const section of port.input_profile.sections) {
      if (!section || typeof section.id !== 'string' || typeof section.heading !== 'string') {
        errors.push({
          message: 'Port input_profile section malformed (needs id and heading, spec v0.2.59)',
          severity: 'error',
          path: 'input_profile.sections'
        });
      }
    }
  }

  return {
    port_id: port.metadata?.id || 'unknown',
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Loads a port definition from a YAML file
 */
export function loadPortFromYaml(filePath: string): PortDefinition {
  const yamlContent = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(yamlContent) as PortDefinition;
  return data;
}

/**
 * Loads a port definition from a JSON file
 */
export function loadPortFromJson(filePath: string): PortDefinition {
  const jsonContent = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(jsonContent) as PortDefinition;
  return data;
}

/**
 * Loads and validates a port definition from a file
 */
export function loadAndValidatePort(filePath: string): {
  port: PortDefinition;
  validation: PortValidationResult;
} {
  let port: PortDefinition;
  
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    port = loadPortFromYaml(filePath);
  } else if (filePath.endsWith('.json')) {
    port = loadPortFromJson(filePath);
  } else {
    throw new Error(`Unsupported file format: ${filePath}`);
  }
  
  const validation = validatePort(port);
  
  if (!validation.is_valid) {
    const errorMessages = validation.errors.map(e => 
      e.rule_id ? `[${e.rule_id}] ${e.message}` : e.message
    ).join('\n');
    throw new Error(`Port validation failed:\n${errorMessages}`);
  }
  
  return { port, validation };
}

/**
 * Loads all ports from a directory
 */
export function loadAllPortsFromDirectory(directory: string): Map<string, PortDefinition> {
  const ports = new Map<string, PortDefinition>();
  
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    if (file.endsWith('.yaml') || file.endsWith('.yml') || file.endsWith('.json')) {
      const filePath = path.join(directory, file);
      try {
        const { port } = loadAndValidatePort(filePath);
        ports.set(port.metadata.id, port);
      } catch (error) {
        console.error(`Failed to load port from ${filePath}: ${error}`);
        throw error;
      }
    }
  }
  
  return ports;
}
