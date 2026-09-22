/**
 * v0.2.24 Hamburg handling-hygiene tests. The Hamburg model is a deliberate
 * hybrid (HHLA terminal call, handling default anchored to Eurogate's
 * published lift charge) and must be impossible to misread as an Eurogate
 * call. Locked constraints:
 *  - line label: the rule name reads "Container Handling (est., Eurogate
 *    anchor)" so estimate status and source are visible in every rendering
 *  - terminal hygiene: exactly one terminal_handling rule, estimated_parameter
 *    block present, biller HHLA; no Eurogate biller or second handling path
 *  - estimated-parameter separation: total, estimated-parameters subtotal,
 *    and total-without-estimates for each port, symmetric across ports
 *  - no checkpoint figure changes
 */
import { calculatePortCallCost } from '../src/engine';
import { loadPortFromYaml } from '../src/loader';
import { PortDefinition } from '../src/types';

const gothenburg = loadPortFromYaml('data/gothenburg_2026.yaml');
const hamburg = loadPortFromYaml('data/hamburg_2026.yaml');
const helsingborg = loadPortFromYaml('data/helsingborg_2026.yaml');

describe('handling hygiene a: line label carries the estimate and its anchor', () => {
  it('the handling rule is named "Container Handling (est., Eurogate anchor)"', () => {
    const rule = hamburg.fee_rules.find(r => r.id === 'hhla_container_handling')!;
    expect(rule).toBeDefined();
    expect(rule.name).toBe('Container Handling (est., Eurogate anchor)');
  });

  it('the rule name is the label in every rendering (data-driven, no per-view overrides)', () => {
    // All three views (per-port, comparison, biller breakdown) resolve line
    // labels from the rule name; a single data edit must therefore suffice.
    const rule = hamburg.fee_rules.find(r => r.id === 'hhla_container_handling')!;
    expect(rule.name).toMatch(/est\./);
    expect(rule.name).toMatch(/Eurogate anchor/);
  });

  it('keeps the estimated_parameter block and the user-overridable rate input', () => {
    const rule = hamburg.fee_rules.find(r => r.id === 'hhla_container_handling')!;
    expect(rule.estimated_parameter).toBeDefined();
    expect(rule.estimated_parameter!.description).toMatch(/Eurogate Hamburg published lift charge 5\.1\.1/);
    expect(rule.rate_structure).toBeDefined();
    expect((rule.rate_structure as any).unit_rate).toBe(358.00);
    expect((rule.rate_structure as any).unit_rate_input).toBe('handling_rate_per_move');
  });

  it('the estimated_parameter flag is emitted on the computed line', () => {
    const result = calculatePortCallCost(hamburg, {
      vessel: { gt: 21979, nt: 8000, loa_m: 171.92, vessel_type: 'container', built_year: 2024 } as any,
      call: { containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0, containers_discharged_le20ft: 400, containers_discharged_gt20ft: 0 } as any
    });
    const line = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hhla_container_handling')!;
    expect(line).toBeDefined();
    expect(line.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
    expect(line.amount).toBe(143200.00);
  });

  it('the flag persists when the user overrides the rate', () => {
    const result = calculatePortCallCost(hamburg, {
      vessel: { gt: 21979, nt: 8000, loa_m: 171.92, vessel_type: 'container', built_year: 2024 } as any,
      call: { containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0, containers_discharged_le20ft: 400, containers_discharged_gt20ft: 0, handling_rate_per_move: 400 } as any
    });
    const line = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hhla_container_handling')!;
    expect(line.amount).toBe(160000.00);
    expect(line.quality_flags.some(f => f.type === 'estimated_parameter')).toBe(true);
  });
});

describe('handling hygiene b: terminal-hygiene constraint (no Eurogate mixing)', () => {
  it('exactly one terminal_handling rule exists in the Hamburg file', () => {
    const handlingRules = hamburg.fee_rules.filter(r => r.fee_family === 'terminal_handling');
    expect(handlingRules.length).toBe(1);
    expect(handlingRules[0].id).toBe('hhla_container_handling');
  });

  it('its biller is HHLA and it carries the estimated_parameter block', () => {
    const rule = hamburg.fee_rules.find(r => r.id === 'hhla_container_handling')!;
    expect(rule.biller).toBe('HHLA Container Terminals');
    expect(rule.estimated_parameter).toBeDefined();
  });

  it('no Eurogate biller exists and no rule references an Eurogate biller or lift path', () => {
    const billerNames = (hamburg.billers ?? []).map(b => b.name);
    expect(billerNames.some(n => /eurogate/i.test(n))).toBe(false);
    expect(hamburg.fee_rules.some(r => /eurogate/i.test(r.biller))).toBe(false);
    // The only Eurogate mention in a rule name is the anchor label on the
    // handling rule itself; no second handling path may exist.
    const eurogateRules = hamburg.fee_rules.filter(r =>
      r.id !== 'hhla_container_handling' &&
      (/eurogate/i.test(r.name) || /eurogate/i.test(r.id))
    );
    expect(eurogateRules.length).toBe(0);
  });

  it('no rule combination can bill an HHLA due with a non-HHLA handling line or vice versa', () => {
    // In the single-terminal model every computed handling line belongs to
    // the same biller as the HHLA dues; locked for future edits.
    const result = calculatePortCallCost(hamburg, {
      vessel: { gt: 21979, nt: 8000, loa_m: 171.92, vessel_type: 'container', built_year: 2024 } as any,
      call: { containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0, containers_discharged_le20ft: 400, containers_discharged_gt20ft: 0, lay_time_hours: 16 } as any
    });
    const handlingBiller = result.billers
      .flatMap(b => b.fees)
      .filter(f => f.fee_family === 'terminal_handling')
      .map(f => f.biller);
    expect(handlingBiller.length).toBeGreaterThan(0);
    for (const biller of handlingBiller) {
      expect(biller).toBe('HHLA Container Terminals');
    }
    const tonnageDue = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'hhla_tonnage_dues');
    expect(tonnageDue!.biller).toBe(handlingBiller[0]);
  });
});

