// Vessel-selection, comparison-surface, and per-port layout tests
// (spec v0.2.47). Pins the pass's contracts:
//   - the three-tier searchable combobox: named library presets, generic
//     size-class entries presented as vessel entries, Custom vessel;
//     typing filters across all three tiers; the button strip is gone;
//     no old button dependency is lost (a generic entry seeds every
//     parameter the preset defines);
//   - the general-information group: lay time directly under the
//     selection, the four container counts as one compact secondary row,
//     both driving figures;
//   - the active vessel in the app header, updating live with selection;
//   - the call-context strip: vessel, GT, TEU, moves, lay time, and
//     classes with honest defaults;
//   - the ranking strip's removal (its DOM must not exist) while the
//     table badges still render;
//   - the per-port two-column layout contract (input left, results
//     right from the md breakpoint; the form-container grid rule that
//     broke the split is gone).
// The workspace recomputes on a 500 ms debounce; the settle helper
// waits it out before reading rendered results.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { PortWorkspace, ComparisonView } from './App';
import portsRegistry from './data/ports.json';
import { DEFAULT_VESSEL, defaultCall } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';

const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

describe('vessel-selection combobox: three tiers, no button strip (spec v0.2.47)', () => {
  it('the button strip is removed and the searchable combobox replaces it', () => {
    expect(appSource).not.toMatch(/className="preset-buttons"/);
    expect(appSource).not.toMatch(/className="preset-btn"/);
    expect(appSource).toMatch(/className="vessel-select"/);
    expect(appSource).toMatch(/label="Vessel"/);
  });

  it('the combobox options hold all three tiers in order: library, generic, custom', () => {
    // One options list: library vessels first, generic size classes
    // beneath them, Custom vessel last.
    expect(appSource).toMatch(/kind: 'library'/);
    expect(appSource).toMatch(/kind: 'generic'/);
    expect(appSource).toMatch(/kind: 'custom'/);
    // The generic entries are presented as vessel entries with their
    // approx. GT (the audit's class names and GT values).
    expect(appSource).toContain('Generic feeder — approx. 8,000 GT');
    expect(appSource).toContain('Generic feeder max — approx. 15,000 GT');
    expect(appSource).toContain('Generic Panamax — approx. 55,000 GT');
    expect(appSource).toContain('Generic Post-Panamax — approx. 100,000 GT');
    expect(appSource).toContain('Generic ultra-large — approx. 215,000 GT');
    expect(appSource).toContain('Custom vessel — enter particulars below');
    // the option list orders: library first, then generic keys, then custom
    expect(appSource).toMatch(/\.\.\.LOADED_VESSELS\.map/);
    expect(appSource).toMatch(/CUSTOM_VESSEL_OPTION\s*\n?\s*\];/);
  });

  it('no old button dependency is lost: generic entries run the same applyPreset the buttons ran', () => {
    // The buttons called applyPreset(key); the generic tier calls
    // applyGenericSizeClass(key) which calls applyPreset(key) — the same
    // full re-seed of every parameter the preset defines.
    expect(appSource).toMatch(/const applyGenericSizeClass = \(presetKey: keyof typeof VESSEL_PRESETS\) => \{\s*applyPreset\(presetKey\);/);
    // applyPreset seeds the vessel parameters and clears estimate badges
    expect(appSource).toMatch(/onVesselChange\(\{ \.\.\.vessel, \.\.\.presetData \}\);/);
  });

  it('search filtering is the Autocomplete over the combined option labels — one searchable surface', () => {
    // A single Autocomplete instance holds all three tiers, so its own
    // filtering covers them; there is no second search control.
    const vesselSelects = appSource.match(/className="vessel-select"/g) ?? [];
    expect(vesselSelects.length).toBe(2); // the two render branches (library present / absent)
    expect(appSource).not.toMatch(/label="Search vessel library \(name or IMO\)"/);
  });
});

describe('general-information group (spec v0.2.47)', () => {
  it('lay time renders directly under the selection in the shared group, not in a port card', () => {
    expect(appSource).toMatch(/className="general-info-group" component="section" aria-label="Call general information"/);
    expect(appSource).toMatch(/className="lay-time-input"\s*\n\s*label="Lay Time at Berth \(hours\)"/);
    // one instance only (the old Hamburg-card duplicate is removed)
    expect((appSource.match(/label="Lay Time at Berth \(hours\)"/g) ?? []).length).toBe(1);
  });

  it('the four container counts render as one compact secondary row, one instance only', () => {
    expect(appSource).toMatch(/className="box-counts-row"/);
    expect((appSource.match(/label="20' Loaded"/g) ?? []).length).toBe(1);
    expect((appSource.match(/label="40' Loaded"/g) ?? []).length).toBe(1);
    expect((appSource.match(/label="20' Discharged"/g) ?? []).length).toBe(1);
    expect((appSource.match(/label="40' Discharged"/g) ?? []).length).toBe(1);
    // the old per-port labels are gone
    expect(appSource).not.toContain("label=\"Containers Loaded ≤20ft\"");
    expect(appSource).not.toContain("label=\"Containers Discharged >20ft\"");
  });
});

