// Port Call Cost Analyzer - Engine Tests
import {
  calculatePortCallCost,
  getNetTonnageClass,
  getCsiClassIndex
} from '../src/engine';
import { PortDefinition, VesselInput, CallInput, CostCalculationInput } from '../src/types';

// Helper to create a test port definition
function createTestPort(): PortDefinition {
  return {
    metadata: {
      id: 'test_port',
      name: 'Test Port',
      country: 'Test Country',
      currency: 'SEK',
      validity_start: '2026-01-01',
      validity_end: '2026-12-31'
    },
    billers: [
      { id: 'port_authority', name: 'Port Authority', currency: 'SEK' },
      { id: 'terminal', name: 'Terminal Operator', currency: 'SEK' }
    ],
    fee_rules: []
  };
}

// Helper to create test input
function createTestInput(vessel: Partial<VesselInput> = {}, call: Partial<CallInput> = {}): CostCalculationInput {
  const defaultVessel: VesselInput = {
    gt: 55000,
    nt: 30250,
    loa_m: 290,
    beam_m: 32,
    draft_m: 12,
    teu_capacity: 4000
  };
  
  const defaultCall: CallInput = {
    port_id: 'test_port',
    date: '2026-01-01',
    containers_loaded_le20ft: 500,
    containers_loaded_gt20ft: 500,
    containers_discharged_le20ft: 500,
    containers_discharged_gt20ft: 500,
    calls_this_month: 1,
    flag_state: 'EU',
    esi_score: 40,
    csi_class: 'A',
    fossil_free_fuel_percentage: 0,
    ops_usage: false,
    lay_up_days: 0,
    storage_days_export: 0,
    storage_days_import: 0,
    reefer_units: 0,
    oog_units: 0,
    dangerous_goods_units: 0,
    pilotage_required: false,
    pilotage_hours: 0,
    pilotage_extra_pilot: false,
    pilotage_ordering_lead_time_hours: 0
  };
  
  return {
    vessel: { ...defaultVessel, ...vessel },
    call: { ...defaultCall, ...call }
  };
}

