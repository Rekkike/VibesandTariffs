// Per-port persisted call state (spec v0.2.60, the port-switch reset defect
// fix, folded into item 3's generalization).
//
// Defect fixed: the port-switch reset wiped every port-specific input the
// user had entered (the old PORT_SPECIFIC_CALL_FIELDS effect), so per-port
// OPS speculation — currency-specific by design (SEK at the Swedish ports,
// EUR at Hamburg) — could not be entered and compared: switching ports
// destroyed the entries. Currency safety is now per-port isolation, not
// wiping: an SEK value never renders in a EUR box because each port's
// workspace reads its own state; the comparison consumes each port's own
// entries.
//
// Pins (all rendered at App level — the state routing lives there):
//  - persistence: entered OPS values survive a switch-away-and-back
//    (red: restoring the wipe effect fails this);
//  - isolation: each port renders only its own values (a GOT OPS price
//    never prices HAM's column);
//  - reset control: the per-workspace "reset to defaults" clears that
//    port's own fields and nothing else (the other port's entries and the
//    shared inputs survive);
//  - shape: HAM still renders no demand/per-GT box (the descriptor pins
//    hold through the persistence change);
//  - routing: shared fields (kWh consumption) carry across ports;
//    per-port fields do not leak.
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import App, { __setMobileQueryForTests } from './App';
import { defaultCall } from '@port-cost/core';
import type { CallInput } from '@port-cost/core/types';
import portsRegistry from './data/ports.json';
import type { PortDefinition } from '@port-cost/core/types';
import * as fs from 'fs';
import * as path from 'path';

const LOADED_PORTS: PortDefinition[] = ((portsRegistry as any).ports ?? []).filter(
  (p: any) => p && p.fee_rules && Array.isArray(p.fee_rules)
);
const cssSource = fs.readFileSync(path.join(__dirname, 'index.css'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, 'App.tsx'), 'utf8');

const GOT = LOADED_PORTS.find(p => p.metadata.id === 'gothenburg')!;
const HAM = LOADED_PORTS.find(p => p.metadata.id === 'hamburg')!;

// React tracks input value changes through the native value setter; the
// established pattern (vesselSelection.test.tsx) routes through the
// prototype setter so the TextField's onChange runs exactly as for a real
// keystroke.
const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const findFieldByLabel = (container: HTMLElement, label: string): HTMLInputElement | null => {
  const labels = Array.from(container.querySelectorAll('label'));
  const target = labels.find(l => (l.textContent ?? '').includes(label));
  if (!target) return null;
  const forId = target.getAttribute('for');
  if (!forId) return null;
  // MUI generates ids containing ':rx:' which are invalid CSS selectors -
  // resolve by id, never by querySelector.
  const input = container.querySelector(byExactId(forId)) as HTMLInputElement | null;
  return input && input.tagName === 'INPUT' ? input : null;
};

const byExactId = (id: string): string => {
  // jsdom supports attribute selectors with escaped ids; escape per CSS.
  const escaped = id.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  return `[id="${escaped}"]`;
};

