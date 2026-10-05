// Port-drawer pins (spec v0.5.0 selection-surface redesign, item 0.5
// transition 5; docs/SELECTION_SURFACE_AUDIT.md §§0.3-0.4).
//
// The drawer replaces the horizontal tab list as the one selection surface:
// the collapsed "Ports" control, the country-grouped panel, the per-port
// navigation, and the relocated compare checkboxes (the same selection
// store and handlers the old comparison surface carried - the v0.2.59
// bounded four-port fresh-load default). Pins here: the drawer-structure
// contract, the country grouping (data-derived, never enumerated), the
// feed into the selection change handler, the honest counter, and the
// comparison cap (6 - the 140 px floor arithmetic, audit §0.4).
//
// The cap's red proof requires a synthetic seventh port: with six ports
// loaded the cap (6) is never reachable in the DOM - the fixture port is
// test-only machinery built from an existing silo's shape (never a silo
// or data change), registered inside the test's isolation and never
// committed to the registry.
//
// The handler-level cap pin forces the change event on a disabled-input
// mutation: the DOM gate swallows clicks on a disabled control, so the
// honest handler-level proof dispatches the event directly and asserts the
// handler ignores the check at cap (the no-op) and honors it below cap.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import {
  PortDrawer,
  groupPortsByCountry,
  COMPARISON_SELECTION_CAP
} from './portDrawer';
import type { PortDefinition } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);

// The synthetic seventh port (test-only, never a silo): cloned from an
// existing silo's real shape with its identity fields re-pointed, so the
// drawer's grouping and cap arithmetic run against seven registry rows
// without touching any data file.
const buildSeventhPort = (): PortDefinition => {
  const base = yaml.load(
    fs.readFileSync(
      path.join(__dirname, '../../core/data/helsingborg_2026.yaml'),
      'utf8'
    )
  ) as PortDefinition;
  return {
    ...base,
    metadata: {
      ...base.metadata,
      id: 'test_synthetic_seventh_port',
      name: 'Synthetic Seventh Port',
      country: 'Denmark'
    }
  };
};

jest.setTimeout(30000);

// Forced checkbox click (the handler-level cap proof's honest form):
// React's checkbox change contract listens to the click event, and a
// real pointer never delivers one to a disabled input - the DOM gate
// swallows the interaction before the handler can run. The proof
// therefore dispatches the click directly onto the disabled control:
// jsdom's checkbox activation behavior performs the checked mutation
// and fires the change event regardless of the disabled state, so the
// component's change handler runs with a checked target exactly as a
// real browser would run it had the gate not intervened. If the handler
// ignores the cap, the forced check appends and the pin fails; if it
// honors the cap, the forced check is a no-op. On an enabled box the
// same dispatch is exactly a user check, so one helper serves both
// sides of the pin.
const forceCheckboxClick = (box: HTMLInputElement) => {
  box.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('port drawer (spec v0.5.0) - structure and grouping', () => {
  it('the collapsed control renders closed with the disclosure contract (button, aria-expanded, aria-controls)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const selection: string[] = [];
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'port', portId: 'gothenburg' }}
          onNavigate={() => {}}
          selectedPortIds={selection}
          onSelectionChange={() => {}}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('port-drawer-panel');
    // Collapsed: no panel in the DOM
    expect(container.querySelector('.port-drawer-body')).toBeNull();
    act(() => { root.unmount(); });
    container.remove();
  });

  it('the drawer opens to a country-grouped panel: one header per distinct country, registry order, no code-side country list', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const panel = container.querySelector('#port-drawer-panel');
    expect(panel).not.toBeNull();
    const headers = Array.from(
      container.querySelectorAll('.port-drawer-country-header')
    ).map(h => (h.textContent ?? '').trim());
    // The six-port reality: five Swedish silos plus Hamburg - grouping is
    // data-derived from metadata.country, never enumerated in code.
    expect(headers).toEqual(['Sweden', 'Germany']);
    const groups = groupPortsByCountry(LOADED_PORTS);
    expect(groups.map(g => g.country)).toEqual(['Sweden', 'Germany']);
    expect(groups.find(g => g.country === 'Sweden')!.ports).toHaveLength(5);
    expect(groups.find(g => g.country === 'Germany')!.ports).toHaveLength(1);
    // No code-side country enumeration: the grouping helper reads the
    // field exactly as carried (a new country appears the day its port
    // exists - pinned by the fixture grouping below).
    const withSeventh = groupPortsByCountry([...LOADED_PORTS, buildSeventhPort()]);
    expect(withSeventh.map(g => g.country)).toEqual(['Sweden', 'Germany', 'Denmark']);
    act(() => { root.unmount(); });
    container.remove();
  });

  it('the panel closes on Escape and on navigation; navigation routes to the workspace and the comparison row', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    let navigated: { kind: 'port'; portId: string } | { kind: 'comparison' } | null = null;
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'port', portId: 'gothenburg' }}
          onNavigate={p => { navigated = p; }}
          selectedPortIds={[]}
          onSelectionChange={() => {}}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('.port-drawer-body')).not.toBeNull();
    // Escape closes, no navigation
    act(() => {
      toggle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(container.querySelector('.port-drawer-body')).toBeNull();
    expect(navigated).toBeNull();
    // Reopen, navigate: closes and routes
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const navRow = Array.from(container.querySelectorAll('.port-drawer-nav'))
      .find(b => (b.textContent ?? '').includes('Helsingborg')) as HTMLButtonElement;
    act(() => { navRow.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(container.querySelector('.port-drawer-body')).toBeNull();
    expect(navigated).toEqual({ kind: 'port', portId: 'helsingborg' });
    // The comparison row routes to the comparison page
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const compareRow = Array.from(container.querySelectorAll('.port-drawer-body button'))
      .find(b => (b.textContent ?? '').includes('Compare Ports')) as HTMLButtonElement;
    act(() => { compareRow.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(navigated).toEqual({ kind: 'comparison' });
    act(() => { root.unmount(); });
    container.remove();
  });

  it('the current page is marked on its row (the tab bar\'s selected signal, carried)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'port', portId: 'hamburg' }}
          onNavigate={() => {}}
          selectedPortIds={[]}
          onSelectionChange={() => {}}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const activeRows = Array.from(container.querySelectorAll('.port-drawer-row-active'));
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0].textContent).toContain('Hamburg');
    act(() => { root.unmount(); });
    container.remove();
  });
});

