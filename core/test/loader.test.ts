// Port Call Cost Analyzer - Loader Tests
import {
  validatePort,
  validateFeeRule,
  validateSourceReference,
  validateRateStructure,
  KNOWN_FEE_FAMILIES
} from '../src/loader';
import {
  PortDefinition,
  FeeRule,
  SourceReference,
  FlatRate,
  BandedRate,
  ProgressiveRate,
  PerCommencedDayRate,
  PerUnitRate,
  BandedByTimeRate
} from '../src/types';

describe('Port Call Cost Analyzer Loader', () => {
  describe('validateSourceReference', () => {
    it('should accept complete source reference', () => {
      const reference: SourceReference = {
        document_name: 'Test Tariff',
        document_url: 'http://example.com',
        document_issued: '2026-01-01',
        page: '1',
        clause: 'Test Clause',
        verified_on: '2026-01-02',
        verified_by: 'Test User'
      };
      
      const errors = validateSourceReference(reference, 'test_rule');
      expect(errors).toHaveLength(0);
    });

    it('should reject incomplete source reference', () => {
      const reference: Partial<SourceReference> = {
        document_name: 'Test Tariff',
        document_url: 'http://example.com'
      };
      
      const errors = validateSourceReference(reference as SourceReference, 'test_rule');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('document_issued'))).toBe(true);
    });

    it('should reject empty fields', () => {
      const reference: SourceReference = {
        document_name: '',
        document_url: '',
        document_issued: '',
        page: '',
        clause: '',
        verified_on: '',
        verified_by: ''
      };
      
      const errors = validateSourceReference(reference, 'test_rule');
      expect(errors).toHaveLength(7); // All fields are missing
    });
  });

  describe('validateRateStructure', () => {
    describe('flat rate', () => {
      it('should accept valid flat rate', () => {
        const rate: FlatRate = {
          type: 'flat',
          amount: 1000
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject negative amount', () => {
        const rate: FlatRate = {
          type: 'flat',
          amount: -100
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('negative'))).toBe(true);
      });

      it('should reject missing amount', () => {
        const rate: FlatRate = {
          type: 'flat',
          amount: null as any
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('missing'))).toBe(true);
      });
    });

    describe('banded rate', () => {
      it('should accept valid banded rate', () => {
        const rate: BandedRate = {
          type: 'banded',
          basis: 'gt',
          bands: [
            { min: 0, max: 10000, rate: 1.0 },
            { min: 10000, max: null, rate: 0.5 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject empty bands', () => {
        const rate: BandedRate = {
          type: 'banded',
          basis: 'gt',
          bands: []
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('at least one band'))).toBe(true);
      });

      it('should reject gaps between bands', () => {
        const rate: BandedRate = {
          type: 'banded',
          basis: 'gt',
          bands: [
            { min: 0, max: 10000, rate: 1.0 },
            { min: 20000, max: null, rate: 0.5 } // Gap from 10000 to 20000
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('Gap'))).toBe(true);
      });

      it('should reject overlapping bands', () => {
        const rate: BandedRate = {
          type: 'banded',
          basis: 'gt',
          bands: [
            { min: 0, max: 20000, rate: 1.0 },
            { min: 10000, max: null, rate: 0.5 } // Overlaps with first band
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('Overlap'))).toBe(true);
      });

      it('should reject missing basis', () => {
        const rate: BandedRate = {
          type: 'banded',
          basis: '' as any,
          bands: [
            { min: 0, max: null, rate: 1.0 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('missing basis'))).toBe(true);
      });
    });

    describe('progressive rate', () => {
      it('should accept valid progressive rate', () => {
        const rate: ProgressiveRate = {
          type: 'progressive',
          basis: 'gt',
          bands: [
            { min: 0, max: 20000, rate: 2.0 },
            { min: 20000, max: 40000, rate: 1.5 },
            { min: 40000, max: null, rate: 1.0 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject non-contiguous bands', () => {
        const rate: ProgressiveRate = {
          type: 'progressive',
          basis: 'gt',
          bands: [
            { min: 0, max: 20000, rate: 2.0 },
            { min: 30000, max: 40000, rate: 1.5 } // Gap from 20000 to 30000
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('not contiguous'))).toBe(true);
      });

      it('should reject first band not starting at 0', () => {
        const rate: ProgressiveRate = {
          type: 'progressive',
          basis: 'gt',
          bands: [
            { min: 1000, max: 20000, rate: 2.0 },
            { min: 20000, max: null, rate: 1.0 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('First progressive band'))).toBe(true);
      });
    });

    describe('per_commenced_day rate', () => {
      it('should accept valid per_commenced_day rate', () => {
        const rate: PerCommencedDayRate = {
          type: 'per_commenced_day',
          daily_rate: 100,
          basis: 'lay_up_days'
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject negative daily_rate', () => {
        const rate: PerCommencedDayRate = {
          type: 'per_commenced_day',
          daily_rate: -100,
          basis: 'lay_up_days'
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('negative'))).toBe(true);
      });

      it('should reject missing basis', () => {
        const rate: PerCommencedDayRate = {
          type: 'per_commenced_day',
          daily_rate: 100,
          basis: '' as any
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('missing basis'))).toBe(true);
      });
    });

    describe('per_unit rate', () => {
      it('should accept valid per_unit rate', () => {
        const rate: PerUnitRate = {
          type: 'per_unit',
          unit_rate: 100,
          unit_type: 'container'
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject negative unit_rate', () => {
        const rate: PerUnitRate = {
          type: 'per_unit',
          unit_rate: -100,
          unit_type: 'container'
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('negative'))).toBe(true);
      });

      it('should reject missing unit_type', () => {
        const rate: PerUnitRate = {
          type: 'per_unit',
          unit_rate: 100,
          unit_type: '' as any
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('missing unit_type'))).toBe(true);
      });
    });

    describe('banded_by_time rate', () => {
      it('should accept valid banded_by_time rate', () => {
        const rate: BandedByTimeRate = {
          type: 'banded_by_time',
          basis: 'storage_days',
          bands: [
            { min_days: 0, max_days: 6, daily_rate: 0 },
            { min_days: 7, max_days: 13, daily_rate: 133 },
            { min_days: 14, max_days: null, daily_rate: 346 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors).toHaveLength(0);
      });

      it('should reject missing min_days', () => {
        const rate: BandedByTimeRate = {
          type: 'banded_by_time',
          basis: 'storage_days',
          bands: [
            { min_days: null as any, max_days: 6, daily_rate: 0 }
          ]
        };
        
        const errors = validateRateStructure(rate, 'test_rule');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.message.includes('missing min_days'))).toBe(true);
      });
    });
  });

  describe('validateFeeRule', () => {
    it('should accept valid fee rule', () => {
      const rule: FeeRule = {
        id: 'test_rule',
        fee_family: 'port_dues',
        biller: 'Port Authority',
        name: 'Test Fee',
        rate_structure: {
          type: 'flat',
          amount: 1000
        },
        source_reference: {
          document_name: 'Test Tariff',
          document_url: 'http://example.com',
          document_issued: '2026-01-01',
          page: '1',
          clause: 'Test',
          verified_on: '2026-01-01',
          verified_by: 'Test'
        }
      };
      
      const errors = validateFeeRule(rule);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing id', () => {
      const rule: Partial<FeeRule> = {
        fee_family: 'port_dues',
        biller: 'Port Authority',
        name: 'Test Fee',
        rate_structure: {
          type: 'flat',
          amount: 1000
        },
        source_reference: {
          document_name: 'Test Tariff',
          document_url: 'http://example.com',
          document_issued: '2026-01-01',
          page: '1',
          clause: 'Test',
          verified_on: '2026-01-01',
          verified_by: 'Test'
        }
      };
      
      const errors = validateFeeRule(rule as FeeRule);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('missing id'))).toBe(true);
    });

    it('should reject missing fee_family', () => {
      const rule: Partial<FeeRule> = {
        id: 'test_rule',
        biller: 'Port Authority',
        name: 'Test Fee',
        rate_structure: {
          type: 'flat',
          amount: 1000
        },
        source_reference: {
          document_name: 'Test Tariff',
          document_url: 'http://example.com',
          document_issued: '2026-01-01',
          page: '1',
          clause: 'Test',
          verified_on: '2026-01-01',
          verified_by: 'Test'
        }
      };
      
      const errors = validateFeeRule(rule as FeeRule);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('missing fee_family'))).toBe(true);
    });

    it('should warn on unknown fee_family', () => {
      const rule: FeeRule = {
        id: 'test_rule',
        fee_family: 'unknown_family',
        biller: 'Port Authority',
        name: 'Test Fee',
        rate_structure: {
          type: 'flat',
          amount: 1000
        },
        source_reference: {
          document_name: 'Test Tariff',
          document_url: 'http://example.com',
          document_issued: '2026-01-01',
          page: '1',
          clause: 'Test',
          verified_on: '2026-01-01',
          verified_by: 'Test'
        }
      };
      
      const errors = validateFeeRule(rule);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.severity === 'warning' && e.message.includes('Unknown fee family'))).toBe(true);
    });

    it('should reject missing source_reference', () => {
      const rule: Partial<FeeRule> = {
        id: 'test_rule',
        fee_family: 'port_dues',
        biller: 'Port Authority',
        name: 'Test Fee',
        rate_structure: {
          type: 'flat',
          amount: 1000
        }
      };
      
      const errors = validateFeeRule(rule as FeeRule);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('missing source_reference'))).toBe(true);
    });
  });

  describe('validatePort', () => {
    it('should accept valid port', () => {
      const port: PortDefinition = {
        metadata: {
          id: 'test_port',
          name: 'Test Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [
          { id: 'biller1', name: 'Biller 1', currency: 'SEK' }
        ],
        default_call: {},
        ops_speculative: {
          electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
          demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
        },
        input_profile: { sections: [{ id: 'general', heading: 'General' }] },
        fee_rules: [
          {
            id: 'rule1',
            fee_family: 'port_dues',
            biller: 'Biller 1',
            name: 'Rule 1',
            rate_structure: {
              type: 'flat',
              amount: 1000
            },
            source_reference: {
              document_name: 'Test Tariff',
              document_url: 'http://example.com',
              document_issued: '2026-01-01',
              page: '1',
              clause: 'Test',
              verified_on: '2026-01-01',
              verified_by: 'Test'
            }
          }
        ]
      };
      
      const result = validatePort(port);
      expect(result.is_valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject port without metadata', () => {
      const port: Partial<PortDefinition> = {
        billers: [],
        fee_rules: []
      };
      
      const result = validatePort(port as PortDefinition);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('missing metadata'))).toBe(true);
    });

    it('should reject port without billers', () => {
      const port: Partial<PortDefinition> = {
        metadata: {
          id: 'test_port',
          name: 'Test Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [],
        fee_rules: []
      };
      
      const result = validatePort(port as PortDefinition);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('at least one biller'))).toBe(true);
    });

    it('should reject port without fee rules', () => {
      const port: Partial<PortDefinition> = {
        metadata: {
          id: 'test_port',
          name: 'Test Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [
          { id: 'biller1', name: 'Biller 1', currency: 'SEK' }
        ],
        default_call: {},
        ops_speculative: {
          electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
          demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
        },
        input_profile: { sections: [{ id: 'general', heading: 'General' }] },
        fee_rules: []
      };
      
      const result = validatePort(port as PortDefinition);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('at least one fee rule'))).toBe(true);
    });

    it('should reject duplicate rule IDs', () => {
      const port: PortDefinition = {
        metadata: {
          id: 'test_port',
          name: 'Test Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [
          { id: 'biller1', name: 'Biller 1', currency: 'SEK' }
        ],
        default_call: {},
        ops_speculative: {
          electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
          demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
        },
        input_profile: { sections: [{ id: 'general', heading: 'General' }] },
        fee_rules: [
          {
            id: 'duplicate_rule',
            fee_family: 'port_dues',
            biller: 'Biller 1',
            name: 'Rule 1',
            rate_structure: { type: 'flat', amount: 1000 },
            source_reference: {
              document_name: 'Test',
              document_url: 'http://example.com',
              document_issued: '2026-01-01',
              page: '1',
              clause: 'Test',
              verified_on: '2026-01-01',
              verified_by: 'Test'
            }
          },
          {
            id: 'duplicate_rule',
            fee_family: 'waste',
            biller: 'Biller 1',
            name: 'Rule 2',
            rate_structure: { type: 'flat', amount: 2000 },
            source_reference: {
              document_name: 'Test',
              document_url: 'http://example.com',
              document_issued: '2026-01-01',
              page: '1',
              clause: 'Test',
              verified_on: '2026-01-01',
              verified_by: 'Test'
            }
          }
        ]
      };
      
      const result = validatePort(port);
      expect(result.is_valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate fee rule id'))).toBe(true);
    });

    it('should warn on unknown biller reference', () => {
      const port: PortDefinition = {
        metadata: {
          id: 'test_port',
          name: 'Test Port',
          country: 'Test Country',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [
          { id: 'biller1', name: 'Biller 1', currency: 'SEK' }
        ],
        default_call: {},
        ops_speculative: {
          electricity: { enabled: false, currency: 'SEK', unit: 'SEK/kWh' },
          demand: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          connection: { enabled: false, currency: 'SEK', unit: 'SEK/call' },
          per_gt: { enabled: false, currency: 'SEK', unit: 'SEK/GT' }
        },
        input_profile: { sections: [{ id: 'general', heading: 'General' }] },
        fee_rules: [
          {
            id: 'rule1',
            fee_family: 'port_dues',
            biller: 'Unknown Biller',
            name: 'Rule 1',
            rate_structure: { type: 'flat', amount: 1000 },
            source_reference: {
              document_name: 'Test',
              document_url: 'http://example.com',
              document_issued: '2026-01-01',
              page: '1',
              clause: 'Test',
              verified_on: '2026-01-01',
              verified_by: 'Test'
            }
          }
        ]
      };
      
      const result = validatePort(port);
      expect(result.is_valid).toBe(true); // Unknown biller is a warning, not error
      expect(result.warnings.some(e => e.message.includes('unknown biller'))).toBe(true);
    });
  });

  describe('KNOWN_FEE_FAMILIES', () => {
    it('should include all standard fee families', () => {
      const expectedFamilies = [
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
      ];
      
      expectedFamilies.forEach(family => {
        expect(KNOWN_FEE_FAMILIES.has(family)).toBe(true);
      });
    });
  });
});