const clickTab = async (container: HTMLElement, tabText: string) => {
  const tab = Array.from(container.querySelectorAll('.port-nav button'))
    .find(b => (b.textContent ?? '').toLowerCase().includes(tabText.toLowerCase()));
  expect(tab).toBeDefined();
  await act(async () => {
    tab!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const settle = async (ms = 650) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

// App-level renders with the 500 ms calculation debounce need multiple
// settles per test; the default 5 s jest timeout is too tight.
jest.setTimeout(30000);

describe('per-port persisted call state (spec v0.2.60, port-switch reset defect fix)', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  const renderApp = async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<App />);
    });
    await settle();
  };

  const rerender = async () => {
    await act(async () => {
      root!.render(<App />);
    });
    await settle();
  };

  afterEach(async () => {
    __setMobileQueryForTests(null);
    if (root) {
      const r = root;
      await act(async () => { r.unmount(); });
    }
    container?.remove();
    container = null;
    root = null;
  });

  it('entered OPS values persist across a switch-away-and-back (the wipe is gone)', async () => {
    await renderApp();
    // GOT is the fresh-load workspace; enter an OPS electricity price.
    const priceField = findFieldByLabel(container!, 'OPS electricity price');
    expect(priceField).not.toBeNull();
    await act(async () => {
      setInputValue(priceField!, '2.5');
    });
    await settle();
    // Switch to HAM and back to GOT.
    await clickTab(container!, 'Hamburg');
    await settle();
    await clickTab(container!, 'Gothenburg');
    await settle();
    const afterSwitch = findFieldByLabel(container!, 'OPS electricity price');
    expect(afterSwitch).not.toBeNull();
    expect(afterSwitch!.value).toBe('2.5');
  });

  it('each port renders only its own values: the GOT OPS price does not price HAM\'s workspace box', async () => {
    await renderApp();
    const priceField = findFieldByLabel(container!, 'OPS electricity price');
    await act(async () => {
      setInputValue(priceField!, '2.5');
    });
    await settle();
    await clickTab(container!, 'Hamburg');
    await settle();
    // HAM's electricity box renders its own state: empty, not GOT's 2.5.
    const hamField = findFieldByLabel(container!, 'OPS electricity price');
    expect(hamField).not.toBeNull();
    expect(hamField!.value).toBe('');
  });

  it('each port renders only its own values in the comparison (the per-port merge)', async () => {
    // The card-per-port layout renders below the 600 px stacking
    // breakpoint; the pin queries the mobile cards, so the seam selects
    // the mobile branch exactly as the responsive suite does.
    __setMobileQueryForTests(() => true);
    await renderApp();
    // The shared enabling input (kWh) plus GOT's own electricity price:
    // together they price OPS at GOT only - HAM has the kWh too, but no
    // entered price of its own, so its column carries no OPS block.
    const kwhField = findFieldByLabel(container!, 'Estimated OPS consumption');
    await act(async () => {
      setInputValue(kwhField!, '1200');
    });
    await settle();
    const priceField = findFieldByLabel(container!, 'OPS electricity price');
    await act(async () => {
      setInputValue(priceField!, '2.5');
    });
    await settle();
    await clickTab(container!, 'Compare Ports');
    await settle();
    // The GOT column prices OPS (kWh default from the shared call seeds
    // nothing by itself - only GOT carries the entered price); the HAM
    // column carries no GOT electricity price. HAM's OPS row stays absent
    // because its own state is empty and the fresh-load shared call has no
    // OPS values (defaultCall carries none).
    const cards = container!.querySelectorAll('.comparison-port-card');
    expect(cards.length).toBe(LOADED_PORTS.length);
    const gotCard = Array.from(cards).find(c => (c.textContent ?? '').includes('Gothenburg'))!;
    const hamCard = Array.from(cards).find(c => (c.textContent ?? '').includes('Hamburg'))!;
    expect(gotCard.querySelector('.comparison-card-ops')).not.toBeNull();
    expect(hamCard.querySelector('.comparison-card-ops')).toBeNull();
  });

  it('the reset control clears that port\'s own fields — other ports\' entries and shared inputs survive', async () => {
    await renderApp();
    const priceField = findFieldByLabel(container!, 'OPS electricity price');
    await act(async () => {
      setInputValue(priceField!, '2.5');
    });
    await settle();
    // A shared input: lay time (seeded 48 by the default profile; enter 12
    // to take ownership).
    const layTimeField = findFieldByLabel(container!, 'Lay time');
    if (layTimeField) {
      await act(async () => {
        setInputValue(layTimeField, '12');
      });
      await settle();
    }
    // Enter a HAM value too, so the reset's blast radius is pinned.
    await clickTab(container!, 'Hamburg');
    await settle();
    const hamPrice = findFieldByLabel(container!, 'OPS electricity price');
    await act(async () => {
      setInputValue(hamPrice!, '3.5');
    });
    await settle();
    // Back to GOT; reset GOT only.
    await clickTab(container!, 'Gothenburg');
    await settle();
    const resetButton = container!.querySelector('.workspace-reset');
    expect(resetButton).not.toBeNull();
    await act(async () => {
      resetButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await settle();
    const gotFieldAfter = findFieldByLabel(container!, 'OPS electricity price');
    expect(gotFieldAfter!.value).toBe('');
    // Shared input survives.
    if (layTimeField) {
      const layTimeAfter = findFieldByLabel(container!, 'Lay time');
      expect(layTimeAfter!.value).toBe('12');
    }
    // HAM's entry survives the GOT reset.
    await clickTab(container!, 'Hamburg');
    await settle();
    const hamFieldAfter = findFieldByLabel(container!, 'OPS electricity price');
    expect(hamFieldAfter!.value).toBe('3.5');
  });

  it('HAM still shows no demand/per-GT box (the descriptor shape holds through the persistence change)', async () => {
    await renderApp();
    await clickTab(container!, 'Hamburg');
    await settle();
    expect(findFieldByLabel(container!, 'OPS demand charge')).toBeNull();
    expect(findFieldByLabel(container!, 'OPS additional per-GT charge')).toBeNull();
    expect(findFieldByLabel(container!, 'OPS electricity price')).not.toBeNull();
    expect(findFieldByLabel(container!, 'OPS service/connection charge')).not.toBeNull();
  });

  it('shared currency-neutral fields carry across ports (kWh stays shared)', async () => {
    await renderApp();
    const kwhField = findFieldByLabel(container!, 'Estimated OPS consumption');
    expect(kwhField).not.toBeNull();
    await act(async () => {
      setInputValue(kwhField!, '1200');
    });
    await settle();
    await clickTab(container!, 'Hamburg');
    await settle();
    const hamKwh = findFieldByLabel(container!, 'Estimated OPS consumption');
    expect(hamKwh).not.toBeNull();
    expect(hamKwh!.value).toBe('1200');
  });

  it('red proof: the wipe effect is gone from App (no port-switch reset remains)', () => {
    expect(appSource).not.toMatch(/lastPortId/);
    expect(appSource).not.toMatch(/PORT_SPECIFIC_CALL_FIELDS/);
    // The persistence mechanism is present: per-port state + the split.
    expect(appSource).toMatch(/perPortCallFields/);
    expect(appSource).toMatch(/splitCallByPersistence/);
  });

  it('the reset control is styled with tokens only (v0.2.51 theme discipline)', () => {
    const m = cssSource.match(/\.workspace-reset\s*\{[^}]*\}/);
    expect(m).not.toBeNull();
    const body = m![0];
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(body).not.toMatch(/rgba?\(/);
    expect(body).toMatch(/var\(--/);
    const hover = cssSource.match(/\.workspace-reset:hover\s*\{[^}]*\}/);
    expect(hover).not.toBeNull();
    expect(hover![0]).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