describe('port drawer (spec v0.5.0) - the comparison selection feed', () => {
  it('the checkboxes feed the same append/filter handlers (check appends, uncheck filters - the old model verbatim)', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const selection: string[] = ['gothenburg', 'hamburg'];
    const setSelection = (next: string[]) => { selection.splice(0, selection.length, ...next); };
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={selection}
          onSelectionChange={setSelection}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const checkboxFor = (name: string) => {
      const box = Array.from(container.querySelectorAll('.port-drawer-body input[type="checkbox"]'))
        .find(i => (i.getAttribute('aria-label') ?? '').includes(name)) as HTMLInputElement;
      expect(box).toBeDefined();
      return box;
    };
    // Check appends (registry-order append, the v0.2.59 handler)
    const hbg = checkboxFor('Helsingborg');
    act(() => { forceCheckboxClick(hbg); });
    expect(selection).toEqual(['gothenburg', 'hamburg', 'helsingborg']);
    // Uncheck filters
    const got = checkboxFor('Gothenburg');
    act(() => { forceCheckboxClick(got); });
    expect(selection).toEqual(['hamburg', 'helsingborg']);
    act(() => { root.unmount(); });
    container.remove();
  });

  it('the honest counter always renders ("N/6 selected"), at cap and below', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={LOADED_PORTS.map(p => p.metadata.id)}
          onSelectionChange={() => {}}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const count = container.querySelector('.port-drawer-count') as HTMLElement;
    expect(count.textContent).toBe(`6/${COMPARISON_SELECTION_CAP} selected`);
    // Below cap the counter renders too (re-render with 2 selected)
    act(() => {
      root.render(
        <PortDrawer
          ports={LOADED_PORTS}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={['gothenburg', 'hamburg']}
          onSelectionChange={() => {}}
        />
      );
    });
    const count2 = container.querySelector('.port-drawer-count') as HTMLElement;
    expect(count2.textContent).toBe(`2/${COMPARISON_SELECTION_CAP} selected`);
    act(() => { root.unmount(); });
    container.remove();
  });
});