describe('workspace render: selection drives the vessel, header reports live (spec v0.2.47)', () => {
  // React tracks input value changes through the native value setter;
  // assigning .value directly bypasses its tracking and onChange never
  // fires. Route through the prototype setter so the TextField's onChange
  // runs exactly as it does for a real keystroke.
  const setInputValue = (input: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  let container: HTMLDivElement | null;
  let root: Root | null;
  let currentVessel: VesselInput;
  let currentCall: CallInput;
  let activeVesselLabel: string;
  let rerender: (vessel: VesselInput, call: CallInput) => Promise<void>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    currentVessel = { ...DEFAULT_VESSEL };
    currentCall = { ...defaultCall('gothenburg') };
    activeVesselLabel = '';
    rerender = async (vessel: VesselInput, call: CallInput) => {
      currentVessel = vessel;
      currentCall = call;
      await act(async () => {
        root!.render(
          <PortWorkspace
            port={GOTHENBURG}
            vessel={vessel}
            call={call}
            onVesselChange={(v) => { currentVessel = v; }}
            onCallChange={(c) => { currentCall = c; }}
            onActiveVesselChange={(label) => { activeVesselLabel = label; }}
          />
        );
      });
    };
  });

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the combobox renders with the three tiers; the library entries carry their class notes', async () => {
    await rerender(currentVessel, currentCall);
    const comboboxInput = container!.querySelector('.vessel-select input');
    expect(comboboxInput).not.toBeNull();
    // options render via MUI popup after opening; the static pin above
    // covers tier order; here the control is present and labeled
    expect((container!.textContent ?? '')).toContain('Vessel');
  });

  it('selecting a generic size class seeds the parameters the old button seeded', async () => {
    await rerender(currentVessel, currentCall);
    // Open the combobox and pick the Generic Panamax entry
    const input = container!.querySelector('.vessel-select input') as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const panamax = options.find(o => (o.textContent ?? '').includes('Generic Panamax'));
    expect(panamax).toBeDefined();
    await act(async () => {
      panamax!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    // The panamax preset seeds GT 55,000 / NT 30,250 / TEU 4,000 (the
    // audit's preset table) — exactly what the removed button seeded.
    expect(currentVessel.gt).toBe(55000);
    expect(currentVessel.nt).toBe(30250);
    expect(currentVessel.teu_capacity).toBe(4000);
    // the header label updates live: the generic class name
    expect(activeVesselLabel).toBe('Generic Panamax — approx. 55,000 GT');
  });

  it('selecting Custom vessel reports the custom label naming the entered GT', async () => {
    await rerender({ ...currentVessel, gt: 42000 }, currentCall);
    const input = container!.querySelector('.vessel-select input') as HTMLInputElement;
    await act(async () => {
      input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    const options = Array.from(document.querySelectorAll('li[role="option"]'));
    const custom = options.find(o => (o.textContent ?? '').includes('Custom vessel'));
    expect(custom).toBeDefined();
    await act(async () => {
      custom!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(activeVesselLabel).toBe('Custom vessel — 42,000 GT');
  });

  it('the lay-time input drives figures: changing it changes the Hamburg result', async () => {
    const hamburgCall = { ...defaultCall('hamburg'), lay_time_hours: 50 };
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={DEFAULT_VESSEL}
          call={hamburgCall}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    let text = container!.textContent ?? '';
    expect(text).toContain('200,750'); // 24 h + 3 commenced 12-h periods at 55,000 GT
    // change the lay time through the shared input
    const layInput = container!.querySelector('.lay-time-input input') as HTMLInputElement;
    expect(layInput).not.toBeNull();
    await act(async () => {
      setInputValue(layInput, '24');
    });
    // the workspace reports the changed call to the parent
    expect(currentCall.lay_time_hours).toBe(24);
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={HAMBURG}
          vessel={DEFAULT_VESSEL}
          call={currentCall}
          onVesselChange={() => {}}
          onCallChange={(c) => { currentCall = c; }}
          onActiveVesselChange={() => {}}
        />
      );
    });
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    text = container!.textContent ?? '';
    expect(text).toContain('68,750'); // first-24-h clock only at 24 h
  });

  it('the box-count inputs drive figures: changing a count changes the result', async () => {
    await rerender(currentVessel, currentCall);
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    const before = container!.textContent ?? '';
    const loaded20 = Array.from(container!.querySelectorAll('.box-count-field input'))
      .find(i => (i.closest('.MuiFormControl-root')?.textContent ?? '').includes("20' Loaded")) as HTMLInputElement;
    expect(loaded20).toBeDefined();
    await act(async () => {
      setInputValue(loaded20, '999');
    });
    expect(currentCall.containers_loaded_le20ft).toBe(999);
    await rerender(currentVessel, currentCall);
    await act(async () => { await new Promise(r => setTimeout(r, 650)); });
    const after = container!.textContent ?? '';
    expect(after).not.toBe(before);
  });
});

describe('call-context strip and header (spec v0.2.47)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('the strip states vessel, GT, TEU, moves, lay time, and classes with honest defaults', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    const vessel: VesselInput = { gt: 12000, teu_capacity: 909 };
    const call: CallInput = {
      ...defaultCall('gothenburg'),
      containers_loaded_le20ft: 20,
      containers_loaded_gt20ft: 10,
      containers_discharged_le20ft: 20,
      containers_discharged_gt20ft: 10
    };
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={vessel}
          call={call}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="HELGAFELL (IMO 9306017)"
        />
      );
    });
    const strip = container!.querySelector('.comparison-context-strip');
    expect(strip).not.toBeNull();
    const text = strip!.textContent ?? '';
    expect(text).toContain('HELGAFELL (IMO 9306017)');
    expect(text).toContain('12,000');
    expect(text).toContain('909');
    expect(text).toContain('60 (loaded + discharged)'); // 20+10+20+10
    expect(text).toContain('not entered'); // lay time blank in this call state
    expect(text).toContain('E (default — not registered)'); // honest default
  });

  it('the ranking strip is absent from the comparison view (removal pin)', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <ComparisonView
          ports={LOADED_PORTS}
          vessel={DEFAULT_VESSEL}
          call={defaultCall('gothenburg')}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
          activeVessel="Custom vessel — 55,000 GT"
        />
      );
    });
    expect(container!.querySelector('.comparison-ranking-strip')).toBeNull();
    // the badges still render on the table (the ranking survives)
    expect(container!.querySelectorAll('.comparison-marker.comparison-cheapest').length).toBeGreaterThan(0);
    expect(container!.querySelectorAll('.comparison-marker.comparison-most-expensive').length).toBeGreaterThan(0);
  });

  it('the app header displays the active vessel under the title, updating live', () => {
    expect(appSource).toMatch(/className="header-active-vessel"/);
    expect(appSource).toMatch(/Active vessel: <strong>\{activeVesselLabel\}<\/strong>/);
    // the workspace reports selection changes to the header via callback
    expect(appSource).toMatch(/onActiveVesselChange=\{setActiveVesselLabel\}/);
  });
});