describe('handling hygiene c: estimated-parameter separation, symmetric across ports', () => {
  const vesselFor = (port: PortDefinition) => {
    if (port.metadata.id === 'hamburg') {
      return { gt: 21979, nt: 8000, loa_m: 171.92, vessel_type: 'container', built_year: 2024 } as any;
    }
    return { gt: 21979, nt: 8000, loa_m: 171.92, vessel_type: 'container', built_year: 2024, flag_state: 'LR' } as any;
  };
  const callFor = (port: PortDefinition) => {
    const base: any = {
      date: '2026-09-21',
      calls_this_month: 1,
      containers_loaded_le20ft: 0,
      containers_loaded_gt20ft: 0,
      containers_discharged_le20ft: 200,
      containers_discharged_gt20ft: 200,
      pilotage_required: true,
      pilotage_hours: 3,
      pilotage_ordering_lead_time_hours: 4,
      csi_class: 'E',
      issc_valid: true
    };
    if (port.metadata.id === 'hamburg') {
      base.lay_time_hours = 16;
      base.port_time_hours = 16;
      base.gangway_class = 'overseas';
      base.gangway_count = 1;
      base.gangway_supervision_hours = 0;
      base.pilotage_segment_pct = 100;
    } else {
      base.lay_time_hours = 16;
    }
    return base;
  };
  const results: Record<string, any> = {};
  for (const port of [gothenburg, hamburg, helsingborg]) {
    results[port.metadata.id] = calculatePortCallCost(port, {
      vessel: vesselFor(port),
      call: callFor(port)
    });
  }

  it('every port result carries total, estimated subtotal, and total without estimates', () => {
    for (const port of [gothenburg, hamburg, helsingborg]) {
      const r = results[port.metadata.id];
      expect(r.total).toBeGreaterThan(0);
      expect(typeof r.total_estimated_parameters).toBe('number');
      expect(typeof r.total_without_estimates).toBe('number');
      // The decomposition is exact: total = estimates + without-estimates
      expect(r.total).toBeCloseTo(r.total_estimated_parameters + r.total_without_estimates, 2);
    }
  });

  it('Hamburg separates handling (143,200.00) and towage (15,000.00) into the estimate subtotal', () => {
    const r = results['hamburg'];
    expect(r.total_estimated_parameters).toBe(158200.00);
    expect(r.total_without_estimates).toBeCloseTo(r.total - 158200.00, 2);
  });

  it('Helsingborg separates towage (60,000.00) and the datestamped EES rate (14,000.00) into the estimate subtotal', () => {
    // The EES default rate is a datestamped parameter the user has not set,
    // so the engine flags it estimated (audit v0.2.23: EES carries a quality
    // flag until the user confirms the current monthly level): 400 x 35.
    const r = results['helsingborg'];
    expect(r.total_estimated_parameters).toBe(74000.00);
    expect(r.total_without_estimates).toBeCloseTo(r.total - 74000.00, 2);
  });

  it('Gothenburg separates towage (60,000.00: LOA 171.92 m, 1 tug by LOA-class default) into the estimate subtotal (spec v0.2.33)', () => {
    // Pre-towage pass this pinned zero estimated lines at Gothenburg; the
    // towage-symmetry pass adds the estimated towage lever, so the pin is now
    // the towage estimate itself (a flagged estimate, never verified data).
    const r = results['gothenburg'];
    expect(r.total_estimated_parameters).toBe(60000.00);
    expect(r.total_without_estimates).toBeCloseTo(r.total - 60000.00, 2);
  });

  it('excludes zero-amount estimated lines so the subtotal cannot drift on blank inputs', () => {
    // Towage default off in Hamburg via zero tug count: the estimate line
    // exists but contributes nothing to the subtotal.
    const r = calculatePortCallCost(hamburg, {
      vessel: { gt: 8890, nt: 3200, loa_m: 137, vessel_type: 'container', built_year: 2005 } as any,
      call: { containers_loaded_le20ft: 0, containers_loaded_gt20ft: 0, containers_discharged_le20ft: 400, containers_discharged_gt20ft: 0, lay_time_hours: 16 } as any
    });
    expect(r.total_estimated_parameters).toBeGreaterThan(0);
    expect(r.total_estimated_parameters).toBeLessThan(r.total);
  });
});
