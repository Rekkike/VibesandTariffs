// Port Call Cost Analyzer - YAML Loading Tests
// Tests that the canonical YAML file can be loaded and parsed correctly
// This ensures the browser-side loading path works

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { PortDefinition } from '../src/types';

describe('Canonical YAML Loading', () => {
  it('should load and parse the canonical Gothenburg 2026 YAML file', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    
    // Read the file
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse it using js-yaml (same as browser)
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    // Assert it's a valid PortDefinition
    expect(portData).toBeDefined();
    expect(portData.metadata).toBeDefined();
    expect(portData.metadata.id).toBe('gothenburg');
    expect(portData.metadata.name).toBe('Port of Gothenburg');
    expect(portData.metadata.currency).toBe('SEK');
    
    // Assert fee_rules exists and is an array
    expect(portData.fee_rules).toBeDefined();
    expect(Array.isArray(portData.fee_rules)).toBe(true);
    expect(portData.fee_rules.length).toBeGreaterThan(0);
  });

  it('should have all required fee families present', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    const feeFamilies = portData.fee_rules.map(r => r.fee_family);
    const uniqueFamilies = new Set(feeFamilies);
    
    // Required families from INTENDED_STATE.md
    const requiredFamilies = [
      'port_dues',
      'waste',
      'pilotage',
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
    
    for (const family of requiredFamilies) {
      expect(uniqueFamilies.has(family)).toBe(true);
    }
  });

  it('should have exactly 50 vessel_fee rules for the 10x5 matrix', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    const vesselFees = portData.fee_rules.filter(r => r.fee_family === 'vessel_fee');
    expect(vesselFees.length).toBe(50);
  });

  it('should have all 10 NT classes for vessel_fee', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    const vesselFees = portData.fee_rules.filter(r => r.fee_family === 'vessel_fee');
    const ntClasses = new Set(vesselFees.map(r => r.applicable_conditions?.nt_class));
    
    // Should have classes 1-10
    for (let i = 1; i <= 10; i++) {
      expect(ntClasses.has(i)).toBe(true);
    }
  });

  it('should have all 5 CSI classes for vessel_fee', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    const vesselFees = portData.fee_rules.filter(r => r.fee_family === 'vessel_fee');
    const csiClasses = new Set(vesselFees.map(r => r.applicable_conditions?.csi_class));
    
    // Should have classes A-E
    expect(csiClasses.has('A')).toBe(true);
    expect(csiClasses.has('B')).toBe(true);
    expect(csiClasses.has('C')).toBe(true);
    expect(csiClasses.has('D')).toBe(true);
    expect(csiClasses.has('E')).toBe(true);
  });

  it('should have Class 8 CSI A vessel fee with amount 34475', () => {
    const filePath = path.join(__dirname, '../data/gothenburg_2026.yaml');
    const yamlContent = fs.readFileSync(filePath, 'utf8');
    const portData = yaml.load(yamlContent) as PortDefinition;
    
    const vesselFeeClass8A = portData.fee_rules.find(
      r => r.fee_family === 'vessel_fee' && 
           r.applicable_conditions?.nt_class === 8 &&
           r.applicable_conditions?.csi_class === 'A'
    );
    
    expect(vesselFeeClass8A).toBeDefined();
    // rate_structure for vessel_fee is flat, so it has amount
    const flatRate = vesselFeeClass8A?.rate_structure as any;
    expect(flatRate.amount).toBe(34475);
  });
});