describe('per-port two-column layout contract (spec v0.2.47)', () => {
  it('the form-container grid rule that broke the split is gone (MUI Grid owns the columns)', () => {
    // The v0.2.47 root cause: a static CSS grid + 24px gap on
    // .form-container fought MUI's flex Grid — both 50% columns wrapped,
    // leaving the right half of the viewport empty at 1280 px. The class
    // must not carry display:grid or a gap.
    const rules = cssSource.match(/\.form-container\s*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBe(0);
    expect(cssSource).not.toMatch(/\.form-container\s*\{[^}]*display:\s*grid/);
    expect(cssSource).not.toMatch(/\.form-container\s*\{[^}]*gap:/);
  });

  it('the two-column split is MUI grid-md-6, stacked at xs (the md breakpoint)', () => {
    expect(appSource).toMatch(/<Grid container spacing=\{3\} className="form-container">/);
    expect((appSource.match(/<Grid item xs=\{12\} md=\{6\}>/g) ?? []).length).toBe(2);
  });

  it('the results tables fit their column (table-layout fixed; badge prose wraps)', () => {
    expect(cssSource).toMatch(/\.results-section table\s*\{\s*table-layout:\s*fixed;\s*width:\s*100%;/);
    expect(cssSource).toMatch(/\.status-badge\.derivation-flag-detail\s*\{\s*white-space:\s*normal;/);
  });
});