describe('port drawer (spec v0.5.0) - the comparison cap (6, the 140 px floor arithmetic)', () => {
  const renderDrawer = (
    container: HTMLDivElement,
    root: Root,
    ports: PortDefinition[],
    selected: string[],
    onSelectionChange: (ids: string[]) => void
  ) => {
    act(() => {
      root.render(
        <PortDrawer
          ports={ports}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={selected}
          onSelectionChange={onSelectionChange}
        />
      );
    });
    const toggle = container.querySelector('.port-drawer-toggle') as HTMLButtonElement;
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  };

  it('with six ports loaded the cap is unreachable in the DOM (the honest-red seam: the sixth-port pin alone can never fail a cap defect)', () => {
    // The audit's own arithmetic: six loaded ports, all checkable, none
    // disabled - the cap never binds on the delivered port set. This pin
    // records why the seventh-port fixture is required for the cap's red
    // proof (a six-port-only cap suite is unfalsifiable).
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const selected = LOADED_PORTS.slice(0, 5).map(p => p.metadata.id);
    renderDrawer(container, root, LOADED_PORTS, selected, () => {});
    const boxes = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ) as HTMLInputElement[];
    expect(boxes).toHaveLength(6);
    // All six checkable, none disabled
    expect(boxes.every(b => !b.disabled)).toBe(true);
    act(() => { root.unmount(); });
    container.remove();
  });

  it('at cap the next unchecked checkbox renders disabled with the cap message - never a silent drop (the seventh-port fixture)', () => {
    const seventh = buildSeventhPort();
    const sevenPorts = [...LOADED_PORTS, seventh];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const selected = LOADED_PORTS.map(p => p.metadata.id); // 6 = the cap
    renderDrawer(container, root, sevenPorts, selected, () => {});
    const seventhBox = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ).find(i => (i.getAttribute('aria-label') ?? '').includes('Synthetic Seventh Port')) as HTMLInputElement;
    expect(seventhBox).toBeDefined();
    expect(seventhBox.disabled).toBe(true);
    // The disclosure names the cap and the remedy
    const message = container.querySelector('.port-drawer-cap-message') as HTMLElement;
    expect(message).not.toBeNull();
    expect(message.textContent).toContain('capped at 6 ports');
    expect(message.textContent).toContain('uncheck one');
    // The checked checkboxes stay enabled at cap (unchecking always works)
    const checkedBoxes = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ).filter(b => (b as HTMLInputElement).checked) as HTMLInputElement[];
    expect(checkedBoxes).toHaveLength(6);
    expect(checkedBoxes.every(b => !b.disabled)).toBe(true);
    act(() => { root.unmount(); });
    container.remove();
  });

  it('the handler-level cap pin: a forced change event at cap is a no-op; below cap the handler honors the check (the disabled-input mutation swallows clicks - the DOM gate never dispatches)', () => {
    const seventh = buildSeventhPort();
    const sevenPorts = [...LOADED_PORTS, seventh];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    // At cap: the disabled control's change event is forced (the mutation
    // the DOM gate prevents); the handler must ignore it.
    const selected = LOADED_PORTS.map(p => p.metadata.id);
    const setSelection = (next: string[]) => { selected.splice(0, selected.length, ...next); };
    renderDrawer(container, root, sevenPorts, selected, setSelection);
    const seventhBox = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ).find(i => (i.getAttribute('aria-label') ?? '').includes('Synthetic Seventh Port')) as HTMLInputElement;
    expect(seventhBox.disabled).toBe(true);
    // Force the click the disabled gate swallows in a real browser: the
    // handler must ignore the check (the cap holds at the handler level)
    act(() => { forceCheckboxClick(seventhBox); });
    expect(selected).toHaveLength(6); // no-op: the cap holds at the handler
    // Unchecking works at cap (the remedy the message names)
    const gotBox = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ).find(i => (i.getAttribute('aria-label') ?? '').includes('Gothenburg')) as HTMLInputElement;
    act(() => { forceCheckboxClick(gotBox); });
    expect(selected).toHaveLength(5);
    // Below cap the handler honors the check (re-render: the seventh row
    // re-enables). The re-render passes the new selection through the
    // same props - the drawer is open, so the panel must still be in the
    // DOM (the toggle is not re-clicked; the open state is the drawer's
    // own component-local state and survives the re-render).
    act(() => {
      root.render(
        <PortDrawer
          ports={sevenPorts}
          page={{ kind: 'comparison' }}
          onNavigate={() => {}}
          selectedPortIds={selected}
          onSelectionChange={setSelection}
        />
      );
    });
    const seventhBox2 = Array.from(
      container.querySelectorAll('.port-drawer-body input[type="checkbox"]')
    ).find(i => (i.getAttribute('aria-label') ?? '').includes('Synthetic Seventh Port')) as HTMLInputElement;
    expect(seventhBox2).toBeDefined();
    expect(seventhBox2.disabled).toBe(false);
    act(() => { forceCheckboxClick(seventhBox2); });
    expect(selected).toHaveLength(6);
    expect(selected).toContain('test_synthetic_seventh_port');
    act(() => { root.unmount(); });
    container.remove();
  });
});
