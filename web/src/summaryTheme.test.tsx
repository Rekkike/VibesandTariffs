// Summary-block and theme-contract pins (spec v0.2.51). The audit found two
// results-area blocks invisible in dark mode since their introduction:
// MUI sx hardcoded a light background (#f5f5f5) while text inherited the
// themed near-white --text-primary. The discipline these pins hold: no
// results-area surface may hardcode a color outside the :root token
// blocks; the retained summary block (Vessel Access Charges) is themed at
// the class level in both modes; the removed Vessel Summary recap stays
// removed (its one unique datum, the NT class, relocated to the NT field's
// helper text); and the default-call totals prove zero figure drift
// against the v0.2.50 baseline.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import fs from 'fs';
import path from 'path';
import { PortWorkspace } from './App';
import { calculatePortCallCost } from '@port-cost/core';
import type { CallInput, CostCalculationInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;

const engineTotal = (portId: string): number => {
  const port = LOADED_PORTS.find(p => p.metadata.id === portId)!;
  const call = defaultCall(portId);
  const input: CostCalculationInput = { vessel: DEFAULT_VESSEL, call };
  return calculatePortCallCost(port, input).total;
};

describe('themed-color discipline (spec v0.2.51)', () => {
  it('no hardcoded light backgrounds remain in the results area (the #f5f5f5 defect is gone)', () => {
    expect(appSource).not.toMatch(/backgroundColor:\s*'#f5f5f5'/);
    expect(appSource).not.toMatch(/backgroundColor:\s*'#fff/);
    expect(appSource).not.toMatch(/backgroundColor:\s*'white/);
  });
  it('the summary blocks use the themed class, not an sx background', () => {
    expect(appSource).toMatch(/className="results-summary-block"/);
    expect(appSource).not.toMatch(/<Box sx=\{\{ mb: 3, p: 2, backgroundColor/);
  });
  it('the #666 secondary-text siblings are themed via the comparison-secondary and results-timestamp classes', () => {
    expect(appSource).not.toMatch(/color:\s*'#666'/);
    expect(appSource).toMatch(/className="comparison-secondary"/);
    expect(appSource).toMatch(/className="results-timestamp"/);
  });
  it('index.css carries the themed block classes and the token variables they resolve to', () => {
    expect(cssSource).toMatch(/\.results-summary-block\s*\{/);
    expect(cssSource).toMatch(/\.results-timestamp\s*\{/);
    expect(cssSource).toMatch(/\.comparison-secondary\s*\{/);
    // The themed classes resolve to tokens, both modes render from one source
    const block = cssSource.match(/\.results-summary-block\s*\{[^}]+\}/)![0];
    expect(block).toMatch(/background:\s*var\(--surface-sunken\)/);
    expect(block).toMatch(/color:\s*var\(--text-primary\)/);
    // Light and dark palettes both define every token the classes use
    for (const token of ['--surface-sunken', '--text-primary', '--text-secondary', '--border']) {
      const darkBlock = cssSource.match(/:root\s*\{[\s\S]*?color-scheme: dark;/)![0];
      const lightBlock = cssSource.match(/:root\[data-theme='light'\]\s*\{[\s\S]*?color-scheme: light;/)![0];
      expect(darkBlock).toContain(token);
      expect(lightBlock).toContain(token);
    }
  });
  it('the stylesheet has no color literals outside the :root token blocks', () => {
    const stripped = cssSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/:root\s*\{[\s\S]*?\}/, '')
      .replace(/:root\[data-theme='light'\]\s*\{[\s\S]*?\}/, '');
    expect(stripped).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(stripped).not.toMatch(/rgba?\(/);
  });
});

describe('Vessel Summary recap disposition (spec v0.2.51)', () => {
  it('the recap is removed: no Vessel Summary block renders in the results area', () => {
    expect(appSource).not.toMatch(/Vessel Summary/);
  });
  it('its one unique datum survives: the NT class renders in the NT field helper at both states', () => {
    // entered NT -> "NT class N"; estimated library NT -> the estimate note
    // carries the class; blank NT -> the 0.55 x GT estimation note stands
    expect(appSource).toMatch(/NT class \$\{getNetTonnageClass\(state\.vessel\.nt\)\}/);
  });
  it('the dead CSI badge color map died with the recap (no orphaned helper)', () => {
    expect(appSource).not.toMatch(/getCsiClassColor/);
  });
});

describe('Vessel Access Charges block — retained and themed (spec v0.2.51)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  afterEach(async () => {
    if (root) { await act(async () => { root!.unmount(); }); }
    container?.remove();
    container = null;
    root = null;
  });

  const renderWorkspace = async (vessel: VesselInput, call: CallInput) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={GOTHENBURG}
          vessel={vessel}
          call={call}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
  };

  it('the block renders with the themed class and its contract disclosure sentence intact', async () => {
    await renderWorkspace(DEFAULT_VESSEL, defaultCall('gothenburg') as CallInput);
    const block = container!.querySelector('.results-summary-block');
    expect(block).not.toBeNull();
    expect(block!.textContent).toContain('Vessel Access Charges');
    expect(block!.textContent).toContain('effective — derived, not a published rate');
    expect(block!.textContent).not.toContain('Vessel Summary');
  });
  it('light mode unaffected: the block resolves the same themed class', async () => {
    // jsdom does not compute CSS custom properties or cascade class styles;
    // the class-level contract is the source of truth (stated limitation),
    // and both modes read the same token names (pinned above).
    await renderWorkspace(DEFAULT_VESSEL, defaultCall('gothenburg') as CallInput);
    expect(appSource).toMatch(/className="results-summary-block"/);
  });
});

describe('zero figure drift against the v0.2.50 baseline (spec v0.2.51)', () => {
  it('default-call totals are unchanged to the cent at all three ports', () => {
    expect(engineTotal('gothenburg')).toBe(3007051.15);
    expect(engineTotal('hamburg')).toBe(2313489.31);
    expect(engineTotal('helsingborg')).toBe(8481257.4);
  });
});
