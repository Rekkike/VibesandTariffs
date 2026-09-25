// Port-generalization pins, web side (spec v0.2.59, refactor pass 1).
//
// Items 3-5 of the pass: the comparison basis and every port's conversion
// path come from data (a port with an undeclared currency fails loudly,
// never ranks on raw amounts); the comparison's fresh-load selection is
// bounded (first four ports, all three today - identical DOM); the
// comparison columns render cheapest-first on the converted basis (the
// same single ranking rule as the cheapest/most-expensive markers); and
// the workspace's port-gated inputs and the operator MenuItems are
// profile-driven (input_profile data), not port-id JSX conditionals.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

import {
  toComparisonBasis,
  rankByConvertedBasis,
  rankOrderByConvertedBasis,
  resolveComparisonBasis,
  declaredRateFor,
  type DeclaredRateRow,
  type ExchangeRateInfo
} from './conversion';
import { ComparisonView, __setMobileQueryForTests } from './App';
import { DEFAULT_VESSEL, allPortResetFields, defaultCall, portInputProfile, portResetFields } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import * as fs from 'fs';
import * as path from 'path';
import { readDecomposedAppSource } from './appSource';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

const rate = (r: number, isDefault = false): ExchangeRateInfo => ({
  rate: r,
  date: '2026-09-21',
  source: isDefault ? 'ECB euro reference rate (SEK per EUR)' : 'User-entered rate',
  is_default: isDefault
});

const registryRows = ((portsRegistry as any).exchange_rates ?? []) as DeclaredRateRow[];
const ctx = resolveComparisonBasis(registryRows);

describe('currency declaration is data (spec v0.2.59)', () => {
  it('the registry declares SEK as the comparison basis with the EUR conversion path', () => {
    expect(ctx.basis).toBe('SEK');
    expect(ctx.rows).toHaveLength(1);
    expect(ctx.rows[0]).toEqual({
      from_currency: 'EUR',
      to_currency: 'SEK',
      rate: 11.275,
      as_of: '2026-09-21',
      source: 'ECB euro reference rate (SEK per EUR)'
    });
  });

  it('a declared currency converts through the context exactly as before (EUR at 11.275)', () => {
    const conv = toComparisonBasis(802_180, 'EUR', rate(11.275, true), ctx);
    expect(conv).toEqual({ amount: 802_180 * 11.275, converted: true });
    const native = toComparisonBasis(1_000_000, 'SEK', rate(11.275, true), ctx);
    expect(native).toEqual({ amount: 1_000_000, converted: false });
  });

  it('red proof: a port with an undeclared currency fails loudly - never ranks on raw amounts', () => {
    // A future DKK port with no DKK rate row: the conversion throws, the
    // comparison never silently renders it unconverted while the ranking
    // orders its raw DKK amounts against SEK amounts.
    const dkkTotals = [
      { portId: 'gothenburg', amount: 1_534_126, currency: 'SEK' },
      { portId: 'aarhus', amount: 900_000, currency: 'DKK' }
    ];
    expect(() => toComparisonBasis(900_000, 'DKK', rate(11.275, true), ctx))
      .toThrow(/no declared conversion path for 'DKK'/);
    expect(() => rankByConvertedBasis(dkkTotals, rate(11.275, true), ctx))
      .toThrow(/no declared conversion path for 'DKK'/);
    expect(() => rankOrderByConvertedBasis(dkkTotals, rate(11.275, true), ctx))
      .toThrow(/no declared conversion path for 'DKK'/);
  });

  it('declaring the DKK row makes the port comparable with zero code change (data-only fix)', () => {
    const dkkCtx = resolveComparisonBasis([
      ...registryRows,
      { from_currency: 'DKK', to_currency: 'SEK', rate: 1.5, as_of: '2026-09-21', source: 'test fixture' }
    ]);
    const conv = toComparisonBasis(900_000, 'DKK', rate(11.275, true), dkkCtx);
    expect(conv).toEqual({ amount: 900_000 * 11.275, converted: true });
    expect(() => declaredRateFor(dkkCtx, 'DKK')).not.toThrow();
  });

  it('without a context the legacy pure-function behavior stands (module testable without the registry)', () => {
    // The v0.2.31 unit-test surface: toComparisonBasis/rank* without a
    // context keep the resolved-rate conversion for any non-basis currency.
    expect(toComparisonBasis(802_180, 'EUR', rate(11.275, true)))
      .toEqual({ amount: 802_180 * 11.275, converted: true });
    const ranking = rankByConvertedBasis([
      { portId: 'gothenburg', amount: 1_534_126, currency: 'SEK' },
      { portId: 'hamburg', amount: 861_430.56, currency: 'EUR' }
    ], rate(11.275, true));
    expect(ranking.mostExpensivePortId).toBe('hamburg');
  });
});