describe('Port Call Cost Analyzer Engine', () => {
  describe('getNetTonnageClass', () => {
    it('should return correct class for NT ranges', () => {
      expect(getNetTonnageClass(0)).toBe(1);
      expect(getNetTonnageClass(500)).toBe(1);
      expect(getNetTonnageClass(1000)).toBe(2);
      expect(getNetTonnageClass(1500)).toBe(2);
      expect(getNetTonnageClass(2000)).toBe(3);
      expect(getNetTonnageClass(2500)).toBe(3);
      expect(getNetTonnageClass(3000)).toBe(4);
      expect(getNetTonnageClass(5000)).toBe(4);
      expect(getNetTonnageClass(6000)).toBe(5);
      expect(getNetTonnageClass(8000)).toBe(5);
      expect(getNetTonnageClass(10000)).toBe(6);
      expect(getNetTonnageClass(12000)).toBe(6);
      expect(getNetTonnageClass(15000)).toBe(7);
      expect(getNetTonnageClass(20000)).toBe(7);
      expect(getNetTonnageClass(30000)).toBe(8);
      expect(getNetTonnageClass(40000)).toBe(8);
      expect(getNetTonnageClass(60000)).toBe(9);
      expect(getNetTonnageClass(80000)).toBe(9);
      expect(getNetTonnageClass(100000)).toBe(10);
      expect(getNetTonnageClass(150000)).toBe(10);
    });
  });

  describe('getCsiClassIndex', () => {
    it('should return correct index for CSI classes', () => {
      expect(getCsiClassIndex('A')).toBe(0);
      expect(getCsiClassIndex('B')).toBe(1);
      expect(getCsiClassIndex('C')).toBe(2);
      expect(getCsiClassIndex('D')).toBe(3);
      expect(getCsiClassIndex('E')).toBe(4);
      expect(getCsiClassIndex(undefined)).toBe(4);
      expect(getCsiClassIndex('UNKNOWN')).toBe(4);
    });
  });

  describe('calculatePortCallCost', () => {
    it('should handle empty fee rules', () => {
      const port = createTestPort();
      const input = createTestInput();
      
      const result = calculatePortCallCost(port, input);
      
      expect(result.total).toBe(0);
      expect(result.billers).toHaveLength(0);
      expect(result.currency).toBe('SEK');
      expect(result.port_id).toBe('test_port');
    });

    it('should calculate flat rate fees', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'flat_fee_1',
          fee_family: 'port_dues',
          biller: 'Port Authority',
          name: 'Flat Fee',
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
      ];
      
      const input = createTestInput();
      const result = calculatePortCallCost(port, input);
      
      expect(result.total).toBe(1000);
      expect(result.billers).toHaveLength(1);
      expect(result.billers[0].subtotal).toBe(1000);
      expect(result.billers[0].fees).toHaveLength(1);
      expect(result.billers[0].fees[0].amount).toBe(1000);
    });

    it('should calculate per_unit fees for containers', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'per_container_fee',
          fee_family: 'terminal_handling',
          biller: 'Terminal Operator',
          name: 'Per Container Fee',
          rate_structure: {
            type: 'per_unit',
            unit_rate: 100,
            unit_type: 'container_total'
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
      ];
      
      const input = createTestInput({
        containers_loaded_le20ft: 100,
        containers_loaded_gt20ft: 50,
        containers_discharged_le20ft: 100,
        containers_discharged_gt20ft: 50
      });
      
      const result = calculatePortCallCost(port, input);
      
      // Total containers: 100 + 50 + 100 + 50 = 300
      expect(result.total).toBe(300 * 100); // 30,000
      expect(result.billers[0].fees[0].amount).toBe(30000);
    });

    it('should calculate progressive rates correctly', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'progressive_fee',
          fee_family: 'port_dues',
          biller: 'Port Authority',
          name: 'Progressive Port Dues',
          rate_structure: {
            type: 'progressive',
            basis: 'gt',
            bands: [
              { min: 0, max: 20000, rate: 2.0 },
              { min: 20000, max: 40000, rate: 1.5 },
              { min: 40000, max: null, rate: 1.0 }
            ]
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
      ];
      
      // Test with GT = 55,000
      const input = createTestInput({ gt: 55000 });
      const result = calculatePortCallCost(port, input);
      
      // Calculation:
      // 0-20,000: 20,000 * 2.0 = 40,000
      // 20,000-40,000: 20,000 * 1.5 = 30,000
      // 40,000-55,000: 15,000 * 1.0 = 15,000
      // Total: 40,000 + 30,000 + 15,000 = 85,000
      expect(result.total).toBe(85000);
      expect(result.billers[0].fees[0].amount).toBe(85000);
    });

    it('should apply minimum amount', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'min_fee',
          fee_family: 'port_dues',
          biller: 'Port Authority',
          name: 'Minimum Fee',
          rate_structure: {
            type: 'per_unit',
            unit_rate: 0.01,
            unit_type: 'gt'
          },
          minimum: 500,
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
      ];
      
      const input = createTestInput({ gt: 1000 }); // Would be 10, but minimum is 500
      const result = calculatePortCallCost(port, input);
      
      expect(result.total).toBe(500);
      expect(result.billers[0].fees[0].amount).toBe(500);
    });

    it('should apply adjustments (discounts)', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'discount_fee',
          fee_family: 'port_dues',
          biller: 'Port Authority',
          name: 'Discountable Fee',
          rate_structure: {
            type: 'flat',
            amount: 1000
          },
          adjustments: [
            {
              type: 'discount',
              percentage: 10,
              condition: 'esi_score >= 30',
              description: 'ESI discount',
              stacking_order: 1
            }
          ],
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
      ];
      
      // Test with ESI score >= 30 (should apply discount)
      const input1 = createTestInput({ esi_score: 35 });
      const result1 = calculatePortCallCost(port, input1);
      expect(result1.total).toBe(900); // 1000 - 10%
      
      // Test with ESI score < 30 (should not apply discount)
      const input2 = createTestInput({ esi_score: 25 });
      const result2 = calculatePortCallCost(port, input2);
      expect(result2.total).toBe(1000); // No discount
    });

    it('should apply multiple stacking discounts', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'multi_discount_fee',
          fee_family: 'port_dues',
          biller: 'Port Authority',
          name: 'Multi-Discount Fee',
          rate_structure: {
            type: 'flat',
            amount: 1000
          },
          adjustments: [
            {
              type: 'discount',
              percentage: 10,
              condition: 'esi_score >= 30',
              description: 'ESI discount',
              stacking_order: 1
            },
            {
              type: 'discount',
              percentage: 10,
              condition: 'fossil_free_fuel_percentage >= 30',
              description: 'Fuel discount',
              stacking_order: 2
            }
          ],
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
      ];
      
      const input = createTestInput({
        esi_score: 35,
        fossil_free_fuel_percentage: 35
      });
      const result = calculatePortCallCost(port, input);
      
      // 1000 * 0.9 * 0.9 = 810
      expect(result.total).toBe(810);
    });

    it('should handle applicable conditions for flag state', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'eu_fee',
          fee_family: 'waste',
          biller: 'Port Authority',
          name: 'EU Waste Fee',
          rate_structure: {
            type: 'per_unit',
            unit_rate: 0.13,
            unit_type: 'gt'
          },
          applicable_conditions: {
            flag_state: 'EU'
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
        },
        {
          id: 'non_eu_fee',
          fee_family: 'waste',
          biller: 'Port Authority',
          name: 'Non-EU Waste Fee',
          rate_structure: {
            type: 'per_unit',
            unit_rate: 0.24,
            unit_type: 'gt'
          },
          applicable_conditions: {
            flag_state: 'non-EU'
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
      ];
      
      // Test with EU flag
      const inputEu = createTestInput({ gt: 10000, flag_state: 'EU' });
      const resultEu = calculatePortCallCost(port, inputEu);
      expect(resultEu.total).toBe(10000 * 0.13); // 1,300
      
      // Test with non-EU flag
      const inputNonEu = createTestInput({ gt: 10000, flag_state: 'non-EU' });
      const resultNonEu = calculatePortCallCost(port, inputNonEu);
      expect(resultNonEu.total).toBe(10000 * 0.24); // 2,400
    });

    it('should estimate NT when not provided', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'nt_fee',
          fee_family: 'vessel_fee',
          biller: 'Port Authority',
          name: 'NT-Based Fee',
          rate_structure: {
            type: 'per_unit',
            unit_rate: 1,
            unit_type: 'nt'
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
      ];
      
      const input = createTestInput({ gt: 10000, nt: undefined });
      const result = calculatePortCallCost(port, input);
      
      // NT should be estimated as 0.55 * GT = 5,500
      expect(result.total).toBe(5500);
      expect(result.quality_flags.some(f => f.type === 'estimated_nt')).toBe(true);
    });

    it('should handle per_commenced_day rates', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'daily_fee',
          fee_family: 'lay_up',
          biller: 'Port Authority',
          name: 'Daily Lay-up Fee',
          rate_structure: {
            type: 'per_commenced_day',
            daily_rate: 100,
            basis: 'lay_up_days'
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
      ];
      
      const input = createTestInput({ lay_up_days: 3.5 }); // 3.5 days = 4 commenced days
      const result = calculatePortCallCost(port, input);
      
      expect(result.total).toBe(400); // 4 * 100
    });

    it('should handle banded_by_time rates with free days', () => {
      const port = createTestPort();
      port.fee_rules = [
        {
          id: 'storage_fee',
          fee_family: 'storage',
          biller: 'Terminal Operator',
          name: 'Storage Fee',
          rate_structure: {
            type: 'banded_by_time',
            basis: 'storage_days_export',
            bands: [
              { min_days: 0, max_days: 6, daily_rate: 0 },
              { min_days: 7, max_days: 9, daily_rate: 133 },
              { min_days: 10, max_days: null, daily_rate: 346 }
            ]
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
      ];
      
      // Test with 5 days (free)
      const input1 = createTestInput({ storage_days_export: 5 });
      const result1 = calculatePortCallCost(port, input1);
      expect(result1.total).toBe(0);
      
      // Test with 8 days (7-9 band: 133 per day)
      const input2 = createTestInput({ storage_days_export: 8 });
      const result2 = calculatePortCallCost(port, input2);
      expect(result2.total).toBe(8 * 133); // 1,064
    });
  });

  // Integration test with Gothenburg data
  describe('Gothenburg 2026 Integration Tests', () => {
    let gothenburgPort: PortDefinition;
    
    beforeAll(() => {
      // Load the Gothenburg port data
      // In a real test, we would load from the YAML file
      // For now, we'll create a minimal version
      gothenburgPort = {
        metadata: {
          id: 'gothenburg',
          name: 'Port of Gothenburg',
          country: 'Sweden',
          currency: 'SEK',
          validity_start: '2026-01-01',
          validity_end: '2026-12-31'
        },
        billers: [
          { id: 'port_of_gothenburg', name: 'Port of Gothenburg', currency: 'SEK' },
          { id: 'sjofartsverket', name: 'Sjöfartsverket', currency: 'SEK' },
          { id: 'apm_terminals_gothenburg', name: 'APM Terminals Gothenburg', currency: 'SEK' }
        ],
        fee_rules: [
          // Container vessel dues
          {
            id: 'port_gothenburg_container_vessel_dues',
            fee_family: 'port_dues',
            biller: 'Port of Gothenburg',
            name: 'Container Vessel Dues',
            rate_structure: {
              type: 'progressive',
              basis: 'gt',
              bands: [
                { min: 0, max: 20000, rate: 1.96 },
                { min: 20000, max: 40000, rate: 1.71 },
                { min: 40000, max: 60000, rate: 1.15 },
                { min: 60000, max: null, rate: 0.80 }
              ]
            },
            minimum: 500,
            source_reference: {
              document_name: 'Port Tariff 2026',
              document_url: 'http://example.com',
              document_issued: '2025-12-01',
              page: '5',
              clause: 'Section 2.1',
              verified_on: '2025-12-15',
              verified_by: 'Test'
            }
          },
          // Waste dues EU
          {
            id: 'port_gothenburg_waste_solid_eu',
            fee_family: 'waste',
            biller: 'Port of Gothenburg',
            name: 'Solid Waste Dues - EU',
            rate_structure: {
              type: 'per_unit',
              unit_rate: 0.13,
              unit_type: 'gt'
            },
            applicable_conditions: { flag_state: 'EU' },
            source_reference: {
              document_name: 'Port Tariff 2026',
              document_url: 'http://example.com',
              document_issued: '2025-12-01',
              page: '10',
              clause: 'Section 4.1',
              verified_on: '2025-12-15',
              verified_by: 'Test'
            }
          },
          // Terminal handling
          {
            id: 'apm_terminals_handling_le20ft',
            fee_family: 'terminal_handling',
            biller: 'APM Terminals Gothenburg',
            name: 'Terminal Handling - <=20ft',
            rate_structure: {
              type: 'per_unit',
              unit_rate: 377,
              unit_type: 'container_le20ft'
            },
            source_reference: {
              document_name: 'APM Terminals Tariff 2026',
              document_url: 'http://example.com',
              document_issued: '2025-12-01',
              page: '2',
              clause: 'Terminal Charges',
              verified_on: '2025-12-15',
              verified_by: 'Test'
            }
          },
          {
            id: 'apm_terminals_handling_gt20ft',
            fee_family: 'terminal_handling',
            biller: 'APM Terminals Gothenburg',
            name: 'Terminal Handling - >20ft',
            rate_structure: {
              type: 'per_unit',
              unit_rate: 535,
              unit_type: 'container_gt20ft'
            },
            source_reference: {
              document_name: 'APM Terminals Tariff 2026',
              document_url: 'http://example.com',
              document_issued: '2025-12-01',
              page: '2',
              clause: 'Terminal Charges',
              verified_on: '2025-12-15',
              verified_by: 'Test'
            }
          }
        ]
      };
    });

    it('should calculate a complete sample call for Panamax vessel', () => {
      // Sample: 55,000 GT Panamax, 1,500 container moves (750 each of le20ft and gt20ft)
      const input: CostCalculationInput = {
        vessel: {
          gt: 55000,
          nt: 30250,
          loa_m: 290,
          beam_m: 32,
          draft_m: 12,
          teu_capacity: 4000
        },
        call: {
          port_id: 'gothenburg',
          date: '2026-01-01',
          containers_loaded_le20ft: 375,
          containers_loaded_gt20ft: 375,
          containers_discharged_le20ft: 375,
          containers_discharged_gt20ft: 375,
          calls_this_month: 1,
          flag_state: 'EU',
          esi_score: 40,
          csi_class: 'A',
          fossil_free_fuel_percentage: 0,
          ops_usage: false,
          lay_up_days: 0,
          storage_days_export: 0,
          storage_days_import: 0,
          reefer_units: 0,
          oog_units: 0,
          dangerous_goods_units: 0,
          pilotage_required: false,
          pilotage_hours: 0,
          pilotage_extra_pilot: false,
          pilotage_ordering_lead_time_hours: 0
        }
      };

      const result = calculatePortCallCost(gothenburgPort, input);

      // Verify we have all three billers
      expect(result.billers).toHaveLength(2); // Port of Gothenburg and APM Terminals
      
      // Find Port of Gothenburg biller
      const portBiller = result.billers.find(b => b.biller === 'Port of Gothenburg');
      expect(portBiller).toBeDefined();
      
      // Find APM Terminals biller
      const apmBiller = result.billers.find(b => b.biller === 'APM Terminals Gothenburg');
      expect(apmBiller).toBeDefined();
      
      // Calculate expected port dues:
      // 0-20,000: 20,000 * 1.96 = 39,200
      // 20,000-40,000: 20,000 * 1.71 = 34,200
      // 40,000-55,000: 15,000 * 1.15 = 17,250
      // Total: 39,200 + 34,200 + 17,250 = 90,650 (above minimum of 500)
      const portDuesFee = portBiller!.fees.find(f => f.fee_family === 'port_dues');
      expect(portDuesFee).toBeDefined();
      expect(portDuesFee!.amount).toBe(90650);
      
      // Calculate expected waste dues:
      // 55,000 GT * 0.13 = 7,150
      const wasteFee = portBiller!.fees.find(f => f.fee_family === 'waste');
      expect(wasteFee).toBeDefined();
      expect(wasteFee!.amount).toBe(55000 * 0.13); // 7,150
      
      // Calculate expected terminal handling:
      // <=20ft: (375 + 375) * 377 = 750 * 377 = 282,750
      // >20ft: (375 + 375) * 535 = 750 * 535 = 401,250
      // Total: 282,750 + 401,250 = 684,000
      const handlingFees = apmBiller!.fees.filter(f => f.fee_family === 'terminal_handling');
      expect(handlingFees).toHaveLength(2);
      const totalHandling = handlingFees.reduce((sum, fee) => sum + fee.amount, 0);
      expect(totalHandling).toBe(750 * 377 + 750 * 535); // 684,000
      
      // Verify total is sum of all billers
      const expectedTotal = portBiller!.subtotal + apmBiller!.subtotal;
      expect(result.total).toBe(expectedTotal);
    });
  });
});
