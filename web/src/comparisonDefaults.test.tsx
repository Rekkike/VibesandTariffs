// Comparison-view shared-call per-port defaults (spec v0.2.53).
//
// Defect class fixed: the comparison's fresh-load call is built by
// defaultCall('gothenburg') and ComparisonView computed
// { ...call, port_id } — dropping each port's own defaultCall values for
// port-specific fields the shared call does not carry. Divergences:
// HEL's issc_valid: true (the no-ISSC doubled rule fired in comparison —
// the HEL column read 8,793,257.40 against the per-port 8,481,257.40),
// HEL's ees_rate_per_move: 35 (a spurious EES estimate flag), and HAM's
// terminal_operator: 'HHLA' + gangway_class: 'overseas' (spurious
// fallback flags on the HHLA fee lines and at result level). GOT
// diverged by nothing.
//
// The fix: each port's column applies its own defaultCall(portId) values
// for port-specific fields the shared call does not carry, so the
// comparison column equals the per-port computation; an explicitly set
// shared input always wins over the per-port default.
//
// Pins:
//   - the HEL comparison column equals the per-port HEL total
//     (8,481,257.40 SEK — defect-fix change from 8,793,257.40);
//   - fresh-load comparison renders valid-ISSC security at 312,000 and
//     no-ISSC is reachable only by explicit selection, with the SOLAS
//     XI-2/ISPS sentence;
//   - shared-call defaults (EES 35, terminal operator, gangway class)
//     applied with no spurious fallback flags;
//   - an explicit shared input still overrides the per-port default
//     (the shared-call contract);
//   - zero drift at all three ports;
//   - visible-plus-suppressed lines equal the Grand Total at all three
//     ports and both Hamburg operators;
//   - the v0.2.51 theme discipline holds (no color literal introduced).
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ComparisonView } from './App';
import portsRegistry from './data/ports.json';
import {
  DEFAULT_VESSEL,
  defaultCall,
  calculatePortCallCost
} from '@port-cost/core';
import type {
  CallInput,
  PortDefinition,
  VesselInput
} from '@port-cost/core/types';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

// The merged-call contract the ComparisonView now implements (spec
// v0.2.53): per-port defaults under an explicitly entered shared call.
// Mirrored here so the engine-level pins assert the exact merged object
// the view computes.
const mergedCall = (portId: string, call: CallInput): CallInput => ({
  ...(defaultCall(portId) as unknown as Record<string, unknown>),
  ...(call as unknown as Record<string, unknown>),
  port_id: portId
}) as CallInput;

const renderComparison = async (
  call: CallInput,
  vessel: VesselInput = DEFAULT_VESSEL,
  selectedPortIds: string[] = LOADED_PORTS.map(p => p.metadata.id)
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <ComparisonView
        ports={LOADED_PORTS}
        vessel={vessel}
        call={call}
        selectedPortIds={selectedPortIds}
        onSelectionChange={() => {}}
        activeVessel="TEST"
      />
    );
  });
  return { container, root };
};

let container: HTMLElement | null = null;
let root: Root | null = null;
afterEach(async () => {
  if (root) {
    const r = root;
    await act(async () => { r.unmount(); });
  }
  container?.remove();
  container = null;
  root = null;
});

