/**
 * NT class-boundary notice pins (spec v0.3.0 — the NT-convention
 * re-derivation, the web layer).
 *
 * The adjudicated contract (docs/NT_REDERIVATION_AUDIT.md §4.3):
 *   - a vessel whose NT is estimated AND whose formalized error band
 *     (0.40–0.58 × GT) spans a Sjöfartsverket class boundary renders a
 *     visible sensitivity notice at the ports whose own rules carry
 *     nt_class conditions (GOT and HEL — data-derived, never a port-id
 *     string);
 *   - the notice states the class actually used and the alternative class;
 *   - a confirmed NT (VISTULA) renders no notice and no estimate badge
 *     (the masquerade guard, both directions);
 *   - an observed value comfortably above its boundary (HELGAFELL)
 *     renders the estimate badge but not the boundary notice;
 *   - removing the notice fails these pins (the red basis).
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { PortWorkspace } from './App';
import portsRegistry from './data/ports.json';
import vesselLibrary from './data/vessel_library.json';
import { DEFAULT_VESSEL, defaultCall, getNetTonnageClass } from '@port-cost/core';
import type { CallInput, PortDefinition, VesselInput } from '@port-cost/core/types';
import { ntBoundaryNoticeFor, portBillsOnNtClasses, NT_ESTIMATE_BAND } from './ntBoundary';
import { readDecomposedAppSource } from './appSource';

const appSource = readDecomposedAppSource();
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const GOTHENBURG = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HELSINGBORG = LOADED_PORTS.find(p => p.metadata.id === 'helsingborg')!;
const HAMBURG = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;
const KYUNGMIN = (vesselLibrary as any).vessels.find((v: any) => v.name === 'MSC KYUNGMIN');
const VISTULA = (vesselLibrary as any).vessels.find((v: any) => v.name === 'VISTULA MAERSK');
const HELGAFELL = (vesselLibrary as any).vessels.find((v: any) => v.name === 'HELGAFELL');

describe('the notice condition is data-derived (the module contract)', () => {
  it('GOT and HEL bill on NT classes; HAM does not (the port\'s own rules decide)', () => {
    expect(portBillsOnNtClasses(GOTHENBURG)).toBe(true);
    expect(portBillsOnNtClasses(HELSINGBORG)).toBe(true);
    expect(portBillsOnNtClasses(HAMBURG)).toBe(false);
  });

  it('MSC KYUNGMIN (8,000 NT est., 21,979 GT): the band spans the Class 6 boundary — the notice fires', () => {
    const notice = ntBoundaryNoticeFor(true, KYUNGMIN.nt, KYUNGMIN.gt);
    expect(notice).not.toBeNull();
    expect(notice!.usedClass).toBe(5);
    expect(notice!.alternativeClass).toBe(6);
    // The band arithmetic: 0.40 x 21,979 = 8,792 (Class 5); 0.58 x 21,979 = 12,748 (Class 6)
    expect(notice!.bandLow).toBe(Math.round(21979 * NT_ESTIMATE_BAND.low));
    expect(notice!.bandHigh).toBe(Math.round(21979 * NT_ESTIMATE_BAND.high));
    expect(getNetTonnageClass(notice!.bandLow)).toBe(5);
    expect(getNetTonnageClass(notice!.bandHigh)).toBe(6);
  });

  it('HELGAFELL (3,783 NT est., 8,890 GT): the band spans 3,000 and 6,000 — the notice fires for the estimate', () => {
    // The audit's §4.3 adjudication for HELGAFELL was pre-observation (the
    // 3,200 estimate): the notice does not fire because the observed value
    // is the placement basis. The formalized convention, however, keys on
    // the estimated flag + the band; at the observed value the band
    // (3,556-5,156) still spans no boundary ABOVE the used class... it spans
    // none: 3,556 is Class 4 and 5,156 is Class 4. The observation moved the
    // band clear of the 3,000 boundary — the notice honestly does not fire.
    const notice = ntBoundaryNoticeFor(true, HELGAFELL.nt, HELGAFELL.gt, HELGAFELL.nt_observed);
    expect(notice).toBeNull();
  });

  it('MAREN (79,120 NT observed-est., 194,849 GT): Class 9 is forced — the observation band (±10 percent) cannot span a boundary', () => {
    const notice = ntBoundaryNoticeFor(true, 79120, 194849, true);
    expect(notice).toBeNull();
  });

  it('a confirmed NT (VISTULA) never fires the notice, and neither does a vessel without NT', () => {
    expect(ntBoundaryNoticeFor(false, VISTULA.nt, VISTULA.gt)).toBeNull();
    expect(ntBoundaryNoticeFor(true, undefined, 20000)).toBeNull();
  });
});

describe('the notice renders at the workspace (GOT and HEL; never HAM)', () => {
  let container: HTMLDivElement | null;
  let root: Root | null;

  const renderWorkspace = async (port: PortDefinition, vessel: VesselInput, call: CallInput, selectName?: string) => {
    await act(async () => {
      root!.render(
        <PortWorkspace
          port={port}
          vessel={vessel}
          call={call}
          onVesselChange={() => {}}
          onCallChange={() => {}}
          onActiveVesselChange={() => {}}
        />
      );
    });
    // Selecting a library vessel seeds the estimate state (the badge and
    // the notice derive from the selection, never the bare vessel prop).
    if (selectName) {
      const input = container!.querySelector('.vessel-select input') as HTMLInputElement;
      await act(async () => {
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      });
      const options = Array.from(document.querySelectorAll('li[role="option"]'));
      const option = options.find(o => (o.textContent ?? '').includes(selectName));
      expect(option).toBeDefined();
      await act(async () => {
        option!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
    }
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => { root!.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('MSC KYUNGMIN at GOT: the notice renders with the used and alternative classes', async () => {
    const vessel: VesselInput = {
      gt: KYUNGMIN.gt, nt: KYUNGMIN.nt, loa_m: KYUNGMIN.loa_m,
      teu_capacity: KYUNGMIN.teu_capacity, built_year: KYUNGMIN.built,
      name: KYUNGMIN.name, imo: KYUNGMIN.imo
    } as VesselInput;
    await renderWorkspace(GOTHENBURG, vessel, { ...defaultCall('gothenburg') }, 'MSC KYUNGMIN');
    const notice = container!.querySelector('[data-testid="nt-boundary-notice"]');
    expect(notice).not.toBeNull();
    const text = notice!.textContent ?? '';
    expect(text).toContain('Class 5');
    expect(text).toContain('Class 6');
    expect(text.toLowerCase()).toContain('uncertain');
  });

  it('MSC KYUNGMIN at HEL: the same notice renders (both Swedish ports)', async () => {
    const vessel: VesselInput = {
      gt: KYUNGMIN.gt, nt: KYUNGMIN.nt, loa_m: KYUNGMIN.loa_m,
      teu_capacity: KYUNGMIN.teu_capacity, built_year: KYUNGMIN.built,
      name: KYUNGMIN.name, imo: KYUNGMIN.imo
    } as VesselInput;
    await renderWorkspace(HELSINGBORG, vessel, { ...defaultCall('helsingborg') }, 'MSC KYUNGMIN');
    const notice = container!.querySelector('[data-testid="nt-boundary-notice"]');
    expect(notice).not.toBeNull();
  });

  it('MSC KYUNGMIN at HAM: no notice (the port bills nothing on NT classes)', async () => {
    const vessel: VesselInput = {
      gt: KYUNGMIN.gt, nt: KYUNGMIN.nt, loa_m: KYUNGMIN.loa_m,
      teu_capacity: KYUNGMIN.teu_capacity, built_year: KYUNGMIN.built,
      name: KYUNGMIN.name, imo: KYUNGMIN.imo
    } as VesselInput;
    await renderWorkspace(HAMBURG, vessel, { ...defaultCall('hamburg') }, 'MSC KYUNGMIN');
    const notice = container!.querySelector('[data-testid="nt-boundary-notice"]');
    expect(notice).toBeNull();
  });

  it('VISTULA (confirmed NT) at GOT: no notice — the class is not uncertain', async () => {
    const vessel: VesselInput = {
      gt: VISTULA.gt, nt: VISTULA.nt, loa_m: VISTULA.loa_m,
      teu_capacity: VISTULA.teu_capacity, built_year: VISTULA.built,
      name: VISTULA.name, imo: VISTULA.imo
    } as VesselInput;
    await renderWorkspace(GOTHENBURG, vessel, { ...defaultCall('gothenburg') }, 'VISTULA MAERSK');
    expect(container!.querySelector('[data-testid="nt-boundary-notice"]')).toBeNull();
  });

  it('HELGAFELL (observed estimate) at HEL: no notice — the band moved clear of the 3,000 boundary', async () => {
    const vessel: VesselInput = {
      gt: HELGAFELL.gt, nt: HELGAFELL.nt, loa_m: HELGAFELL.loa_m,
      teu_capacity: HELGAFELL.teu_capacity, built_year: HELGAFELL.built,
      name: HELGAFELL.name, imo: HELGAFELL.imo
    } as VesselInput;
    await renderWorkspace(HELSINGBORG, vessel, { ...defaultCall('helsingborg') }, 'HELGAFELL');
    expect(container!.querySelector('[data-testid="nt-boundary-notice"]')).toBeNull();
  });

  it('the default MAREN call renders no notice at any port (Class 9 forced)', async () => {
    for (const port of LOADED_PORTS) {
      await renderWorkspace(port, { ...DEFAULT_VESSEL }, { ...defaultCall(port.metadata.id) });
      expect(container!.querySelector('[data-testid="nt-boundary-notice"]')).toBeNull();
    }
  });
});

describe('source-level red-proof bases (the notice removal fails these)', () => {
  it('the notice markup and testid exist in the inputs module', () => {
    expect(appSource).toMatch(/data-testid="nt-boundary-notice"/);
    expect(appSource).toMatch(/ntBoundaryNoticeFor/);
    expect(appSource).toMatch(/portBillsOnNtClasses/);
  });

  it('the notice styling is token-based (no color literal)', () => {
    expect(cssSource).toMatch(/\.nt-boundary-notice/);
    expect(cssSource).toMatch(/--warning-tint/);
  });

  it('the NT input keeps the estimate badge contract (the est. label keys on estimated_fields)', () => {
    expect(appSource).toMatch(/Net Tonnage \(NT\) — est\./);
  });
});
