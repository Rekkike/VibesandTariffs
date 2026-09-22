// Port Call Cost Analyzer - Core Module Index
// Main exports for the core engine

export * from './types';
export * from './engine';

// Default form state (spec v0.2.28 default-call contract: worst-case
// published-rate call; environmental levers blank = not entered)
export * from './defaults';
export * from './classification';

// KNOWN_FEE_FAMILIES is a constant that doesn't depend on fs
// We'll define it directly here to avoid importing loader in browser context
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
  'vessel_fee',
  'readiness_fee',
  'cargo_fee',
  'ops',
  'lay_up'
]);