describe('comparison scalability controls (spec v0.2.59)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    __setMobileQueryForTests(() => true);
  });

  const renderComparison = async (
    mobile: boolean,
    selectedPortIds: string[] = LOADED_PORTS.map(p => p.metadata.id)
  ) => {
    __setMobileQueryForTests(() => mobile);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={selectedPortIds}
          onSelectionChange={() => {}}
          activeVessel="TEST"
        />
      );
    });
    return { container, root };
  };

  afterEach(async () => {
    __setMobileQueryForTests(null);
    const r = root;
    if (r) {
      await act(async () => { r.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the columns render cheapest-first by Grand Total on the converted basis (GOT, HEL, HAM at the default rate)', async () => {
    await renderComparison(false);
    const headerCells = Array.from(container!.querySelectorAll('.comparison-table thead th'))
      .map(th => th.textContent ?? '');
    // First cell is the row label.
    expect(headerCells).toHaveLength(LOADED_PORTS.length + 1);
    expect(headerCells[1]).toContain('Gothenburg');
    expect(headerCells[2]).toContain('Helsingborg');
    expect(headerCells[3]).toContain('Hamburg');
  });

  it('the cheapest/most-expensive markers are consistent with the column order (same single ranking rule)', async () => {
    await renderComparison(false);
    const cheapest = container!.querySelectorAll('.comparison-marker.comparison-cheapest');
    const mostExpensive = container!.querySelectorAll('.comparison-marker.comparison-most-expensive');
    expect(cheapest.length).toBe(1);
    expect(mostExpensive.length).toBe(1);
    expect((cheapest[0].closest('th')?.textContent ?? '')).toContain('Gothenburg');
    expect((mostExpensive[0].closest('th')?.textContent ?? '')).toContain('Hamburg');
  });

  it('the mobile cards render in the same ranked order (one rule, both layouts)', async () => {
    await renderComparison(true);
    const cards = Array.from(container!.querySelectorAll('.comparison-port-card'))
      .map(c => c.textContent ?? '');
    expect(cards.length).toBe(LOADED_PORTS.length);
    expect(cards[0]).toContain('Gothenburg');
    expect(cards[1]).toContain('Helsingborg');
    expect(cards[2]).toContain('Hamburg');
  });

  it('a subset selection renders only the selected ports - the bounded fresh-load default does not render unselected ports', async () => {
    await renderComparison(false, ['gothenburg', 'hamburg']);
    const headerCells = Array.from(container!.querySelectorAll('.comparison-table thead th'));
    expect(headerCells).toHaveLength(3); // label + 2 ports
    expect(headerCells[1].textContent).toContain('Gothenburg');
    expect(headerCells[2].textContent).toContain('Hamburg');
  });

  it('red proof: the fresh-load selection is bounded, not all-ports (slice(0, 4), all three today)', () => {
    const appSource = readDecomposedAppSource();
    expect(appSource).toMatch(/LOADED_PORTS\.slice\(0, 4\)\.map\(p => p\.metadata\.id\)/);
    expect(appSource).not.toMatch(/useState<string\[\]>\(\s*LOADED_PORTS\.map\(p => p\.metadata\.id\)/);
  });

  it('red proof: the comparison prose no longer hardcodes the port count', () => {
    const appSource = readDecomposedAppSource();
    expect(appSource).toContain('one identical call at every selected port');
    expect(appSource).not.toContain('one identical call at all three ports');
  });
});

describe('profile-driven workspace inputs (spec v0.2.59)', () => {
  it('every loaded port carries an input profile with sections and fields', () => {
    for (const port of LOADED_PORTS) {
      const profile = portInputProfile(port.metadata.id);
      expect(profile.sections.length).toBeGreaterThan(0);
      expect(profile.fields).toBeDefined();
    }
  });

  it('Hamburg\'s profile declares the operator list the select renders (data, not MenuItems in code)', () => {
    const profile = portInputProfile('hamburg');
    const operatorSection = profile.sections.find(sec => sec.operators);
    expect(operatorSection).toBeDefined();
    expect(operatorSection!.id).toBe('hamburg_call_parameters');
    // v0.2.66 promotion re-point (disclosed): the seeded default operator is
    // Eurogate, so the data list orders it first; HHLA is the switchable
    // terminal variant.
    expect(operatorSection!.operators!.map(op => op.value)).toEqual(['Eurogate', 'HHLA']);
    expect(operatorSection!.operators!.map(op => op.label)).toEqual([
      'EUROGATE Container Terminal Hamburg (default — reference operator)',
      'HHLA (CTA/CTB/CTT — switchable terminal variant)'
    ]);
  });

  it('red proof: the workspace gates read the profile, not port ids (the port-id JSX conditionals are gone)', () => {
    const appSource = readDecomposedAppSource();
    // The five former gates are profile-membership tests now.
    expect(appSource).toMatch(/profileSections\.has\('hamburg_call_parameters'\)/);
    expect(appSource).toMatch(/profileSections\.has\('helsingborg_call_parameters'\)/);
    expect(appSource).toMatch(/profileSections\.has\('gothenburg_ancillary'\)/);
    expect(appSource).toMatch(/profileFields\.has\('build_year'\)/);
    expect(appSource).toMatch(/profileFields\.has\('clean_shipping_index'\)/);
    // And no port-id conditional gates the workspace JSX anymore
    // (re-pointed at the v0.2.60 decomposition, disclosed deviation: the
    // workspace's modules, not the former App.tsx slice):
    const workspaceModules = ['portWorkspace.tsx', 'portWorkspaceInputs.tsx'];
    const workspace = workspaceModules
      .map(m => require('fs').readFileSync(require('path').join(__dirname, m), 'utf8'))
      .join('\n');
    expect(workspace).not.toMatch(/port\.metadata\.id === /);
    // The operator MenuItems are data-driven:
    expect(appSource).toMatch(/operatorSection\?\.operators \?\? \[\]\)\.map\(op =>/);
  });

  it('the three ports\' rendered inputs are unchanged (pixel-identical extraction): the terminalScope suite\'s operator-label pins hold unmodified', () => {
    // The DOM-level proof lives in the terminalScope suite (7 pins assert
    // both operator labels render from the select); here the pin is that
    // the labels the profile declares are byte-identical to the labels
    // the former hardcoded MenuItems carried (the extraction contract).
    const profile = portInputProfile('hamburg');
    const labels = profile.sections.find(sec => sec.operators)!.operators!.map(op => op.label);
    // v0.2.66 promotion re-point (disclosed): the labels follow the flipped
    // operator order (Eurogate default first, HHLA the switchable variant).
    expect(labels[0]).toBe('EUROGATE Container Terminal Hamburg (default — reference operator)');
    expect(labels[1]).toBe('HHLA (CTA/CTB/CTT — switchable terminal variant)');
  });
});

// Port-specific reset fields (spec v0.2.60, refactor pass 2 item 3): the
// last hand-kept per-port array is data now. Each port's input_profile
// declares its reset_fields; the App port-switch reset effect iterates
// the registry union - a new port's reset fields ship with its authoring.
describe('port-specific reset fields (spec v0.2.60)', () => {
  it('each port declares exactly its own reset_fields and the union covers every port-specific input', () => {
    const expected: Record<string, string[]> = {
      gothenburg: [
        'engine_tier', 'engine_tier_estimated', 'clean_shipping_index_class',
        'towage_cost_per_tug', 'tug_count', 'csi_class',
        'fossil_free_fuel_percentage', 'pilotage_hours', 'pilotage_extra_pilot',
        'pilotage_ordering_lead_time_hours', 'hatch_cover_count',
        'gearbox_count', 'lay_up_days', 'ops_electricity_price',
        'ops_demand_charge', 'ops_connection_charge', 'ops_per_gt_charge'
      ],
      hamburg: [
        'engine_tier', 'engine_tier_estimated', 'esi_noise_score',
        'towage_amount', 'handling_rate_per_move', 'gangway_class',
        'gangway_count', 'gangway_supervision_hours', 'hpa_berth_usage',
        'berth_type', 'berth_hours', 'quantum_prior_year_gt',
        'pilotage_segment_pct', 'waste_short_sea_reduction',
        'waste_alternative_fuel_reduction', 'waste_sustainable_waste_reduction',
        'ops_electricity_price', 'ops_demand_charge', 'ops_connection_charge',
        'ops_per_gt_charge', 'lashing_containers', 'twistlock_containers',
        'imo_containers', 'layby_hours', 'reefer_extra_days', 'small_call_containers'
      ],
      helsingborg: [
        'engine_tier', 'engine_tier_estimated', 'esi_score', 'esi_noise_score',
        'issc_valid', 'clean_shipping_index_class', 'ees_rate_per_move',
        'towage_cost_per_tug', 'tug_count', 'csi_class',
        'fossil_free_fuel_percentage', 'pilotage_hours', 'pilotage_extra_pilot',
        'pilotage_ordering_lead_time_hours', 'hatch_cover_count',
        'gearbox_count', 'lay_up_days', 'ops_electricity_price',
        'ops_demand_charge', 'ops_connection_charge', 'ops_per_gt_charge'
      ]
    };
    for (const port of LOADED_PORTS) {
      expect(portResetFields(port.metadata.id)).toEqual(expected[port.metadata.id]);
    }
    expect(allPortResetFields()).toEqual(expect.arrayContaining(expected.hamburg));
  });

  it('the App reset effect reads the registry union, not a hand-kept array (source pin)', () => {
    const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
    expect(appSource).not.toMatch(/PORT_SPECIFIC_CALL_FIELDS/);
    expect(appSource).toMatch(/allPortResetFields\(\)/);
    expect(appSource).not.toMatch(/portSpecificCallFields\s*=\s*\[/);
  });
});