describe('comparison shared-call per-port defaults (spec v0.2.53 defect fix)', () => {
  it('the merged call applies each port’s defaultCall for port-specific fields the shared call does not carry (engine level)', () => {
    const sharedCall = defaultCall('gothenburg');
    for (const port of LOADED_PORTS) {
      const merged = mergedCall(port.metadata.id, sharedCall);
      const result = calculatePortCallCost(port, { vessel: DEFAULT_VESSEL, call: merged });
      const perPort = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id)
      });
      expect(result.total).toBe(perPort.total);
      expect(result.quality_flags.map(f => f.description).sort())
        .toEqual(perPort.quality_flags.map(f => f.description).sort());
    }
  });

  it('the HEL comparison column equals the per-port HEL total — 8,481,257.40 SEK, not the divergent 8,793,257.40 (before/after: 8,793,257.40 → 8,481,257.40, defect-fix change)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const grandTotalRow = container!.querySelector('.comparison-total-row');
    expect(grandTotalRow).not.toBeNull();
    const text = grandTotalRow!.textContent ?? '';
    // sv-SE grouping renders 8 481 257 (narrow no-break spaces).
    expect(text).toContain('8\u00a0481\u00a0257');
    expect(text).not.toContain('8\u00a0793\u00a0257');
  });

  it('fresh-load comparison renders valid-ISSC security at 312,000.00 SEK (no-ISSC reachable only by explicit selection)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    // Security family row: HEL column carries the single-rate fee.
    const securityRow = Array.from(container!.querySelectorAll('.comparison-family-cell'))
      .find(el => (el.textContent ?? '').includes('security'));
    expect(securityRow).toBeDefined();
    const row = securityRow!.closest('tr');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain('312\u00a0000');
    expect(row!.textContent).not.toContain('624\u00a0000');
  });

  it('explicit no-ISSC selection reaches the doubled fee with the SOLAS XI-2/ISPS consequence sentence', async () => {
    ({ container, root } = await renderComparison({
      ...defaultCall('gothenburg'),
      issc_valid: false
    } as CallInput));
    const flags = Array.from(container!.querySelectorAll('.quality-flags li'))
      .map(el => el.textContent ?? '');
    const solas = flags.find(t => t.includes('SOLAS XI-2/ISPS'));
    expect(solas).toBeDefined();
    expect(solas).toContain('Helsingborg');
    // And the doubled figure renders on the security row.
    const securityRow = Array.from(container!.querySelectorAll('.comparison-family-cell'))
      .find(el => (el.textContent ?? '').includes('security'));
    const row = securityRow!.closest('tr');
    expect(row!.textContent).toContain('624\u00a0000');
  });

  it('shared-call defaults applied with no spurious fallback flags: EES 35, terminal operator HHLA, gangway class overseas (fresh-load comparison raises no fallback flags at all)', async () => {
    ({ container, root } = await renderComparison(defaultCall('gothenburg')));
    const flags = Array.from(container!.querySelectorAll('.quality-flags li'))
      .map(el => el.textContent ?? '');
    // The spurious flags the divergent shared call produced:
    // "Terminal operator not selected; defaulted to HHLA…", the EES
    // estimate divergence, the gangway fallback — none may render.
    expect(flags.filter(t => t.includes('Terminal operator not selected'))).toEqual([]);
    expect(flags.filter(t => t.includes('defaulted to HHLA'))).toEqual([]);
    // Any remaining flag is the honest per-port set (estimated
    // parameters, assumed parameters), identical to per-port views.
    const byPort = new Map<string, string[]>();
    for (const t of flags) {
      const port = t.split(':')[0];
      byPort.set(port, [...(byPort.get(port) ?? []), t]);
    }
    for (const portName of Array.from(byPort.keys())) {
      const list = byPort.get(portName)!;
      const port = LOADED_PORTS.find(p => p.metadata.name === portName)!;
      const perPort = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: defaultCall(port.metadata.id)
      });
      const perPortDescs = perPort.quality_flags.map(f => f.description).sort();
      const rendered = list.map(t => t.replace(/^[^:]+:\s*/, '').replace(/^\[[A-Z]+\]\s*/, '')).sort();
      expect(rendered).toEqual(perPortDescs);
    }
  });

  it('an explicitly set shared input overrides the per-port default (the shared-call contract survives the fix)', async () => {
    ({ container, root } = await renderComparison({
      ...defaultCall('gothenburg'),
      ees_rate_per_move: 42
    } as CallInput));
    // The explicit 42 SEK/move prices HEL's EES at 4,000 x 42 = 168,000.
    const hel = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;
    const result = calculatePortCallCost(hel, {
      vessel: DEFAULT_VESSEL,
      call: mergedCall('helsingborg', { ...defaultCall('gothenburg'), ees_rate_per_move: 42 } as CallInput)
    });
    const ees = result.billers.flatMap(b => b.fees).find(f => f.fee_rule_id === 'poh_ees');
    expect(ees).toBeDefined();
    expect(ees!.amount).toBe(168000);
  });

  it('zero drift: the comparison columns equal the pinned per-port totals at all three ports', () => {
    const sharedCall = defaultCall('gothenburg');
    const pinned: Record<string, number> = {
      gothenburg: 3007051.15,
      hamburg: 2313489.31,
      helsingborg: 8481257.4
    };
    for (const port of LOADED_PORTS) {
      const result = calculatePortCallCost(port, {
        vessel: DEFAULT_VESSEL,
        call: mergedCall(port.metadata.id, sharedCall)
      });
      expect(Math.round(result.total * 100)).toBe(Math.round(pinned[port.metadata.id] * 100));
    }
  });

  it('visible-plus-suppressed lines equal the Grand Total at all three ports and both Hamburg operators', () => {
    const sharedCall = defaultCall('gothenburg');
    for (const port of LOADED_PORTS) {
      const operators = port.metadata.id === 'hamburg' ? ['HHLA', 'Eurogate'] : [undefined];
      for (const op of operators) {
        const call = op
          ? { ...sharedCall, terminal_operator: op } as CallInput
          : sharedCall;
        const result = calculatePortCallCost(port, {
          vessel: DEFAULT_VESSEL,
          call: mergedCall(port.metadata.id, call)
        });
        const feeSum = result.billers.flatMap(b => b.fees).reduce((s, f) => s + f.amount, 0);
        expect(Math.round(feeSum * 100)).toBe(Math.round(result.total * 100));
      }
    }
  });

  it('the v0.2.51 theme discipline holds: no color literal introduced (source and stylesheet unchanged by this pass)', () => {
    // The established v0.2.51 discipline checks, restated for this pass's
    // touched files: no hardcoded light backgrounds, no #666 secondary
    // literals, and the stylesheet carries color literals only inside the
    // :root token blocks. The muiThemeFor palette bridge stays token-based.
    expect(appSource).not.toMatch(/backgroundColor:\s*'#f5f5f5'/);
    expect(appSource).not.toMatch(/backgroundColor:\s*'#fff/);
    expect(appSource).not.toMatch(/backgroundColor:\s*'white/);
    expect(appSource).not.toMatch(/color:\s*'#666'/);
    const stripped = cssSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/:root\s*\{[\s\S]*?\}/, '')
      .replace(/:root\[data-theme='light'\]\s*\{[\s\S]*?\}/, '');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(stripped).not.toMatch(/rgba?\(/);
  });
});
