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
  'idle_berth'
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
    
    default:
      errors.push({
        rule_id: ruleId,
        message: `Unknown rate structure type: ${rate.type}`,
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
